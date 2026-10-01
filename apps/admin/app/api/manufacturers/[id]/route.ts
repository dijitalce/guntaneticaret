import { eq } from "drizzle-orm";
import { db, manufacturers } from "@guntan/db";
import { MANUFACTURER_LOGO_MAX_BYTES } from "@guntan/config/manufacturer-logos";
import { writeAudit } from "@guntan/observability";
import { apiAdminSession, redirectTo, safeNext, text } from "../../../../src/api-helpers";

function imageType(bytes: Buffer): string | null {
  if (bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes.subarray(0, 4).toString("ascii") === "RIFF" && bytes.subarray(8, 12).toString("ascii") === "WEBP") return "image/webp";
  const head = bytes.subarray(0, 1024).toString("utf8").replace(/^\uFEFF/, "").trimStart();
  if ((head.startsWith("<svg") || head.startsWith("<?xml")) && /<svg[\s>]/i.test(bytes.toString("utf8"))) return "image/svg+xml";
  return null;
}

function unsafeSvg(svg: string): boolean {
  return /<script|<foreignObject|\son\w+\s*=|javascript:|<iframe|<embed|<object/i.test(svg);
}

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await apiAdminSession();
  if (!session) return redirectTo(request, "/login");
  const { id } = await ctx.params;
  const form = await request.formData();
  const action = text(form, "_action");
  const next = safeNext(form.get("next"), "/catalog/manufacturers");

  const [mfr] = await db.select({ id: manufacturers.id, name: manufacturers.name, logoUrl: manufacturers.logoUrl }).from(manufacturers).where(eq(manufacturers.id, id)).limit(1);
  if (!mfr) return redirectTo(request, next, { hata: "Üretici bulunamadı." });

  let logoUrl: string | null;
  let detail: Record<string, unknown>;
  if (action === "remove") {
    logoUrl = null;
    detail = { logo: "removed" };
  } else if (action === "upload") {
    const file = form.get("logo");
    if (!(file instanceof File) || file.size === 0) return redirectTo(request, next, { hata: "Logo dosyası seçilmedi." });
    if (file.size > MANUFACTURER_LOGO_MAX_BYTES) {
      return redirectTo(request, next, { hata: `Logo en fazla ${MANUFACTURER_LOGO_MAX_BYTES / 1024} KB olabilir.` });
    }
    const bytes = Buffer.from(await file.arrayBuffer());
    const type = imageType(bytes);
    if (!type) return redirectTo(request, next, { hata: "Yalnızca PNG, JPG, WEBP veya SVG yükleyebilirsiniz." });
    if (type === "image/svg+xml" && unsafeSvg(bytes.toString("utf8"))) {
      return redirectTo(request, next, { hata: "SVG dosyası betik veya gömülü içerik barındırıyor; PNG olarak yükleyin." });
    }
    logoUrl = `data:${type};base64,${bytes.toString("base64")}`;
    detail = { logo: "uploaded", type, bytes: bytes.length };
  } else {
    return redirectTo(request, next, { hata: "Geçersiz işlem." });
  }

  await db.update(manufacturers).set({ logoUrl, updatedAt: new Date() }).where(eq(manufacturers.id, id));
  await writeAudit({
    actorId: session.user.id,
    actorEmail: session.user.email,
    entity: "manufacturer",
    entityId: id,
    action: "update",
    before: { name: mfr.name, hadLogo: Boolean(mfr.logoUrl) },
    after: detail,
  });
  return redirectTo(request, next, { ok: action === "remove" ? "kaldirildi" : "yuklendi", m: mfr.name });
}

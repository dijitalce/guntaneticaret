import { eq } from "drizzle-orm";
import { banners, db } from "@guntan/db";
import { writeAudit } from "@guntan/observability";
import { apiAdminSession, redirectTo, text } from "../../../../../src/api-helpers";
import { bannerFromForm } from "../../../../../src/content-forms";

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await apiAdminSession();
  if (!session) return redirectTo(request, "/login");
  const { id } = await ctx.params;
  const [banner] = await db.select().from(banners).where(eq(banners.id, id)).limit(1);
  if (!banner) return redirectTo(request, "/content/banners");
  const form = await request.formData();
  const action = text(form, "_action") || "save";
  const audit = (act: string, after?: unknown) =>
    writeAudit({ actorId: session.user.id, actorEmail: session.user.email, entity: "banner", entityId: id, action: act, before: banner, after });

  if (action === "delete") {
    await db.delete(banners).where(eq(banners.id, id));
    await audit("delete");
    return redirectTo(request, "/content/banners", { ok: "silindi" });
  }
  if (action === "toggle") {
    await db.update(banners).set({ isActive: banner.isActive ? 0 : 1 }).where(eq(banners.id, id));
    await audit(banner.isActive ? "deactivate" : "activate");
    return redirectTo(request, "/content/banners", { ok: "kaydedildi" });
  }
  const input = bannerFromForm(form);
  if ("error" in input) return redirectTo(request, `/content/banners/${id}`, { hata: input.error ?? "Geçersiz form." });
  await db.update(banners).set(input).where(eq(banners.id, id));
  await audit("update", input);
  return redirectTo(request, `/content/banners/${id}`, { ok: "kaydedildi" });
}

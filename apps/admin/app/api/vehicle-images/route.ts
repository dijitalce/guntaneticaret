import { eq } from "drizzle-orm";
import { db, vehicleGenerations, vehicleModels } from "@guntan/db";
import { writeAudit } from "@guntan/observability";
import { apiAdminSession, redirectTo, safeNext, text } from "../../../src/api-helpers";
import { VEHICLE_IMAGE_MAX_BYTES, deleteVehicleImage, saveVehicleImage, vehicleImageType } from "../../../src/vehicle-images";

const TABLES = {
  model: { table: vehicleModels, audit: "vehicle_model" },
  generation: { table: vehicleGenerations, audit: "vehicle_generation" },
} as const;

export async function POST(request: Request) {
  const session = await apiAdminSession();
  if (!session) return redirectTo(request, "/login");
  const form = await request.formData();
  const entity = text(form, "entity") as keyof typeof TABLES;
  const id = text(form, "id");
  const action = text(form, "_action");
  const next = safeNext(form.get("next"), "/catalog/models");
  const target = TABLES[entity];
  if (!target || !id) return redirectTo(request, next, { hata: "Geçersiz istek." });

  const [row] = await db
    .select({ id: target.table.id, imageUrl: target.table.imageUrl })
    .from(target.table)
    .where(eq(target.table.id, id))
    .limit(1);
  if (!row) return redirectTo(request, next, { hata: "Kayıt bulunamadı." });

  let imageUrl: string | null = null;
  let detail: Record<string, unknown>;
  if (action === "remove") {
    detail = { image: "removed" };
  } else if (action === "upload") {
    const file = form.get("file");
    if (!(file instanceof File) || file.size === 0) return redirectTo(request, next, { hata: "Fotoğraf seçilmedi." });
    if (file.size > VEHICLE_IMAGE_MAX_BYTES) {
      return redirectTo(request, next, { hata: `Fotoğraf en fazla ${VEHICLE_IMAGE_MAX_BYTES / 1024} KB olabilir.` });
    }
    const bytes = Buffer.from(await file.arrayBuffer());
    const type = vehicleImageType(bytes);
    if (!type) return redirectTo(request, next, { hata: "Yalnızca WEBP, JPG veya PNG yükleyebilirsiniz." });
    try {
      imageUrl = await saveVehicleImage(`${entity}-${id.slice(0, 8)}`, bytes, type);
    } catch (err) {
      return redirectTo(request, next, { hata: (err as Error).message });
    }
    detail = { image: "uploaded", type, bytes: bytes.length };
  } else {
    return redirectTo(request, next, { hata: "Geçersiz işlem." });
  }

  await db.update(target.table).set({ imageUrl }).where(eq(target.table.id, id));
  await deleteVehicleImage(row.imageUrl);
  await writeAudit({
    actorId: session.user.id,
    actorEmail: session.user.email,
    entity: target.audit,
    entityId: id,
    action: "update",
    before: { imageUrl: row.imageUrl },
    after: { ...detail, imageUrl },
  });
  return redirectTo(request, next, { ok: action === "remove" ? "gorsel-kaldirildi" : "gorsel-yuklendi" });
}

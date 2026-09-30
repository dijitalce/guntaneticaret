import { eq } from "drizzle-orm";
import { db, newId, vehicleBrands, vehicleModels } from "@guntan/db";
import { writeAudit } from "@guntan/observability";
import { apiAdminSession, isDuplicateError, redirectTo, slugify, text } from "../../../src/api-helpers";

export async function POST(request: Request) {
  const session = await apiAdminSession();
  if (!session) return redirectTo(request, "/login");
  const form = await request.formData();

  const brandId = text(form, "brandId");
  const name = text(form, "name");
  const slug = slugify(text(form, "slug") || name);
  const back = (hata: string) => redirectTo(request, `/catalog/models/new${brandId ? `?marka=${brandId}` : ""}`, { hata });
  if (!brandId) return back("Marka seçin.");
  if (!name || !slug) return back("Model adı zorunlu.");
  const [brand] = await db.select({ id: vehicleBrands.id }).from(vehicleBrands).where(eq(vehicleBrands.id, brandId)).limit(1);
  if (!brand) return back("Marka bulunamadı.");

  const id = newId();
  const values = {
    id,
    brandId,
    name,
    slug,
    imageUrl: text(form, "imageUrl") || null,
    sortOrder: Number.parseInt(text(form, "sortOrder") || "0", 10) || 0,
    isActive: form.get("isActive") === "1",
    seoContent: text(form, "seoContent") || null,
  };
  try {
    await db.insert(vehicleModels).values(values);
  } catch (err) {
    return back(isDuplicateError(err) ? `Bu markada “${slug}” adresiyle bir model zaten var.` : "Model kaydedilemedi.");
  }
  await writeAudit({
    actorId: session.user.id,
    actorEmail: session.user.email,
    entity: "vehicle_model",
    entityId: id,
    action: "create",
    after: values,
  });
  return redirectTo(request, `/catalog/models/${id}`, { ok: "olusturuldu" });
}

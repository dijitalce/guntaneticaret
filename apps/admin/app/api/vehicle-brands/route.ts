import { db, newId, vehicleBrands } from "@guntan/db";
import { writeAudit } from "@guntan/observability";
import { apiAdminSession, isDuplicateError, redirectTo, slugify, text } from "../../../src/api-helpers";

export async function POST(request: Request) {
  const session = await apiAdminSession();
  if (!session) return redirectTo(request, "/login");
  const form = await request.formData();

  const name = text(form, "name");
  const slug = slugify(text(form, "slug") || name);
  if (!name || !slug) return redirectTo(request, "/catalog/brands/new", { hata: "Marka adı zorunlu." });

  const id = newId();
  const values = {
    id,
    name,
    slug,
    logoUrl: text(form, "logoUrl") || null,
    sortOrder: Number.parseInt(text(form, "sortOrder") || "0", 10) || 0,
    isActive: form.get("isActive") === "1",
    seoContent: text(form, "seoContent") || null,
  };
  try {
    await db.insert(vehicleBrands).values(values);
  } catch (err) {
    const msg = isDuplicateError(err) ? `“${slug}” adresiyle bir marka zaten var.` : "Marka kaydedilemedi.";
    return redirectTo(request, "/catalog/brands/new", { hata: msg });
  }
  await writeAudit({
    actorId: session.user.id,
    actorEmail: session.user.email,
    entity: "vehicle_brand",
    entityId: id,
    action: "create",
    after: values,
  });
  return redirectTo(request, `/catalog/brands/${id}`, { ok: "olusturuldu" });
}

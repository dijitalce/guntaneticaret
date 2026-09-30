import { count, eq } from "drizzle-orm";
import { db, productFitments, vehicleBrands, vehicleModels } from "@guntan/db";
import { writeAudit } from "@guntan/observability";
import { apiAdminSession, redirectTo, safeNext, text } from "../../../../src/api-helpers";

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await apiAdminSession();
  if (!session) return redirectTo(request, "/login");
  const { id } = await ctx.params;
  const form = await request.formData();
  const action = text(form, "_action") || "save";
  const next = safeNext(form.get("next"), `/catalog/brands/${id}`);

  const [brand] = await db.select().from(vehicleBrands).where(eq(vehicleBrands.id, id)).limit(1);
  if (!brand) return redirectTo(request, "/catalog/brands", { hata: "Marka bulunamadı." });
  const audit = (act: string, after?: unknown) =>
    writeAudit({
      actorId: session.user.id,
      actorEmail: session.user.email,
      entity: "vehicle_brand",
      entityId: id,
      action: act,
      before: { name: brand.name, logoUrl: brand.logoUrl, isActive: brand.isActive, sortOrder: brand.sortOrder },
      after,
    });

  if (action === "toggle") {
    await db.update(vehicleBrands).set({ isActive: !brand.isActive }).where(eq(vehicleBrands.id, id));
    await audit("toggle", { isActive: !brand.isActive });
    return redirectTo(request, next, { ok: brand.isActive ? "pasif" : "aktif" });
  }

  if (action === "delete") {
    const [[models], [fitments]] = await Promise.all([
      db.select({ n: count() }).from(vehicleModels).where(eq(vehicleModels.brandId, id)),
      db.select({ n: count() }).from(productFitments).where(eq(productFitments.vehicleBrandId, id)),
    ]);
    if ((models?.n ?? 0) > 0 || (fitments?.n ?? 0) > 0) {
      return redirectTo(request, `/catalog/brands/${id}`, {
        hata: `Bu markaya bağlı ${models?.n ?? 0} model ve ${fitments?.n ?? 0} ürün uyumluluğu var. Silmek yerine pasif yapın.`,
      });
    }
    await db.delete(vehicleBrands).where(eq(vehicleBrands.id, id));
    await audit("delete");
    return redirectTo(request, "/catalog/brands", { ok: "silindi" });
  }

  const name = text(form, "name");
  if (!name) return redirectTo(request, `/catalog/brands/${id}`, { hata: "Marka adı zorunlu." });
  const values = {
    name,
    logoUrl: text(form, "logoUrl") || null,
    sortOrder: Number.parseInt(text(form, "sortOrder") || "0", 10) || 0,
    isActive: form.get("isActive") === "1",
    seoContent: text(form, "seoContent") || null,
  };
  await db.update(vehicleBrands).set(values).where(eq(vehicleBrands.id, id));
  await audit("update", values);
  return redirectTo(request, `/catalog/brands/${id}`, { ok: "kaydedildi" });
}

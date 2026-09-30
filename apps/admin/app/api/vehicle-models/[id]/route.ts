import { count, eq } from "drizzle-orm";
import { db, productFitments, vehicleModels } from "@guntan/db";
import { writeAudit } from "@guntan/observability";
import { apiAdminSession, redirectTo, safeNext, text } from "../../../../src/api-helpers";

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await apiAdminSession();
  if (!session) return redirectTo(request, "/login");
  const { id } = await ctx.params;
  const form = await request.formData();
  const action = text(form, "_action") || "save";
  const next = safeNext(form.get("next"), `/catalog/models/${id}`);

  const [model] = await db.select().from(vehicleModels).where(eq(vehicleModels.id, id)).limit(1);
  if (!model) return redirectTo(request, "/catalog/models", { hata: "Model bulunamadı." });
  const audit = (act: string, after?: unknown) =>
    writeAudit({
      actorId: session.user.id,
      actorEmail: session.user.email,
      entity: "vehicle_model",
      entityId: id,
      action: act,
      before: { name: model.name, imageUrl: model.imageUrl, isActive: model.isActive, sortOrder: model.sortOrder },
      after,
    });

  if (action === "toggle") {
    await db.update(vehicleModels).set({ isActive: !model.isActive }).where(eq(vehicleModels.id, id));
    await audit("toggle", { isActive: !model.isActive });
    return redirectTo(request, next, { ok: model.isActive ? "pasif" : "aktif" });
  }

  if (action === "delete") {
    const [fitments] = await db.select({ n: count() }).from(productFitments).where(eq(productFitments.vehicleModelId, id));
    if ((fitments?.n ?? 0) > 0) {
      return redirectTo(request, `/catalog/models/${id}`, {
        hata: `Bu modele bağlı ${fitments!.n} ürün uyumluluğu var. Silmek yerine pasif yapın.`,
      });
    }
    await db.delete(vehicleModels).where(eq(vehicleModels.id, id));
    await audit("delete");
    return redirectTo(request, `/catalog/models?marka=${model.brandId}`, { ok: "silindi" });
  }

  const name = text(form, "name");
  if (!name) return redirectTo(request, `/catalog/models/${id}`, { hata: "Model adı zorunlu." });
  const values = {
    name,
    imageUrl: text(form, "imageUrl") || null,
    sortOrder: Number.parseInt(text(form, "sortOrder") || "0", 10) || 0,
    isActive: form.get("isActive") === "1",
    seoContent: text(form, "seoContent") || null,
  };
  await db.update(vehicleModels).set(values).where(eq(vehicleModels.id, id));
  await audit("update", values);
  return redirectTo(request, `/catalog/models/${id}`, { ok: "kaydedildi" });
}

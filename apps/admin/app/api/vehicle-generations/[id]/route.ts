import { eq } from "drizzle-orm";
import { db, vehicleGenerations } from "@guntan/db";
import { writeAudit } from "@guntan/observability";
import { apiAdminSession, redirectTo, text } from "../../../../src/api-helpers";
import { parseGenerationForm } from "../../../../src/generation-input";
import { deleteVehicleImage } from "../../../../src/vehicle-images";

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await apiAdminSession();
  if (!session) return redirectTo(request, "/login");
  const { id } = await ctx.params;
  const form = await request.formData();
  const action = text(form, "_action") || "save";

  const [gen] = await db.select().from(vehicleGenerations).where(eq(vehicleGenerations.id, id)).limit(1);
  if (!gen) return redirectTo(request, "/catalog/models", { hata: "Kasa kaydı bulunamadı." });
  const back = `/catalog/models/${gen.modelId}#kasalar`;
  const audit = (act: string, after?: unknown) =>
    writeAudit({
      actorId: session.user.id,
      actorEmail: session.user.email,
      entity: "vehicle_generation",
      entityId: id,
      action: act,
      before: { name: gen.name, yearFrom: gen.yearFrom, yearTo: gen.yearTo, isActive: gen.isActive },
      after,
    });

  if (action === "delete") {
    try {
      await db.delete(vehicleGenerations).where(eq(vehicleGenerations.id, id));
    } catch {
      return redirectTo(request, back, { hata: "Bu kasaya bağlı ürün uyumluluğu var; silmek yerine pasif yapın." });
    }
    await deleteVehicleImage(gen.imageUrl);
    await audit("delete");
    return redirectTo(request, back, { ok: "kasa-silindi" });
  }

  const parsed = parseGenerationForm(form);
  if ("error" in parsed) return redirectTo(request, back, { hata: parsed.error! });
  await db.update(vehicleGenerations).set(parsed.values).where(eq(vehicleGenerations.id, id));
  await audit("update", parsed.values);
  return redirectTo(request, back, { ok: "kasa-kaydedildi" });
}

import { and, eq } from "drizzle-orm";
import { db, newId, vehicleGenerations, vehicleModels } from "@guntan/db";
import { writeAudit } from "@guntan/observability";
import { apiAdminSession, redirectTo, slugify, text } from "../../../src/api-helpers";
import { parseGenerationForm } from "../../../src/generation-input";

export async function POST(request: Request) {
  const session = await apiAdminSession();
  if (!session) return redirectTo(request, "/login");
  const form = await request.formData();
  const modelId = text(form, "modelId");
  const [model] = await db.select({ id: vehicleModels.id }).from(vehicleModels).where(eq(vehicleModels.id, modelId)).limit(1);
  if (!model) return redirectTo(request, "/catalog/models", { hata: "Model bulunamadı." });
  const back = `/catalog/models/${modelId}#kasalar`;

  const parsed = parseGenerationForm(form);
  if ("error" in parsed) return redirectTo(request, back, { hata: parsed.error! });
  const base = slugify(parsed.values.name) || "kasa";
  let slug = base;
  for (let i = 2; i < 50; i++) {
    const [dup] = await db
      .select({ id: vehicleGenerations.id })
      .from(vehicleGenerations)
      .where(and(eq(vehicleGenerations.modelId, modelId), eq(vehicleGenerations.slug, slug)))
      .limit(1);
    if (!dup) break;
    slug = `${base}-${i}`;
  }
  const id = newId();
  const values = { id, modelId, slug, ...parsed.values };
  await db.insert(vehicleGenerations).values(values);
  await writeAudit({
    actorId: session.user.id,
    actorEmail: session.user.email,
    entity: "vehicle_generation",
    entityId: id,
    action: "create",
    after: values,
  });
  return redirectTo(request, back, { ok: "kasa-eklendi" });
}

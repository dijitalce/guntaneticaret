import { eq } from "drizzle-orm";
import { db, setCatalogExportToken, tenants } from "@guntan/db";
import { writeAudit } from "@guntan/observability";
import { apiAdminSession, redirectTo, text } from "../../../src/api-helpers";

export async function POST(request: Request) {
  const session = await apiAdminSession();
  if (!session) return redirectTo(request, "/login");
  const form = await request.formData();
  const tenantId = text(form, "tenantId");
  const action = text(form, "action");
  const back = `/integrations/xml?sekme=disa-aktar&site=${tenantId}`;
  const [tenant] = await db.select({ id: tenants.id }).from(tenants).where(eq(tenants.id, tenantId)).limit(1);
  if (!tenant) return redirectTo(request, "/integrations/xml?sekme=disa-aktar", { hata: "Site bulunamadı." });
  if (!["enable", "rotate", "disable"].includes(action)) return redirectTo(request, back, { hata: "Geçersiz işlem." });

  await setCatalogExportToken(tenantId, action !== "disable");
  await writeAudit({
    actorId: session.user.id,
    actorEmail: session.user.email,
    entity: "catalog_export",
    entityId: tenantId,
    action: action === "disable" ? "disable" : action === "rotate" ? "rotate_token" : "enable",
  });
  return redirectTo(request, back, { ok: action });
}

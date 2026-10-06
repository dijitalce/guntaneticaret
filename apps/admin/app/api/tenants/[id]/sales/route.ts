import { eq } from "drizzle-orm";
import { db, tenantSettings, tenants } from "@guntan/db";
import { DEFAULT_THEME_TOKENS, SALES_SOCIAL_KEYS, salesStatusFromSocial } from "@guntan/types";
import { writeAudit } from "@guntan/observability";
import { apiAdminSession, redirectTo, safeNext, text } from "../../../../../src/api-helpers";
import { mergeSocial, refreshTenantCache } from "../../../../../src/tenant-form";

/** Siteyi satışa açar/kapatır; kapalıyken vitrin sipariş ve ödeme kabul etmez. */
export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await apiAdminSession();
  if (!session) return redirectTo(request, "/login");
  const { id } = await ctx.params;
  const form = await request.formData();
  const back = safeNext(form.get("next"), `/tenants/${id}`);
  const action = text(form, "_action");
  if (action !== "open" && action !== "close" && action !== "message") {
    return redirectTo(request, back, { hata: "Geçersiz işlem." });
  }

  const [tenant] = await db.select({ id: tenants.id, name: tenants.name }).from(tenants).where(eq(tenants.id, id)).limit(1);
  if (!tenant) return redirectTo(request, "/tenants", { hata: "Site bulunamadı." });
  let [settings] = await db.select().from(tenantSettings).where(eq(tenantSettings.tenantId, id)).limit(1);
  if (!settings) {
    await db.insert(tenantSettings).values({ tenantId: id, siteName: tenant.name, themeTokens: { ...DEFAULT_THEME_TOKENS } });
    [settings] = await db.select().from(tenantSettings).where(eq(tenantSettings.tenantId, id)).limit(1);
  }
  if (!settings) return redirectTo(request, back, { hata: "Site ayarları oluşturulamadı." });

  const before = salesStatusFromSocial(settings.socialJson);
  const patch: Record<string, string> = {};
  if (action !== "message") patch[SALES_SOCIAL_KEYS.closed] = action === "close" ? "1" : "";
  if (form.has("message")) patch[SALES_SOCIAL_KEYS.message] = text(form, "message").slice(0, 300);
  const socialJson = mergeSocial(settings.socialJson, patch);
  await db.update(tenantSettings).set({ socialJson }).where(eq(tenantSettings.id, settings.id));
  const after = salesStatusFromSocial(socialJson);

  await refreshTenantCache(id);
  await writeAudit({
    actorId: session.user.id,
    actorEmail: session.user.email,
    entity: "tenant",
    entityId: id,
    action: action === "message" ? "sales:message" : action === "close" ? "sales:close" : "sales:open",
    before,
    after,
  });
  const ok = action === "close" ? "satis-kapali" : action === "open" ? "satis-acik" : "satis-mesaj";
  return redirectTo(request, back, { ok });
}

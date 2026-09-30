import { eq } from "drizzle-orm";
import { db, tenantSettings, tenants } from "@guntan/db";
import { DEFAULT_THEME_TOKENS, TENANT_STATUS } from "@guntan/types";
import { writeAudit } from "@guntan/observability";
import { apiAdminSession, redirectTo, text } from "../../../../src/api-helpers";
import {
  compileInBackground,
  mergeSocial,
  parseAdvanced,
  parseBranding,
  parseCatalog,
  parseContact,
  parseSeo,
  parseTheme,
  refreshTenantCache,
  replaceCatalogRules,
} from "../../../../src/tenant-form";

const SECTIONS = ["genel", "gorunum", "iletisim", "seo", "katalog", "gelismis"] as const;
type Section = (typeof SECTIONS)[number];
const STATUSES: string[] = Object.values(TENANT_STATUS);

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await apiAdminSession();
  if (!session) return redirectTo(request, "/login");
  const { id } = await ctx.params;
  const form = await request.formData();
  const section = (SECTIONS as readonly string[]).includes(text(form, "_section")) ? (text(form, "_section") as Section) : "genel";
  const back = `/tenants/${id}`;
  const fail = (hata: string) => redirectTo(request, back, { sekme: section, hata });

  const [tenant] = await db.select().from(tenants).where(eq(tenants.id, id)).limit(1);
  if (!tenant) return redirectTo(request, "/tenants", { hata: "Site bulunamadı." });
  let [settings] = await db.select().from(tenantSettings).where(eq(tenantSettings.tenantId, id)).limit(1);
  if (!settings) {
    await db.insert(tenantSettings).values({ tenantId: id, siteName: tenant.name, themeTokens: { ...DEFAULT_THEME_TOKENS } });
    [settings] = await db.select().from(tenantSettings).where(eq(tenantSettings.tenantId, id)).limit(1);
  }
  if (!settings) return fail("Site ayarları oluşturulamadı.");

  let after: Record<string, unknown> = {};
  let ok = "kaydedildi";

  if (section === "genel") {
    const name = text(form, "name");
    const siteName = text(form, "siteName") || name;
    const status = text(form, "status");
    if (!name) return fail("Site adı zorunlu.");
    if (!STATUSES.includes(status)) return fail("Geçersiz durum.");
    await db.update(tenants).set({ name, status }).where(eq(tenants.id, id));
    await db.update(tenantSettings).set({ siteName }).where(eq(tenantSettings.id, settings.id));
    after = { name, siteName, status };
  } else if (section === "gorunum") {
    const patch = { ...parseBranding(form), themeTokens: parseTheme(form, settings.themeTokens) };
    await db.update(tenantSettings).set(patch).where(eq(tenantSettings.id, settings.id));
    after = patch;
  } else if (section === "iletisim") {
    const parsed = parseContact(form);
    if (!parsed.ok) return fail(parsed.error);
    const socialJson = mergeSocial(settings.socialJson, parsed.value.social);
    await db.update(tenantSettings).set({ ...parsed.value.settings, socialJson }).where(eq(tenantSettings.id, settings.id));
    after = { ...parsed.value.settings, socialJson };
  } else if (section === "seo") {
    const parsed = parseSeo(form);
    if (!parsed.ok) return fail(parsed.error);
    const socialJson = mergeSocial(settings.socialJson, parsed.value.social);
    await db.update(tenantSettings).set({ ...parsed.value.settings, socialJson }).where(eq(tenantSettings.id, settings.id));
    after = { ...parsed.value.settings, socialJson };
  } else if (section === "katalog") {
    const { visibilityMode, rules, selectedCount } = parseCatalog(form);
    if (visibilityMode !== "ALL" && selectedCount === 0) return fail("Seçili markalar modunda en az bir grup veya marka seçmelisiniz.");
    await replaceCatalogRules(id, rules);
    await db.update(tenants).set({ visibilityMode }).where(eq(tenants.id, id));
    compileInBackground(id);
    after = { visibilityMode, rules: rules.length };
    ok = "derleniyor";
  } else if (section === "gelismis") {
    const patch = parseAdvanced(form);
    await db.update(tenantSettings).set(patch).where(eq(tenantSettings.id, settings.id));
    after = { headerHtml: !!patch.headerHtml, footerHtml: !!patch.footerHtml, customScripts: !!patch.customScripts };
  }

  await refreshTenantCache(id);
  await writeAudit({
    actorId: session.user.id,
    actorEmail: session.user.email,
    entity: "tenant",
    entityId: id,
    action: `update:${section}`,
    before: section === "genel" || section === "katalog" ? tenant : undefined,
    after,
  });
  return redirectTo(request, back, { sekme: section, ok });
}

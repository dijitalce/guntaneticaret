import { eq } from "drizzle-orm";
import { db, newId, tenantBankAccounts, tenantDomains, tenantSettings, tenants } from "@guntan/db";
import { DEFAULT_THEME_TOKENS, TENANT_STATUS } from "@guntan/types";
import { writeAudit } from "@guntan/observability";
import { apiAdminSession, isDuplicateError, redirectTo, slugify, text } from "../../../src/api-helpers";
import {
  compileInBackground,
  mergeSocial,
  parseCatalog,
  parseContact,
  parseSeo,
  parseTheme,
  replaceCatalogRules,
} from "../../../src/tenant-form";
import { formatIban, isValidIban, normalizeHostname, normalizeIban } from "../../../src/tenant-seo";

export async function POST(request: Request) {
  const session = await apiAdminSession();
  if (!session) return redirectTo(request, "/login");
  const form = await request.formData();
  const fail = (hata: string) => redirectTo(request, "/tenants/new", { hata });

  const name = text(form, "name");
  const slug = slugify(text(form, "slug") || name);
  const hostname = normalizeHostname(text(form, "hostname"));
  const status = text(form, "status") === TENANT_STATUS.ACTIVE ? TENANT_STATUS.ACTIVE : TENANT_STATUS.DRAFT;
  if (!name || !slug) return fail("Site adı zorunlu.");
  if (!hostname) return fail("Geçerli bir alan adı girin (örn. ornekotoparca.com).");

  const [slugTaken] = await db.select({ id: tenants.id }).from(tenants).where(eq(tenants.slug, slug)).limit(1);
  if (slugTaken) return fail(`“${slug}” kodu başka bir sitede kullanılıyor.`);
  const [hostTaken] = await db.select({ id: tenantDomains.id }).from(tenantDomains).where(eq(tenantDomains.hostname, hostname)).limit(1);
  if (hostTaken) return fail(`${hostname} başka bir siteye bağlı.`);

  const contact = parseContact(form);
  if (!contact.ok) return fail(contact.error);
  const seo = parseSeo(form);
  if (!seo.ok) return fail(seo.error);
  const catalog = parseCatalog(form);
  if (catalog.visibilityMode !== "ALL" && catalog.selectedCount === 0) {
    return fail("Seçili markalar modunda en az bir grup veya marka seçmelisiniz.");
  }
  const iban = normalizeIban(text(form, "iban"));
  if (iban && !isValidIban(iban)) return fail("IBAN geçersiz. TR ile başlayan 26 karakterlik IBAN girin.");

  const tenantId = newId();
  try {
    await db.insert(tenants).values({ id: tenantId, name, slug, status, visibilityMode: catalog.visibilityMode });
  } catch (err) {
    if (isDuplicateError(err)) return fail(`“${slug}” kodu başka bir sitede kullanılıyor.`);
    throw err;
  }
  await db.insert(tenantDomains).values({ tenantId, hostname, isPrimary: true });
  await db.insert(tenantSettings).values({
    tenantId,
    siteName: text(form, "siteName") || name,
    ...contact.value.settings,
    ...seo.value.settings,
    socialJson: mergeSocial({}, { ...contact.value.social, ...seo.value.social }),
    themeTokens: parseTheme(form, DEFAULT_THEME_TOKENS),
    logoUrl: "/brand/logo.png",
    faviconUrl: "/favicon.png",
    placeholderImageUrl: "/placeholder-product.jpg",
  });
  await replaceCatalogRules(tenantId, catalog.rules);
  if (iban) {
    await db.insert(tenantBankAccounts).values({
      tenantId,
      bankName: text(form, "bankName") || "Banka",
      accountHolder: text(form, "accountHolder") || name,
      iban: formatIban(iban),
    });
  }
  compileInBackground(tenantId);
  await writeAudit({
    actorId: session.user.id,
    actorEmail: session.user.email,
    entity: "tenant",
    entityId: tenantId,
    action: "create",
    after: { name, slug, hostname, status, visibilityMode: catalog.visibilityMode },
  });
  return redirectTo(request, `/tenants/${tenantId}`, { ok: "olusturuldu" });
}

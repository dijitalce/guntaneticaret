import { and, eq, inArray } from "drizzle-orm";
import { compileVisibility, db, tenantCatalogRules, tenantDomains } from "@guntan/db";
import { invalidateTenantCache } from "@guntan/tenant";
import { CATALOG_RULE_KIND, DEFAULT_THEME_TOKENS, SEO_SOCIAL_KEYS, SOCIAL_LINKS, VISIBILITY_MODE } from "@guntan/types";
import { text } from "./api-helpers";
import {
  GA_ID_RE,
  GTM_ID_RE,
  extractVerification,
  isHttpUrl,
  isValidEmail,
  normalizeWhatsapp,
} from "./tenant-seo";

type Result<T> = { ok: true; value: T } | { ok: false; error: string };

const orNull = (v: string) => (v ? v : null);

export function parseBranding(form: FormData) {
  return {
    logoUrl: orNull(text(form, "logoUrl")),
    logoDarkUrl: orNull(text(form, "logoDarkUrl")),
    faviconUrl: orNull(text(form, "faviconUrl")),
    placeholderImageUrl: orNull(text(form, "placeholderImageUrl")),
  };
}

const HEX = /^#[0-9a-f]{6}$/i;

export function parseTheme(form: FormData, current: Record<string, string> | null | undefined) {
  const next: Record<string, string> = { ...DEFAULT_THEME_TOKENS, ...(current ?? {}) };
  for (const key of ["primary", "secondary", "accent", "background"] as const) {
    const v = text(form, key);
    if (HEX.test(v)) next[key] = v.toLowerCase();
  }
  return next;
}

export function parseContact(form: FormData): Result<{
  settings: { phone: string | null; whatsapp: string | null; email: string | null; address: string | null };
  social: Record<string, string>;
}> {
  const email = text(form, "email");
  if (email && !isValidEmail(email)) return { ok: false, error: "E-posta adresi geçersiz." };
  const social: Record<string, string> = {};
  for (const link of SOCIAL_LINKS) {
    const v = text(form, `social_${link.key}`);
    if (v && !isHttpUrl(v)) return { ok: false, error: `${link.label} adresi https:// ile başlayan tam bir bağlantı olmalı.` };
    social[link.key] = v;
  }
  const allCatalogUrl = text(form, "allCatalogUrl");
  if (allCatalogUrl && !isHttpUrl(allCatalogUrl)) return { ok: false, error: "“Tüm parçalar” bağlantısı https:// ile başlamalı." };
  if (form.has("allCatalogUrl")) social.allCatalogUrl = allCatalogUrl;
  return {
    ok: true,
    value: {
      settings: {
        phone: orNull(text(form, "phone")),
        whatsapp: orNull(normalizeWhatsapp(text(form, "whatsapp"))),
        email: orNull(email),
        address: orNull(text(form, "address")),
      },
      social,
    },
  };
}

export function parseSeo(form: FormData): Result<{
  settings: {
    defaultMetaTitle: string | null;
    defaultMetaDescription: string | null;
    seoTitleTemplate: string;
    ogImageUrl: string | null;
    seoContent: string | null;
    gaId?: string | null;
    gtmId?: string | null;
  };
  social: Record<string, string>;
}> {
  const template = text(form, "seoTitleTemplate") || "{page} | {siteName}";
  if (!template.includes("{page}")) return { ok: false, error: "Başlık şablonunda {page} yer almalı." };
  const settings: {
    defaultMetaTitle: string | null;
    defaultMetaDescription: string | null;
    seoTitleTemplate: string;
    ogImageUrl: string | null;
    seoContent: string | null;
    gaId?: string | null;
    gtmId?: string | null;
  } = {
    defaultMetaTitle: orNull(text(form, "defaultMetaTitle").slice(0, 255)),
    defaultMetaDescription: orNull(text(form, "defaultMetaDescription")),
    seoTitleTemplate: template.slice(0, 255),
    ogImageUrl: orNull(text(form, "ogImageUrl")),
    seoContent: orNull(text(form, "seoContent")),
  };
  const social: Record<string, string> = {};
  if (form.has("gaId")) {
    const ga = text(form, "gaId").toUpperCase();
    if (ga && !GA_ID_RE.test(ga)) return { ok: false, error: "Google Analytics kimliği “G-XXXXXXX” biçiminde olmalı." };
    settings.gaId = orNull(ga);
  }
  if (form.has("gtmId")) {
    const gtm = text(form, "gtmId").toUpperCase();
    if (gtm && !GTM_ID_RE.test(gtm)) return { ok: false, error: "Tag Manager kimliği “GTM-XXXXXX” biçiminde olmalı." };
    settings.gtmId = orNull(gtm);
  }
  for (const key of [SEO_SOCIAL_KEYS.googleVerification, SEO_SOCIAL_KEYS.bingVerification, SEO_SOCIAL_KEYS.yandexVerification]) {
    if (form.has(key)) social[key] = extractVerification(text(form, key));
  }
  if (form.has(SEO_SOCIAL_KEYS.twitterHandle)) {
    const h = text(form, SEO_SOCIAL_KEYS.twitterHandle).replace(/^https?:\/\/(www\.)?(x|twitter)\.com\//i, "").replace(/^@?/, "");
    if (h && !/^[A-Za-z0-9_]{1,15}$/.test(h)) return { ok: false, error: "X kullanıcı adı geçersiz." };
    social[SEO_SOCIAL_KEYS.twitterHandle] = h ? `@${h}` : "";
  }
  if (form.has("_seoFlags")) social[SEO_SOCIAL_KEYS.noindex] = form.get("noindex") === "on" ? "1" : "";
  return { ok: true, value: { settings, social } };
}

export function parseAdvanced(form: FormData) {
  return {
    headerHtml: orNull(text(form, "headerHtml")),
    footerHtml: orNull(text(form, "footerHtml")),
    customScripts: orNull(text(form, "customScripts")),
  };
}

/** Boş değerli anahtarları kaldırarak mevcut social_json ile birleştirir. */
export function mergeSocial(current: Record<string, string> | null | undefined, patch: Record<string, string>) {
  const next: Record<string, string> = { ...(current ?? {}) };
  for (const [k, v] of Object.entries(patch)) {
    if (v) next[k] = v;
    else delete next[k];
  }
  return next;
}

const MANAGED_KINDS = [CATALOG_RULE_KIND.INCLUDE_GROUP, CATALOG_RULE_KIND.INCLUDE_BRAND, CATALOG_RULE_KIND.EXCLUDE_BRAND];

export function parseCatalog(form: FormData) {
  const uniq = (key: string) => [...new Set(form.getAll(key).map(String).filter(Boolean))];
  const groupIds = uniq("groupIds");
  const includeBrandIds = uniq("includeBrandIds");
  const excludeBrandIds = uniq("excludeBrandIds");
  const scope = text(form, "visibilityScope");
  const visibilityMode =
    scope === "ALL"
      ? VISIBILITY_MODE.ALL
      : groupIds.length && !includeBrandIds.length && !excludeBrandIds.length
        ? VISIBILITY_MODE.GROUPS
        : !groupIds.length && includeBrandIds.length
          ? VISIBILITY_MODE.BRANDS
          : VISIBILITY_MODE.CUSTOM;
  const rules = [
    ...groupIds.map((targetId) => ({ kind: CATALOG_RULE_KIND.INCLUDE_GROUP, targetId })),
    ...includeBrandIds.map((targetId) => ({ kind: CATALOG_RULE_KIND.INCLUDE_BRAND, targetId })),
    ...excludeBrandIds.map((targetId) => ({ kind: CATALOG_RULE_KIND.EXCLUDE_BRAND, targetId })),
  ];
  return { visibilityMode, rules, selectedCount: groupIds.length + includeBrandIds.length };
}

/** Grup/marka kurallarını yeniler; kategori ve ürün kurallarına dokunmaz. */
export async function replaceCatalogRules(tenantId: string, rules: { kind: string; targetId: string }[]) {
  await db
    .delete(tenantCatalogRules)
    .where(and(eq(tenantCatalogRules.tenantId, tenantId), inArray(tenantCatalogRules.kind, MANAGED_KINDS)));
  if (rules.length) await db.insert(tenantCatalogRules).values(rules.map((r) => ({ tenantId, ...r })));
}

export function compileInBackground(tenantId: string) {
  void (async () => {
    try {
      await compileVisibility(db, tenantId);
    } catch (err) {
      console.error("compileVisibility failed", tenantId, err);
    }
  })();
}

export async function refreshTenantCache(tenantId: string, extraHosts: string[] = []) {
  const domains = await db.select({ hostname: tenantDomains.hostname }).from(tenantDomains).where(eq(tenantDomains.tenantId, tenantId));
  await invalidateTenantCache(tenantId, [...domains.map((d) => d.hostname), ...extraHosts]);
}

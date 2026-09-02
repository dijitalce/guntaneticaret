import { eq } from "drizzle-orm";
import IORedis from "ioredis";
import { db, tenantDomains, tenantSettings, tenants } from "@guntan/db";
import { CACHE_KEYS, TENANT_CONFIG_CACHE_TTL_SECONDS, TENANT_HOST_CACHE_TTL_SECONDS } from "@guntan/config";
import {
  DEFAULT_THEME_TOKENS,
  TENANT_STATUS,
  type TenantPublicConfig,
  type ThemeTokens,
} from "@guntan/types";

let redis: IORedis | null = null;
function getRedis() {
  if (!process.env.REDIS_URL) return null;
  redis ??= new IORedis(process.env.REDIS_URL, { maxRetriesPerRequest: 2, lazyConnect: true });
  return redis;
}

export function normalizeHost(host: string): string {
  return host.replace(/:\d+$/, "").replace(/^www\./i, "").toLowerCase();
}

export async function resolveTenantByHost(rawHost: string): Promise<TenantPublicConfig | null> {
  const hostname = normalizeHost(rawHost);
  if (!hostname) return null;
  const cache = getRedis();
  const cacheKey = CACHE_KEYS.tenantHost(hostname);
  if (cache) {
    try {
      const hit = await cache.get(cacheKey);
      if (hit === "null") return null;
      if (hit) return JSON.parse(hit) as TenantPublicConfig;
    } catch {
      /* cache optional */
    }
  }

  const [domain] = await db
    .select()
    .from(tenantDomains)
    .where(eq(tenantDomains.hostname, hostname))
    .limit(1);

  if (!domain) {
    await cache?.set(cacheKey, "null", "EX", TENANT_HOST_CACHE_TTL_SECONDS);
    return null;
  }

  const [tenant] = await db.select().from(tenants).where(eq(tenants.id, domain.tenantId)).limit(1);
  if (!tenant || tenant.status === TENANT_STATUS.DRAFT) {
    await cache?.set(cacheKey, "null", "EX", TENANT_HOST_CACHE_TTL_SECONDS);
    return null;
  }

  const [settings] = await db.select().from(tenantSettings).where(eq(tenantSettings.tenantId, tenant.id)).limit(1);
  const domains = await db.select().from(tenantDomains).where(eq(tenantDomains.tenantId, tenant.id));
  const canonical = domains.find((d) => d.isPrimary)?.hostname ?? hostname;
  const theme = { ...DEFAULT_THEME_TOKENS, ...(settings?.themeTokens ?? {}) } as ThemeTokens;

  const config: TenantPublicConfig = {
    tenant: {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      status: tenant.status as TenantPublicConfig["tenant"]["status"],
      visibilityMode: tenant.visibilityMode as TenantPublicConfig["tenant"]["visibilityMode"],
      hostname,
      canonicalHost: canonical,
    },
    siteName: settings?.siteName ?? tenant.name,
    logoUrl: settings?.logoUrl ?? null,
    logoDarkUrl: settings?.logoDarkUrl ?? null,
    faviconUrl: settings?.faviconUrl ?? null,
    placeholderImageUrl: settings?.placeholderImageUrl ?? null,
    phone: settings?.phone ?? null,
    whatsapp: settings?.whatsapp ?? null,
    email: settings?.email ?? null,
    address: settings?.address ?? null,
    theme,
    defaultMetaTitle: settings?.defaultMetaTitle ?? null,
    defaultMetaDescription: settings?.defaultMetaDescription ?? null,
    ogImageUrl: settings?.ogImageUrl ?? null,
    gaId: settings?.gaId ?? null,
    gtmId: settings?.gtmId ?? null,
    customScripts: settings?.customScripts ?? null,
    allCatalogUrl: settings?.socialJson?.allCatalogUrl ?? null,
  };

  await cache?.set(cacheKey, JSON.stringify(config), "EX", TENANT_HOST_CACHE_TTL_SECONDS);
  await cache?.set(CACHE_KEYS.tenantConfig(tenant.id), JSON.stringify(config), "EX", TENANT_CONFIG_CACHE_TTL_SECONDS);
  return config;
}

export function themeToCssVars(theme: ThemeTokens): string {
  return [
    `--primary:${theme.primary}`,
    `--secondary:${theme.secondary}`,
    `--accent:${theme.accent}`,
    `--background:${theme.background}`,
    `--foreground:${theme.foreground}`,
    `--border:${theme.border}`,
    `--muted:${theme.muted}`,
    `--muted-foreground:${theme.mutedForeground}`,
    `--card:${theme.card}`,
    `--destructive:${theme.destructive}`,
    `--radius:${theme.radius}`,
    `--font:${theme.font}`,
  ].join(";");
}

export async function invalidateTenantCache(tenantId: string, hostnames: string[]) {
  const cache = getRedis();
  if (!cache) return;
  await cache.del(CACHE_KEYS.tenantConfig(tenantId), ...hostnames.map((h) => CACHE_KEYS.tenantHost(normalizeHost(h))));
}

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
const memCache = new Map<string, { value: TenantPublicConfig | null; exp: number }>();
const MEM_TTL_MS = 5 * 60_000;

function memGet(hostname: string): TenantPublicConfig | null | undefined {
  const hit = memCache.get(hostname);
  if (!hit) return undefined;
  if (hit.exp < Date.now()) {
    memCache.delete(hostname);
    return undefined;
  }
  return hit.value;
}

function memSet(hostname: string, value: TenantPublicConfig | null) {
  if (memCache.size > 80) memCache.clear();
  memCache.set(hostname, { value, exp: Date.now() + MEM_TTL_MS });
}

function getRedis() {
  const url = process.env.REDIS_URL;
  if (!url) return null;
  // Hostinger Cloud'da REDIS_URL çoğu zaman localhost kalıyor; bağlanmayı
  // denemek her istekte 1–2 sn kaybettirir.
  if (process.env.NODE_ENV === "production" && /localhost|127\.0\.0\.1/.test(url)) {
    return null;
  }
  const g = globalThis as unknown as { __guntanRedis?: IORedis | null };
  if (g.__guntanRedis !== undefined) return g.__guntanRedis;
  if (!redis) {
    redis = new IORedis(url, {
      maxRetriesPerRequest: 2,
      lazyConnect: true,
      // If REDIS_URL points at something unreachable (e.g. a leftover
      // "localhost" value in production with no Redis running there), the
      // default 10s connect timeout would otherwise stall every single
      // request on every domain by that long before falling back to the DB.
      connectTimeout: 1500,
      retryStrategy: () => null,
      enableOfflineQueue: false,
    });
    // ioredis crashes the whole process on an unhandled "error" event; the
    // cache is optional here, so swallow connection errors and let callers'
    // try/catch fall back to reading straight from the database.
    redis.on("error", () => {});
  }
  g.__guntanRedis = redis;
  return redis;
}

function liveRedis() {
  const cache = getRedis();
  if (!cache) return null;
  if (cache.status === "wait") {
    cache.connect().catch(() => {});
  }
  return cache.status === "ready" ? cache : null;
}

export function normalizeHost(host: string): string {
  return host.replace(/:\d+$/, "").replace(/^www\./i, "").toLowerCase();
}

async function safeCacheSet(cache: IORedis | null, key: string, value: string, ttlSeconds: number) {
  if (!cache || cache.status !== "ready") return;
  try {
    await cache.set(key, value, "EX", ttlSeconds);
  } catch {
    /* cache optional */
  }
}

export async function resolveTenantByHost(rawHost: string): Promise<TenantPublicConfig | null> {
  const hostname = normalizeHost(rawHost);
  if (!hostname) return null;
  const cached = memGet(hostname);
  if (cached !== undefined) return cached;
  const cache = liveRedis();
  const cacheKey = CACHE_KEYS.tenantHost(hostname);
  if (cache) {
    try {
      const hit = await cache.get(cacheKey);
      if (hit === "null") {
        memSet(hostname, null);
        return null;
      }
      if (hit) {
        const parsed = JSON.parse(hit) as TenantPublicConfig;
        memSet(hostname, parsed);
        return parsed;
      }
    } catch {
      /* cache optional */
    }
  }

  try {
    const [domain] = await db
      .select()
      .from(tenantDomains)
      .where(eq(tenantDomains.hostname, hostname))
      .limit(1);

    if (!domain) {
      memSet(hostname, null);
      await safeCacheSet(cache, cacheKey, "null", TENANT_HOST_CACHE_TTL_SECONDS);
      return null;
    }

    const [tenant] = await db.select().from(tenants).where(eq(tenants.id, domain.tenantId)).limit(1);
    if (!tenant || tenant.status === TENANT_STATUS.DRAFT) {
      memSet(hostname, null);
      await safeCacheSet(cache, cacheKey, "null", TENANT_HOST_CACHE_TTL_SECONDS);
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
      seoContent: settings?.seoContent ?? null,
    };

    memSet(hostname, config);
    await safeCacheSet(cache, cacheKey, JSON.stringify(config), TENANT_HOST_CACHE_TTL_SECONDS);
    await safeCacheSet(cache, CACHE_KEYS.tenantConfig(tenant.id), JSON.stringify(config), TENANT_CONFIG_CACHE_TTL_SECONDS);
    return config;
  } catch (err) {
    // Empty MySQL / wrong DATABASE_URL / connection errors must not take down every tenant domain.
    console.error("[tenant] resolveTenantByHost failed:", hostname, err instanceof Error ? err.message : err);
    return null;
  }
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
  memCache.clear();
  const cache = liveRedis();
  if (!cache) return;
  try {
    await cache.del(CACHE_KEYS.tenantConfig(tenantId), ...hostnames.map((h) => CACHE_KEYS.tenantHost(normalizeHost(h))));
  } catch {
    /* cache optional */
  }
}

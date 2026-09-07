export const RESERVED_PATH_SLUGS = [
  "urun",
  "sepet",
  "odeme",
  "hesabim",
  "arama",
  "kategori",
  "sayfa",
  "blog",
  "favoriler",
  "iletisim",
  "giris",
  "kayit",
  "cikis",
  "robots.txt",
  "sitemap.xml",
  "api",
  "admin",
  "yonetim",
] as const;

export function isReservedSlug(slug: string): boolean {
  return (RESERVED_PATH_SLUGS as readonly string[]).includes(slug.toLowerCase());
}

export const CACHE_KEYS = {
  tenantHost: (hostname: string) => `tenant:host:${hostname}`,
  tenantConfig: (tenantId: string) => `tenant:config:${tenantId}`,
  navBrands: (tenantId: string) => `nav:brands:${tenantId}`,
  navModels: (tenantId: string, brandSlug: string) => `nav:models:${tenantId}:${brandSlug}`,
} as const;

export const QUEUE_NAMES = {
  XML_IMPORT: "xml-import",
  VISIBILITY_COMPILE: "visibility-compile",
  SEARCH_REINDEX: "search-reindex",
  SITEMAP: "sitemap",
  IMAGE_INGEST: "image-ingest",
  EMAIL: "email",
} as const;

export const HEADER_TENANT_ID = "x-tenant-id";
export const HEADER_TENANT_SLUG = "x-tenant-slug";
export const HEADER_CANONICAL_HOST = "x-canonical-host";

export const COOKIE_CUSTOMER_SESSION = "guntan_customer";
export const COOKIE_ADMIN_SESSION = "guntan_admin";
export const COOKIE_CART = "guntan_cart";
export const COOKIE_GARAGE = "guntan_garage";
export const COOKIE_WISHLIST = "guntan_wishlist";

/** Hostinger/Node 0.0.0.0 dinlerken request.url yanlış origin verir; public URL kullan. */
export function publicRequestOrigin(request: Request): string {
  const envUrl = process.env.STOREFRONT_URL ?? process.env.ADMIN_URL;
  if (envUrl) {
    try {
      const origin = new URL(envUrl).origin;
      if (origin && !origin.includes("0.0.0.0")) return origin;
    } catch {
      /* ignore */
    }
  }

  const xfHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const xfProto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() || "https";
  if (xfHost && !xfHost.startsWith("0.0.0.0")) {
    return `${xfProto}://${xfHost}`;
  }

  const host = request.headers.get("host")?.split(",")[0]?.trim();
  if (host && !host.startsWith("0.0.0.0")) {
    return `${xfProto}://${host}`;
  }

  try {
    const u = new URL(request.url);
    if (u.hostname && u.hostname !== "0.0.0.0") return u.origin;
  } catch {
    /* ignore */
  }

  return "http://localhost:3000";
}

export function publicRedirect(path: string, request: Request): URL {
  const p = path.startsWith("/") ? path : `/${path}`;
  return new URL(p, publicRequestOrigin(request));
}

export { loadEnv, type AppEnv } from "./env";

export {
  TENANT_HOST_CACHE_TTL_SECONDS,
  TENANT_CONFIG_CACHE_TTL_SECONDS,
  NAV_CACHE_TTL_SECONDS,
} from "@guntan/types";

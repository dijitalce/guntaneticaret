import { SEO_SOCIAL_KEYS, SOCIAL_LINKS, applySeoTitleTemplate, type TenantPublicConfig } from "@guntan/types";

/** Sitenin başlık şablonunu ({page} | {siteName}) uygular. */
export function pageTitle(tenant: TenantPublicConfig, page: string) {
  return applySeoTitleTemplate(tenant.seoTitleTemplate, page, tenant.siteName);
}

export function socialProfileUrls(tenant: TenantPublicConfig): string[] | undefined {
  const social = tenant.social ?? {};
  const urls = SOCIAL_LINKS.map((s) => social[s.key]).filter((u): u is string => !!u && /^https?:\/\//i.test(u));
  return urls.length ? urls : undefined;
}

export function tenantNoIndex(tenant: TenantPublicConfig) {
  return tenant.social?.[SEO_SOCIAL_KEYS.noindex] === "1";
}

export function tenantVerification(tenant: TenantPublicConfig) {
  const s = tenant.social ?? {};
  const google = s[SEO_SOCIAL_KEYS.googleVerification];
  const bing = s[SEO_SOCIAL_KEYS.bingVerification];
  const yandex = s[SEO_SOCIAL_KEYS.yandexVerification];
  if (!google && !bing && !yandex) return undefined;
  return {
    google: google || undefined,
    yandex: yandex || undefined,
    other: bing ? { "msvalidate.01": bing } : undefined,
  };
}

export function absoluteUrl(host: string, path: string) {
  const base = host.startsWith("http") ? host : `https://${host}`;
  return `${base.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
}

const FALLBACK_SITE = "https://guntanotoyedekparca.com";

/** Next metadataBase: relative OG/Twitter görsellerini production origin ile çöz. */
export function metadataBaseForHost(host?: string | null): URL {
  const value = (host ?? "").trim();
  if (value.startsWith("http://") || value.startsWith("https://")) {
    try {
      const url = new URL(value);
      if (url.hostname && url.hostname !== "0.0.0.0") return url;
    } catch {
      /* fall through */
    }
  }

  const hostname = (value.split(":")[0] ?? "").toLowerCase();
  if (hostname && hostname !== "0.0.0.0" && hostname !== "127.0.0.1") {
    if (hostname === "localhost" || hostname.endsWith(".localhost")) {
      return new URL(`http://${hostname}${value.includes(":") ? `:${value.split(":")[1]}` : ":3000"}`);
    }
    return new URL(`https://${hostname}`);
  }

  const envUrl = process.env.STOREFRONT_URL ?? FALLBACK_SITE;
  try {
    const url = new URL(envUrl);
    if (url.hostname && url.hostname !== "0.0.0.0") return url;
  } catch {
    /* fall through */
  }
  return new URL(FALLBACK_SITE);
}

export function JsonLd({ data }: { data: Record<string, unknown> | Record<string, unknown>[] }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export function breadcrumbJsonLd(host: string, crumbs: { name: string; path?: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      ...(c.path ? { item: absoluteUrl(host, c.path) } : {}),
    })),
  };
}

export function itemListJsonLd(
  host: string,
  name: string,
  items: { name: string; slug: string }[],
) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name,
    numberOfItems: items.length,
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: absoluteUrl(host, `/urun/${item.slug}`),
      name: item.name,
    })),
  };
}

export function collectionPageJsonLd(host: string, name: string, description: string, path: string, siteName?: string) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name,
    description,
    url: absoluteUrl(host, path),
    isPartOf: {
      "@type": "WebSite",
      name: siteName ?? name,
      url: absoluteUrl(host, "/"),
    },
  };
}

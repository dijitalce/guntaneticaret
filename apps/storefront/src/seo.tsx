export function absoluteUrl(host: string, path: string) {
  const base = host.startsWith("http") ? host : `https://${host}`;
  return `${base.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
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

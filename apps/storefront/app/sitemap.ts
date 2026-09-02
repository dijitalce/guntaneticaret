import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { resolveTenantByHost } from "@guntan/tenant";
import { listVisibleBrands } from "@guntan/catalog";
import { db, products, tenantCatalogIndex } from "@guntan/db";
import { and, eq } from "drizzle-orm";
import { SITEMAP_URL_LIMIT } from "@guntan/types";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const host = (await headers()).get("x-request-host") ?? (await headers()).get("host") ?? "localhost";
  const tenant = await resolveTenantByHost(host);
  if (!tenant) return [];
  const base = `https://${tenant.tenant.canonicalHost}`;
  const brands = await listVisibleBrands(tenant.tenant.id);
  const productRows = await db
    .select({ slug: products.slug, updatedAt: products.updatedAt })
    .from(products)
    .innerJoin(tenantCatalogIndex, eq(tenantCatalogIndex.productId, products.id))
    .where(and(eq(tenantCatalogIndex.tenantId, tenant.tenant.id), eq(products.status, "active")))
    .limit(SITEMAP_URL_LIMIT);

  return [
    { url: `${base}/`, changeFrequency: "daily", priority: 1 },
    ...brands.map((b) => ({ url: `${base}/${b.slug}`, changeFrequency: "weekly" as const, priority: 0.8 })),
    ...productRows.map((p) => ({ url: `${base}/urun/${p.slug}`, changeFrequency: "weekly" as const, priority: 0.6 })),
  ];
}

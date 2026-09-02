import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { featuredProducts, getBrandBySlug, listModelsForBrand, listProducts } from "@guntan/catalog";
import { LISTING_SORT, type ListingSort } from "@guntan/types";
import { getTenant } from "../../src/tenant";
import { CatalogListing } from "../../src/catalog-listing";

export const revalidate = 120;

export async function generateMetadata({ params }: { params: Promise<{ brand: string }> }): Promise<Metadata> {
  const { brand } = await params;
  const tenant = await getTenant();
  const row = await getBrandBySlug(tenant.tenant.id, brand);
  if (!row) return {};
  return {
    title: `${row.name} Yedek Parça | ${tenant.siteName}`,
    description: `${row.name} modelleri için yedek parça.`,
    alternates: { canonical: `https://${tenant.tenant.canonicalHost}/${row.slug}` },
  };
}

export default async function BrandPage({
  params,
  searchParams,
}: {
  params: Promise<{ brand: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { brand } = await params;
  const sp = await searchParams;
  const tenant = await getTenant();
  const row = await getBrandBySlug(tenant.tenant.id, brand);
  if (!row) notFound();

  const sort = (sp.sort as ListingSort | undefined) ?? LISTING_SORT.RECOMMENDED;
  const [models, result, featured] = await Promise.all([
    listModelsForBrand(tenant.tenant.id, row.id),
    listProducts({ tenantId: tenant.tenant.id, brandId: row.id, sort, page: Number(sp.page ?? 1) }),
    featuredProducts(tenant.tenant.id, 4),
  ]);

  return (
    <CatalogListing
      crumbs={[{ href: "/", label: "Ana Sayfa" }, { label: row.name }]}
      title={`${row.name} Yedek Parça`}
      navTitle="Modeller"
      navItems={models.map((m) => ({
        name: m.name,
        slug: m.slug,
        href: `/${row.slug}/${m.slug}`,
        logoUrl: row.logoUrl,
      }))}
      featured={featured}
      items={result.items}
      total={result.total}
      sort={sort}
      placeholder={tenant.placeholderImageUrl}
    />
  );
}

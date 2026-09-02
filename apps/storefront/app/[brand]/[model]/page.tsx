import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { featuredProducts, getBrandBySlug, getModelBySlug, listingFacets, listModelsForBrand, listProducts } from "@guntan/catalog";
import { LISTING_SORT, type ListingSort } from "@guntan/types";
import { getTenant } from "../../../src/tenant";
import { CatalogListing } from "../../../src/catalog-listing";

export const revalidate = 120;

export async function generateMetadata({ params }: { params: Promise<{ brand: string; model: string }> }): Promise<Metadata> {
  const { brand, model } = await params;
  const tenant = await getTenant();
  const b = await getBrandBySlug(tenant.tenant.id, brand);
  if (!b) return {};
  return {
    title: `${b.name} ${model.toUpperCase()} Yedek Parça | ${tenant.siteName}`,
    alternates: { canonical: `https://${tenant.tenant.canonicalHost}/${brand}/${model}` },
  };
}

export default async function ModelListingPage({
  params,
  searchParams,
}: {
  params: Promise<{ brand: string; model: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { brand, model } = await params;
  const sp = await searchParams;
  const tenant = await getTenant();
  const b = await getBrandBySlug(tenant.tenant.id, brand);
  if (!b) notFound();
  const m = await getModelBySlug(b.id, model);
  if (!m) notFound();

  const page = Number(sp.page ?? 1);
  const sort = (sp.sort as ListingSort | undefined) ?? LISTING_SORT.RECOMMENDED;
  const [models, facets, result, featured] = await Promise.all([
    listModelsForBrand(tenant.tenant.id, b.id),
    listingFacets(tenant.tenant.id, b.id, m.id),
    listProducts({
      tenantId: tenant.tenant.id,
      brandId: b.id,
      modelId: m.id,
      sort,
      page,
      inStock: sp.stock === "1",
    }),
    featuredProducts(tenant.tenant.id, 4),
  ]);

  return (
    <CatalogListing
      crumbs={[
        { href: "/", label: "Ana Sayfa" },
        { href: `/${b.slug}`, label: b.name },
        { label: m.name },
      ]}
      title={`${b.name} ${m.name} Yedek Parça`}
      navTitle="Modeller"
      navItems={models.map((item) => ({
        name: item.name,
        slug: item.slug,
        href: `/${b.slug}/${item.slug}`,
        logoUrl: b.logoUrl,
      }))}
      activeSlug={m.slug}
      featured={featured}
      facets={facets}
      categoryBase={`/${b.slug}/${m.slug}`}
      items={result.items}
      total={result.total}
      sort={sort}
      placeholder={tenant.placeholderImageUrl}
    />
  );
}

import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { featuredProducts, getBrandBySlug, getModelBySlug, listProducts } from "@guntan/catalog";
import { LISTING_SORT, type ListingSort } from "@guntan/types";
import { getTenant } from "../../../src/tenant";
import { cachedListingFacets, cachedModelsForBrand } from "../../../src/cached-catalog";
import { CatalogListing } from "../../../src/catalog-listing";
import {
  JsonLd,
  absoluteUrl,
  breadcrumbJsonLd,
  collectionPageJsonLd,
  itemListJsonLd,
} from "../../../src/seo";

export const revalidate = 120;

export async function generateMetadata({ params }: { params: Promise<{ brand: string; model: string }> }): Promise<Metadata> {
  const { brand, model } = await params;
  const tenant = await getTenant();
  const b = await getBrandBySlug(tenant.tenant.id, brand);
  if (!b) return {};
  const m = await getModelBySlug(b.id, model);
  const modelLabel = m?.name ?? model.toUpperCase();
  const title = `${b.name} ${modelLabel} Yedek Parça | ${tenant.siteName}`;
  const description = `${b.name} ${modelLabel} uyumlu yedek parçalar. Fren, motor, filtre ve bakım ürünleri — ${tenant.siteName}.`;
  const path = `/${brand}/${model}`;
  return {
    title,
    description,
    alternates: { canonical: absoluteUrl(tenant.tenant.canonicalHost, path) },
    openGraph: { title, description, url: absoluteUrl(tenant.tenant.canonicalHost, path), type: "website" },
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

  const page = Math.max(1, Number(sp.page ?? 1) || 1);
  const sort = (sp.sort as ListingSort | undefined) ?? LISTING_SORT.RECOMMENDED;
  const [models, facets, result, featured] = await Promise.all([
    cachedModelsForBrand(tenant.tenant.id, b.id),
    cachedListingFacets(tenant.tenant.id, b.id, m.id),
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

  const host = tenant.tenant.canonicalHost;
  const title = `${b.name} ${m.name} Yedek Parça`;
  const path = `/${b.slug}/${m.slug}`;

  return (
    <>
      <JsonLd
        data={[
          breadcrumbJsonLd(host, [
            { name: "Ana Sayfa", path: "/" },
            { name: b.name, path: `/${b.slug}` },
            { name: m.name, path },
          ]),
          collectionPageJsonLd(host, title, `${title} — ${tenant.siteName}`, path),
          itemListJsonLd(host, title, result.items),
        ]}
      />
      <CatalogListing
        crumbs={[
          { href: "/", label: "Ana Sayfa" },
          { href: `/${b.slug}`, label: b.name },
          { label: m.name },
        ]}
        title={title}
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
        listBasePath={path}
        items={result.items}
        total={result.total}
        page={result.page}
        pageSize={result.pageSize}
        sort={sort}
        placeholder={tenant.placeholderImageUrl}
      />
    </>
  );
}

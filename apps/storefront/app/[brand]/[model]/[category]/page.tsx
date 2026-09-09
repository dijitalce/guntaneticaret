import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { LISTING_SORT, type ListingSort } from "@guntan/types";
import { getTenant } from "../../../../src/tenant";
import {
  cachedBrandBySlug,
  cachedCategoryById,
  cachedCategoryBySlug,
  cachedFeaturedProducts,
  cachedListProducts,
  cachedListingFacets,
  cachedModelBySlug,
  cachedModelsForBrand,
} from "../../../../src/cached-catalog";
import { CatalogListing } from "../../../../src/catalog-listing";
import { sentenceCaseTr } from "../../../../src/format";
import {
  JsonLd,
  absoluteUrl,
  breadcrumbJsonLd,
  collectionPageJsonLd,
  itemListJsonLd,
} from "../../../../src/seo";

export const revalidate = 120;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ brand: string; model: string; category: string }>;
}): Promise<Metadata> {
  const { brand, model, category } = await params;
  const tenant = await getTenant();
  const b = await cachedBrandBySlug(tenant.tenant.id, brand);
  if (!b) return {};
  const m = await cachedModelBySlug(b.id, model);
  if (!m) return {};
  const cat = await cachedCategoryBySlug(category);
  if (!cat) return {};
  const title = `${b.name} ${m.name} ${sentenceCaseTr(cat.name)} Yedek Parça | ${tenant.siteName}`;
  const description =
    cat.seoContent?.slice(0, 160) ??
    `${b.name} ${m.name} için ${sentenceCaseTr(cat.name).toLocaleLowerCase("tr-TR")} yedek parçaları. KDV dahil fiyat.`;
  const path = `/${b.slug}/${m.slug}/${cat.slug}`;
  return {
    title,
    description,
    alternates: { canonical: absoluteUrl(tenant.tenant.canonicalHost, path) },
    openGraph: { title, description, url: absoluteUrl(tenant.tenant.canonicalHost, path), type: "website" },
  };
}

export default async function CategoryListingPage({
  params,
  searchParams,
}: {
  params: Promise<{ brand: string; model: string; category: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { brand, model, category } = await params;
  const sp = await searchParams;
  const tenant = await getTenant();
  const b = await cachedBrandBySlug(tenant.tenant.id, brand);
  if (!b) notFound();
  const m = await cachedModelBySlug(b.id, model);
  if (!m) notFound();
  const cat = await cachedCategoryBySlug(category);
  if (!cat) notFound();
  const parent = cat.parentId ? await cachedCategoryById(cat.parentId) : null;
  const page = Math.max(1, Number(sp.page ?? 1) || 1);
  const sort = (sp.sort as ListingSort | undefined) ?? LISTING_SORT.RECOMMENDED;
  const [models, facets, result, featured] = await Promise.all([
    cachedModelsForBrand(tenant.tenant.id, b.id),
    cachedListingFacets(tenant.tenant.id, b.id, m.id),
    cachedListProducts({
      tenantId: tenant.tenant.id,
      brandId: b.id,
      modelId: m.id,
      categoryId: cat.id,
      sort,
      page,
    }),
    cachedFeaturedProducts(tenant.tenant.id, 4),
  ]);

  const host = tenant.tenant.canonicalHost;
  const title = `${b.name} ${m.name} ${sentenceCaseTr(cat.name)}`;
  const path = `/${b.slug}/${m.slug}/${cat.slug}`;

  return (
    <>
      <JsonLd
        data={[
          breadcrumbJsonLd(host, [
            { name: "Ana Sayfa", path: "/" },
            { name: b.name, path: `/${b.slug}` },
            { name: m.name, path: `/${b.slug}/${m.slug}` },
            { name: sentenceCaseTr(cat.name), path },
          ]),
          collectionPageJsonLd(
            host,
            `${title} Yedek Parça`,
            `${title} uyumlu yedek parçalar — ${tenant.siteName}`,
            path,
          ),
          itemListJsonLd(host, title, result.items),
        ]}
      />
      <CatalogListing
        crumbs={[
          { href: "/", label: "Ana Sayfa" },
          { href: `/${b.slug}`, label: b.name },
          { href: `/${b.slug}/${m.slug}`, label: m.name },
          { label: sentenceCaseTr(cat.name) },
        ]}
        title={`${title} Yedek Parça`}
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
        activeCategorySlug={parent?.slug ?? cat.slug}
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

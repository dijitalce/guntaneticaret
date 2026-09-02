import { notFound } from "next/navigation";
import { featuredProducts, getBrandBySlug, getCategoryById, getCategoryBySlug, getModelBySlug, listingFacets, listModelsForBrand, listProducts } from "@guntan/catalog";
import { LISTING_SORT } from "@guntan/types";
import { getTenant } from "../../../../src/tenant";
import { CatalogListing } from "../../../../src/catalog-listing";
import { sentenceCaseTr } from "../../../../src/format";

export default async function CategoryListingPage({
  params,
}: {
  params: Promise<{ brand: string; model: string; category: string }>;
}) {
  const { brand, model, category } = await params;
  const tenant = await getTenant();
  const b = await getBrandBySlug(tenant.tenant.id, brand);
  if (!b) notFound();
  const m = await getModelBySlug(b.id, model);
  if (!m) notFound();
  const cat = await getCategoryBySlug(category);
  if (!cat) notFound();
  const parent = cat.parentId ? await getCategoryById(cat.parentId) : null;
  const [models, facets, result, featured] = await Promise.all([
    listModelsForBrand(tenant.tenant.id, b.id),
    listingFacets(tenant.tenant.id, b.id, m.id),
    listProducts({
      tenantId: tenant.tenant.id,
      brandId: b.id,
      modelId: m.id,
      categoryId: cat.id,
    }),
    featuredProducts(tenant.tenant.id, 4),
  ]);

  return (
    <CatalogListing
      crumbs={[
        { href: "/", label: "Ana Sayfa" },
        { href: `/${b.slug}`, label: b.name },
        { href: `/${b.slug}/${m.slug}`, label: m.name },
        { label: sentenceCaseTr(cat.name) },
      ]}
      title={`${b.name} ${m.name} ${sentenceCaseTr(cat.name)}`}
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
      activeCategorySlug={parent?.slug ?? cat.slug}
      items={result.items}
      total={result.total}
      sort={LISTING_SORT.RECOMMENDED}
      placeholder={tenant.placeholderImageUrl}
    />
  );
}

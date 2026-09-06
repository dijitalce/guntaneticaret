import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { featuredProducts, getBrandBySlug, listProducts } from "@guntan/catalog";
import { LISTING_SORT, type ListingSort } from "@guntan/types";
import { getTenant } from "../../src/tenant";
import { cachedModelsForBrand } from "../../src/cached-catalog";
import { CatalogListing } from "../../src/catalog-listing";
import {
  JsonLd,
  absoluteUrl,
  breadcrumbJsonLd,
  collectionPageJsonLd,
  itemListJsonLd,
} from "../../src/seo";

export const revalidate = 120;

export async function generateMetadata({ params }: { params: Promise<{ brand: string }> }): Promise<Metadata> {
  const { brand } = await params;
  const tenant = await getTenant();
  const row = await getBrandBySlug(tenant.tenant.id, brand);
  if (!row) return {};
  const title = `${row.name} Yedek Parça | ${tenant.siteName}`;
  const description =
    row.seoContent?.slice(0, 160) ??
    `${row.name} modelleri için yedek parça. Fren, motor, filtre ve bakım ürünleri — ${tenant.siteName}.`;
  return {
    title,
    description,
    alternates: { canonical: absoluteUrl(tenant.tenant.canonicalHost, `/${row.slug}`) },
    openGraph: {
      title,
      description,
      url: absoluteUrl(tenant.tenant.canonicalHost, `/${row.slug}`),
      type: "website",
    },
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

  const page = Math.max(1, Number(sp.page ?? 1) || 1);
  const sort = (sp.sort as ListingSort | undefined) ?? LISTING_SORT.RECOMMENDED;
  const [models, result, featured] = await Promise.all([
    cachedModelsForBrand(tenant.tenant.id, row.id),
    listProducts({ tenantId: tenant.tenant.id, brandId: row.id, sort, page }),
    featuredProducts(tenant.tenant.id, 4),
  ]);

  const host = tenant.tenant.canonicalHost;
  const title = `${row.name} Yedek Parça`;
  const path = `/${row.slug}`;
  const description =
    row.seoContent ?? `${row.name} modelleri için yedek parça — ${tenant.siteName}.`;

  return (
    <>
      <JsonLd
        data={[
          breadcrumbJsonLd(host, [
            { name: "Ana Sayfa", path: "/" },
            { name: row.name, path },
          ]),
          collectionPageJsonLd(host, title, description, path),
          itemListJsonLd(host, title, result.items),
        ]}
      />
      <CatalogListing
        crumbs={[{ href: "/", label: "Ana Sayfa" }, { label: row.name }]}
        title={title}
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
        page={result.page}
        pageSize={result.pageSize}
        sort={sort}
        listBasePath={path}
        placeholder={tenant.placeholderImageUrl}
      />
      {row.seoContent && (
        <div className="container">
          <section className="seo-block">
            <h2>{row.name} yedek parça</h2>
            <p>{row.seoContent}</p>
          </section>
        </div>
      )}
    </>
  );
}

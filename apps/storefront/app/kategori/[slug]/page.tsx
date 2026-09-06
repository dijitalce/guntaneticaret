import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCategoryById, getCategoryBySlug, listProducts } from "@guntan/catalog";
import { LISTING_SORT, type ListingSort } from "@guntan/types";
import { getTenant } from "../../../src/tenant";
import { ProductCard } from "../../../src/product-card";
import { SortSelect } from "../../../src/sort-select";
import { sentenceCaseTr } from "../../../src/format";
import {
  JsonLd,
  absoluteUrl,
  breadcrumbJsonLd,
  collectionPageJsonLd,
  itemListJsonLd,
} from "../../../src/seo";
import Link from "next/link";

export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const tenant = await getTenant();
  const cat = await getCategoryBySlug(slug);
  if (!cat) return {};
  const title = cat.seoContent
    ? undefined
    : `${sentenceCaseTr(cat.name)} Yedek Parça | ${tenant.siteName}`;
  const description =
    cat.seoContent?.slice(0, 160) ??
    `${sentenceCaseTr(cat.name)} kategorisinde ${tenant.siteName} stoklarındaki yedek parçaları incele. KDV dahil fiyat, hızlı tedarik.`;
  return {
    title: title ?? `${sentenceCaseTr(cat.name)} Yedek Parça | ${tenant.siteName}`,
    description,
    alternates: {
      canonical: absoluteUrl(tenant.tenant.canonicalHost, `/kategori/${cat.slug}`),
    },
    openGraph: {
      title: `${sentenceCaseTr(cat.name)} Yedek Parça | ${tenant.siteName}`,
      description,
      url: absoluteUrl(tenant.tenant.canonicalHost, `/kategori/${cat.slug}`),
      type: "website",
    },
  };
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const tenant = await getTenant();
  const cat = await getCategoryBySlug(slug);
  if (!cat) notFound();
  const parent = cat.parentId ? await getCategoryById(cat.parentId) : null;
  const page = Math.max(1, Number(sp.page ?? 1) || 1);
  const sort = (sp.sort as ListingSort | undefined) ?? LISTING_SORT.RECOMMENDED;
  const result = await listProducts({
    tenantId: tenant.tenant.id,
    categoryId: cat.id,
    sort,
    page,
  });

  const host = tenant.tenant.canonicalHost;
  const catSlug = cat.slug;
  const title = `${sentenceCaseTr(cat.name)} Yedek Parça`;
  const description =
    cat.seoContent ??
    `${sentenceCaseTr(cat.name)} için uyumlu oto yedek parçalar. ${tenant.siteName} güvencesiyle KDV dahil fiyat.`;
  const totalPages = Math.max(1, Math.ceil(result.total / result.pageSize));

  function pageHref(p: number) {
    const params = new URLSearchParams();
    if (sort !== LISTING_SORT.RECOMMENDED) params.set("sort", sort);
    if (p > 1) params.set("page", String(p));
    const q = params.toString();
    return q ? `/kategori/${catSlug}?${q}` : `/kategori/${catSlug}`;
  }

  return (
    <div className="container page-surface">
      <JsonLd
        data={[
          breadcrumbJsonLd(host, [
            { name: "Ana Sayfa", path: "/" },
            ...(parent
              ? [{ name: sentenceCaseTr(parent.name), path: `/kategori/${parent.slug}` }]
              : []),
            { name: sentenceCaseTr(cat.name), path: `/kategori/${cat.slug}` },
          ]),
          collectionPageJsonLd(host, title, description, `/kategori/${cat.slug}`),
          itemListJsonLd(host, title, result.items),
        ]}
      />
      <nav className="breadcrumb">
        <Link href="/">Ana Sayfa</Link>
        {parent && (
          <>
            {" › "}
            <Link href={`/kategori/${parent.slug}`}>{sentenceCaseTr(parent.name)}</Link>
          </>
        )}
        {" › "}
        {sentenceCaseTr(cat.name)}
      </nav>
      <div className="catalog-toolbar">
        <div>
          <h1>{title}</h1>
          <p className="catalog-count">{result.total} ürün listeleniyor</p>
        </div>
        <SortSelect value={sort} />
      </div>
      {cat.seoContent && <p className="category-seo-lead">{cat.seoContent}</p>}
      <div className="product-grid">
        {result.items.map((p, i) => (
          <ProductCard
            key={p.id}
            product={p}
            placeholder={tenant.placeholderImageUrl}
            priority={i < 4}
          />
        ))}
      </div>
      {result.total === 0 && (
        <div className="empty-state">
          <h2>Bu kategoride ürün yok</h2>
          <p>Başka bir kategori seç veya marka/model ile devam et.</p>
          <Link className="btn btn-primary" href="/">Marka seç</Link>
        </div>
      )}
      {totalPages > 1 && (
        <nav className="catalog-pagination" aria-label="Sayfalar">
          {page > 1 && <Link href={pageHref(page - 1)}>Önceki</Link>}
          <span>
            {page} / {totalPages}
          </span>
          {page < totalPages && <Link href={pageHref(page + 1)}>Sonraki</Link>}
        </nav>
      )}
      <section className="seo-block">
        <h2>{sentenceCaseTr(cat.name)} yedek parça</h2>
        <p>{description}</p>
      </section>
    </div>
  );
}

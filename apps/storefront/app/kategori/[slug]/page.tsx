import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { LISTING_SORT, type ListingSort } from "@guntan/types";
import { getTenant } from "../../../src/tenant";
import {
  cachedBrandBySlug,
  cachedCategoryById,
  cachedCategoryBySlug,
  cachedListProducts,
  cachedListingFacetsForCategory,
  cachedManufacturerBySlug,
} from "../../../src/cached-catalog";
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

export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const tenant = await getTenant();
  const cat = await cachedCategoryBySlug(slug);
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
  const manufacturerSlug = sp.mfr?.trim() || undefined;
  const brandSlug = sp.brand?.trim() || undefined;
  const [cat, manufacturer, brand] = await Promise.all([
    cachedCategoryBySlug(slug),
    manufacturerSlug ? cachedManufacturerBySlug(manufacturerSlug) : Promise.resolve(null),
    brandSlug ? cachedBrandBySlug(tenant.tenant.id, brandSlug) : Promise.resolve(null),
  ]);
  if (!cat) notFound();
  const page = Math.max(1, Number(sp.page ?? 1) || 1);
  const sort = (sp.sort as ListingSort | undefined) ?? LISTING_SORT.RECOMMENDED;
  const inStock = sp.stock === "1";

  const [parent, facets, result] = await Promise.all([
    cat.parentId ? cachedCategoryById(cat.parentId) : Promise.resolve(null),
    cachedListingFacetsForCategory(tenant.tenant.id, cat.id),
    cachedListProducts({
      tenantId: tenant.tenant.id,
      categoryId: cat.id,
      manufacturerId: manufacturer?.id,
      brandId: brand?.id,
      sort,
      page,
      inStock,
    }),
  ]);

  const host = tenant.tenant.canonicalHost;
  const catSlug = cat.slug;
  const title = `${sentenceCaseTr(cat.name)} Yedek Parça`;
  const description =
    cat.seoContent ??
    `${sentenceCaseTr(cat.name)} için uyumlu oto yedek parçalar. ${tenant.siteName} güvencesiyle KDV dahil fiyat.`;
  const totalPages = Math.max(1, Math.ceil(result.total / result.pageSize));

  function href(overrides: Record<string, string | undefined> = {}) {
    const params = new URLSearchParams();
    const next = {
      sort: sort !== LISTING_SORT.RECOMMENDED ? sort : undefined,
      stock: inStock ? "1" : undefined,
      mfr: manufacturerSlug,
      brand: brandSlug,
      page: undefined as string | undefined,
      ...overrides,
    };
    if (next.sort) params.set("sort", next.sort);
    if (next.stock === "1") params.set("stock", "1");
    if (next.mfr) params.set("mfr", next.mfr);
    if (next.brand) params.set("brand", next.brand);
    if (next.page && next.page !== "1") params.set("page", next.page);
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

      {facets.children.length > 0 && (
        <nav className="catalog-cats" aria-label="Alt kategoriler">
          <Link className="is-active" href={href({ mfr: undefined, brand: undefined, page: undefined })}>
            Tümü
          </Link>
          {facets.children.map((c) => (
            <Link key={c.id} href={`/kategori/${c.slug}`}>
              {sentenceCaseTr(c.name)}
              <em>{c.count}</em>
            </Link>
          ))}
        </nav>
      )}

      <div className="catalog-filters">
        <Link
          className={`catalog-filter-chip${!inStock ? " is-active" : ""}`}
          href={href({ stock: undefined, page: undefined })}
        >
          Tüm stok
        </Link>
        <Link
          className={`catalog-filter-chip${inStock ? " is-active" : ""}`}
          href={href({ stock: "1", page: undefined })}
        >
          Stokta olanlar
        </Link>
        {(manufacturerSlug || brandSlug) && (
          <Link className="catalog-filter-chip" href={href({ mfr: undefined, brand: undefined, page: undefined })}>
            Filtreleri temizle
          </Link>
        )}
      </div>

      {facets.manufacturers.length > 0 && (
        <nav className="catalog-cats" aria-label="Üretici markalar">
          <Link
            className={!manufacturerSlug ? "is-active" : undefined}
            href={href({ mfr: undefined, page: undefined })}
          >
            Tüm üreticiler
          </Link>
          {facets.manufacturers.map((m) => (
            <Link
              key={m.id}
              className={manufacturerSlug === m.slug ? "is-active" : undefined}
              href={href({ mfr: m.slug, page: undefined })}
            >
              {m.name}
              <em>{m.count}</em>
            </Link>
          ))}
        </nav>
      )}

      {facets.brands.length > 0 && (
        <nav className="catalog-cats" aria-label="Araç markaları">
          <Link
            className={!brandSlug ? "is-active" : undefined}
            href={href({ brand: undefined, page: undefined })}
          >
            Tüm araçlar
          </Link>
          {facets.brands.map((b) => (
            <Link
              key={b.id}
              className={brandSlug === b.slug ? "is-active" : undefined}
              href={href({ brand: b.slug, page: undefined })}
            >
              {b.name}
              <em>{b.count}</em>
            </Link>
          ))}
        </nav>
      )}

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
          <h2>Bu filtrede ürün yok</h2>
          <p>Filtreyi genişlet veya başka bir kategori dene.</p>
          <Link className="btn btn-primary" href={`/kategori/${cat.slug}`}>
            Filtreleri sıfırla
          </Link>
        </div>
      )}
      {totalPages > 1 && (
        <nav className="catalog-pagination" aria-label="Sayfalar">
          {page > 1 && <Link href={href({ page: String(page - 1) })}>Önceki</Link>}
          <span>
            {page} / {totalPages}
          </span>
          {page < totalPages && <Link href={href({ page: String(page + 1) })}>Sonraki</Link>}
        </nav>
      )}
      <section className="seo-block">
        <h2>{sentenceCaseTr(cat.name)} yedek parça</h2>
        <p>{description}</p>
      </section>
    </div>
  );
}

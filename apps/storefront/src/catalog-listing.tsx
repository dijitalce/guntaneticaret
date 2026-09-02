import Link from "next/link";
import { type ListingSort } from "@guntan/types";
import { ProductCard, ProductMiniCard } from "./product-card";
import { VehicleNav, type VehicleNavItem } from "./vehicle-nav";
import { sentenceCaseTr } from "./format";
import { SortSelect } from "./sort-select";

type Product = {
  id: string;
  name: string;
  slug: string;
  sku: string;
  price: string;
  compareAtPrice: string | null;
  manufacturerName?: string | null;
  imageUrl?: string | null;
  oem?: string | null;
  stockStatus: string;
};

type Facets = {
  categories: { id: string; name: string; slug: string; count: number }[];
  manufacturers: { id: string; name: string; slug: string }[];
  engines: { id: string; name: string; slug: string }[];
};

export function CatalogListing({
  crumbs,
  title,
  navTitle,
  navItems,
  activeSlug,
  featured,
  facets,
  categoryBase,
  activeCategorySlug,
  items,
  total,
  sort,
  placeholder,
}: {
  crumbs: { href?: string; label: string }[];
  title: string;
  navTitle: string;
  navItems: VehicleNavItem[];
  activeSlug?: string;
  featured: { name: string; slug: string; price: string; imageUrl?: string | null }[];
  facets?: Facets;
  categoryBase?: string;
  activeCategorySlug?: string;
  items: Product[];
  total: number;
  sort: ListingSort;
  placeholder: string | null;
}) {
  const categories = [...(facets?.categories ?? [])].sort(
    (a, b) => Number(b.count) - Number(a.count) || a.name.localeCompare(b.name, "tr"),
  );

  return (
    <div className="container catalog-page">
      <div className="catalog-layout">
        <aside className="catalog-aside">
          <VehicleNav
            title={navTitle}
            items={navItems}
            activeSlug={activeSlug}
            searchable
            backHref="/"
            backLabel="Markalara dön"
          />
          {featured.length > 0 && (
            <div className="aside-block">
              <div className="vehicle-nav-head">Çok satanlar</div>
              {featured.slice(0, 4).map((p) => (
                <ProductMiniCard key={p.slug} product={p} placeholder={placeholder} />
              ))}
            </div>
          )}
        </aside>
        <section>
          <nav className="breadcrumb">
            {crumbs.map((c, i) => (
              <span key={`${c.label}-${i}`}>
                {i > 0 && " › "}
                {c.href ? <Link href={c.href}>{c.label}</Link> : c.label}
              </span>
            ))}
          </nav>
          <div className="catalog-toolbar">
            <div>
              <h1>{title}</h1>
              <p className="catalog-count">{total} ürün listeleniyor</p>
            </div>
            <SortSelect value={sort} />
          </div>
          {categoryBase && categories.length > 0 && (
            <nav className="catalog-cats" aria-label="Kategoriler">
              <Link className={!activeCategorySlug ? "is-active" : undefined} href={categoryBase}>
                Tümü
              </Link>
              {categories.map((c) => (
                <Link
                  key={c.id}
                  className={activeCategorySlug === c.slug ? "is-active" : undefined}
                  href={`${categoryBase}/${c.slug}`}
                >
                  {sentenceCaseTr(c.name)}
                  <em>{c.count}</em>
                </Link>
              ))}
            </nav>
          )}
          <div className="product-grid">
            {items.map((p) => (
              <ProductCard key={p.id} product={p} placeholder={placeholder} />
            ))}
          </div>
          {total === 0 && (
            <div className="empty-state">
              <h2>Bu seçimde ürün yok</h2>
              <p>Başka bir model veya kategori dene.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

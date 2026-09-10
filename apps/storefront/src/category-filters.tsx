import Link from "next/link";

type FacetItem = { id: string; name: string; slug: string; count: number };

export function CategoryFilters({
  manufacturers,
  brands,
  inStock,
  manufacturerSlug,
  brandSlug,
  href,
}: {
  manufacturers: FacetItem[];
  brands: FacetItem[];
  inStock: boolean;
  manufacturerSlug?: string;
  brandSlug?: string;
  href: (overrides?: Record<string, string | undefined>) => string;
}) {
  const hasActiveFilters = Boolean(manufacturerSlug) || inStock;

  return (
    <div className="filter-panel">
      <div className="filter-panel-head">
        Filtreler
        {hasActiveFilters && (
          <Link className="filter-clear" href={href({ mfr: undefined, stock: undefined, page: undefined })}>
            Temizle
          </Link>
        )}
      </div>

      <div className="filter-group">
        <div className="filter-group-title">Stok durumu</div>
        <Link
          className={`filter-link${!inStock ? " is-active" : ""}`}
          href={href({ stock: undefined, page: undefined })}
        >
          Tüm stok
        </Link>
        <Link
          className={`filter-link${inStock ? " is-active" : ""}`}
          href={href({ stock: "1", page: undefined })}
        >
          Stokta olanlar
        </Link>
      </div>

      {manufacturers.length > 0 && (
        <div className="filter-group">
          <div className="filter-group-title">Üretici</div>
          <Link
            className={`filter-link${!manufacturerSlug ? " is-active" : ""}`}
            href={href({ mfr: undefined, page: undefined })}
          >
            Tümü
          </Link>
          {manufacturers.map((m) => (
            <Link
              key={m.id}
              className={`filter-link${manufacturerSlug === m.slug ? " is-active" : ""}`}
              href={href({ mfr: m.slug, page: undefined })}
            >
              <span>{m.name}</span>
              <em>{m.count}</em>
            </Link>
          ))}
        </div>
      )}

      {brands.length > 0 && (
        <div className="filter-group">
          <div className="filter-group-title">Araç markası</div>
          <Link
            className={`filter-link${!brandSlug ? " is-active" : ""}`}
            href={href({ brand: undefined, model: undefined, page: undefined })}
          >
            Tümü
          </Link>
          {brands.map((b) => (
            <Link
              key={b.id}
              className={`filter-link${brandSlug === b.slug ? " is-active" : ""}`}
              href={href({ brand: b.slug, model: undefined, page: undefined })}
            >
              <span>{b.name}</span>
              <em>{b.count}</em>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

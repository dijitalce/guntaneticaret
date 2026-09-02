import Link from "next/link";
import { searchProducts } from "@guntan/search";
import { featuredProducts, searchCatalog } from "@guntan/catalog";
import { getTenant } from "../../src/tenant";
import { ProductCard } from "../../src/product-card";
import { redirect } from "next/navigation";

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string; brand?: string }> }) {
  const sp = await searchParams;
  const tenant = await getTenant();
  if (sp.brand && !sp.q) redirect(`/${sp.brand}`);
  const indexed = sp.q ? await searchProducts(tenant.tenant.id, sp.q, 24).catch(() => []) : [];
  const catalogHits = indexed.length === 0 && sp.q ? await searchCatalog(tenant.tenant.id, sp.q, 24) : [];
  const hits = indexed.length > 0
    ? indexed
    : catalogHits.map((h) => ({
        id: h.id,
        title: h.title,
        slug: h.slug,
        sku: h.sku,
        manufacturer: h.manufacturer ?? "",
        price: h.price,
      }));
  const fallback = hits.length === 0 ? await featuredProducts(tenant.tenant.id, 8) : [];

  return (
    <div className="container page-surface">
      <nav className="breadcrumb"><Link href="/">Ana Sayfa</Link> › Arama</nav>
      <h1>{sp.q ? `“${sp.q}” araması` : "Arama"}</h1>
      {hits.length > 0 && (
        <div className="product-grid">
          {hits.map((h) => (
            <ProductCard
              key={h.id}
              product={{
                name: h.title,
                slug: h.slug,
                sku: h.sku,
                price: "price" in h && h.price != null ? String(h.price) : undefined,
                manufacturerName: h.manufacturer,
                stockStatus: "in_stock",
              }}
              placeholder={tenant.placeholderImageUrl}
            />
          ))}
        </div>
      )}
      {sp.q && hits.length === 0 && (
        <>
          <div className="empty-state">
            <h2>Bu arama için sonuç yok</h2>
            <p>Popüler ürünlere göz atabilir veya marka/model seçerek devam edebilirsin.</p>
            <Link className="btn btn-primary" href="/">Marka seç</Link>
          </div>
          {fallback.length > 0 && (
            <div className="product-grid" style={{ marginTop: "1.25rem" }}>
              {fallback.map((p) => (
                <ProductCard key={p.id} product={{ ...p, imageUrl: null }} placeholder={tenant.placeholderImageUrl} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

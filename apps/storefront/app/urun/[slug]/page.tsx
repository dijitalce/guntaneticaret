import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getProductBySlug, productImageUrl, relatedProducts } from "@guntan/catalog";
import { discountPercent } from "@guntan/ecommerce";
import { getTenant } from "../../../src/tenant";
import { ProductCard } from "../../../src/product-card";

export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const tenant = await getTenant();
  const product = await getProductBySlug(tenant.tenant.id, slug);
  if (!product) return {};
  return {
    title: `${product.product.name} | ${tenant.siteName}`,
    description: product.product.description ?? undefined,
    alternates: { canonical: `https://${tenant.tenant.canonicalHost}/urun/${product.product.slug}` },
  };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tenant = await getTenant();
  const data = await getProductBySlug(tenant.tenant.id, slug);
  if (!data) notFound();
  const { product } = data;
  const img = productImageUrl(data.images[0]?.url, tenant.placeholderImageUrl);
  const disc = discountPercent(product.price, product.compareAtPrice);
  const related = await relatedProducts(tenant.tenant.id, product.id, data.fitments[0]?.modelId);
  const fit = data.fitments[0];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    sku: product.sku,
    brand: data.manufacturerName,
    offers: {
      "@type": "Offer",
      priceCurrency: "TRY",
      price: product.price,
      availability: product.stockStatus === "in_stock" ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
    },
  };

  return (
    <div className="container page-surface">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <nav className="breadcrumb">
        <Link href="/">Ana Sayfa</Link>
        {fit && (
          <>
            {" › "}
            <Link href={`/${fit.brandSlug}`}>{fit.brandName}</Link>
            {" › "}
            <Link href={`/${fit.brandSlug}/${fit.modelSlug}`}>{fit.modelName}</Link>
          </>
        )}
        {" › "}{product.name}
      </nav>
      <div className="pdp">
        <div className="pdp-media">
          <img src={img} alt={product.name} />
        </div>
        <div className="pdp-info">
          {data.manufacturerName && <div className="badge">{data.manufacturerName}</div>}
          <h1>{product.name}</h1>
          <dl className="pdp-meta">
            <div><dt>SKU</dt><dd>{product.sku}</dd></div>
            {data.oems.length > 0 && <div><dt>OEM</dt><dd>{data.oems.map((o) => o.raw).join(", ")}</dd></div>}
          </dl>
          <p className="price">
            {product.compareAtPrice && <s>{Number(product.compareAtPrice).toLocaleString("tr-TR")} TL</s>}
            {Number(product.price).toLocaleString("tr-TR")} TL
            <small>KDV dahil</small>
            {disc != null && <span className="badge">%{disc}</span>}
          </p>
          <p className={product.stockStatus === "in_stock" ? "badge badge-stock" : "badge badge-out"}>
            {product.stockStatus === "in_stock" ? "Stokta" : "Stokta yok"}
          </p>
          <form className="pdp-cart" action="/api/cart" method="post">
            <input type="hidden" name="slug" value={product.slug} />
            <label>Adet <input className="input" type="number" name="qty" defaultValue={1} min={1} /></label>
            <div className="pdp-actions">
              <button className="btn btn-primary" type="submit">Sepete ekle</button>
              <Link className="btn btn-secondary" href="/odeme">Hemen al</Link>
              {tenant.whatsapp && (
                <a className="btn btn-ghost" href={`https://wa.me/${tenant.whatsapp}?text=${encodeURIComponent(product.name)}`}>WhatsApp ile sor</a>
              )}
            </div>
          </form>
          <p className="pdp-ship">Teslimat bilgisi sipariş sonrası SMS veya e-posta ile iletilir.</p>
        </div>
      </div>
      <h2 className="pdp-section">Bu ürün hangi araçlarla uyumlu?</h2>
      <table className="fitment-table">
        <thead><tr><th>Marka</th><th>Model</th><th>Kasa</th><th>Yıl</th><th>Motor</th></tr></thead>
        <tbody>
          {data.fitments.map((f, i) => (
            <tr key={i}>
              <td>{f.brandName}</td>
              <td>{f.modelName}</td>
              <td>{f.generationName ?? "—"}</td>
              <td>{f.yearFrom && f.yearTo ? `${f.yearFrom}-${f.yearTo}` : "—"}</td>
              <td>{f.engineName ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <h2 className="pdp-section">Açıklama</h2>
      <p className="pdp-desc">{product.description}</p>
      {related.length > 0 && (
        <>
          <h2 className="pdp-section">Aynı araca uygun diğer parçalar</h2>
          <div className="product-grid">
            {related.map((p) => (
              <ProductCard
                key={p.id}
                product={{ ...p, stockStatus: "in_stock" }}
                placeholder={tenant.placeholderImageUrl}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

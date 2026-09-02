import Link from "next/link";
import { productImageUrl } from "@guntan/catalog";
import { discountPercent } from "@guntan/ecommerce";

function formatPrice(value: string) {
  return `${Number(value).toLocaleString("tr-TR")} TL`;
}

export function ProductCard({
  product,
  placeholder,
}: {
  product: {
    name: string;
    slug: string;
    sku?: string;
    price?: string;
    compareAtPrice?: string | null;
    manufacturerName?: string | null;
    imageUrl?: string | null;
    oem?: string | null;
    stockStatus?: string;
  };
  placeholder: string | null;
}) {
  const img = productImageUrl(product.imageUrl, placeholder);
  const disc = product.price ? discountPercent(product.price, product.compareAtPrice ?? null) : null;
  const inStock = product.stockStatus !== "out_of_stock";
  return (
    <article className="product-card">
      <Link className="product-card-media" href={`/urun/${product.slug}`}>
        {disc != null && <span className="product-card-disc">%{disc}</span>}
        <img src={img} alt={product.name} />
      </Link>
      <div className="product-card-body">
        {product.manufacturerName && <span className="product-card-mfr">{product.manufacturerName}</span>}
        <Link className="product-card-name" href={`/urun/${product.slug}`}>{product.name}</Link>
        {product.oem && <small className="product-card-oem">OEM {product.oem}</small>}
        {product.price != null && product.price !== "" && (
          <div className="product-card-price">
            {product.compareAtPrice && <s>{formatPrice(product.compareAtPrice)}</s>}
            <strong>{formatPrice(product.price)}</strong>
          </div>
        )}
        <div className="product-card-foot">
          <span className={inStock ? "badge badge-stock" : "badge badge-out"}>
            {inStock ? "Stokta" : "Tükendi"}
          </span>
          {inStock && product.slug && (
            <form action="/api/cart" method="post">
              <input type="hidden" name="slug" value={product.slug} />
              <button className="btn btn-primary" type="submit">Sepete ekle</button>
            </form>
          )}
        </div>
      </div>
    </article>
  );
}

export function ProductMiniCard({
  product,
  placeholder,
}: {
  product: { name: string; slug: string; price: string; imageUrl?: string | null };
  placeholder: string | null;
}) {
  const img = productImageUrl(product.imageUrl, placeholder);
  return (
    <Link className="product-mini" href={`/urun/${product.slug}`}>
      <img src={img} alt="" />
      <span>
        <b>{product.name}</b>
        <em>{formatPrice(product.price)}</em>
      </span>
    </Link>
  );
}

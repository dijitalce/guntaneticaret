import Link from "next/link";
import Image from "next/image";
import { oemsByProductIds, productImageUrl } from "@guntan/catalog";
import { discountPercent } from "@guntan/ecommerce";
import { AddToCartForm } from "./add-to-cart-form";
import { ManufacturerLogo } from "./manufacturer-logo";
import { getSalesStatus } from "./sales";
import { formatTl as formatPrice } from "./format";
import { IconBolt, IconCart } from "./icons";

/** Kartlarda gösterilecek ilk OEM numarası; tek sorguda tüm liste için. */
export async function cardOems(ids: string[]): Promise<Map<string, string>> {
  if (ids.length === 0) return new Map();
  try {
    const all = await oemsByProductIds(ids);
    return new Map([...all].flatMap(([id, list]) => (list[0] ? [[id, list[0]] as const] : [])));
  } catch {
    return new Map();
  }
}

function IconCar() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 16.5v-3.4l1.7-4.4A2 2 0 0 1 7.6 7.4h8.8a2 2 0 0 1 1.9 1.3l1.7 4.4v3.4M4 13h16"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <circle cx="7.5" cy="16.5" r="1.8" stroke="currentColor" strokeWidth="2" />
      <circle cx="16.5" cy="16.5" r="1.8" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

export async function ProductCard({
  product,
  placeholder,
  priority = false,
  note,
  oem,
}: {
  product: {
    name: string;
    slug: string;
    sku?: string;
    price?: string;
    compareAtPrice?: string | null;
    manufacturerName?: string | null;
    manufacturerLogo?: string | null;
    imageUrl?: string | null;
    stockStatus?: string;
    fitments?: { href: string; label: string }[];
    fitmentExtra?: number;
  };
  placeholder: string | null;
  priority?: boolean;
  note?: string;
  oem?: string | null;
}) {
  const img = productImageUrl(product.imageUrl, placeholder);
  const disc = product.price ? discountPercent(product.price, product.compareAtPrice ?? null) : null;
  const fitments = product.fitments ?? [];
  const sales = await getSalesStatus();
  const href = `/urun/${product.slug}`;
  const hasPrice = product.price != null && product.price !== "";
  return (
    <article className="product-card">
      <Link className="product-card-media" href={href}>
        <Image
          src={img}
          alt={product.name}
          width={400}
          height={400}
          sizes="(max-width: 640px) 50vw, (max-width: 1100px) 33vw, 25vw"
          priority={priority}
        />
        {disc != null && <span className="product-card-disc">-%{disc}</span>}
        <span className="product-card-ship">
          <IconBolt /> Aynı gün kargo
        </span>
      </Link>
      <div className="product-card-body">
        {product.manufacturerName || oem ? (
          <div className="product-card-meta">
            <ManufacturerLogo name={product.manufacturerName} src={product.manufacturerLogo} className="product-card-mfr" height={18} />
            {oem ? <span className="product-card-oem" title={`OEM ${oem}`}>OEM <b>{oem}</b></span> : null}
          </div>
        ) : null}
        <Link className="product-card-name" href={href} title={product.name}>{product.name}</Link>
        {note ? <p className="product-card-note">{note}</p> : null}
        {fitments.length > 0 && (
          <p className="product-card-fit">
            <IconCar />
            <span className="sr-only">Uyumlu: </span>
            <span className="product-card-fit-list">
              {fitments.map((f, i) => (
                <span key={f.href}>
                  {i > 0 ? ", " : ""}
                  <Link href={f.href}>{f.label}</Link>
                </span>
              ))}
            </span>
            {product.fitmentExtra ? <em>+{product.fitmentExtra}</em> : null}
          </p>
        )}
        <div className="product-card-buy">
          <div className="product-card-price">
            {hasPrice ? (
              <>
                {product.compareAtPrice ? <s>{formatPrice(product.compareAtPrice)}</s> : null}
                <strong>{formatPrice(product.price!)}</strong>
                <small>KDV dahil</small>
              </>
            ) : (
              <small>Fiyat için iletişime geçin</small>
            )}
          </div>
          <span className="product-card-stock">
            <span className="stock-dot" aria-hidden /> Stokta
          </span>
        </div>
        <div className="product-card-foot">
          {!sales.open ? (
            <span className="sales-closed-note">Satışa kapalı</span>
          ) : product.slug && (
            <AddToCartForm
              slug={product.slug}
              track={{ id: product.slug, name: product.name, price: Number(product.price ?? 0), qty: 1, brand: product.manufacturerName ?? null }}
            >
              <button className="btn btn-primary product-card-atc" type="submit">
                <IconCart />
                <span className="label-full">Sepete ekle</span>
                <span className="label-short">Sepete</span>
              </button>
            </AddToCartForm>
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
      <Image src={img} alt="" width={54} height={54} sizes="54px" />
      <span>
        <b>{product.name}</b>
        <em>{formatPrice(product.price)}</em>
      </span>
    </Link>
  );
}

import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { productImageUrl } from "@guntan/catalog";
import { discountPercent } from "@guntan/ecommerce";
import { getTenant } from "../../../src/tenant";
import { JsonLd, breadcrumbJsonLd, pageTitle } from "../../../src/seo";
import {
  fitmentSummary,
  oemList,
  productDisplayTitle,
  productFactsSummary,
  productJsonLd,
  productMetaDescription,
  type ProductSeoInput,
} from "../../../src/product-seo";
import { cachedProductBySlug, cachedRelatedProducts } from "../../../src/cached-catalog";
import { ProductCard } from "../../../src/product-card";
import { AddToCartForm } from "../../../src/add-to-cart-form";
import { CommerceEvent } from "../../../src/visitor-tracker";
import { StockAlertForm } from "../../../src/stock-alert-form";
import { ManufacturerLogo, manufacturerLogoUrl } from "../../../src/manufacturer-logo";
import { QtyStepper } from "../../../src/qty-stepper";
import { StickyAtc } from "../../../src/sticky-atc";
import { IconBox, IconShield, IconTag, IconTruck } from "../../../src/icons";
import { sentenceCaseTr } from "../../../src/format";

export const revalidate = 300;

type ProductData = NonNullable<Awaited<ReturnType<typeof cachedProductBySlug>>>;

function seoInput(tenant: Awaited<ReturnType<typeof getTenant>>, data: ProductData): ProductSeoInput {
  return {
    host: tenant.tenant.canonicalHost,
    siteName: tenant.siteName,
    product: data.product,
    manufacturerName: data.manufacturerName,
    images: data.images,
    oems: data.oems,
    categories: data.categories,
    fitments: data.fitments,
  };
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const tenant = await getTenant();
  const product = await cachedProductBySlug(tenant.tenant.id, slug);
  if (!product) return {};
  const title = pageTitle(tenant, productDisplayTitle(product.product.name, product.manufacturerName));
  const description = productMetaDescription(seoInput(tenant, product));
  const url = `https://${tenant.tenant.canonicalHost}/urun/${product.product.slug}`;
  const image = product.images[0]?.url;
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, type: "website", images: image ? [image] : undefined },
  };
}

export default async function ProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ sepet?: string }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const tenant = await getTenant();
  const data = await cachedProductBySlug(tenant.tenant.id, slug);
  if (!data) notFound();
  const { product } = data;
  const img = productImageUrl(data.images[0]?.url, tenant.placeholderImageUrl);
  const hasRealImage = Boolean(data.images[0]?.url);
  const disc = discountPercent(product.price, product.compareAtPrice);
  const related = await cachedRelatedProducts(tenant.tenant.id, product.id, data.fitments[0]?.modelId);
  const fit = data.fitments[0];
  const inStock = product.stockStatus === "in_stock";
  const available = Math.max(0, (product.stockQty ?? 0) - (product.reservedQty ?? 0));
  const lowStock = inStock && available > 0 && available <= 5;
  const priceLabel = `${Number(product.price).toLocaleString("tr-TR")} TL`;
  const allOems = oemList(data.oems);
  const oemCodes = allOems.slice(0, 4);
  const whatsappHref = tenant.whatsapp
    ? `https://wa.me/${tenant.whatsapp}?text=${encodeURIComponent(product.name)}`
    : null;
  const seo = seoInput(tenant, data);
  const factsSummary = productFactsSummary(seo);
  const host = tenant.tenant.canonicalHost;
  const vehicleCount = fitmentSummary(data.fitments).count;

  return (
    <div className="container page-surface">
      <JsonLd
        data={[
          productJsonLd(seo),
          breadcrumbJsonLd(host, [
            { name: "Ana Sayfa", path: "/" },
            ...(fit
              ? [
                  { name: fit.brandName, path: `/${fit.brandSlug}` },
                  { name: fit.modelName, path: `/${fit.brandSlug}/${fit.modelSlug}` },
                ]
              : []),
            { name: product.name, path: `/urun/${product.slug}` },
          ]),
        ]}
      />
      <CommerceEvent
        event="view_item"
        items={[{ id: product.id, name: product.name, price: Number(product.price), qty: 1, brand: data.manufacturerName }]}
      />
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
          <Image
            src={img}
            alt={product.name}
            width={800}
            height={800}
            sizes="(max-width: 768px) 100vw, 50vw"
            priority={hasRealImage}
            loading={hasRealImage ? undefined : "eager"}
          />
        </div>
        <div className="pdp-info">
          {data.manufacturerName &&
            (manufacturerLogoUrl(data.manufacturerName, data.manufacturerLogo) ? (
              <ManufacturerLogo name={data.manufacturerName} src={data.manufacturerLogo} className="pdp-mfr" height={36} />
            ) : (
              <div className="badge">{data.manufacturerName}</div>
            ))}
          <h1>{product.name}</h1>
          <dl className="pdp-codes">
            <div>
              <dt>Ürün kodu</dt>
              <dd>{product.sku}</dd>
            </div>
            {oemCodes.length > 0 && (
              <div>
                <dt>OEM</dt>
                <dd>{oemCodes.join(", ")}</dd>
              </div>
            )}
            {product.barcode && (
              <div>
                <dt>Barkod</dt>
                <dd>{product.barcode}</dd>
              </div>
            )}
          </dl>
          {fit && (
            <a className="pdp-fit" href="#uyumluluk">
              <span className="pdp-fit-dot" aria-hidden />
              Uyumlu: {fit.brandName} {fit.modelName}
              {fit.yearFrom && fit.yearTo ? ` (${fit.yearFrom}-${fit.yearTo})` : ""}
              {data.fitments.length > 1 ? ` ve ${data.fitments.length - 1} araç daha` : ""}
            </a>
          )}
          <div className="pdp-price-row">
            <p className="price">
              {product.compareAtPrice && <s>{Number(product.compareAtPrice).toLocaleString("tr-TR")} TL</s>}
              {priceLabel}
              <small>KDV dahil</small>
              {disc != null && <span className="badge">%{disc}</span>}
            </p>
            <p className={inStock ? "badge badge-stock" : "badge badge-out"}>
              {!inStock ? "Stokta yok" : lowStock ? `Son ${available} adet` : "Stokta"}
            </p>
          </div>
          {sp.sepet === "ok" && (
            <p className="account-alert" role="status">
              Ürün sepete eklendi. <Link href="/sepet">Sepete git</Link>
            </p>
          )}
          {sp.sepet === "hata" && (
            <p className="account-alert is-bad" role="alert">
              Sepete eklenemedi. Stok durumunu kontrol edin.
            </p>
          )}
          {inStock ? (
            <AddToCartForm
              id="pdp-cart-form"
              className="pdp-cart"
              slug={product.slug}
              track={{ id: product.id, name: product.name, price: Number(product.price), qty: 1, brand: data.manufacturerName }}
            >
              <div className="pdp-buy" id="pdp-buy">
                <QtyStepper max={available || undefined} />
                <button className="btn btn-primary" type="submit">
                  Sepete ekle
                </button>
              </div>
              <div className="pdp-actions">
                <button className="btn btn-secondary" type="submit" name="intent" value="buy">
                  Hemen al
                </button>
                {whatsappHref && (
                  <a className="btn btn-whatsapp" href={whatsappHref} target="_blank" rel="noreferrer">
                    WhatsApp ile sor
                  </a>
                )}
              </div>
            </AddToCartForm>
          ) : (
            <div className="pdp-cart">
              <p className="muted">Bu ürün şu an stokta yok. Tedarik durumu için bize ulaşın.</p>
              <StockAlertForm productId={product.id} />
              {whatsappHref && (
                <div className="pdp-actions">
                  <a className="btn btn-primary" href={whatsappHref}>
                    WhatsApp ile stok sor
                  </a>
                </div>
              )}
            </div>
          )}
          <ul className="pdp-trust">
            <li><IconTag /> KDV dahil fiyat, ek ücret yok</li>
            <li><IconTruck /> Kargo takip bilgisi SMS ve e-posta ile</li>
            <li><IconBox /> Teslimattan itibaren 14 gün iade hakkı</li>
            <li><IconShield /> Güvenli ödeme</li>
          </ul>
        </div>
      </div>
      <h2 className="pdp-section" id="uyumluluk">Bu ürün hangi araçlarla uyumlu?</h2>
      {data.fitments.length > 0 ? (
        <div className="table-scroll">
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
        </div>
      ) : (
        <p className="pdp-desc">
          Uyumluluk bilgisi henüz girilmedi. Aracınıza uyup uymadığını OEM numarasıyla kontrol edebilir
          {whatsappHref ? <> veya <a href={whatsappHref} target="_blank" rel="noreferrer">WhatsApp üzerinden sorabilirsiniz</a></> : null}.
        </p>
      )}
      <h2 className="pdp-section">Ürün bilgileri</h2>
      <div className="table-scroll">
        <table className="fitment-table pdp-specs">
          <tbody>
            {data.manufacturerName && (
              <tr><th scope="row">Marka</th><td>{data.manufacturerName}</td></tr>
            )}
            <tr><th scope="row">Ürün kodu</th><td>{product.sku}</td></tr>
            {allOems.length > 0 && (
              <tr><th scope="row">OEM numarası</th><td>{allOems.join(", ")}</td></tr>
            )}
            {product.barcode && <tr><th scope="row">Barkod</th><td>{product.barcode}</td></tr>}
            {data.categories.length > 0 && (
              <tr>
                <th scope="row">Kategori</th>
                <td>
                  {data.categories.map((c, i) => (
                    <span key={c.id}>
                      {i > 0 && ", "}
                      <Link href={`/kategori/${c.slug}`}>{sentenceCaseTr(c.name)}</Link>
                    </span>
                  ))}
                </td>
              </tr>
            )}
            {vehicleCount > 0 && (
              <tr><th scope="row">Uyumlu araç</th><td>{vehicleCount} model</td></tr>
            )}
            <tr><th scope="row">Durum</th><td>Sıfır</td></tr>
          </tbody>
        </table>
      </div>
      {(product.description || factsSummary) && (
        <>
          <h2 className="pdp-section">Açıklama</h2>
          {product.description && <p className="pdp-desc">{product.description}</p>}
          {factsSummary && <p className="pdp-desc">{factsSummary}</p>}
        </>
      )}
      {related.length > 0 && (
        <>
          <h2 className="pdp-section">Aynı araca uygun diğer parçalar</h2>
          <div className="product-grid">
            {related.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                placeholder={tenant.placeholderImageUrl}
              />
            ))}
          </div>
        </>
      )}
      {inStock && <StickyAtc targetId="pdp-buy" formId="pdp-cart-form" price={priceLabel} />}
    </div>
  );
}

import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { productImageUrl } from "@guntan/catalog";
import { discountPercent, garantiConfig, installmentOptions } from "@guntan/ecommerce";
import { getTenant } from "../../../src/tenant";
import { JsonLd, breadcrumbJsonLd, pageTitle } from "../../../src/seo";
import {
  fitmentSummary,
  productDisplayTitle,
  productJsonLd,
  productMetaDescription,
  productSeoParagraphs,
  type ProductSeoInput,
} from "../../../src/product-seo";
import { cachedAlternatives, cachedProductBySlug, cachedRelatedProducts } from "../../../src/cached-catalog";
import { ProductCard, cardOems } from "../../../src/product-card";
import { AddToCartForm } from "../../../src/add-to-cart-form";
import { CommerceEvent } from "../../../src/visitor-tracker";
import { ManufacturerLogo, manufacturerLogoUrl } from "../../../src/manufacturer-logo";
import { QtyStepper } from "../../../src/qty-stepper";
import { StickyAtc } from "../../../src/sticky-atc";
import { IconBolt, IconCard, IconCheckBadge, IconLock, IconSwap } from "../../../src/icons";
import { InstallmentTable, MissingPartCta, OemList, PaymentMarks, StockLine } from "../../../src/assurance";
import { ProductTabs, type ProductTab } from "../../../src/product-tabs";
import { ReturnPolicyNotice } from "../../../src/return-notice";
import { sentenceCaseTr } from "../../../src/format";
import { getSalesStatus } from "../../../src/sales";
import { listProductReviews, productReviewSummary, reviewEligibility, type ReviewSummary } from "@guntan/db";
import { getCurrentCustomer } from "../../../src/customer";
import { ProductReviews, Stars, type ReviewViewer } from "../../../src/product-reviews";

const EMPTY_SUMMARY: ReviewSummary = { count: 0, average: 0, distribution: [0, 0, 0, 0, 0] };

async function loadReviews(productId: string) {
  const [summary, reviews, user] = await Promise.all([
    productReviewSummary(productId).catch(() => EMPTY_SUMMARY),
    listProductReviews(productId).catch(() => []),
    getCurrentCustomer().catch(() => null),
  ]);
  let viewer: ReviewViewer = { kind: "guest" };
  if (user) {
    const e = await reviewEligibility(user.id, productId).catch(() => null);
    viewer = e?.orderId ? { kind: "eligible", existing: e.existing } : { kind: "ineligible" };
  }
  return { summary, reviews, viewer };
}

export const revalidate = 300;

type ProductData = NonNullable<Awaited<ReturnType<typeof cachedProductBySlug>>>;

function uniqueOems(data: ProductData) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const o of data.oems) {
    if (seen.has(o.normalized)) continue;
    seen.add(o.normalized);
    out.push(o.raw);
  }
  return out;
}

function seoInput(tenant: Awaited<ReturnType<typeof getTenant>>, data: ProductData): ProductSeoInput {
  return {
    host: tenant.tenant.canonicalHost,
    siteName: tenant.siteName,
    product: data.product,
    manufacturerName: data.manufacturerName,
    images: data.images,
    categories: data.categories,
    fitments: data.fitments,
    oems: uniqueOems(data),
  };
}

function money(n: number) {
  return `${n.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TL`;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const tenant = await getTenant();
  const product = await cachedProductBySlug(tenant.tenant.id, slug);
  if (!product) return {};
  const display = productDisplayTitle(product.product.name, product.manufacturerName);
  const fit = product.fitments.find((f) => !/^di[gğ]er/i.test(f.modelName));
  const vehicle = fit ? `${fit.brandName} ${fit.modelName}` : null;
  const title = pageTitle(
    tenant,
    vehicle && !display.toLocaleLowerCase("tr-TR").includes(fit!.modelName.toLocaleLowerCase("tr-TR"))
      ? `${display} – ${vehicle}`
      : display,
  );
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
  searchParams: Promise<{ sepet?: string; degerlendirme?: string }>;
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
  const [relatedAll, alternatives, reviewData] = await Promise.all([
    cachedRelatedProducts(tenant.tenant.id, product.id, data.fitments[0]?.modelId, 12),
    cachedAlternatives(tenant.tenant.id, product.id),
    loadReviews(product.id),
  ]);
  const altIds = new Set(alternatives.map((a) => a.id));
  const related = relatedAll.filter((p) => !altIds.has(p.id)).slice(0, 8);
  const relatedOems = await cardOems(related.map((p) => p.id));
  const fit = data.fitments[0];
  const priceLabel = money(Number(product.price));
  const whatsappHref = tenant.whatsapp
    ? `https://wa.me/${tenant.whatsapp}?text=${encodeURIComponent(product.name)}`
    : null;
  const sales = await getSalesStatus();
  const garanti = await garantiConfig();
  const installments = garanti ? installmentOptions(Number(product.price), garanti) : [];
  const maxInstallments = installments.reduce((m, o) => Math.max(m, o.count), 1);
  const minMonthly = installments.reduce((m, o) => Math.min(m, o.monthly), Number(product.price));
  const seo = { ...seoInput(tenant, data), available: sales.open, reviews: { summary: reviewData.summary, items: reviewData.reviews } };
  const oems = seo.oems ?? [];
  const seoParagraphs = productSeoParagraphs({ ...seo, cardPayments: Boolean(garanti) });
  const host = tenant.tenant.canonicalHost;
  const vehicleCount = fitmentSummary(data.fitments).count;
  const cheapestAlt = alternatives.reduce<number | null>(
    (min, a) => (min == null || Number(a.price) < min ? Number(a.price) : min),
    null,
  );
  const vehicleName = fit ? `${fit.brandName} ${fit.modelName}` : null;
  const askHref = whatsappHref ? (
    <a href={whatsappHref} target="_blank" rel="noreferrer">
      WhatsApp üzerinden
    </a>
  ) : null;

  const tabs: ProductTab[] = [
    {
      id: "aciklama",
      label: "Ürün açıklaması",
      content: (
        <div className="pdp-tab-split">
          <div>
            <h2 className="pdp-tab-title">Ürün bilgileri</h2>
            <table className="fitment-table pdp-specs">
              <tbody>
                {data.manufacturerName && (
                  <tr><th scope="row">Marka</th><td>{data.manufacturerName}</td></tr>
                )}
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
                {oems.length > 0 && (
                  <tr><th scope="row">OEM no</th><td><a href="#oem">{oems[0]}{oems.length > 1 ? ` +${oems.length - 1}` : ""}</a></td></tr>
                )}
                {vehicleCount > 0 && (
                  <tr><th scope="row">Uyumlu araç</th><td><a href="#uyumluluk">{vehicleCount} model</a></td></tr>
                )}
                <tr><th scope="row">Durum</th><td>Sıfır, orijinal ambalajında</td></tr>
                <tr><th scope="row">Stok durumu</th><td className="is-ok">Stokta</td></tr>
                <tr><th scope="row">Kargo</th><td>Aynı gün kargo · Aras Kargo</td></tr>
                <tr><th scope="row">İade</th><td>Teslimattan itibaren 14 gün</td></tr>
              </tbody>
            </table>
          </div>
          <div className="pdp-desc-body">
            <h2 className="pdp-tab-title">Ürün açıklaması</h2>
            {product.description && <p className="pdp-desc">{product.description}</p>}
            {seoParagraphs.map((p, i) => (
              <p key={i} className="pdp-desc">{p}</p>
            ))}
          </div>
        </div>
      ),
    },
    {
      id: "uyumluluk",
      label: "Uyumlu araçlar",
      count: vehicleCount || undefined,
      content: (
        <>
          <h2 className="pdp-tab-title">
            {product.name} uyumlu araçlar
          </h2>
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
            <p className="pdp-desc">Uyumluluk bilgisi henüz girilmedi.</p>
          )}
          <p className="pdp-tab-note">
            Emin değil misiniz? Aracınıza uyup uymadığını{askHref ? <> {askHref} veya</> : null} şasi numaranızla bize
            sorun; siparişten önce uyumu teyit edelim.
          </p>
        </>
      ),
    },
  ];
  if (oems.length > 0) {
    tabs.push({
      id: "oem",
      label: "OEM numaraları",
      count: oems.length,
      content: (
        <>
          <h2 className="pdp-tab-title">OEM / orijinal parça numaraları</h2>
          <ul className="pdp-oem-grid">
            {oems.map((o) => (
              <li key={o}>
                <Link href={`/arama?q=${encodeURIComponent(o)}`} title={`${o} numaralı tüm parçalar`}>
                  <code>{o}</code>
                </Link>
              </li>
            ))}
          </ul>
          <p className="pdp-tab-note">
            Eski parçanızın üzerindeki veya servis kaydındaki numarayı bu kodlarla karşılaştırın. Bir numaraya tıklayarak
            aynı OEM numaralı diğer marka parçaları görebilirsiniz.
          </p>
        </>
      ),
    });
  }
  tabs.push({
    id: "taksit",
    label: "Taksit seçenekleri",
    content: (
      <>
        <h2 className="pdp-tab-title">Taksit seçenekleri</h2>
        {garanti ? (
          <InstallmentTable options={installments} minAmount={garanti.installmentMinAmount || undefined} />
        ) : (
          <p className="installment-note muted">Havale / EFT ile güvenli ödeme yapabilirsiniz.</p>
        )}
      </>
    ),
  });

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
          {reviewData.summary.count > 0 ? (
            <a className="pdp-rating" href="#degerlendirmeler">
              <Stars value={reviewData.summary.average} size="sm" />
              <span>{reviewData.summary.average.toLocaleString("tr-TR", { minimumFractionDigits: 1 })} · {reviewData.summary.count} değerlendirme</span>
            </a>
          ) : null}
          <OemList oems={oems} max={4} label="OEM no" />
          {fit && (
            <a className="pdp-fit" href="#uyumluluk">
              <span className="pdp-fit-dot" aria-hidden />
              Uyumlu: {fit.brandName} {fit.modelName}
              {fit.yearFrom && fit.yearTo ? ` (${fit.yearFrom}-${fit.yearTo})` : ""}
              {data.fitments.length > 1 ? ` ve ${data.fitments.length - 1} araç daha` : ""}
            </a>
          )}
          <StockLine />
          <div className="pdp-price-row">
            <p className="price">
              {product.compareAtPrice && <s>{money(Number(product.compareAtPrice))}</s>}
              {priceLabel}
              <small>KDV dahil</small>
              {disc != null && <span className="badge">%{disc}</span>}
            </p>
            {maxInstallments > 1 ? (
              <a className="pdp-installment-hint" href="#taksit">
                <IconCard />
                <span>
                  Aylık <b>{money(minMonthly)}</b>&apos;den başlayan, {maxInstallments} aya varan taksit
                </span>
              </a>
            ) : null}
          </div>
          {sp.sepet === "ok" && (
            <p className="account-alert" role="status">
              Ürün sepete eklendi. <Link href="/sepet">Sepete git</Link>
            </p>
          )}
          {sp.sepet === "hata" && (
            <p className="account-alert is-bad" role="alert">
              Sepete eklenemedi. Lütfen tekrar deneyin.
            </p>
          )}
          {sales.open ? (
            <AddToCartForm
              id="pdp-cart-form"
              className="pdp-cart"
              slug={product.slug}
              track={{ id: product.id, name: product.name, price: Number(product.price), qty: 1, brand: data.manufacturerName }}
            >
              <div className="pdp-buy" id="pdp-buy">
                <QtyStepper />
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
                    WhatsApp ile sorun
                  </a>
                )}
              </div>
            </AddToCartForm>
          ) : (
            <div className="pdp-closed">
              <p className="account-alert is-bad" role="status">
                {sales.message}
              </p>
              {whatsappHref && (
                <div className="pdp-actions">
                  <a className="btn btn-whatsapp" href={whatsappHref} target="_blank" rel="noreferrer">
                    WhatsApp ile sorun
                  </a>
                </div>
              )}
            </div>
          )}
          {alternatives.length > 0 && (
            <a className="alt-brands-btn" href="#alternatifler">
              <IconSwap />
              <span>
                <strong>Alternatif markalar ({alternatives.length})</strong>
                <small>
                  Aynı OEM numaralı farklı marka seçenekleri
                  {cheapestAlt != null ? ` · ${money(cheapestAlt)}'den başlayan fiyatlarla` : ""}
                </small>
              </span>
            </a>
          )}
          <ul className="pdp-perks">
            <li>
              <IconBolt />
              <span>
                <b>Aynı gün kargo</b> · stoktaki ürünler aynı gün Aras Kargo&apos;ya verilir
              </span>
            </li>
            <li>
              <ReturnPolicyNotice whatsapp={tenant.whatsapp} phone={tenant.phone} />
            </li>
            <li>
              <a href="#uyumluluk">
                <IconCheckBadge />
                <span>
                  <u>Bu parça hangi araçlara uyumlu?</u> · şasi numaranızla teyit ediyoruz
                </span>
              </a>
            </li>
            <li>
              <IconLock />
              <span>
                {garanti ? "3D Secure ve 256-bit SSL ile güvenli ödeme" : "256-bit SSL ile korunan alışveriş"} · faturalı satış
              </span>
            </li>
          </ul>
          <PaymentMarks card={Boolean(garanti)} />
        </div>
      </div>

      <ProductTabs tabs={tabs} />

      {alternatives.length > 0 && (
        <section className="pdp-block" id="alternatifler" aria-labelledby="alternatifler-baslik">
          <div className="pdp-block-head">
            <h2 className="pdp-section" id="alternatifler-baslik">Alternatif markalar</h2>
            <p className="muted">
              Bu ürünle aynı OEM numarasına sahip, aracınızda yerine kullanılabilecek farklı marka parçalar. Fiyata göre
              sıralıdır.
            </p>
          </div>
          <div className="product-grid">
            {alternatives.map((p) => (
              <ProductCard key={p.id} product={p} placeholder={tenant.placeholderImageUrl} note={`OEM ${p.sharedOem}`} />
            ))}
          </div>
        </section>
      )}

      <MissingPartCta whatsapp={tenant.whatsapp} phone={tenant.phone} context={vehicleName ?? undefined} />

      <ProductReviews
        productId={product.id}
        summary={reviewData.summary}
        reviews={reviewData.reviews}
        viewer={reviewData.viewer}
        result={sp.degerlendirme}
      />
      {related.length > 0 && (
        <section className="pdp-block" aria-labelledby="ayni-arac-baslik">
          <div className="pdp-block-head">
            <h2 className="pdp-section" id="ayni-arac-baslik">
              Aynı araç için diğer ürünler{vehicleName ? ` – ${vehicleName}` : ""}
            </h2>
            {fit ? (
              <Link className="pdp-block-link" href={`/${fit.brandSlug}/${fit.modelSlug}`}>
                Tüm {vehicleName} parçaları
              </Link>
            ) : null}
          </div>
          <div className="product-grid">
            {related.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                placeholder={tenant.placeholderImageUrl}
                oem={relatedOems.get(p.id)}
              />
            ))}
          </div>
        </section>
      )}
      {sales.open ? <StickyAtc targetId="pdp-buy" formId="pdp-cart-form" price={priceLabel} /> : null}
    </div>
  );
}

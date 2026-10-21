import { cookies } from "next/headers";
import Image from "next/image";
import Link from "next/link";
import { COOKIE_CART } from "@guntan/config";
import {
  alternativesByProductIds,
  cartProductExtras,
  oemsByProductIds,
  productImageUrl,
  type AlternativeProduct,
} from "@guntan/catalog";
import { getShippingSettings } from "@guntan/db";
import { garantiConfig, getCartSummary, getOrCreateCart, installmentOptions } from "@guntan/ecommerce";
import type { TenantPublicConfig } from "@guntan/types";
import { getTenant } from "../../src/tenant";
import { getCurrentCustomer } from "../../src/customer";
import { getSalesStatus } from "../../src/sales";
import { VAT_RATE, vatBreakdown } from "../../src/vat";
import { cachedRelatedProducts } from "../../src/cached-catalog";
import { ProductCard, cardOems } from "../../src/product-card";
import { ManufacturerLogo } from "../../src/manufacturer-logo";
import { IconLock, IconSwap } from "../../src/icons";
import {
  AssuranceGrid,
  MissingPartCta,
  OemList,
  PaymentMarks,
  ReturnTerms,
  StockLine,
  assuranceItems,
} from "../../src/assurance";

function money(n: number) {
  return `${n.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TL`;
}

function CheckoutSteps() {
  return (
    <ol className="checkout-steps" aria-label="Sipariş adımları">
      <li className="is-current">1. Sepet</li>
      <li>2. Ödeme</li>
      <li>3. Onay</li>
    </ol>
  );
}

function SellerInfo({ tenant }: { tenant: TenantPublicConfig }) {
  return (
    <div className="seller-info">
      <strong>Satıcı: {tenant.siteName}</strong>
      {tenant.address ? <span>{tenant.address}</span> : null}
      {tenant.phone ? <a href={`tel:${tenant.phone.replace(/[^\d+]/g, "")}`}>{tenant.phone}</a> : null}
      {tenant.email ? <a href={`mailto:${tenant.email}`}>{tenant.email}</a> : null}
    </div>
  );
}

function EmptyCart({ tenant }: { tenant: TenantPublicConfig }) {
  return (
    <div className="container page-surface">
      <nav className="breadcrumb">
        <Link href="/">Ana Sayfa</Link> › Sepet
      </nav>
      <div className="empty-state">
        <h1>Sepetiniz boş</h1>
        <p>Marka ve model seçerek aracınıza uygun parçayı ekleyebilirsiniz.</p>
        <Link className="btn btn-primary" href="/">
          Alışverişe başla
        </Link>
      </div>
      <AssuranceGrid variant="strip" items={assuranceItems()} />
      <MissingPartCta whatsapp={tenant.whatsapp} phone={tenant.phone} />
    </div>
  );
}

export default async function CartPage({
  searchParams,
}: {
  searchParams: Promise<{ hata?: string; giris?: string; uyelik?: string; degisim?: string }>;
}) {
  const sp = await searchParams;
  const tenant = await getTenant();
  const sales = await getSalesStatus();
  const user = await getCurrentCustomer();
  const jar = await cookies();
  const sessionId = jar.get(COOKIE_CART)?.value;
  if (!sessionId && !user) return <EmptyCart tenant={tenant} />;

  await getOrCreateCart(tenant.tenant.id, user?.id, sessionId);
  const view = await getCartSummary(tenant.tenant.id, sessionId, user?.id);
  if (view.items.length === 0) return <EmptyCart tenant={tenant} />;

  const tenantId = tenant.tenant.id;
  const ids = view.items.map((i) => i.productId);
  const noExtras: Awaited<ReturnType<typeof cartProductExtras>> = { byProduct: new Map(), firstModelId: undefined };
  const [extras, oemsBy, altsBy, shipping] = await Promise.all([
    cartProductExtras(ids).catch(() => noExtras),
    oemsByProductIds(ids).catch(() => new Map<string, string[]>()),
    alternativesByProductIds(tenantId, ids, 4).catch(() => new Map<string, AlternativeProduct[]>()),
    getShippingSettings().catch(() => null),
  ]);
  const shown = new Set([...ids, ...[...altsBy.values()].flat().map((a) => a.id)]);
  const related = extras.firstModelId
    ? (await cachedRelatedProducts(tenantId, ids[0]!, extras.firstModelId, 12).catch(() => []))
        .filter((p) => !shown.has(p.id))
        .slice(0, 4)
    : [];
  const relatedOems = await cardOems(related.map((p) => p.id));

  const itemCount = view.qty;
  const placeholder = tenant.placeholderImageUrl ?? "/placeholder-product.jpg";
  const grand = view.subtotal + view.shippingAmount;
  const garanti = await garantiConfig();
  const installments = garanti ? installmentOptions(grand, garanti) : [];
  const best = installments.reduce<(typeof installments)[number] | null>(
    (m, o) => (o.count > (m?.count ?? 1) ? o : m),
    null,
  );
  const freeThreshold = shipping?.freeShippingThreshold ?? 0;
  const freeRemaining = freeThreshold > 0 ? Math.max(0, freeThreshold - view.subtotal) : 0;
  const firstVehicle = view.items
    .map((i) => extras.byProduct.get(i.productId)?.fitments[0]?.label)
    .find(Boolean);

  return (
    <div className="container page-surface cart-page">
      <nav className="breadcrumb">
        <Link href="/">Ana Sayfa</Link> › Sepet
      </nav>
      <CheckoutSteps />
      <div className="cart-head">
        <div>
          <h1>Sepetim</h1>
          <p className="muted">
            {itemCount} ürün · KDV dahil fiyat
            {user ? ` · ${user.firstName}` : null}
          </p>
        </div>
        <span className="secure-chip">
          <IconLock /> Güvenli alışveriş
        </span>
      </div>

      {(sp.giris === "1" || sp.uyelik === "1") && (
        <p className="account-alert is-ok" role="status">
          {sp.uyelik === "1"
            ? "Hesabınız oluşturuldu. Sepetiniz hesabınıza bağlandı."
            : "Giriş yaptınız. Sepetiniz hesabınıza bağlandı."}
        </p>
      )}

      {sp.degisim === "1" && (
        <p className="account-alert is-ok" role="status">
          Ürün alternatif markayla değiştirildi.
        </p>
      )}

      {!sales.open && (
        <p className="account-alert is-bad" role="alert">
          {sales.message} Sepetinizdeki ürünler saklanır; satışlar yeniden açıldığında siparişinizi tamamlayabilirsiniz.
        </p>
      )}

      {sp.hata === "stok" && (
        <p className="account-alert is-bad" role="alert">
          İstediğiniz adet stokta yok. Adedi düşürüp tekrar deneyin.
        </p>
      )}

      {sp.hata === "degisim" && (
        <p className="account-alert is-bad" role="alert">
          Ürün değiştirilemedi. Lütfen tekrar deneyin.
        </p>
      )}

      <AssuranceGrid variant="strip" items={assuranceItems({ card: Boolean(garanti), maxInstallments: best?.count })} />

      <div className="cart-layout">
        <div className="cart-lines" aria-label="Sepet ürünleri">
          {freeThreshold > 0 && (
            <div className={`free-ship${freeRemaining === 0 ? " is-done" : ""}`}>
              <p>
                {freeRemaining === 0
                  ? "Kargo bedava! Siparişin ücretsiz gönderilecek."
                  : `${money(freeRemaining)} daha ekle, kargo bedava olsun.`}
              </p>
              <span className="free-ship-bar" aria-hidden>
                <span style={{ width: `${Math.min(100, (view.subtotal / freeThreshold) * 100)}%` }} />
              </span>
            </div>
          )}

          {view.items.map((i) => {
            const unit = Number(i.price);
            const line = unit * i.qty;
            const img = i.imageUrl || placeholder;
            const extra = extras.byProduct.get(i.productId);
            const oems = oemsBy.get(i.productId) ?? [];
            const alts = altsBy.get(i.productId) ?? [];
            const cheapest = alts[0] ? Number(alts[0].price) : null;
            return (
              <article key={i.id} className="cart-row">
                <Link className="cart-thumb" href={`/urun/${i.slug}`}>
                  <Image src={img} alt="" width={96} height={96} />
                </Link>
                <div className="cart-row-main">
                  {extra?.manufacturerName ? (
                    <ManufacturerLogo
                      name={extra.manufacturerName}
                      src={extra.manufacturerLogo}
                      className="cart-row-mfr"
                      height={18}
                    />
                  ) : null}
                  <Link className="cart-row-name" href={`/urun/${i.slug}`}>
                    {i.name}
                  </Link>
                  <OemList oems={oems} max={3} />
                  {extra && extra.fitments.length > 0 ? (
                    <p className="cart-row-fit">
                      <span>Uyumlu</span>
                      {extra.fitments.map((f) => f.label).join(", ")}
                      {extra.fitmentExtra ? ` +${extra.fitmentExtra}` : ""}
                    </p>
                  ) : null}
                  <StockLine compact />
                  <div className="cart-row-actions">
                    <div className="qty-stepper" role="group" aria-label="Adet">
                      <form action="/api/cart" method="post">
                        <input type="hidden" name="action" value="update" />
                        <input type="hidden" name="itemId" value={i.id} />
                        <input type="hidden" name="qty" value={Math.max(0, i.qty - 1)} />
                        <button type="submit" aria-label="Adeti azalt">
                          −
                        </button>
                      </form>
                      <span aria-live="polite">{i.qty}</span>
                      <form action="/api/cart" method="post">
                        <input type="hidden" name="action" value="update" />
                        <input type="hidden" name="itemId" value={i.id} />
                        <input type="hidden" name="qty" value={i.qty + 1} />
                        <button type="submit" aria-label="Adeti artır">
                          +
                        </button>
                      </form>
                    </div>
                    <form action="/api/cart" method="post">
                      <input type="hidden" name="action" value="remove" />
                      <input type="hidden" name="itemId" value={i.id} />
                      <button className="cart-remove" type="submit">
                        Kaldır
                      </button>
                    </form>
                  </div>
                  {alts.length > 0 && (
                    <details className="cart-alt">
                      <summary className="alt-brands-btn is-small">
                        <IconSwap />
                        <span>
                          <strong>Alternatif markalar ({alts.length})</strong>
                          {cheapest != null ? <small>{money(cheapest)}&apos;den başlayan fiyatlarla</small> : null}
                        </span>
                      </summary>
                      <ul className="cart-alt-list">
                        {alts.map((a) => {
                          const diff = unit - Number(a.price);
                          return (
                            <li key={a.id}>
                              <Link className="cart-alt-thumb" href={`/urun/${a.slug}`}>
                                <Image src={productImageUrl(a.imageUrl, placeholder)} alt="" width={56} height={56} />
                              </Link>
                              <div className="cart-alt-main">
                                {a.manufacturerName ? <b>{a.manufacturerName}</b> : null}
                                <Link href={`/urun/${a.slug}`}>{a.name}</Link>
                                <span className="cart-alt-price">
                                  {money(Number(a.price))}
                                  {diff > 0.009 ? <em>{money(diff)} daha uygun</em> : null}
                                </span>
                              </div>
                              {sales.open ? (
                                <form action="/api/cart" method="post">
                                  <input type="hidden" name="action" value="replace" />
                                  <input type="hidden" name="itemId" value={i.id} />
                                  <input type="hidden" name="slug" value={a.slug} />
                                  <button className="btn btn-secondary" type="submit">
                                    Bununla değiştir
                                  </button>
                                </form>
                              ) : null}
                            </li>
                          );
                        })}
                      </ul>
                      <Link className="cart-alt-all" href={`/urun/${i.slug}#alternatifler`}>
                        Tüm alternatifleri gör
                      </Link>
                    </details>
                  )}
                </div>
                <div className="cart-row-total">
                  <strong>{money(line)}</strong>
                  {i.qty > 1 ? <small>{money(unit)} / adet</small> : null}
                </div>
              </article>
            );
          })}

          <MissingPartCta whatsapp={tenant.whatsapp} phone={tenant.phone} context={firstVehicle} compact />
        </div>

        <aside className="cart-summary">
          <h2>Sipariş özeti</h2>
          <dl className="cart-summary-rows">
            <div>
              <dt>Ürün ({itemCount})</dt>
              <dd>{money(view.subtotal)}</dd>
            </div>
            <div>
              <dt>Kargo (Aras Kargo)</dt>
              <dd>{view.shippingAmount === 0 ? "Ücretsiz" : money(view.shippingAmount)}</dd>
            </div>
            <div className="is-vat">
              <dt>KDV hariç tutar</dt>
              <dd>{money(vatBreakdown(grand).net)}</dd>
            </div>
            <div className="is-vat">
              <dt>KDV (%{VAT_RATE})</dt>
              <dd>{money(vatBreakdown(grand).vat)}</dd>
            </div>
            <div className="is-total">
              <dt>Ödenecek</dt>
              <dd>{money(grand)}</dd>
            </div>
          </dl>
          {best ? (
            <p className="cart-installment">
              veya <strong>{best.count} × {money(best.monthly)}</strong> taksitle
            </p>
          ) : null}
          {sales.open ? (
            <Link className="btn btn-primary cart-checkout-btn" href="/odeme">
              <IconLock /> Güvenli ödemeye geç
            </Link>
          ) : (
            <span className="sales-closed-note">{sales.message}</span>
          )}
          <p className="cart-summary-note muted">
            {garanti
              ? "Kredi / banka kartı (3D Secure) veya havale / EFT. Kart bilgileriniz bizde saklanmaz; ödeme Garanti BBVA güvenli ödeme sayfasında yapılır."
              : "Havale / EFT ile ödeme. Sipariş sonrası IBAN bilgisi gösterilir."}
          </p>
          <PaymentMarks card={Boolean(garanti)} />
          <Link className="cart-continue" href="/">
            Alışverişe devam et
          </Link>
          <AssuranceGrid variant="list" items={assuranceItems({ card: Boolean(garanti), maxInstallments: best?.count })} />
          <SellerInfo tenant={tenant} />
        </aside>
      </div>

      <div className="pdp-info-cols cart-info-cols">
        <section className="pdp-panel" aria-labelledby="sepet-iade">
          <h2 id="sepet-iade">İade şartları</h2>
          <ReturnTerms />
        </section>
        <section className="pdp-panel" aria-labelledby="sepet-kargo">
          <h2 id="sepet-kargo">Kargo ve teslimat</h2>
          <div className="return-terms">
            <ul>
              <li>Stoktaki tüm ürünler <strong>aynı gün</strong> kargoya verilir.</li>
              <li>Gönderiler Aras Kargo ile uygun fiyatla yapılır{shipping?.estimatedDays ? `; tahmini teslimat ${shipping.estimatedDays}` : ""}.</li>
              <li>Kargo takip numarası SMS ve e-posta ile iletilir.</li>
              <li>Parçalar orijinal ambalajında, faturalı olarak gönderilir.</li>
            </ul>
          </div>
        </section>
      </div>

      {related.length > 0 && (
        <section className="pdp-block" aria-labelledby="sepet-ayni-arac">
          <div className="pdp-block-head">
            <h2 className="pdp-section" id="sepet-ayni-arac">
              Aynı araç için diğer ürünler{firstVehicle ? ` – ${firstVehicle}` : ""}
            </h2>
          </div>
          <div className="product-grid">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} placeholder={tenant.placeholderImageUrl} oem={relatedOems.get(p.id)} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { beacon } from "../../src/track";
import { VAT_RATE, vatBreakdown } from "../../src/vat";

function money(n: number) {
  return `${n.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TL`;
}

/** Baştaki 0/+90 atılmış 10 haneli numara. */
function phoneDigits(raw: string) {
  let d = raw.replace(/\D/g, "");
  if (d.startsWith("90") && d.length > 10) d = d.slice(2);
  if (d.startsWith("0")) d = d.slice(1);
  return d.slice(0, 10);
}

/** "5321234567" → "0 (532) 123 45 67" (yazarken kısmi) */
function formatPhone(raw: string) {
  const d = phoneDigits(raw);
  if (!d) return "";
  let out = `0 (${d.slice(0, 3)}`;
  if (d.length > 3) out += `) ${d.slice(3, 6)}`;
  if (d.length > 6) out += ` ${d.slice(6, 8)}`;
  if (d.length > 8) out += ` ${d.slice(8, 10)}`;
  return out;
}

const PHONE_PATTERN = "0 \\([2-5][0-9]{2}\\) [0-9]{3} [0-9]{2} [0-9]{2}";

function PhoneInput({ name, autoComplete, defaultValue }: { name: string; autoComplete: string; defaultValue?: string }) {
  const [value, setValue] = useState(() => formatPhone(defaultValue ?? ""));
  return (
    <input
      className="input"
      name={name}
      type="tel"
      autoComplete={autoComplete}
      inputMode="tel"
      required
      placeholder="0 (5xx) xxx xx xx"
      maxLength={17}
      pattern={PHONE_PATTERN}
      title="10 haneli telefon numarası, örn. 0 (532) 123 45 67"
      value={value}
      onChange={(e) => setValue(formatPhone(e.target.value))}
    />
  );
}

function NationalIdInput({ defaultValue }: { defaultValue?: string }) {
  const [value, setValue] = useState(() => (defaultValue ?? "").replace(/\D/g, "").slice(0, 11));
  return (
    <input
      className="input"
      name="nationalId"
      inputMode="numeric"
      autoComplete="off"
      placeholder="11 haneli T.C. kimlik no"
      minLength={11}
      maxLength={11}
      pattern="[1-9][0-9]{10}"
      title="T.C. kimlik numarası 11 haneli olmalı"
      value={value}
      onChange={(e) => setValue(e.target.value.replace(/\D/g, "").slice(0, 11))}
    />
  );
}

export type CheckoutLine = {
  id: string;
  name: string;
  slug: string;
  qty: number;
  price: string;
  imageUrl: string | null;
};

export type CheckoutDefaults = {
  fullName?: string;
  email?: string;
  phone?: string;
  invoiceType?: "individual" | "corporate";
  companyName?: string;
  taxOffice?: string;
  taxNumber?: string;
  nationalId?: string;
  billingCity?: string;
  billingDistrict?: string;
  billingLine1?: string;
  billingPostalCode?: string;
  shipDifferent?: boolean;
  shipFullName?: string;
  shipPhone?: string;
  shipCity?: string;
  shipDistrict?: string;
  shipLine1?: string;
  shipPostalCode?: string;
};

export type CardInstallmentOption = { count: number; total: number; monthly: number; ratePct: number };

export function CheckoutForm({
  items,
  subtotal,
  discount = 0,
  couponCode = "",
  couponInput = "",
  shippingFee,
  card,
  placeholder,
  defaults,
}: {
  items: CheckoutLine[];
  subtotal: number;
  discount?: number;
  couponCode?: string;
  couponInput?: string;
  shippingFee: number;
  card: { testMode: boolean; options: CardInstallmentOption[] } | null;
  placeholder: string;
  defaults?: CheckoutDefaults;
}) {
  const itemCount = items.reduce((sum, i) => sum + i.qty, 0);
  const [paymentMethod, setPaymentMethod] = useState<"credit_card" | "bank_transfer">(
    card ? "credit_card" : "bank_transfer",
  );
  const [installments, setInstallments] = useState(1);
  const baseTotal = Math.max(0, subtotal - discount) + shippingFee;
  const selectedOption = card?.options.find((o) => o.count === installments);
  const payTotal = paymentMethod === "credit_card" && selectedOption ? selectedOption.total : baseTotal;
  const installmentFee = Math.round((payTotal - baseTotal) * 100) / 100;
  const [invoiceType, setInvoiceType] = useState<"individual" | "corporate">(
    defaults?.invoiceType === "corporate" ? "corporate" : "individual",
  );
  const [shipDifferent, setShipDifferent] = useState(Boolean(defaults?.shipDifferent));

  return (
    <div className="checkout-layout">
      <div className="checkout-main">
        <details className="checkout-mobile-summary">
          <summary>
            <span>Sipariş özeti · {itemCount} ürün</span>
            <strong>{money(payTotal)}</strong>
          </summary>
          <ul>
            {items.map((i) => (
              <li key={i.id}>
                <span>{i.qty} × {i.name}</span>
                <b>{money(Number(i.price) * i.qty)}</b>
              </li>
            ))}
            {discount > 0 && (
              <li>
                <span>İndirim ({couponCode})</span>
                <b>-{money(discount)}</b>
              </li>
            )}
            <li>
              <span>Kargo</span>
              <b>{shippingFee === 0 ? "Ücretsiz" : money(shippingFee)}</b>
            </li>
          </ul>
        </details>
        <form
          className="checkout-form-stack"
          action="/api/checkout"
          method="post"
          id="checkout-form"
          onBlur={(e) => {
            const target = e.target as unknown as HTMLInputElement;
            if (!["email", "phone", "fullName"].includes(target.name)) return;
            const data = new FormData(e.currentTarget);
            const email = String(data.get("email") ?? "");
            const phone = String(data.get("phone") ?? "");
            if (!email.includes("@") && phone.replace(/\D/g, "").length < 10) return;
            beacon({ t: "contact", p: "/odeme", email, phone, name: String(data.get("fullName") ?? "") }, "marketing");
          }}
        >
          <input type="hidden" name="couponCode" value={couponCode} />
          <section className="checkout-form-card">
            <h2>İletişim</h2>
            <p className="checkout-lead muted">Sipariş bilgilendirmesi ve kargo için kullanılır.</p>
            <div className="checkout-form-grid">
              <label>
                Ad soyad
                <input className="input" name="fullName" autoComplete="name" required defaultValue={defaults?.fullName ?? ""} />
              </label>
              <div className="checkout-form-row">
                <label>
                  E-posta
                  <input className="input" type="email" name="email" autoComplete="email" required defaultValue={defaults?.email ?? ""} />
                </label>
                <label>
                  Telefon
                  <PhoneInput name="phone" autoComplete="tel" defaultValue={defaults?.phone} />
                </label>
              </div>
            </div>
          </section>

          <section className="checkout-form-card">
            <h2>Fatura bilgileri</h2>
            <p className="checkout-lead muted">Bireysel veya kurumsal fatura seçin.</p>
            <div className="checkout-segment" role="radiogroup" aria-label="Fatura tipi">
              <label className={`checkout-segment-option${invoiceType === "individual" ? " is-active" : ""}`}>
                <input
                  type="radio"
                  name="invoiceType"
                  value="individual"
                  checked={invoiceType === "individual"}
                  onChange={() => setInvoiceType("individual")}
                />
                <span>Bireysel</span>
              </label>
              <label className={`checkout-segment-option${invoiceType === "corporate" ? " is-active" : ""}`}>
                <input
                  type="radio"
                  name="invoiceType"
                  value="corporate"
                  checked={invoiceType === "corporate"}
                  onChange={() => setInvoiceType("corporate")}
                />
                <span>Kurumsal</span>
              </label>
            </div>

            <div className="checkout-form-grid">
              {invoiceType === "corporate" ? (
                <>
                  <label>
                    Firma ünvanı
                    <input className="input" name="companyName" autoComplete="organization" required defaultValue={defaults?.companyName ?? ""} />
                  </label>
                  <div className="checkout-form-row">
                    <label>
                      Vergi dairesi
                      <input className="input" name="taxOffice" required defaultValue={defaults?.taxOffice ?? ""} />
                    </label>
                    <label>
                      Vergi numarası
                      <input className="input" name="taxNumber" inputMode="numeric" required defaultValue={defaults?.taxNumber ?? ""} />
                    </label>
                  </div>
                </>
              ) : (
                <label>
                  T.C. kimlik no <span className="checkout-optional">(isteğe bağlı)</span>
                  <NationalIdInput defaultValue={defaults?.nationalId} />
                </label>
              )}

              <div className="checkout-form-row">
                <label>
                  İl
                  <input className="input" name="billingCity" autoComplete="address-level1" required defaultValue={defaults?.billingCity ?? ""} />
                </label>
                <label>
                  İlçe
                  <input className="input" name="billingDistrict" autoComplete="address-level2" required defaultValue={defaults?.billingDistrict ?? ""} />
                </label>
              </div>
              <label>
                Posta kodu <span className="checkout-optional">(isteğe bağlı)</span>
                <input className="input" name="billingPostalCode" autoComplete="postal-code" inputMode="numeric" defaultValue={defaults?.billingPostalCode ?? ""} />
              </label>
              <label>
                Fatura adresi
                <textarea className="input" name="billingLine1" autoComplete="street-address" required defaultValue={defaults?.billingLine1 ?? ""} />
              </label>
            </div>
          </section>

          <section className="checkout-form-card">
            <h2>Teslimat adresi</h2>
            <label className="checkout-check">
              <input
                type="checkbox"
                name="shipDifferent"
                value="1"
                checked={shipDifferent}
                onChange={(e) => setShipDifferent(e.target.checked)}
              />
              <span>Farklı adrese teslim edilsin</span>
            </label>

            {!shipDifferent ? (
              <p className="checkout-hint muted">Ürünler fatura adresine gönderilir.</p>
            ) : (
              <div className="checkout-form-grid" style={{ marginTop: "0.85rem" }}>
                <label>
                  Teslim alacak kişi
                  <input className="input" name="shipFullName" autoComplete="shipping name" required defaultValue={defaults?.shipFullName ?? ""} />
                </label>
                <label>
                  Teslimat telefonu
                  <PhoneInput name="shipPhone" autoComplete="shipping tel" defaultValue={defaults?.shipPhone} />
                </label>
                <div className="checkout-form-row">
                  <label>
                    İl
                    <input className="input" name="shipCity" autoComplete="shipping address-level1" required defaultValue={defaults?.shipCity ?? ""} />
                  </label>
                  <label>
                    İlçe
                    <input className="input" name="shipDistrict" autoComplete="shipping address-level2" required defaultValue={defaults?.shipDistrict ?? ""} />
                  </label>
                </div>
                <label>
                  Posta kodu <span className="checkout-optional">(isteğe bağlı)</span>
                  <input className="input" name="shipPostalCode" autoComplete="shipping postal-code" inputMode="numeric" defaultValue={defaults?.shipPostalCode ?? ""} />
                </label>
                <label>
                  Teslimat adresi
                  <textarea className="input" name="shipLine1" autoComplete="shipping street-address" required defaultValue={defaults?.shipLine1 ?? ""} />
                </label>
              </div>
            )}
          </section>

          <section className="checkout-form-card">
            <h2>Sipariş notu</h2>
            <label className="checkout-form-grid">
              <span className="checkout-optional" style={{ fontWeight: 650 }}>
                İsteğe bağlı
              </span>
              <textarea
                className="input"
                name="notes"
                placeholder="Kapı kodu, teslimat saati vb."
                rows={3}
              />
            </label>
          </section>

          <section className="checkout-pay-card">
            <h2>Ödeme yöntemi</h2>
            {card ? (
              <div className="checkout-pay-options" role="radiogroup" aria-label="Ödeme yöntemi">
                <label className={`checkout-pay-method${paymentMethod === "credit_card" ? " is-selected" : ""}`}>
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="credit_card"
                    checked={paymentMethod === "credit_card"}
                    onChange={() => setPaymentMethod("credit_card")}
                  />
                  <strong>Kredi / banka kartı</strong>
                  <span>
                    Garanti BBVA güvenli ödeme sayfasında 3D Secure ile ödenir. Kart bilgileriniz bizde saklanmaz.
                    {card.testMode ? " (Test modu: gerçek çekim yapılmaz.)" : ""}
                  </span>
                </label>
                <label className={`checkout-pay-method${paymentMethod === "bank_transfer" ? " is-selected" : ""}`}>
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="bank_transfer"
                    checked={paymentMethod === "bank_transfer"}
                    onChange={() => setPaymentMethod("bank_transfer")}
                  />
                  <strong>Havale / EFT</strong>
                  <span>Sipariş sonrası IBAN gösterilir.</span>
                </label>
              </div>
            ) : (
              <div className="checkout-pay-method is-selected" aria-current="true">
                <input type="hidden" name="paymentMethod" value="bank_transfer" />
                <strong>Havale / EFT</strong>
                <span>Sipariş sonrası IBAN gösterilir.</span>
              </div>
            )}

            {card && paymentMethod === "credit_card" && card.options.length > 1 && (
              <fieldset className="checkout-installments">
                <legend>Taksit seçenekleri</legend>
                {card.options.map((o) => (
                  <label key={o.count} className={installments === o.count ? "is-selected" : ""}>
                    <input
                      type="radio"
                      name="installments"
                      value={o.count}
                      checked={installments === o.count}
                      onChange={() => setInstallments(o.count)}
                    />
                    <span>{o.count === 1 ? "Tek çekim" : `${o.count} taksit`}</span>
                    <span className="muted">{o.count === 1 ? "" : `${o.count} × ${money(o.monthly)}`}</span>
                    <strong>{money(o.total)}</strong>
                  </label>
                ))}
              </fieldset>
            )}
            {card && paymentMethod === "credit_card" && card.options.length <= 1 && (
              <input type="hidden" name="installments" value="1" />
            )}
          </section>

          <section className="checkout-form-card">
            <h2>Yasal onaylar</h2>
            <div className="checkout-consents">
              <label className="checkout-check">
                <input type="checkbox" name="acceptDistanceSales" value="1" required />
                <span>
                  <Link href="/sayfa/mesafeli-satis" target="_blank">
                    Mesafeli satış sözleşmesi
                  </Link>
                  ni okudum, onaylıyorum.
                </span>
              </label>
              <label className="checkout-check">
                <input type="checkbox" name="acceptPrivacy" value="1" required />
                <span>
                  <Link href="/sayfa/gizlilik" target="_blank">
                    Gizlilik ve KVKK aydınlatma metni
                  </Link>
                  ni okudum, kabul ediyorum.
                </span>
              </label>
              <label className="checkout-check">
                <input type="checkbox" name="acceptMarketing" value="1" />
                <span>Kampanya ve bilgilendirme e-postası / SMS almak istiyorum. (isteğe bağlı)</span>
              </label>
            </div>
            <button className="btn btn-primary checkout-submit-inline" type="submit">
              {paymentMethod === "credit_card" ? "Kartla öde" : "Siparişi oluştur"} · {money(payTotal)}
            </button>
          </section>
        </form>
      </div>

      <aside className="checkout-summary-card">
        <h2>Sipariş özeti</h2>
        <div className="checkout-mini-list">
          {items.map((i) => (
            <div key={i.id} className="checkout-mini-item">
              <Image src={i.imageUrl || placeholder} alt="" width={56} height={56} />
              <div>
                <strong>
                  <Link href={`/urun/${i.slug}`}>{i.name}</Link>
                </strong>
                <span>
                  {i.qty} adet · {money(Number(i.price))}
                </span>
              </div>
              <em>{money(Number(i.price) * i.qty)}</em>
            </div>
          ))}
        </div>
        <dl className="cart-summary-rows">
          <div>
            <dt>Ürün ({itemCount})</dt>
            <dd>{money(subtotal)}</dd>
          </div>
          {discount > 0 ? (
            <div className="is-discount">
              <dt>İndirim ({couponCode})</dt>
              <dd>-{money(discount)}</dd>
            </div>
          ) : null}
          <div>
            <dt>Kargo</dt>
            <dd>{shippingFee === 0 ? "Ücretsiz" : money(shippingFee)}</dd>
          </div>
          {installmentFee > 0 && (
            <div>
              <dt>Vade farkı ({installments} taksit)</dt>
              <dd>{money(installmentFee)}</dd>
            </div>
          )}
          <div className="is-vat">
            <dt>KDV hariç tutar</dt>
            <dd>{money(vatBreakdown(payTotal).net)}</dd>
          </div>
          <div className="is-vat">
            <dt>KDV (%{VAT_RATE})</dt>
            <dd>{money(vatBreakdown(payTotal).vat)}</dd>
          </div>
          <div className="is-total">
            <dt>Ödenecek</dt>
            <dd>{money(payTotal)}</dd>
          </div>
        </dl>
        <form className="coupon-form" action="/odeme" method="get">
          <label htmlFor="kupon">İndirim kodu</label>
          <div className="coupon-row">
            <input className="input" id="kupon" name="kupon" defaultValue={couponCode || couponInput} placeholder="Kupon kodu" autoComplete="off" />
            <button className="btn btn-secondary" type="submit">
              {couponCode ? "Değiştir" : "Uygula"}
            </button>
          </div>
          {couponCode ? <a className="coupon-remove" href="/odeme">Kuponu kaldır</a> : null}
        </form>
        <p className="cart-summary-note muted">KDV dahil fiyat. Stok siparişte rezerve edilir.</p>
        <button className="btn btn-primary" type="submit" form="checkout-form">
          {paymentMethod === "credit_card" ? "Kartla öde" : "Siparişi oluştur"}
        </button>
        <Link className="cart-continue" href="/sepet">
          Sepete dön
        </Link>
        <ul className="cart-trust">
          <li>{card ? "3D Secure kart veya havale / EFT" : "Havale / EFT ile güvenli ödeme"}</li>
          <li>KDV dahil fiyat</li>
          <li>Sipariş no ile takip</li>
        </ul>
      </aside>
    </div>
  );
}

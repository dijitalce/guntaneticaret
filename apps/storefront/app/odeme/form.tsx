"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

function money(n: number) {
  return `${n.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TL`;
}

export type CheckoutLine = {
  id: string;
  name: string;
  slug: string;
  qty: number;
  price: string;
  imageUrl: string | null;
};

export function CheckoutForm({
  items,
  subtotal,
  placeholder,
}: {
  items: CheckoutLine[];
  subtotal: number;
  placeholder: string;
}) {
  const itemCount = items.reduce((sum, i) => sum + i.qty, 0);
  const [invoiceType, setInvoiceType] = useState<"individual" | "corporate">("individual");
  const [shipDifferent, setShipDifferent] = useState(false);

  return (
    <div className="checkout-layout">
      <div className="checkout-main">
        <form className="checkout-form-stack" action="/api/checkout" method="post" id="checkout-form">
          <section className="checkout-form-card">
            <h2>İletişim</h2>
            <p className="checkout-lead muted">Sipariş bilgilendirmesi ve kargo için kullanılır.</p>
            <div className="checkout-form-grid">
              <label>
                Ad soyad
                <input className="input" name="fullName" autoComplete="name" required />
              </label>
              <div className="checkout-form-row">
                <label>
                  E-posta
                  <input className="input" type="email" name="email" autoComplete="email" required />
                </label>
                <label>
                  Telefon
                  <input className="input" name="phone" autoComplete="tel" inputMode="tel" required />
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
                    <input className="input" name="companyName" autoComplete="organization" required />
                  </label>
                  <div className="checkout-form-row">
                    <label>
                      Vergi dairesi
                      <input className="input" name="taxOffice" required />
                    </label>
                    <label>
                      Vergi numarası
                      <input className="input" name="taxNumber" inputMode="numeric" required />
                    </label>
                  </div>
                </>
              ) : (
                <label>
                  T.C. kimlik no <span className="checkout-optional">(isteğe bağlı)</span>
                  <input className="input" name="nationalId" inputMode="numeric" autoComplete="off" maxLength={11} />
                </label>
              )}

              <div className="checkout-form-row">
                <label>
                  İl
                  <input className="input" name="billingCity" autoComplete="address-level1" required />
                </label>
                <label>
                  İlçe
                  <input className="input" name="billingDistrict" autoComplete="address-level2" required />
                </label>
              </div>
              <label>
                Posta kodu <span className="checkout-optional">(isteğe bağlı)</span>
                <input className="input" name="billingPostalCode" autoComplete="postal-code" inputMode="numeric" />
              </label>
              <label>
                Fatura adresi
                <textarea className="input" name="billingLine1" autoComplete="street-address" required />
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
                  <input className="input" name="shipFullName" autoComplete="shipping name" required />
                </label>
                <label>
                  Teslimat telefonu
                  <input className="input" name="shipPhone" autoComplete="shipping tel" inputMode="tel" required />
                </label>
                <div className="checkout-form-row">
                  <label>
                    İl
                    <input className="input" name="shipCity" autoComplete="shipping address-level1" required />
                  </label>
                  <label>
                    İlçe
                    <input className="input" name="shipDistrict" autoComplete="shipping address-level2" required />
                  </label>
                </div>
                <label>
                  Posta kodu <span className="checkout-optional">(isteğe bağlı)</span>
                  <input className="input" name="shipPostalCode" autoComplete="shipping postal-code" inputMode="numeric" />
                </label>
                <label>
                  Teslimat adresi
                  <textarea className="input" name="shipLine1" autoComplete="shipping street-address" required />
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
            <div className="checkout-pay-method is-selected" aria-current="true">
              <strong>Havale / EFT</strong>
              <span>Sipariş sonrası IBAN gösterilir. Kart tahsilatı yoktur.</span>
            </div>
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
              Siparişi oluştur · {money(subtotal)}
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
          <div>
            <dt>Kargo</dt>
            <dd>Sipariş sonrası</dd>
          </div>
          <div className="is-total">
            <dt>Ödenecek</dt>
            <dd>{money(subtotal)}</dd>
          </div>
        </dl>
        <p className="cart-summary-note muted">KDV dahil fiyat. Stok siparişte rezerve edilir.</p>
        <button className="btn btn-primary" type="submit" form="checkout-form">
          Siparişi oluştur
        </button>
        <Link className="cart-continue" href="/sepet">
          Sepete dön
        </Link>
        <ul className="cart-trust">
          <li>Havale / EFT ile güvenli ödeme</li>
          <li>KDV dahil fiyat</li>
          <li>Sipariş no ile takip</li>
        </ul>
      </aside>
    </div>
  );
}

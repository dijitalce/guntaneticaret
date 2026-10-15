"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { PaymentLinkBilling } from "@guntan/db";

function money(n: number) {
  return `${n.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TL`;
}

type Option = { count: number; total: number; monthly: number };

const FORM_ID = "tahsilat-form";

export function PaymentLinkCheckout({
  code,
  title,
  description,
  siteName,
  amount,
  options,
  testMode,
  error,
  defaults,
}: {
  code: string;
  title: string;
  description: string | null;
  siteName: string;
  amount: number;
  options: Option[];
  testMode: boolean;
  error: string | null;
  defaults: { fullName: string; email: string; phone: string; billing: PaymentLinkBilling | null };
}) {
  const billing = defaults.billing;
  const [installments, setInstallments] = useState(1);
  const [addBilling, setAddBilling] = useState(Boolean(billing));
  const [invoiceType, setInvoiceType] = useState<"individual" | "corporate">(billing?.invoiceType ?? "individual");
  const [submitting, setSubmitting] = useState(false);
  useEffect(() => {
    // Bankadan tarayıcının geri tuşuyla dönülürse sayfa önbellekten gelir; buton kilitli kalmasın.
    const reset = (e: PageTransitionEvent) => e.persisted && setSubmitting(false);
    window.addEventListener("pageshow", reset);
    return () => window.removeEventListener("pageshow", reset);
  }, []);
  const selected = options.find((o) => o.count === installments) ?? options[0]!;
  const fee = Math.round((selected.total - amount) * 100) / 100;
  const payLabel = submitting ? "Güvenli ödemeye yönlendiriliyor…" : `Ödemeyi tamamla · ${money(selected.total)}`;

  return (
    <div className="checkout-layout">
      <div className="checkout-main">
        <section className="paylink-hero">
          <span className="paylink-badge">Ödeme talebi · {siteName}</span>
          <h1>{title}</h1>
          <div className="paylink-amount">{money(amount)}</div>
          {description ? <p className="paylink-desc">{description}</p> : null}
        </section>

        {error ? (
          <p className="account-alert is-bad" role="alert">
            {error}
          </p>
        ) : null}

        <form
          id={FORM_ID}
          className="checkout-form-stack"
          action={`/api/tahsilat/${code}`}
          method="post"
          onSubmit={(e) => {
            if (submitting) e.preventDefault();
            else setSubmitting(true);
          }}
        >
          <section className="checkout-form-card">
            <h2>Ödeyen bilgileri</h2>
            <p className="checkout-lead muted">Ödeme bilgilendirmesi bu e-posta adresine gönderilir.</p>
            <div className="checkout-form-grid">
              <label>
                Ad soyad
                <input className="input" name="fullName" autoComplete="name" required minLength={3} defaultValue={defaults.fullName} />
              </label>
              <div className="checkout-form-row">
                <label>
                  E-posta
                  <input className="input" type="email" name="email" autoComplete="email" required defaultValue={defaults.email} />
                </label>
                <label>
                  Telefon
                  <input
                    className="input"
                    type="tel"
                    name="phone"
                    autoComplete="tel"
                    inputMode="tel"
                    required
                    minLength={10}
                    maxLength={20}
                    placeholder="0 (5xx) xxx xx xx"
                    defaultValue={defaults.phone}
                  />
                </label>
              </div>
            </div>
          </section>

          <section className="checkout-form-card">
            <h2>
              Fatura ve adres bilgileri <span className="checkout-optional">(isteğe bağlı)</span>
            </h2>
            <label className="checkout-check">
              <input type="checkbox" name="addBilling" value="1" checked={addBilling} onChange={(e) => setAddBilling(e.target.checked)} />
              <span>Fatura ve adres bilgilerimi eklemek istiyorum</span>
            </label>
            {!addBilling ? (
              <p className="checkout-hint muted">Bireysel veya kurumsal fatura için adres ve vergi bilgilerinizi ekleyebilirsiniz.</p>
            ) : (
              <>
                <div className="checkout-segment" role="radiogroup" aria-label="Fatura tipi" style={{ marginTop: "0.85rem" }}>
                  {(["individual", "corporate"] as const).map((t) => (
                    <label key={t} className={`checkout-segment-option${invoiceType === t ? " is-active" : ""}`}>
                      <input type="radio" name="invoiceType" value={t} checked={invoiceType === t} onChange={() => setInvoiceType(t)} />
                      <span>{t === "individual" ? "Bireysel" : "Kurumsal"}</span>
                    </label>
                  ))}
                </div>
                <div className="checkout-form-grid">
                  {invoiceType === "corporate" ? (
                    <>
                      <label>
                        Firma ünvanı
                        <input className="input" name="companyName" autoComplete="organization" required minLength={2} defaultValue={billing?.companyName ?? ""} />
                      </label>
                      <div className="checkout-form-row">
                        <label>
                          Vergi dairesi
                          <input className="input" name="taxOffice" required defaultValue={billing?.taxOffice ?? ""} />
                        </label>
                        <label>
                          Vergi numarası
                          <input
                            className="input"
                            name="taxNumber"
                            inputMode="numeric"
                            required
                            pattern="[0-9]{10,11}"
                            title="10 haneli vergi numarası (şahıs şirketlerinde 11 haneli T.C. kimlik no)"
                            maxLength={11}
                            defaultValue={billing?.taxNumber ?? ""}
                          />
                        </label>
                      </div>
                    </>
                  ) : (
                    <label>
                      T.C. kimlik no <span className="checkout-optional">(isteğe bağlı)</span>
                      <input
                        className="input"
                        name="nationalId"
                        inputMode="numeric"
                        autoComplete="off"
                        placeholder="11 haneli T.C. kimlik no"
                        pattern="[1-9][0-9]{10}"
                        title="T.C. kimlik numarası 11 haneli olmalı"
                        maxLength={11}
                        defaultValue={billing?.nationalId ?? ""}
                      />
                    </label>
                  )}
                  <div className="checkout-form-row">
                    <label>
                      İl
                      <input className="input" name="billingCity" autoComplete="address-level1" required defaultValue={billing?.city ?? ""} />
                    </label>
                    <label>
                      İlçe
                      <input className="input" name="billingDistrict" autoComplete="address-level2" required defaultValue={billing?.district ?? ""} />
                    </label>
                  </div>
                  <label>
                    Posta kodu <span className="checkout-optional">(isteğe bağlı)</span>
                    <input
                      className="input"
                      name="billingPostalCode"
                      autoComplete="postal-code"
                      inputMode="numeric"
                      maxLength={5}
                      defaultValue={billing?.postalCode ?? ""}
                    />
                  </label>
                  <label>
                    Fatura adresi
                    <textarea className="input" name="billingLine1" autoComplete="street-address" required minLength={5} defaultValue={billing?.line1 ?? ""} />
                  </label>
                </div>
              </>
            )}
          </section>

          <section className="checkout-pay-card">
            <h2>Ödeme yöntemi</h2>
            <div className="checkout-pay-method is-selected" aria-current="true">
              <strong>Kredi / banka kartı</strong>
              <span>
                Garanti BBVA 3D Secure ile güvenli ödeme. Kart bilgileriniz bankanın sayfasında girilir, sitemizde saklanmaz.
                {testMode ? " (Test modu: gerçek çekim yapılmaz.)" : ""}
              </span>
            </div>
            {options.length > 1 ? (
              <fieldset className="checkout-installments">
                <legend>Taksit seçenekleri</legend>
                {options.map((o) => (
                  <label key={o.count} className={installments === o.count ? "is-selected" : ""}>
                    <input type="radio" name="installments" value={o.count} checked={installments === o.count} onChange={() => setInstallments(o.count)} />
                    <span>{o.count === 1 ? "Tek çekim" : `${o.count} taksit`}</span>
                    <span className="muted">{o.count === 1 ? "" : `${o.count} × ${money(o.monthly)}`}</span>
                    <strong>{money(o.total)}</strong>
                  </label>
                ))}
              </fieldset>
            ) : (
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
            </div>
            <button className="btn btn-primary checkout-submit-inline" type="submit" disabled={submitting}>
              {payLabel}
            </button>
          </section>
        </form>
      </div>

      <aside className="checkout-summary-card">
        <h2>Ödeme özeti</h2>
        <dl className="cart-summary-rows">
          <div>
            <dt>{title}</dt>
            <dd>{money(amount)}</dd>
          </div>
          {fee > 0 ? (
            <div>
              <dt>Vade farkı ({installments} taksit)</dt>
              <dd>{money(fee)}</dd>
            </div>
          ) : null}
          {installments > 1 ? (
            <div>
              <dt>Aylık</dt>
              <dd>
                {installments} × {money(selected.monthly)}
              </dd>
            </div>
          ) : null}
          <div className="is-total">
            <dt>Ödenecek tutar</dt>
            <dd>{money(selected.total)}</dd>
          </div>
        </dl>
        <button className="btn btn-primary" type="submit" form={FORM_ID} disabled={submitting}>
          {payLabel}
        </button>
        <ul className="cart-trust">
          <li>Garanti BBVA 3D Secure</li>
          <li>256-bit SSL ile şifreli bağlantı</li>
          <li>Kart bilgileri sitemizde saklanmaz</li>
        </ul>
      </aside>
    </div>
  );
}

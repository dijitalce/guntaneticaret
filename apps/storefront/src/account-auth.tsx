"use client";

import Link from "next/link";
import { useState } from "react";

export function AccountAuthForms({
  siteName,
  initialTab = "login",
}: {
  siteName: string;
  initialTab?: "login" | "register";
}) {
  const [tab, setTab] = useState<"login" | "register">(initialTab);
  const [invoiceType, setInvoiceType] = useState<"individual" | "corporate">("individual");

  return (
    <div className="account-auth">
      <aside className="account-auth-aside">
        <p className="account-auth-eyebrow">Hesabım</p>
        <h1>Alışverişine kaldığın yerden devam et</h1>
        <p>
          Siparişlerini takip et, adreslerini kaydet ve {siteName} alışverişini daha hızlı tamamla.
        </p>
        <ul className="account-auth-benefits">
          <li>Sipariş ve kargo durumunu gör</li>
          <li>Teslimat adreslerini kaydet</li>
          <li>Havale / EFT ödemelerini kolayca takip et</li>
          <li>KDV dahil fiyatlarla güvenli alışveriş</li>
        </ul>
        <div className="account-auth-legal-links">
          <Link href="/sayfa/gizlilik" target="_blank">
            Gizlilik &amp; KVKK
          </Link>
          <Link href="/sayfa/mesafeli-satis" target="_blank">
            Mesafeli satış
          </Link>
        </div>
      </aside>

      <div className="account-auth-card">
        <div className="account-auth-tabs" role="tablist" aria-label="Hesap işlemleri">
          <button
            type="button"
            role="tab"
            aria-selected={tab === "login"}
            className={tab === "login" ? "is-active" : undefined}
            onClick={() => setTab("login")}
          >
            Giriş yap
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "register"}
            className={tab === "register" ? "is-active" : undefined}
            onClick={() => setTab("register")}
          >
            Üye ol
          </button>
        </div>

        {tab === "login" ? (
          <form action="/api/auth/login" method="post" className="account-auth-form" aria-labelledby="login-title">
            <h2 id="login-title">Giriş yap</h2>
            <p className="account-auth-hint muted">Kayıtlı e-posta ve şifrenle giriş yap.</p>
            <label>
              E-posta
              <input className="input" name="email" type="email" autoComplete="email" required />
            </label>
            <label>
              Şifre
              <input
                className="input"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                minLength={6}
              />
            </label>
            <button className="btn btn-primary" type="submit">
              Giriş yap
            </button>
            <p className="account-auth-switch muted">
              Hesabın yok mu?{" "}
              <button type="button" className="account-auth-text-btn" onClick={() => setTab("register")}>
                Üye ol
              </button>
            </p>
          </form>
        ) : (
          <form action="/api/auth/register" method="post" className="account-auth-form" aria-labelledby="register-title">
            <h2 id="register-title">Üye ol</h2>
            <p className="account-auth-hint muted">
              Fatura tipini ve adresini kaydet; sepetin hesabına bağlanır, siparişlerde kullanılır.
            </p>
            <div className="account-field-row">
              <label>
                Ad
                <input className="input" name="firstName" autoComplete="given-name" required />
              </label>
              <label>
                Soyad
                <input className="input" name="lastName" autoComplete="family-name" required />
              </label>
            </div>
            <label>
              E-posta
              <input className="input" name="email" type="email" autoComplete="email" required />
            </label>
            <label>
              Telefon
              <input
                className="input"
                name="phone"
                type="tel"
                autoComplete="tel"
                inputMode="tel"
                placeholder="05xx xxx xx xx"
              />
            </label>
            <label>
              Şifre
              <input
                className="input"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={6}
              />
              <span className="account-field-note">En az 6 karakter</span>
            </label>

            <div className="account-auth-block">
              <h3>Fatura tipi</h3>
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
              {invoiceType === "corporate" ? (
                <>
                  <label>
                    Firma ünvanı
                    <input className="input" name="companyName" autoComplete="organization" required />
                  </label>
                  <div className="account-field-row">
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
                  T.C. kimlik no <span className="account-field-note">(isteğe bağlı)</span>
                  <input className="input" name="nationalId" inputMode="numeric" maxLength={11} autoComplete="off" />
                </label>
              )}
            </div>

            <div className="account-auth-block">
              <h3>Fatura adresi</h3>
              <p className="account-auth-hint muted">Sipariş faturalarında kullanılacak adres.</p>
              <div className="account-field-row">
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
                Açık adres
                <textarea className="input" name="billingLine1" autoComplete="street-address" required rows={3} />
              </label>
              <label>
                Posta kodu <span className="account-field-note">(isteğe bağlı)</span>
                <input className="input" name="billingPostalCode" autoComplete="postal-code" inputMode="numeric" />
              </label>
              <label className="account-check">
                <input type="checkbox" name="alsoShipping" value="1" defaultChecked />
                <span>Aynı adresi teslimat adresi olarak da kaydet</span>
              </label>
            </div>

            <div className="account-consents">
              <label className="account-check">
                <input type="checkbox" name="acceptTerms" value="1" required />
                <span>
                  <Link href="/sayfa/mesafeli-satis" target="_blank">
                    Üyelik ve kullanım koşulları
                  </Link>
                  nı okudum, kabul ediyorum.
                </span>
              </label>
              <label className="account-check">
                <input type="checkbox" name="acceptPrivacy" value="1" required />
                <span>
                  <Link href="/sayfa/gizlilik" target="_blank">
                    Gizlilik ve KVKK aydınlatma metni
                  </Link>
                  ni okudum, kabul ediyorum.
                </span>
              </label>
              <label className="account-check">
                <input type="checkbox" name="acceptMarketing" value="1" />
                <span>Kampanya, fırsat ve bilgilendirme e-postası / SMS almak istiyorum. (isteğe bağlı)</span>
              </label>
            </div>

            <button className="btn btn-primary" type="submit">
              Hesap oluştur
            </button>
            <p className="account-auth-switch muted">
              Zaten üye misin?{" "}
              <button type="button" className="account-auth-text-btn" onClick={() => setTab("login")}>
                Giriş yap
              </button>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}

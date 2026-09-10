"use client";

import Link from "next/link";
import { useState } from "react";

type ProfileUser = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  invoiceType: string;
  companyName: string | null;
  taxOffice: string | null;
  taxNumber: string | null;
  nationalId: string | null;
};

export function ProfileForms({
  user,
  alerts,
}: {
  user: ProfileUser;
  alerts: { ok?: string; hata?: string };
}) {
  const [invoiceType, setInvoiceType] = useState<"individual" | "corporate">(
    user.invoiceType === "corporate" ? "corporate" : "individual",
  );

  return (
    <section className="account-section">
      <div className="account-section-head">
        <h2>Profil</h2>
      </div>
      {alerts.ok === "1" && (
        <p className="account-alert is-ok" role="status">
          Bilgilerin kaydedildi.
        </p>
      )}
      {alerts.hata === "sifre" && (
        <p className="account-alert is-bad" role="alert">
          Mevcut şifre hatalı veya yeni şifre geçersiz.
        </p>
      )}
      {alerts.hata === "1" && (
        <p className="account-alert is-bad" role="alert">
          Profil kaydedilemedi. Alanları kontrol et.
        </p>
      )}

      <div className="account-auth-grid">
        <form action="/api/account/profile" method="post" className="account-panel">
          <h3>Kişisel bilgiler</h3>
          <div className="account-field-row">
            <label>
              Ad
              <input className="input" name="firstName" defaultValue={user.firstName} required />
            </label>
            <label>
              Soyad
              <input className="input" name="lastName" defaultValue={user.lastName} required />
            </label>
          </div>
          <label>
            E-posta
            <input className="input" value={user.email} disabled readOnly />
          </label>
          <label>
            Telefon
            <input className="input" name="phone" type="tel" defaultValue={user.phone ?? ""} placeholder="05xx xxx xx xx" />
          </label>

          <h3 style={{ marginTop: "0.5rem" }}>Fatura tipi</h3>
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
                <input className="input" name="companyName" defaultValue={user.companyName ?? ""} required />
              </label>
              <div className="account-field-row">
                <label>
                  Vergi dairesi
                  <input className="input" name="taxOffice" defaultValue={user.taxOffice ?? ""} required />
                </label>
                <label>
                  Vergi numarası
                  <input className="input" name="taxNumber" defaultValue={user.taxNumber ?? ""} required />
                </label>
              </div>
            </>
          ) : (
            <label>
              T.C. kimlik no
              <input className="input" name="nationalId" defaultValue={user.nationalId ?? ""} maxLength={11} />
            </label>
          )}

          <button className="btn btn-primary" type="submit">
            Kaydet
          </button>
        </form>

        <form action="/api/account/password" method="post" className="account-panel">
          <h3>Şifre değiştir</h3>
          <label>
            Mevcut şifre
            <input className="input" name="currentPassword" type="password" required minLength={6} autoComplete="current-password" />
          </label>
          <label>
            Yeni şifre
            <input className="input" name="newPassword" type="password" required minLength={6} autoComplete="new-password" />
          </label>
          <label>
            Yeni şifre (tekrar)
            <input className="input" name="newPasswordConfirm" type="password" required minLength={6} autoComplete="new-password" />
          </label>
          <button className="btn btn-secondary" type="submit">
            Şifreyi güncelle
          </button>
          <p className="muted" style={{ margin: 0, fontSize: "0.85rem" }}>
            Şifreni unuttuysan destek için <Link href="/iletisim">iletişim</Link> sayfasını kullan.
          </p>
        </form>
      </div>
    </section>
  );
}

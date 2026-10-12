"use client";

import Link from "next/link";
import { useState } from "react";

function money(n: number) {
  return `${n.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TL`;
}

type Option = { count: number; total: number; monthly: number };

export function PaymentLinkForm({
  code,
  options,
  defaults,
}: {
  code: string;
  options: Option[];
  defaults: { fullName: string; email: string; phone: string };
}) {
  const [installments, setInstallments] = useState(1);
  const selected = options.find((o) => o.count === installments) ?? options[0]!;

  return (
    <form className="checkout-form-stack" action={`/api/tahsilat/${code}`} method="post">
      <section className="checkout-form-card">
        <h2>Ödeyen bilgileri</h2>
        <p className="checkout-lead muted">Ödeme dekontu bu e-posta adresine gönderilir.</p>
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
              Telefon <span className="checkout-optional">(isteğe bağlı)</span>
              <input className="input" type="tel" name="phone" autoComplete="tel" inputMode="tel" maxLength={20} defaultValue={defaults.phone} />
            </label>
          </div>
        </div>
      </section>

      <section className="checkout-pay-card">
        <h2>Kartla ödeme</h2>
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
        <p className="checkout-hint muted">Kart bilgileriniz Garanti BBVA&apos;nın 3D Secure sayfasında girilir; bizim sitemizde saklanmaz.</p>
      </section>

      <section className="checkout-form-card">
        <div className="checkout-consents">
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
        <button className="btn btn-primary checkout-submit-inline" type="submit">
          Kartla öde · {money(selected.total)}
        </button>
      </section>
    </form>
  );
}

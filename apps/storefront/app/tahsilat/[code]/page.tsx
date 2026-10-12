import Link from "next/link";
import { notFound } from "next/navigation";
import { getPaymentLinkByCode } from "@guntan/db";
import { garantiConfigFromEnv, installmentOptions } from "@guntan/ecommerce";
import { getTenant } from "../../../src/tenant";
import { PaymentLinkForm } from "./form";

export const dynamic = "force-dynamic";
export const metadata = { title: "Ödeme", robots: { index: false, follow: false } };

function money(value: string | number) {
  const n = typeof value === "number" ? value : Number(value);
  return `${n.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TL`;
}

const ERRORS: Record<string, string> = {
  kapali: "Kartla ödeme şu an kullanılamıyor. Lütfen bizimle iletişime geçin.",
  onay: "Devam etmek için aydınlatma metnini onaylayın.",
  bilgi: "Ad soyad ve geçerli bir e-posta adresi girin.",
  taksit: "Seçilen taksit bu tutar için geçerli değil.",
};

export default async function PaymentLinkPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ hata?: string; mesaj?: string; durum?: string }>;
}) {
  const [{ code }, sp, tenant] = await Promise.all([params, searchParams, getTenant()]);
  const link = await getPaymentLinkByCode(code);
  if (!link) notFound();

  const garanti = garantiConfigFromEnv();
  const amount = Number(link.amount);
  const error = sp.hata === "kart" ? sp.mesaj || "Ödeme tamamlanamadı." : sp.hata ? ERRORS[sp.hata] : null;

  return (
    <div className="container page-surface">
      <nav className="breadcrumb">
        <Link href="/">Ana Sayfa</Link> › Ödeme
      </nav>
      <div className="checkout-layout">
        <div className="checkout-main">
          {link.status === "paid" ? (
            <section className="checkout-form-card">
              <h1 style={{ margin: "0 0 0.5rem", fontSize: "1.45rem" }}>{sp.durum === "odendi" ? "Ödemeniz alındı" : "Bu ödeme tamamlandı"}</h1>
              <p className="muted" style={{ marginTop: 0 }}>
                {link.title} · Ödenen: <strong>{money(link.paid_amount ?? link.amount)}</strong>
                {link.paid_installment && link.paid_installment > 1 ? ` · ${link.paid_installment} taksit` : null}
              </p>
              <p>Teşekkür ederiz. Ödemeniz Garanti BBVA tarafından onaylandı.</p>
              <Link className="btn btn-primary" href="/" style={{ marginTop: "0.5rem", display: "inline-flex" }}>
                Siteye dön
              </Link>
            </section>
          ) : link.status === "cancelled" ? (
            <section className="checkout-form-card">
              <h1 style={{ margin: "0 0 0.5rem", fontSize: "1.45rem" }}>Bu ödeme bağlantısı geçerli değil</h1>
              <p className="muted">
                Bağlantı iptal edilmiş. Yeni bir bağlantı için{" "}
                {tenant.phone ? <a href={`tel:${tenant.phone}`}>{tenant.phone}</a> : "bizimle"} iletişime geçebilirsiniz.
              </p>
            </section>
          ) : (
            <>
              <section className="checkout-form-card">
                <h1 style={{ margin: "0 0 0.35rem", fontSize: "1.45rem" }}>{link.title}</h1>
                <p className="muted" style={{ margin: 0 }}>
                  {tenant.siteName} için ödenecek tutar: <strong>{money(amount)}</strong>
                </p>
                {link.description ? <p style={{ whiteSpace: "pre-line", marginBottom: 0 }}>{link.description}</p> : null}
              </section>
              {error ? (
                <p className="account-alert is-bad" role="alert">
                  {error}
                </p>
              ) : null}
              {garanti ? (
                <PaymentLinkForm
                  code={link.code}
                  options={installmentOptions(amount, garanti)}
                  defaults={{
                    fullName: link.payer_name ?? link.customer_name ?? "",
                    email: link.payer_email ?? link.customer_email ?? "",
                    phone: link.payer_phone ?? link.customer_phone ?? "",
                  }}
                />
              ) : (
                <section className="checkout-form-card">
                  <p>{ERRORS.kapali}</p>
                </section>
              )}
            </>
          )}
        </div>
        <aside className="checkout-summary-card">
          <h2>Ödeme özeti</h2>
          <dl className="cart-summary-rows">
            <div>
              <dt>{link.title}</dt>
              <dd>{money(amount)}</dd>
            </div>
          </dl>
          <p className="cart-summary-note muted">Ödeme Garanti BBVA 3D Secure ile alınır.</p>
        </aside>
      </div>
    </div>
  );
}

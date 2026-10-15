import Link from "next/link";
import { notFound } from "next/navigation";
import { getPaymentLinkByCode, paymentLinkBilling } from "@guntan/db";
import { garantiConfig, installmentOptions } from "@guntan/ecommerce";
import { getTenant } from "../../../src/tenant";
import { PaymentLinkCheckout } from "./form";

export const dynamic = "force-dynamic";
export const metadata = { title: "Ödeme", robots: { index: false, follow: false } };

function money(value: string | number) {
  const n = typeof value === "number" ? value : Number(value);
  return `${n.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TL`;
}

const ERRORS: Record<string, string> = {
  kapali: "Kartla ödeme şu an kullanılamıyor. Lütfen bizimle iletişime geçin.",
  onay: "Devam etmek için mesafeli satış sözleşmesini ve aydınlatma metnini onaylayın.",
  bilgi: "Ad soyad, geçerli bir e-posta adresi ve telefon numarası girin.",
  taksit: "Seçilen taksit bu tutar için geçerli değil.",
  fatura:
    "Fatura bilgilerini kontrol edin: il, ilçe ve adres zorunludur; kurumsal faturada firma ünvanı, vergi dairesi ve 10–11 haneli vergi numarası gerekir.",
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

  const garanti = await garantiConfig();
  const amount = Number(link.amount);
  const error =
    sp.hata === "kart"
      ? `Ödeme tamamlanamadı${sp.mesaj ? `: ${sp.mesaj}` : "."} Kartınızdan çekim yapılmadı; tekrar deneyebilirsiniz.`
      : sp.hata
        ? (ERRORS[sp.hata] ?? null)
        : null;
  const paid = link.status === "paid";

  return (
    <div className="container page-surface">
      <nav className="breadcrumb">
        <Link href="/">Ana Sayfa</Link> › Ödeme
      </nav>
      <ol className="checkout-steps" aria-label="Ödeme adımları">
        <li className={paid ? undefined : "is-current"}>Bilgiler</li>
        <li>3D Secure</li>
        <li className={paid ? "is-current" : undefined}>Onay</li>
      </ol>

      {paid ? (
        <section className="checkout-form-card paylink-result">
          <div className="paylink-result-icon is-ok" aria-hidden>
            ✓
          </div>
          <h1>{sp.durum === "odendi" ? "Ödemeniz alındı" : "Bu ödeme tamamlandı"}</h1>
          <p className="muted">
            {link.title} · <strong>{money(link.paid_amount ?? link.amount)}</strong>
            {link.paid_installment && link.paid_installment > 1 ? ` · ${link.paid_installment} taksit` : null}
          </p>
          <p>Teşekkür ederiz. Ödemeniz Garanti BBVA tarafından onaylandı.</p>
          <Link className="btn btn-primary" href="/">
            Siteye dön
          </Link>
        </section>
      ) : link.status === "cancelled" ? (
        <section className="checkout-form-card paylink-result">
          <div className="paylink-result-icon" aria-hidden>
            !
          </div>
          <h1>Bu ödeme bağlantısı geçerli değil</h1>
          <p className="muted">
            Bağlantı iptal edilmiş. Yeni bir bağlantı için {tenant.phone ? <a href={`tel:${tenant.phone}`}>{tenant.phone}</a> : "bizimle"}{" "}
            iletişime geçebilirsiniz.
          </p>
        </section>
      ) : garanti ? (
        <PaymentLinkCheckout
          code={link.code}
          title={link.title}
          description={link.description}
          siteName={tenant.siteName}
          amount={amount}
          options={installmentOptions(amount, garanti)}
          testMode={garanti.mode === "TEST"}
          error={error}
          defaults={{
            fullName: link.payer_name ?? link.customer_name ?? "",
            email: link.payer_email ?? link.customer_email ?? "",
            phone: link.payer_phone ?? link.customer_phone ?? "",
            billing: paymentLinkBilling(link),
          }}
        />
      ) : (
        <section className="checkout-form-card paylink-result">
          <h1>{link.title}</h1>
          <p className="muted">{ERRORS.kapali}</p>
        </section>
      )}
    </div>
  );
}

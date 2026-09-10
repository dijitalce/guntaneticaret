import Link from "next/link";
import { and, desc, eq } from "drizzle-orm";
import { db, orders } from "@guntan/db";
import { getTenant } from "../../src/tenant";
import { getCurrentCustomer } from "../../src/customer";
import { formatDateTr, formatMoney, orderStatusLabel, orderStatusTone } from "../../src/order-labels";
import { AccountAuthForms } from "../../src/account-auth";

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ hata?: string; kayit?: string; ok?: string }>;
}) {
  const sp = await searchParams;
  const tenant = await getTenant();
  const user = await getCurrentCustomer();

  if (!user) {
    const initialTab = sp.kayit === "email" || sp.kayit === "onay" || sp.kayit === "eksik" ? "register" : "login";
    return (
      <div className="account-auth-page">
        <nav className="breadcrumb">
          <Link href="/">Ana Sayfa</Link> › Hesabım
        </nav>
        {sp.hata === "1" && (
          <p className="account-alert is-bad" role="alert">
            E-posta veya şifre hatalı. Tekrar dene.
          </p>
        )}
        {sp.kayit === "email" && (
          <p className="account-alert is-bad" role="alert">
            Bu e-posta ile zaten bir hesap var. Giriş yapmayı dene.
          </p>
        )}
        {sp.kayit === "onay" && (
          <p className="account-alert is-bad" role="alert">
            Üyelik için kullanım koşulları ve KVKK onaylarını işaretlemen gerekir.
          </p>
        )}
        {sp.kayit === "eksik" && (
          <p className="account-alert is-bad" role="alert">
            Lütfen ad, soyad, e-posta ve en az 6 karakterlik şifre gir.
          </p>
        )}
        {sp.kayit === "1" && (
          <p className="account-alert is-ok" role="status">
            Hesabın oluşturuldu.
          </p>
        )}
        <AccountAuthForms siteName={tenant.siteName} initialTab={initialTab} />
      </div>
    );
  }

  const recent = await db
    .select()
    .from(orders)
    .where(and(eq(orders.customerId, user.id), eq(orders.tenantId, tenant.tenant.id)))
    .orderBy(desc(orders.createdAt))
    .limit(5);

  const pending = recent.filter((o) => o.status === "pending_payment").length;

  return (
    <>
      {sp.ok === "profil" && (
        <p className="account-alert is-ok" role="status">
          Profil bilgilerin güncellendi.
        </p>
      )}
      {sp.ok === "sifre" && (
        <p className="account-alert is-ok" role="status">
          Şifren güncellendi.
        </p>
      )}
      {sp.kayit === "1" && (
        <p className="account-alert is-ok" role="status">
          Hoş geldin! Hesabın hazır.
        </p>
      )}
      <div className="account-stats">
        <div className="account-stat">
          <strong>{recent.length > 0 ? recent.length : "0"}</strong>
          <span>Son sipariş</span>
        </div>
        <div className="account-stat">
          <strong>{pending}</strong>
          <span>Ödeme bekleyen</span>
        </div>
        <div className="account-stat">
          <Link href="/hesabim/adresler">Adresler</Link>
          <span>Teslimat için kaydet</span>
        </div>
      </div>

      <section className="account-section">
        <div className="account-section-head">
          <h2>Son siparişler</h2>
          <Link href="/hesabim/siparisler">Tümünü gör</Link>
        </div>
        {recent.length === 0 ? (
          <div className="empty-state account-empty">
            <h3>Henüz sipariş yok</h3>
            <p>Marka ve model seçerek uygun parçaları hemen bulabilirsin.</p>
            <Link className="btn btn-primary" href="/">
              Alışverişe başla
            </Link>
          </div>
        ) : (
          <ul className="account-order-list">
            {recent.map((o) => (
              <li key={o.id}>
                <Link href={`/hesabim/siparisler/${o.id}`} className="account-order-row">
                  <div>
                    <strong>{o.orderNo}</strong>
                    <span className="muted">{formatDateTr(o.createdAt)}</span>
                  </div>
                  <div className="account-order-meta">
                    <em className={`order-badge is-${orderStatusTone(o.status)}`}>{orderStatusLabel(o.status)}</em>
                    <b>{formatMoney(o.grandTotal)}</b>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

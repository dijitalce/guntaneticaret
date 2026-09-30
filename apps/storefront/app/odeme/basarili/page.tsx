import Link from "next/link";
import { eq } from "drizzle-orm";
import { db, orderItems, orders, tenantBankAccounts } from "@guntan/db";
import { CommerceEvent } from "../../../src/visitor-tracker";
import { ORDER_STATUS, PAYMENT_METHOD } from "@guntan/types";
import { getTenant } from "../../../src/tenant";

function money(value: string | number) {
  const n = typeof value === "number" ? value : Number(value);
  return `${n.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TL`;
}

export default async function SuccessPage({ searchParams }: { searchParams: Promise<{ order?: string }> }) {
  const { order: orderNo } = await searchParams;
  const tenant = await getTenant();
  const [order] = orderNo ? await db.select().from(orders).where(eq(orders.orderNo, orderNo)).limit(1) : [];
  const paidByCard =
    order?.shippingAddress?.paymentMethod === PAYMENT_METHOD.CREDIT_CARD && order.status !== ORDER_STATUS.PENDING_PAYMENT;
  const banks = paidByCard
    ? []
    : await db.select().from(tenantBankAccounts).where(eq(tenantBankAccounts.tenantId, tenant.tenant.id));
  const installments = Number(order?.shippingAddress?.installments ?? "1");
  const purchaseItems = order ? await db.select().from(orderItems).where(eq(orderItems.orderId, order.id)) : [];
  const trackPurchase = Boolean(order) && (paidByCard || order?.shippingAddress?.paymentMethod !== PAYMENT_METHOD.CREDIT_CARD) && order?.status !== ORDER_STATUS.CANCELLED;

  return (
    <div className="container page-surface">
      {trackPurchase && order ? (
        <CommerceEvent
          event="purchase"
          orderNo={order.orderNo}
          value={Number(order.grandTotal)}
          shipping={Number(order.shippingTotal)}
          items={purchaseItems.map((i) => ({ id: i.productId, name: i.name, price: Number(i.unitPrice), qty: i.qty }))}
        />
      ) : null}
      <nav className="breadcrumb">
        <Link href="/">Ana Sayfa</Link> › Sipariş onayı
      </nav>
      <ol className="checkout-steps" aria-label="Sipariş adımları">
        <li>Sepet</li>
        <li>Ödeme</li>
        <li className="is-current">Onay</li>
      </ol>

      <div className="checkout-layout">
        <section className="checkout-form-card">
          <h1 style={{ margin: "0 0 0.5rem", fontSize: "1.45rem" }}>
            {paidByCard ? "Ödemeniz alındı" : "Siparişiniz alındı"}
          </h1>
          {order ? (
            <p className="muted" style={{ marginTop: 0 }}>
              Sipariş no: <strong>{order.orderNo}</strong> · {paidByCard ? "Ödenen" : "Ödenecek"}:{" "}
              <strong>{money(order.grandTotal)}</strong>
              {paidByCard && installments > 1 ? ` · ${installments} taksit` : null}
            </p>
          ) : (
            <p className="muted">Sipariş kaydı oluşturuldu. Havale açıklamasına sipariş numaranızı yazın.</p>
          )}
          {paidByCard ? (
            <p>Kart ödemeniz onaylandı, siparişiniz hazırlanmaya alınacak. Kargoya verildiğinde takip numarası hesabınızda görünür.</p>
          ) : (
            <p>
              Ödemeyi tamamladıktan sonra siparişiniz hazırlanmaya başlar. Dekontu{" "}
              {tenant.email ? <a href={`mailto:${tenant.email}`}>{tenant.email}</a> : "e-posta"} adresine
              iletebilirsiniz.
            </p>
          )}
          <Link className="btn btn-primary" href="/" style={{ marginTop: "0.5rem", display: "inline-flex" }}>
            Alışverişe dön
          </Link>
        </section>

        {!paidByCard && (
          <aside className="checkout-summary-card">
            <h2>Havale / EFT</h2>
            <p className="muted" style={{ marginTop: 0 }}>
              Açıklama alanına sipariş numaranızı yazın.
            </p>
            <div className="checkout-mini-list">
              {banks.length === 0 && <p className="muted">Banka hesabı henüz tanımlanmamış.</p>}
              {banks.map((b) => (
                <div key={b.id} style={{ display: "grid", gap: "0.2rem" }}>
                  <strong>{b.bankName}</strong>
                  <span className="muted">{b.accountHolder}</span>
                  <code style={{ fontSize: "0.92rem" }}>{b.iban}</code>
                </div>
              ))}
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db, orderItems, orders, payments, shipments, tenantBankAccounts } from "@guntan/db";
import { getTenant } from "../../../../src/tenant";
import { getCurrentCustomer } from "../../../../src/customer";
import { formatDateTr, formatMoney, orderStatusLabel, orderStatusTone } from "../../../../src/order-labels";

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tenant = await getTenant();
  const user = await getCurrentCustomer();
  if (!user) redirect("/hesabim");

  const [order] = await db
    .select()
    .from(orders)
    .where(and(eq(orders.id, id), eq(orders.tenantId, tenant.tenant.id), eq(orders.customerId, user.id)))
    .limit(1);
  if (!order) notFound();

  const [items, pay, ships, banks] = await Promise.all([
    db.select().from(orderItems).where(eq(orderItems.orderId, order.id)),
    db.select().from(payments).where(eq(payments.orderId, order.id)),
    db.select().from(shipments).where(eq(shipments.orderId, order.id)),
    db.select().from(tenantBankAccounts).where(eq(tenantBankAccounts.tenantId, tenant.tenant.id)),
  ]);

  const addr = order.shippingAddress ?? {};
  const awaiting = pay.some((p) => p.status === "awaiting");
  const ship = ships[0];

  return (
    <section className="account-section">
      <nav className="breadcrumb">
        <Link href="/hesabim">Hesabım</Link>
        {" › "}
        <Link href="/hesabim/siparisler">Siparişler</Link>
        {" › "}
        {order.orderNo}
      </nav>

      <div className="account-section-head">
        <div>
          <h2>Sipariş {order.orderNo}</h2>
          <p className="muted">{formatDateTr(order.createdAt)}</p>
        </div>
        <em className={`order-badge is-${orderStatusTone(order.status)}`}>{orderStatusLabel(order.status)}</em>
      </div>

      <div className="account-detail-grid">
        <div className="account-panel">
          <h3>Ürünler</h3>
          <ul className="account-item-list">
            {items.map((item) => (
              <li key={item.id}>
                <div>
                  <strong>{item.name}</strong>
                  <span className="muted">SKU {item.sku} · {item.qty} adet</span>
                </div>
                <b>{formatMoney(Number(item.unitPrice) * item.qty)}</b>
              </li>
            ))}
          </ul>
          <dl className="account-totals">
            <div><dt>Ara toplam</dt><dd>{formatMoney(order.subtotal)}</dd></div>
            <div><dt>Kargo</dt><dd>{formatMoney(order.shippingTotal)}</dd></div>
            {Number(order.discountTotal) > 0 && (
              <div><dt>İndirim</dt><dd>-{formatMoney(order.discountTotal)}</dd></div>
            )}
            <div className="is-grand"><dt>Toplam</dt><dd>{formatMoney(order.grandTotal)}</dd></div>
          </dl>
        </div>

        <div className="account-side-stack">
          <div className="account-panel">
            <h3>Teslimat</h3>
            <p>
              <strong>{order.fullName}</strong><br />
              {order.phone}<br />
              {order.email}
            </p>
            <p className="muted">
              {[addr.line1, addr.district, addr.city, addr.postalCode].filter(Boolean).join(", ")}
            </p>
          </div>

          {ship && (ship.trackingNo || ship.carrier) && (
            <div className="account-panel">
              <h3>Kargo</h3>
              {ship.carrier && <p>Firma: {ship.carrier}</p>}
              {ship.trackingNo && <p>Takip no: <strong>{ship.trackingNo}</strong></p>}
              <p className="muted">Durum: {ship.status}</p>
            </div>
          )}

          {awaiting && (
            <div className="account-panel is-highlight">
              <h3>Havale bilgileri</h3>
              <p>Açıklamaya <strong>{order.orderNo}</strong> yazın.</p>
              {banks.map((b) => (
                <p key={b.id}>
                  <strong>{b.bankName}</strong><br />
                  {b.accountHolder}<br />
                  <code>{b.iban}</code>
                </p>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

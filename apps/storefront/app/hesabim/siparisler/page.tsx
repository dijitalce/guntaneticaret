import Link from "next/link";
import { redirect } from "next/navigation";
import { and, desc, eq } from "drizzle-orm";
import { db, orders } from "@guntan/db";
import { getTenant } from "../../../src/tenant";
import { getCurrentCustomer } from "../../../src/customer";
import { formatDateTr, formatMoney, orderStatusLabel, orderStatusTone } from "../../../src/order-labels";

export default async function OrdersPage() {
  const tenant = await getTenant();
  const user = await getCurrentCustomer();
  if (!user) redirect("/hesabim");

  const rows = await db
    .select()
    .from(orders)
    .where(and(eq(orders.customerId, user.id), eq(orders.tenantId, tenant.tenant.id)))
    .orderBy(desc(orders.createdAt))
    .limit(50);

  return (
    <section className="account-section">
      <div className="account-section-head">
        <h2>Siparişlerim</h2>
      </div>
      {rows.length === 0 ? (
        <div className="empty-state account-empty">
          <h3>Sipariş bulunamadı</h3>
          <p>İlk siparişini verdikten sonra durumunu buradan takip edebilirsin.</p>
          <Link className="btn btn-primary" href="/">Alışverişe başla</Link>
        </div>
      ) : (
        <ul className="account-order-list">
          {rows.map((o) => (
            <li key={o.id}>
              <Link href={`/hesabim/siparisler/${o.id}`} className="account-order-row">
                <div>
                  <strong>{o.orderNo}</strong>
                  <span className="muted">{formatDateTr(o.createdAt)} · {o.fullName}</span>
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
  );
}

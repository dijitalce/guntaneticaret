import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db, orders, payments, tenantBankAccounts } from "@guntan/db";
import { cookies } from "next/headers";
import { COOKIE_CUSTOMER_SESSION } from "@guntan/config";
import { getCustomerBySession } from "@guntan/auth";
import { getTenant } from "../../../../src/tenant";

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tenant = await getTenant();
  const token = (await cookies()).get(COOKIE_CUSTOMER_SESSION)?.value;
  const user = token ? await getCustomerBySession(token) : null;
  const [order] = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
  if (!order || order.tenantId !== tenant.tenant.id) notFound();
  if (user && order.customerId && order.customerId !== user.id) notFound();
  const pay = await db.select().from(payments).where(eq(payments.orderId, order.id));
  const banks = await db.select().from(tenantBankAccounts).where(eq(tenantBankAccounts.tenantId, tenant.tenant.id));
  return (
    <div className="container">
      <h1>Sipariş {order.orderNo}</h1>
      <p>Durum: {order.status}</p>
      <p>Tutar: {order.grandTotal} TL</p>
      {pay[0]?.status === "awaiting" && (
        <section className="card" style={{ padding: "1rem" }}>
          <h2>Havale bilgileri</h2>
          <p>Açıklama olarak <strong>{order.orderNo}</strong> yazın.</p>
          {banks.map((b) => (
            <p key={b.id}>{b.bankName} — {b.accountHolder}<br />{b.iban}</p>
          ))}
        </section>
      )}
    </div>
  );
}

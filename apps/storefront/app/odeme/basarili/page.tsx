import { eq } from "drizzle-orm";
import { db, orders, tenantBankAccounts } from "@guntan/db";
import { getTenant } from "../../../src/tenant";

export default async function SuccessPage({ searchParams }: { searchParams: Promise<{ order?: string }> }) {
  const { order: orderNo } = await searchParams;
  const tenant = await getTenant();
  const [order] = orderNo ? await db.select().from(orders).where(eq(orders.orderNo, orderNo)).limit(1) : [];
  const banks = await db.select().from(tenantBankAccounts).where(eq(tenantBankAccounts.tenantId, tenant.tenant.id));
  return (
    <div className="container">
      <h1>Siparişiniz alındı</h1>
      {order && <p>Sipariş no: <strong>{order.orderNo}</strong> — {order.grandTotal} TL</p>}
      <div className="card" style={{ padding: "1rem" }}>
        <h2>Havale / EFT</h2>
        <p>Açıklama alanına sipariş numaranızı yazın.</p>
        {banks.map((b) => (
          <p key={b.id}>{b.bankName}<br />{b.accountHolder}<br />{b.iban}</p>
        ))}
      </div>
    </div>
  );
}

import { desc } from "drizzle-orm";
import { db, orders, tenants } from "@guntan/db";
import { AdminShell, requireAdmin } from "@/src/shell";

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ tenant?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  const tenantRows = await db.select().from(tenants);
  const rows = await db.select().from(orders).orderBy(desc(orders.createdAt)).limit(100);
  const filtered = sp.tenant ? rows.filter((o) => o.tenantId === sp.tenant) : rows;
  const nameBy = Object.fromEntries(tenantRows.map((t) => [t.id, t.name]));
  return (
    <AdminShell>
      <h1>Siparişler</h1>
      <form>
        <select className="select" name="tenant" defaultValue={sp.tenant ?? ""}>
          <option value="">Tüm siteler</option>
          {tenantRows.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <button className="btn btn-secondary" type="submit">Filtrele</button>
      </form>
      <table className="table">
        <thead><tr><th>No</th><th>Site</th><th>Tutar</th><th>Durum</th><th></th></tr></thead>
        <tbody>
          {filtered.map((o) => (
            <tr key={o.id}>
              <td>{o.orderNo}</td>
              <td>{nameBy[o.tenantId]}</td>
              <td>{o.grandTotal}</td>
              <td>{o.status}</td>
              <td>
                {o.status === "pending_payment" && (
                  <form action={`/api/orders/${o.id}/confirm`} method="post">
                    <button className="btn btn-primary" type="submit">Ödeme alındı</button>
                  </form>
                )}
                {o.status === "pending_payment" && (
                  <form action={`/api/orders/${o.id}/cancel`} method="post">
                    <button className="btn btn-secondary" type="submit">İptal</button>
                  </form>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </AdminShell>
  );
}

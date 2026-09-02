import { count, eq } from "drizzle-orm";
import { db, orders, products, tenants, xmlImportRuns } from "@guntan/db";
import { AdminShell, requireAdmin } from "@/src/shell";
import { desc } from "drizzle-orm";

export default async function DashboardPage() {
  await requireAdmin();
  const [productCount] = await db.select({ n: count() }).from(products);
  const [activeCount] = await db.select({ n: count() }).from(products).where(eq(products.status, "active"));
  const [oos] = await db.select({ n: count() }).from(products).where(eq(products.stockStatus, "out_of_stock"));
  const [orderCount] = await db.select({ n: count() }).from(orders);
  const [tenantCount] = await db.select({ n: count() }).from(tenants);
  const lastRuns = await db.select().from(xmlImportRuns).orderBy(desc(xmlImportRuns.createdAt)).limit(5);

  return (
    <AdminShell>
      <h1>Dashboard</h1>
      <div className="kpis">
        {[
          ["Toplam ürün", productCount?.n],
          ["Aktif", activeCount?.n],
          ["Stoksuz", oos?.n],
          ["Sipariş", orderCount?.n],
          ["Tenant", tenantCount?.n],
        ].map(([l, v]) => (
          <div key={String(l)} className="card kpi"><div>{l}</div><strong style={{ fontSize: "1.4rem" }}>{Number(v)}</strong></div>
        ))}
      </div>
      <h2>Son XML import</h2>
      <table className="table">
        <thead><tr><th>Durum</th><th>Toplam</th><th>Eklenen</th><th>Güncellenen</th></tr></thead>
        <tbody>
          {lastRuns.map((r) => (
            <tr key={r.id}><td>{r.status}</td><td>{r.total}</td><td>{r.createdCount}</td><td>{r.updatedCount}</td></tr>
          ))}
        </tbody>
      </table>
    </AdminShell>
  );
}

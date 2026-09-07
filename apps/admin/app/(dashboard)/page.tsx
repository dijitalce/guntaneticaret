import { count, eq, desc } from "drizzle-orm";
import Link from "next/link";
import { db, orders, products, tenants, xmlImportRuns } from "@guntan/db";
import { EmptyState, PageHeader, Panel, QuickLink, StatusBadge, statusTone } from "@/src/ui";

export const metadata = { title: "Özet" };

export default async function DashboardPage() {
  const [productCount] = await db.select({ n: count() }).from(products);
  const [activeCount] = await db.select({ n: count() }).from(products).where(eq(products.status, "active"));
  const [oos] = await db.select({ n: count() }).from(products).where(eq(products.stockStatus, "out_of_stock"));
  const [orderCount] = await db.select({ n: count() }).from(orders);
  const [pendingOrders] = await db
    .select({ n: count() })
    .from(orders)
    .where(eq(orders.status, "pending_payment"));
  const [tenantCount] = await db.select({ n: count() }).from(tenants);
  const lastRuns = await db.select().from(xmlImportRuns).orderBy(desc(xmlImportRuns.createdAt)).limit(6);

  const stats = [
    { label: "Toplam ürün", value: productCount?.n, hint: "Katalogdaki tüm kayıtlar" },
    { label: "Aktif ürün", value: activeCount?.n, hint: "Vitrinde görünenler" },
    { label: "Stoksuz", value: oos?.n, hint: "Stok durumu kritik" },
    { label: "Sipariş", value: orderCount?.n, hint: pendingOrders?.n ? `${pendingOrders.n} ödeme bekliyor` : "Tüm zamanlar" },
    { label: "Siteler", value: tenantCount?.n, hint: "Multi-tenant domainler" },
  ];

  return (
    <>
      <PageHeader
        title="Özet"
        description="Güntan ekosisteminin anlık durumu. Siparişleri, kataloğu ve XML senkronunu buradan takip edin."
      />

      <div className="kpis">
        {stats.map((s) => (
          <div key={s.label} className="kpi">
            <div className="kpi-label">{s.label}</div>
            <strong>{Number(s.value ?? 0).toLocaleString("tr-TR")}</strong>
            <div className="kpi-hint">{s.hint}</div>
          </div>
        ))}
      </div>

      <div className="quick-grid">
        <QuickLink href="/orders" title="Siparişler" hint="Ödeme onayı ve iptaller" />
        <QuickLink href="/catalog/products" title="Ürünler" hint="Son güncellenen 100 kayıt" />
        <QuickLink href="/tenants" title="Siteler" hint="Domain ve görünürlük" />
        <QuickLink href="/integrations/xml" title="XML senkron" hint="Feed çalıştır ve hataları gör" />
      </div>

      <Panel title="Son XML import çalışmaları" action={<Link className="btn btn-secondary" href="/integrations/xml">Tümü</Link>}>
        {lastRuns.length === 0 ? (
          <EmptyState title="Henüz import yok" description="XML feed’lerini senkronize ettiğinizde sonuçlar burada görünür." />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Durum</th>
                  <th>Toplam</th>
                  <th>Eklenen</th>
                  <th>Güncellenen</th>
                  <th>Hata</th>
                </tr>
              </thead>
              <tbody>
                {lastRuns.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <StatusBadge tone={statusTone(r.status)}>{r.status}</StatusBadge>
                    </td>
                    <td>{r.total}</td>
                    <td>{r.createdCount}</td>
                    <td>{r.updatedCount}</td>
                    <td>{r.failedCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </>
  );
}

import Link from "next/link";
import { desc } from "drizzle-orm";
import { db, orders, tenants } from "@guntan/db";
import { orderStatusLabel } from "@guntan/ecommerce";
import { withBase } from "@/src/paths";
import { EmptyState, PageHeader, Panel, StatusBadge, formatTry, statusTone } from "@/src/ui";

export const metadata = { title: "Siparişler" };

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ tenant?: string; status?: string }>;
}) {
  const sp = await searchParams;
  const tenantRows = await db.select().from(tenants);
  const rows = await db.select().from(orders).orderBy(desc(orders.createdAt)).limit(100);
  const filtered = rows.filter((o) => {
    if (sp.tenant && o.tenantId !== sp.tenant) return false;
    if (sp.status && o.status !== sp.status) return false;
    return true;
  });
  const nameBy = Object.fromEntries(tenantRows.map((t) => [t.id, t.name]));

  return (
    <>
      <PageHeader
        title="Siparişler"
        description="Son 100 sipariş. Detaya girerek ödeme, hazırlık, kargo ve teslim adımlarını yönetin."
      />

      <Panel>
        <form className="toolbar" method="get">
          <div className="field">
            <label htmlFor="tenant">Site</label>
            <select id="tenant" className="select" name="tenant" defaultValue={sp.tenant ?? ""}>
              <option value="">Tüm siteler</option>
              {tenantRows.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="status">Durum</label>
            <select id="status" className="select" name="status" defaultValue={sp.status ?? ""}>
              <option value="">Tümü</option>
              <option value="pending_payment">Ödeme bekliyor</option>
              <option value="paid">Ödendi</option>
              <option value="preparing">Hazırlanıyor</option>
              <option value="shipped">Kargoda</option>
              <option value="completed">Tamamlandı</option>
              <option value="cancelled">İptal</option>
            </select>
          </div>
          <button className="btn btn-secondary" type="submit">
            Filtrele
          </button>
        </form>

        {filtered.length === 0 ? (
          <EmptyState title="Sipariş bulunamadı" description="Filtreyi temizleyin veya yeni siparişleri bekleyin." />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>No</th>
                  <th>Müşteri</th>
                  <th>Site</th>
                  <th>Tutar</th>
                  <th>Durum</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((o) => (
                  <tr key={o.id}>
                    <td>
                      <Link href={`/orders/${o.id}`}>{o.orderNo}</Link>
                    </td>
                    <td>
                      <div>{o.fullName}</div>
                      <div style={{ fontSize: "0.78rem", color: "#6b7280" }}>{o.email}</div>
                    </td>
                    <td>{nameBy[o.tenantId] ?? "—"}</td>
                    <td>{formatTry(o.grandTotal)}</td>
                    <td>
                      <StatusBadge tone={statusTone(o.status)}>{orderStatusLabel(o.status)}</StatusBadge>
                    </td>
                    <td>
                      <div className="row-actions">
                        <Link className="btn btn-secondary" href={`/orders/${o.id}`}>
                          Detay
                        </Link>
                        {o.status === "pending_payment" && (
                          <form action={withBase(`/api/orders/${o.id}/confirm`)} method="post">
                            <button className="btn btn-primary" type="submit">
                              Ödeme alındı
                            </button>
                          </form>
                        )}
                      </div>
                    </td>
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

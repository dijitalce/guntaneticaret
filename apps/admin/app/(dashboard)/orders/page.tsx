import { desc } from "drizzle-orm";
import { db, orders, tenants } from "@guntan/db";
import { withBase } from "@/src/paths";
import { EmptyState, PageHeader, Panel, StatusBadge, formatTry, statusTone } from "@/src/ui";

export const metadata = { title: "Siparişler" };

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ tenant?: string }> }) {
  const sp = await searchParams;
  const tenantRows = await db.select().from(tenants);
  const rows = await db.select().from(orders).orderBy(desc(orders.createdAt)).limit(100);
  const filtered = sp.tenant ? rows.filter((o) => o.tenantId === sp.tenant) : rows;
  const nameBy = Object.fromEntries(tenantRows.map((t) => [t.id, t.name]));

  return (
    <>
      <PageHeader
        title="Siparişler"
        description="Son 100 sipariş. Havale bekleyenleri onaylayın veya iptal edin."
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
                      <strong>{o.orderNo}</strong>
                    </td>
                    <td>{nameBy[o.tenantId] ?? "—"}</td>
                    <td>{formatTry(o.grandTotal)}</td>
                    <td>
                      <StatusBadge tone={statusTone(o.status)}>{o.status}</StatusBadge>
                    </td>
                    <td>
                      {o.status === "pending_payment" ? (
                        <div className="row-actions">
                          <form action={withBase(`/api/orders/${o.id}/confirm`)} method="post">
                            <button className="btn btn-primary" type="submit">
                              Ödeme alındı
                            </button>
                          </form>
                          <form action={withBase(`/api/orders/${o.id}/cancel`)} method="post">
                            <button className="btn btn-secondary" type="submit">
                              İptal
                            </button>
                          </form>
                        </div>
                      ) : null}
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

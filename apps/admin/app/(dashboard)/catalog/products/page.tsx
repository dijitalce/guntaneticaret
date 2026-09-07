import { desc } from "drizzle-orm";
import { db, products } from "@guntan/db";
import { AdminShell, requireAdmin } from "@/src/shell";
import { EmptyState, PageHeader, Panel, StatusBadge, formatTry, statusTone } from "@/src/ui";

export const metadata = { title: "Ürünler" };

export default async function ProductsPage() {
  await requireAdmin();
  const rows = await db.select().from(products).orderBy(desc(products.updatedAt)).limit(100);

  return (
    <AdminShell>
      <PageHeader
        title="Ürünler"
        description="Son güncellenen 100 ürün. Detaylı arama vitrin ve XML senkron üzerinden yönetilir."
      />

      <Panel>
        {rows.length === 0 ? (
          <EmptyState title="Ürün yok" description="XML import veya katalog senkronu çalıştırın." />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>Ad</th>
                  <th>Fiyat</th>
                  <th>Stok</th>
                  <th>Durum</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <code style={{ fontSize: "0.8rem" }}>{p.sku}</code>
                    </td>
                    <td>{p.name}</td>
                    <td>{formatTry(p.price)}</td>
                    <td>
                      <StatusBadge tone={p.stockStatus === "out_of_stock" ? "bad" : "ok"}>
                        {p.stockQty ?? "—"} · {p.stockStatus}
                      </StatusBadge>
                    </td>
                    <td>
                      <StatusBadge tone={statusTone(p.status)}>{p.status}</StatusBadge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </AdminShell>
  );
}

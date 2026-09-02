import { desc } from "drizzle-orm";
import { db, products } from "@guntan/db";
import { AdminShell, requireAdmin } from "@/src/shell";

export default async function ProductsPage() {
  await requireAdmin();
  const rows = await db.select().from(products).orderBy(desc(products.updatedAt)).limit(100);
  return (
    <AdminShell>
      <h1>Ürünler</h1>
      <table className="table">
        <thead><tr><th>SKU</th><th>Ad</th><th>Fiyat</th><th>Stok</th><th>Durum</th></tr></thead>
        <tbody>
          {rows.map((p) => (
            <tr key={p.id}><td>{p.sku}</td><td>{p.name}</td><td>{p.price}</td><td>{p.stockQty}</td><td>{p.status}</td></tr>
          ))}
        </tbody>
      </table>
    </AdminShell>
  );
}

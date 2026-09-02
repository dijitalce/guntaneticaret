import { db, vehicleBrands } from "@guntan/db";
import { AdminShell, requireAdmin } from "@/src/shell";
import { asc } from "drizzle-orm";

export default async function BrandsPage() {
  await requireAdmin();
  const rows = await db.select().from(vehicleBrands).orderBy(asc(vehicleBrands.name));
  return (
    <AdminShell>
      <h1>Araç markaları</h1>
      <table className="table">
        <thead><tr><th>Ad</th><th>Slug</th></tr></thead>
        <tbody>{rows.map((b) => <tr key={b.id}><td>{b.name}</td><td>{b.slug}</td></tr>)}</tbody>
      </table>
    </AdminShell>
  );
}

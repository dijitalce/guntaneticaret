import { db, vehicleModels } from "@guntan/db";
import { AdminShell, requireAdmin } from "@/src/shell";

export default async function ModelsPage() {
  await requireAdmin();
  const rows = await db.select().from(vehicleModels).limit(200);
  return (
    <AdminShell>
      <h1>Modeller</h1>
      <table className="table">
        <thead><tr><th>Ad</th><th>Slug</th></tr></thead>
        <tbody>{rows.map((m) => <tr key={m.id}><td>{m.name}</td><td>{m.slug}</td></tr>)}</tbody>
      </table>
    </AdminShell>
  );
}

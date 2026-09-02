import { db, pages } from "@guntan/db";
import { AdminShell, requireAdmin } from "@/src/shell";

export default async function PagesAdmin() {
  await requireAdmin();
  const rows = await db.select().from(pages).limit(100);
  return (
    <AdminShell>
      <h1>Sayfalar</h1>
      <table className="table">
        <thead><tr><th>Başlık</th><th>Slug</th></tr></thead>
        <tbody>{rows.map((p) => <tr key={p.id}><td>{p.title}</td><td>{p.slug}</td></tr>)}</tbody>
      </table>
    </AdminShell>
  );
}

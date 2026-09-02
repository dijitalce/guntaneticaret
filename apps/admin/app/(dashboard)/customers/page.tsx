import { db, customers } from "@guntan/db";
import { AdminShell, requireAdmin } from "@/src/shell";

export default async function CustomersPage() {
  await requireAdmin();
  const rows = await db.select().from(customers).limit(100);
  return (
    <AdminShell>
      <h1>Müşteriler</h1>
      <table className="table">
        <thead><tr><th>E-posta</th><th>Ad</th></tr></thead>
        <tbody>{rows.map((c) => <tr key={c.id}><td>{c.email}</td><td>{c.firstName} {c.lastName}</td></tr>)}</tbody>
      </table>
    </AdminShell>
  );
}

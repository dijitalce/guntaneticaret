import { db, adminUsers } from "@guntan/db";
import { AdminShell, requireAdmin } from "@/src/shell";

export default async function UsersPage() {
  await requireAdmin();
  const rows = await db.select().from(adminUsers);
  return (
    <AdminShell>
      <h1>Kullanıcılar</h1>
      <table className="table">
        <thead><tr><th>E-posta</th><th>Ad</th></tr></thead>
        <tbody>{rows.map((u) => <tr key={u.id}><td>{u.email}</td><td>{u.name}</td></tr>)}</tbody>
      </table>
    </AdminShell>
  );
}

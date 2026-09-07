import { db, adminUsers } from "@guntan/db";
import { EmptyState, PageHeader, Panel, StatusBadge } from "@/src/ui";

export const metadata = { title: "Kullanıcılar" };

export default async function UsersPage() {
  const rows = await db.select().from(adminUsers);
  return (
    <>
      <PageHeader title="Kullanıcılar" description="Admin panel hesapları." />
      <Panel>
        {rows.length === 0 ? (
          <EmptyState title="Kullanıcı yok" />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>E-posta</th>
                  <th>Ad</th>
                  <th>Durum</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((u) => (
                  <tr key={u.id}>
                    <td>{u.email}</td>
                    <td>{u.name}</td>
                    <td>
                      <StatusBadge tone={u.isActive === "true" ? "ok" : "bad"}>
                        {u.isActive === "true" ? "Aktif" : "Pasif"}
                      </StatusBadge>
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

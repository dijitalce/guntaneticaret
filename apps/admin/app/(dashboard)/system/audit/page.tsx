import { desc } from "drizzle-orm";
import { db, auditLogs } from "@guntan/db";
import { AdminShell, requireAdmin } from "@/src/shell";
import { EmptyState, PageHeader, Panel } from "@/src/ui";

export const metadata = { title: "Audit log" };

export default async function AuditPage() {
  await requireAdmin();
  const rows = await db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(100);
  return (
    <AdminShell>
      <PageHeader title="Audit log" description="Yönetim paneli işlem geçmişi (son 100)." />
      <Panel>
        {rows.length === 0 ? (
          <EmptyState title="Kayıt yok" />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Kim</th>
                  <th>Aksiyon</th>
                  <th>Kayıt</th>
                  <th>Zaman</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td>{r.actorEmail ?? "—"}</td>
                    <td>{r.action}</td>
                    <td>
                      <code style={{ fontSize: "0.78rem" }}>
                        {r.entity}:{r.entityId}
                      </code>
                    </td>
                    <td>{r.createdAt.toLocaleString("tr-TR")}</td>
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

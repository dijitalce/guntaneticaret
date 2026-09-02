import { desc } from "drizzle-orm";
import { db, auditLogs } from "@guntan/db";
import { AdminShell, requireAdmin } from "@/src/shell";

export default async function AuditPage() {
  await requireAdmin();
  const rows = await db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(100);
  return (
    <AdminShell>
      <h1>Audit log</h1>
      <table className="table">
        <thead><tr><th>Kim</th><th>Aksiyon</th><th>Kayıt</th><th>Zaman</th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}><td>{r.actorEmail}</td><td>{r.action}</td><td>{r.entity}:{r.entityId}</td><td>{r.createdAt.toISOString()}</td></tr>
          ))}
        </tbody>
      </table>
    </AdminShell>
  );
}

import { desc } from "drizzle-orm";
import { db, xmlFeeds, xmlImportRuns, xmlImportRowErrors } from "@guntan/db";
import { AdminShell, requireAdmin } from "@/src/shell";

export default async function XmlPage() {
  await requireAdmin();
  const feeds = await db.select().from(xmlFeeds);
  const runs = await db.select().from(xmlImportRuns).orderBy(desc(xmlImportRuns.createdAt)).limit(20);
  const errors = await db.select().from(xmlImportRowErrors).orderBy(desc(xmlImportRowErrors.createdAt)).limit(20);
  return (
    <AdminShell>
      <h1>XML import</h1>
      {feeds.map((f) => (
        <form key={f.id} action={`/api/xml/${f.id}/run`} method="post" className="card" style={{ padding: "1rem", marginBottom: "0.75rem" }}>
          <strong>{f.name}</strong>
          <p>{f.filePath ?? f.url}</p>
          <button className="btn btn-primary">Şimdi senkronize et</button>
        </form>
      ))}
      <h2>Çalışmalar</h2>
      <table className="table">
        <thead><tr><th>Durum</th><th>Toplam</th><th>Eklenen</th><th>Güncellenen</th><th>Aynı</th><th>Hata</th><th>Pasif</th></tr></thead>
        <tbody>
          {runs.map((r) => (
            <tr key={r.id}>
              <td>{r.status}</td><td>{r.total}</td><td>{r.createdCount}</td><td>{r.updatedCount}</td>
              <td>{r.unchangedCount}</td><td>{r.failedCount}</td><td>{r.inactivatedCount}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <h2>Hatalar</h2>
      <ul>{errors.map((e) => <li key={e.id}>{e.externalId}: {e.message}</li>)}</ul>
    </AdminShell>
  );
}

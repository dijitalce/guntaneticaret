import { desc } from "drizzle-orm";
import { db, xmlFeeds, xmlImportRuns, xmlImportRowErrors } from "@guntan/db";
import { AdminShell, requireAdmin } from "@/src/shell";
import { withBase } from "@/src/paths";
import { EmptyState, PageHeader, Panel, StatusBadge, statusTone } from "@/src/ui";

export const metadata = { title: "XML senkron" };

export default async function XmlPage() {
  await requireAdmin();
  const feeds = await db.select().from(xmlFeeds);
  const runs = await db.select().from(xmlImportRuns).orderBy(desc(xmlImportRuns.createdAt)).limit(20);
  const errors = await db.select().from(xmlImportRowErrors).orderBy(desc(xmlImportRowErrors.createdAt)).limit(20);

  return (
    <AdminShell>
      <PageHeader
        title="XML senkron"
        description="Tedarikçi feed’lerini çalıştırın; import sonuçlarını ve satır hatalarını izleyin."
      />

      <Panel title="Feed’ler">
        {feeds.length === 0 ? (
          <EmptyState title="Feed tanımlı değil" description="Veritabanına XML feed kaydı eklenince burada görünür." />
        ) : (
          feeds.map((f) => (
            <form key={f.id} action={withBase(`/api/xml/${f.id}/run`)} method="post" className="feed-card">
              <div>
                <strong>{f.name}</strong>
                <p>{f.filePath ?? f.url}</p>
              </div>
              <button className="btn btn-primary" type="submit">
                Şimdi senkronize et
              </button>
            </form>
          ))
        )}
      </Panel>

      <Panel title="Son çalışmalar">
        {runs.length === 0 ? (
          <EmptyState title="Çalışma yok" />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Durum</th>
                  <th>Toplam</th>
                  <th>Eklenen</th>
                  <th>Güncellenen</th>
                  <th>Aynı</th>
                  <th>Hata</th>
                  <th>Pasif</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <StatusBadge tone={statusTone(r.status)}>{r.status}</StatusBadge>
                    </td>
                    <td>{r.total}</td>
                    <td>{r.createdCount}</td>
                    <td>{r.updatedCount}</td>
                    <td>{r.unchangedCount}</td>
                    <td>{r.failedCount}</td>
                    <td>{r.inactivatedCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Panel title="Son hatalar" padded>
        {errors.length === 0 ? (
          <EmptyState title="Hata kaydı yok" />
        ) : (
          <ul style={{ margin: 0, paddingLeft: "1.1rem", display: "grid", gap: "0.45rem" }}>
            {errors.map((e) => (
              <li key={e.id}>
                <code>{e.externalId}</code>: {e.message}
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </AdminShell>
  );
}

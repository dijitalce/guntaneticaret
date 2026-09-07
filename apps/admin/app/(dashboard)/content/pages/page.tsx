import { db, pages } from "@guntan/db";
import { AdminShell, requireAdmin } from "@/src/shell";
import { EmptyState, PageHeader, Panel } from "@/src/ui";

export const metadata = { title: "Sayfalar" };

export default async function PagesAdmin() {
  await requireAdmin();
  const rows = await db.select().from(pages).limit(100);
  return (
    <AdminShell>
      <PageHeader title="Sayfalar" description="Statik içerik sayfaları." />
      <Panel>
        {rows.length === 0 ? (
          <EmptyState title="Sayfa yok" />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Başlık</th>
                  <th>Slug</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => (
                  <tr key={p.id}>
                    <td>{p.title}</td>
                    <td>
                      <code style={{ fontSize: "0.8rem" }}>{p.slug}</code>
                    </td>
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

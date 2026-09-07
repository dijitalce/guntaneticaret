import { asc } from "drizzle-orm";
import { db, vehicleBrands } from "@guntan/db";
import { AdminShell, requireAdmin } from "@/src/shell";
import { EmptyState, PageHeader, Panel } from "@/src/ui";

export const metadata = { title: "Araç markaları" };

export default async function BrandsPage() {
  await requireAdmin();
  const rows = await db.select().from(vehicleBrands).orderBy(asc(vehicleBrands.name));
  return (
    <AdminShell>
      <PageHeader title="Araç markaları" description="Araç markası kataloğu (alfabetik)." />
      <Panel>
        {rows.length === 0 ? (
          <EmptyState title="Marka yok" />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Ad</th>
                  <th>Slug</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((b) => (
                  <tr key={b.id}>
                    <td>{b.name}</td>
                    <td>
                      <code style={{ fontSize: "0.8rem" }}>{b.slug}</code>
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

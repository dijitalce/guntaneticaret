import { db, vehicleModels } from "@guntan/db";
import { EmptyState, PageHeader, Panel } from "@/src/ui";

export const metadata = { title: "Modeller" };

export default async function ModelsPage() {
  const rows = await db.select().from(vehicleModels).limit(200);
  return (
    <>
      <PageHeader title="Modeller" description="İlk 200 araç modeli." />
      <Panel>
        {rows.length === 0 ? (
          <EmptyState title="Model yok" />
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
                {rows.map((m) => (
                  <tr key={m.id}>
                    <td>{m.name}</td>
                    <td>
                      <code style={{ fontSize: "0.8rem" }}>{m.slug}</code>
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

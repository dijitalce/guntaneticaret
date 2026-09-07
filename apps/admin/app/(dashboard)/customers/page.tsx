import { db, customers } from "@guntan/db";
import { EmptyState, PageHeader, Panel } from "@/src/ui";

export const metadata = { title: "Müşteriler" };

export default async function CustomersPage() {
  const rows = await db.select().from(customers).limit(100);
  return (
    <>
      <PageHeader title="Müşteriler" description="Kayıtlı müşteri hesapları (ilk 100)." />
      <Panel>
        {rows.length === 0 ? (
          <EmptyState title="Müşteri yok" />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>E-posta</th>
                  <th>Ad</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => (
                  <tr key={c.id}>
                    <td>{c.email}</td>
                    <td>
                      {c.firstName} {c.lastName}
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

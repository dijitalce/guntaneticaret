import Link from "next/link";
import { db, tenantDomains, tenants } from "@guntan/db";
import { AdminShell, requireAdmin } from "@/src/shell";
import { EmptyState, PageHeader, Panel, StatusBadge, statusTone } from "@/src/ui";

export const metadata = { title: "Siteler" };

export default async function TenantsPage() {
  await requireAdmin();
  const rows = await db.select().from(tenants);
  const domains = await db.select().from(tenantDomains);

  return (
    <AdminShell>
      <PageHeader
        title="Siteler"
        description="Tenant’lar, domain eşlemeleri ve katalog görünürlük modları."
        actions={
          <Link className="btn btn-primary" href="/tenants/new">
            Yeni site
          </Link>
        }
      />

      <Panel>
        {rows.length === 0 ? (
          <EmptyState title="Henüz site yok" description="İlk tenant’ı oluşturarak başlayın." />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Ad</th>
                  <th>Mod</th>
                  <th>Durum</th>
                  <th>Domain</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((t) => (
                  <tr key={t.id}>
                    <td>
                      <Link href={`/tenants/${t.id}`}>{t.name}</Link>
                    </td>
                    <td>
                      <StatusBadge tone="info">{t.visibilityMode}</StatusBadge>
                    </td>
                    <td>
                      <StatusBadge tone={statusTone(t.status)}>{t.status}</StatusBadge>
                    </td>
                    <td>{domains.filter((d) => d.tenantId === t.id).map((d) => d.hostname).join(", ") || "—"}</td>
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

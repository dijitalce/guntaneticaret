import { db, tenantDomains, tenants } from "@guntan/db";
import { AdminShell, requireAdmin } from "@/src/shell";
import Link from "next/link";

export default async function TenantsPage() {
  await requireAdmin();
  const rows = await db.select().from(tenants);
  const domains = await db.select().from(tenantDomains);
  return (
    <AdminShell>
      <h1>Siteler</h1>
      <Link className="btn btn-primary" href="/tenants/new">Yeni site</Link>
      <table className="table">
        <thead><tr><th>Ad</th><th>Mod</th><th>Durum</th><th>Domain</th></tr></thead>
        <tbody>
          {rows.map((t) => (
            <tr key={t.id}>
              <td><Link href={`/tenants/${t.id}`}>{t.name}</Link></td>
              <td>{t.visibilityMode}</td>
              <td>{t.status}</td>
              <td>{domains.filter((d) => d.tenantId === t.id).map((d) => d.hostname).join(", ")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </AdminShell>
  );
}

import { db, brandGroupMembers, brandGroups, vehicleBrands } from "@guntan/db";
import { AdminShell, requireAdmin } from "@/src/shell";
import { EmptyState, PageHeader, Panel } from "@/src/ui";

export const metadata = { title: "Marka grupları" };

export default async function GroupsPage() {
  await requireAdmin();
  const groups = await db.select().from(brandGroups);
  const members = await db.select().from(brandGroupMembers);
  const brands = await db.select().from(vehicleBrands);
  const nameBy = Object.fromEntries(brands.map((b) => [b.id, b.name]));

  return (
    <AdminShell>
      <PageHeader
        title="Marka grupları"
        description="Tenant katalog görünürlüğünde kullanılan marka kümeleri."
      />
      {groups.length === 0 ? (
        <Panel padded>
          <EmptyState title="Grup yok" />
        </Panel>
      ) : (
        groups.map((g) => (
          <div key={g.id} className="panel" style={{ marginBottom: "0.75rem" }}>
            <div className="panel-pad">
              <strong>{g.name}</strong>
              <p style={{ margin: "0.35rem 0 0", color: "#6b7280", fontSize: "0.9rem" }}>
                {members.filter((m) => m.groupId === g.id).map((m) => nameBy[m.brandId]).filter(Boolean).join(", ") || "Üye yok"}
              </p>
            </div>
          </div>
        ))
      )}
    </AdminShell>
  );
}

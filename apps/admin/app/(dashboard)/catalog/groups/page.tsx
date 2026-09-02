import { db, brandGroupMembers, brandGroups, vehicleBrands } from "@guntan/db";
import { AdminShell, requireAdmin } from "@/src/shell";

export default async function GroupsPage() {
  await requireAdmin();
  const groups = await db.select().from(brandGroups);
  const members = await db.select().from(brandGroupMembers);
  const brands = await db.select().from(vehicleBrands);
  const nameBy = Object.fromEntries(brands.map((b) => [b.id, b.name]));
  return (
    <AdminShell>
      <h1>Marka grupları</h1>
      {groups.map((g) => (
        <div key={g.id} className="card" style={{ padding: "1rem", marginBottom: "0.75rem" }}>
          <strong>{g.name}</strong>
          <p>{members.filter((m) => m.groupId === g.id).map((m) => nameBy[m.brandId]).join(", ")}</p>
        </div>
      ))}
    </AdminShell>
  );
}

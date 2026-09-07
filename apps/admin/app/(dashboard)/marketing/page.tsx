import { db, coupons } from "@guntan/db";
import { AdminShell, requireAdmin } from "@/src/shell";
import { PageHeader, Panel } from "@/src/ui";

export const metadata = { title: "Pazarlama" };

export default async function MarketingPage() {
  await requireAdmin();
  const rows = await db.select().from(coupons);
  return (
    <AdminShell>
      <PageHeader title="Pazarlama" description="Kupon ve kampanya özeti." />
      <Panel padded>
        <p style={{ margin: 0, color: "#6b7280" }}>
          Tanımlı kupon: <strong style={{ color: "#12141a" }}>{rows.length}</strong>
        </p>
      </Panel>
    </AdminShell>
  );
}

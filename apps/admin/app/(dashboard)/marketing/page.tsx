import { AdminShell, requireAdmin } from "@/src/shell";
import { db, coupons } from "@guntan/db";

export default async function MarketingPage() {
  await requireAdmin();
  const rows = await db.select().from(coupons);
  return (
    <AdminShell>
      <h1>Pazarlama</h1>
      <p>{rows.length} kupon.</p>
    </AdminShell>
  );
}

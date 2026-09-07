import { db, coupons } from "@guntan/db";
import { PageHeader, Panel } from "@/src/ui";

export const metadata = { title: "Pazarlama" };

export default async function MarketingPage() {
  const rows = await db.select().from(coupons);
  return (
    <>
      <PageHeader title="Pazarlama" description="Kupon ve kampanya özeti." />
      <Panel padded>
        <p style={{ margin: 0, color: "#6b7280" }}>
          Tanımlı kupon: <strong style={{ color: "#12141a" }}>{rows.length}</strong>
        </p>
      </Panel>
    </>
  );
}

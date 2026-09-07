import { db, banners } from "@guntan/db";
import { PageHeader, Panel } from "@/src/ui";

export const metadata = { title: "Bannerlar" };

export default async function BannersPage() {
  const rows = await db.select().from(banners);
  return (
    <>
      <PageHeader
        title="Bannerlar"
        description="Vitrin banner kayıtları. Yeni ekleme site düzenleme ekranından yönetilir."
      />
      <Panel padded>
        <p style={{ margin: 0, color: "#6b7280" }}>
          Toplam <strong style={{ color: "#12141a" }}>{rows.length}</strong> banner kaydı.
        </p>
      </Panel>
    </>
  );
}

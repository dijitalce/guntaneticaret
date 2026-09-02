import { db, banners } from "@guntan/db";
import { AdminShell, requireAdmin } from "@/src/shell";

export default async function BannersPage() {
  await requireAdmin();
  const rows = await db.select().from(banners);
  return (
    <AdminShell>
      <h1>Bannerlar</h1>
      <p>{rows.length} kayıt. Yeni banner tenant düzenleme ekranından yönetilir.</p>
    </AdminShell>
  );
}

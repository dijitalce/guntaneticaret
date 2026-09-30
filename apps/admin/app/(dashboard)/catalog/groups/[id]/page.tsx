import { notFound } from "next/navigation";
import { eq, inArray } from "drizzle-orm";
import { brandGroupMembers, brandGroups, db, tenants } from "@guntan/db";
import { tenantsUsingGroup } from "@/src/brand-groups";
import { GroupForm } from "@/src/group-form";
import { Alert, PageHeader, Panel } from "@/src/ui";

export const metadata = { title: "Marka grubu" };

const OK: Record<string, string> = {
  olusturuldu: "Grup oluşturuldu. Bir siteye atamak için Siteler → site ayarları → Katalog bölümünü kullanın.",
  kaydedildi: "Değişiklikler kaydedildi.",
  derleniyor: "Değişiklikler kaydedildi. Bu grubu kullanan sitelerin marka listesi arka planda güncelleniyor (birkaç dakika sürebilir).",
};

export default async function GroupEditPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string; hata?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const [group] = await db.select().from(brandGroups).where(eq(brandGroups.id, id)).limit(1);
  if (!group) notFound();
  const [members, tenantIds] = await Promise.all([
    db.select({ brandId: brandGroupMembers.brandId }).from(brandGroupMembers).where(eq(brandGroupMembers.groupId, id)),
    tenantsUsingGroup(id),
  ]);
  const usedBy = tenantIds.length
    ? await db.select({ id: tenants.id, name: tenants.name }).from(tenants).where(inArray(tenants.id, tenantIds))
    : [];

  return (
    <>
      <PageHeader
        title={group.name}
        description={usedBy.length ? `Kullanan siteler: ${usedBy.map((t) => t.name).join(", ")}` : "Bu grup henüz hiçbir sitede kullanılmıyor."}
        crumbs={[{ href: "/catalog/groups", label: "Marka grupları" }]}
      />
      {sp.ok && OK[sp.ok] ? <Alert tone="ok">{OK[sp.ok]}</Alert> : null}
      {sp.hata ? <Alert>{sp.hata}</Alert> : null}
      {usedBy.length ? (
        <Alert tone="info">Üyeleri değiştirmek, bu grubu kullanan sitelerde hangi markaların ve ürünlerin görüneceğini değiştirir.</Alert>
      ) : null}
      <div className="form-page is-wide">
        <Panel padded>
          <GroupForm group={group} memberIds={members.map((m) => m.brandId)} />
        </Panel>
      </div>
    </>
  );
}

import { asc } from "drizzle-orm";
import { brandGroupMembers, brandGroups, db, vehicleBrands } from "@guntan/db";
import { NewTenantForm } from "@/src/new-tenant-form";
import { withBase } from "@/src/paths";
import { assetBase, assetUrl } from "@/src/storefront";
import { Alert, PageHeader } from "@/src/ui";

export const metadata = { title: "Yeni site" };

export default async function NewTenantPage({ searchParams }: { searchParams: Promise<{ hata?: string }> }) {
  const sp = await searchParams;
  const [groups, members, brands] = await Promise.all([
    db.select().from(brandGroups).orderBy(asc(brandGroups.name)),
    db.select().from(brandGroupMembers),
    db
      .select({ id: vehicleBrands.id, name: vehicleBrands.name, logoUrl: vehicleBrands.logoUrl, isActive: vehicleBrands.isActive })
      .from(vehicleBrands)
      .orderBy(asc(vehicleBrands.name)),
  ]);
  return (
    <>
      <PageHeader
        title="Yeni site"
        description="Alan adı, SEO, katalog ve marka ayarlarıyla yeni bir vitrin oluşturun."
        crumbs={[{ href: "/tenants", label: "Siteler" }]}
      />
      {sp.hata ? <Alert>{sp.hata}</Alert> : null}
      <NewTenantForm
        action={withBase("/api/tenants")}
        assetBase={assetBase()}
        groups={groups.map((g) => ({ id: g.id, name: g.name, memberIds: members.filter((m) => m.groupId === g.id).map((m) => m.brandId) }))}
        brands={brands.map((b) => ({ id: b.id, name: b.name, logo: assetUrl(b.logoUrl), isActive: b.isActive }))}
      />
    </>
  );
}

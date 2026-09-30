import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { brandGroupMembers, brandGroups, db, tenantCatalogRules, tenants, vehicleBrands } from "@guntan/db";
import { CATALOG_RULE_KIND } from "@guntan/types";
import { BrandLogo } from "@/src/brand-logo";
import { IconEdit, IconGlobe, IconPlus, IconTag } from "@/src/icons";
import { assetUrl } from "@/src/storefront";
import { Alert, EmptyState, PageHeader } from "@/src/ui";

export const metadata = { title: "Marka grupları" };

const MAX_LOGOS = 10;

export default async function GroupsPage({ searchParams }: { searchParams: Promise<{ ok?: string; hata?: string }> }) {
  const sp = await searchParams;
  const [groups, members, brands, rules, tenantRows] = await Promise.all([
    db.select().from(brandGroups).orderBy(asc(brandGroups.name)),
    db.select().from(brandGroupMembers),
    db.select({ id: vehicleBrands.id, name: vehicleBrands.name, logoUrl: vehicleBrands.logoUrl }).from(vehicleBrands).orderBy(asc(vehicleBrands.name)),
    db.select().from(tenantCatalogRules).where(eq(tenantCatalogRules.kind, CATALOG_RULE_KIND.INCLUDE_GROUP)),
    db.select({ id: tenants.id, name: tenants.name }).from(tenants),
  ]);
  const brandBy = new Map(brands.map((b) => [b.id, b]));
  const tenantName = new Map(tenantRows.map((t) => [t.id, t.name]));

  return (
    <>
      <PageHeader
        title="Marka grupları"
        description="Birden fazla markayı tek seferde bir siteye atamak için kullanılır (örn. “Alman markaları”)."
        actions={
          <Link className="btn btn-primary" href="/catalog/groups/new">
            <IconPlus />
            Yeni grup
          </Link>
        }
      />
      {sp.ok === "silindi" ? <Alert tone="ok">Grup silindi.</Alert> : null}
      {sp.hata ? <Alert>{sp.hata}</Alert> : null}

      {groups.length === 0 ? (
        <div className="panel">
          <EmptyState title="Henüz grup yok" description="İlk grubu oluşturup markaları seçin." icon={IconTag} />
        </div>
      ) : (
        <div className="group-grid">
          {groups.map((g) => {
            const list = members
              .filter((m) => m.groupId === g.id)
              .map((m) => brandBy.get(m.brandId))
              .filter((b): b is NonNullable<typeof b> => !!b)
              .sort((a, b) => a.name.localeCompare(b.name, "tr"));
            const usedBy = rules.filter((r) => r.targetId === g.id).map((r) => tenantName.get(r.tenantId)).filter(Boolean);
            return (
              <Link key={g.id} href={`/catalog/groups/${g.id}`} className="group-card">
                <div className="group-card-head">
                  <div>
                    <strong>{g.name}</strong>
                    <span>{list.length} marka</span>
                  </div>
                  <span className="icon-btn" aria-hidden>
                    <IconEdit />
                  </span>
                </div>
                {list.length ? (
                  <div className="logo-stack">
                    {list.slice(0, MAX_LOGOS).map((b) => (
                      <span key={b.id} title={b.name}>
                        <BrandLogo src={assetUrl(b.logoUrl)} name={b.name} size={34} />
                      </span>
                    ))}
                    {list.length > MAX_LOGOS ? <span className="logo-more">+{list.length - MAX_LOGOS}</span> : null}
                  </div>
                ) : (
                  <p className="muted text-sm" style={{ margin: 0 }}>
                    Bu grupta marka yok.
                  </p>
                )}
                <div className="group-card-foot">
                  <IconGlobe width={14} height={14} />
                  {usedBy.length ? `${usedBy.join(", ")} sitesinde kullanılıyor` : "Hiçbir sitede kullanılmıyor"}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}

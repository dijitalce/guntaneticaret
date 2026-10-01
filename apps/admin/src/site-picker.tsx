import Link from "next/link";
import { db, tenantDomains, tenantSettings, tenants } from "@guntan/db";
import { BrandLogo } from "./brand-logo";
import { assetUrl } from "./storefront";

const MAIN_SLUG = "guntan";

export type PickerSite = { id: string; name: string; host: string; logo: string | null };

/** Ana site (Güntan) önce, sonra oluşturulma sırası; etiket olarak vitrindeki site adı. */
export async function loadSites(): Promise<PickerSite[]> {
  const [tenantRows, domainRows, settingRows] = await Promise.all([
    db.select({ id: tenants.id, name: tenants.name, slug: tenants.slug, createdAt: tenants.createdAt }).from(tenants),
    db.select({ tenantId: tenantDomains.tenantId, hostname: tenantDomains.hostname, isPrimary: tenantDomains.isPrimary }).from(tenantDomains),
    db.select({ tenantId: tenantSettings.tenantId, siteName: tenantSettings.siteName, logoUrl: tenantSettings.logoUrl, faviconUrl: tenantSettings.faviconUrl }).from(tenantSettings),
  ]);
  return tenantRows
    .map((t) => {
      const s = settingRows.find((r) => r.tenantId === t.id);
      const ds = domainRows.filter((d) => d.tenantId === t.id);
      const primary = ds.find((d) => d.isPrimary) ?? ds[0];
      return {
        id: t.id,
        main: t.slug === MAIN_SLUG,
        name: s?.siteName?.trim() || t.name,
        host: primary?.hostname ?? "Alan adı yok",
        logo: assetUrl(s?.faviconUrl ?? s?.logoUrl),
        createdAt: t.createdAt,
      };
    })
    .sort((a, b) => Number(b.main) - Number(a.main) || a.createdAt.getTime() - b.createdAt.getTime() || a.name.localeCompare(b.name, "tr"))
    .map(({ id, name, host, logo }) => ({ id, name, host, logo }));
}

export function SitePicker({ sites, current, href }: { sites: PickerSite[]; current: string; href: (id: string) => string }) {
  if (sites.length < 2) return null;
  return (
    <nav className="int-sites" aria-label="Site seçimi">
      {sites.map((t) => (
        <Link key={t.id} href={href(t.id)} className={t.id === current ? "is-active" : undefined} aria-current={t.id === current ? "page" : undefined}>
          <BrandLogo src={t.logo} name={t.name} size={32} />
          <span>
            <strong>{t.name}</strong>
            <small>{t.host}</small>
          </span>
        </Link>
      ))}
    </nav>
  );
}

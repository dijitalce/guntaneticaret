import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { banners, db, tenants } from "@guntan/db";
import { BANNER_PLACEMENTS, placementLabel } from "@/src/content-forms";
import { IconPlus } from "@/src/icons";
import { StatusToggle } from "@/src/status-toggle";
import { Alert, EmptyState, PageHeader, Panel } from "@/src/ui";
import { TabNav } from "@/src/ui-ext";

export const metadata = { title: "Bannerlar" };
export const dynamic = "force-dynamic";

export default async function BannersPage({ searchParams }: { searchParams: Promise<{ site?: string; ok?: string; hata?: string }> }) {
  const sp = await searchParams;
  const tenantRows = await db.select({ id: tenants.id, name: tenants.name }).from(tenants).orderBy(asc(tenants.name));
  const tenantId = tenantRows.find((t) => t.id === sp.site)?.id ?? null;
  const tenantName = new Map(tenantRows.map((t) => [t.id, t.name]));
  const rows = await db
    .select()
    .from(banners)
    .where(tenantId ? eq(banners.tenantId, tenantId) : undefined)
    .orderBy(asc(banners.placement), asc(banners.sortOrder), asc(banners.createdAt));

  return (
    <>
      <PageHeader
        title="Bannerlar"
        description="Ana sayfa slider ve kampanya görselleri. Slider’da aktif banner yoksa varsayılan görseller gösterilir."
        actions={
          <Link className="btn btn-primary" href={tenantId ? `/content/banners/new?site=${tenantId}` : "/content/banners/new"}>
            <IconPlus />
            Yeni banner
          </Link>
        }
      />
      {sp.ok === "olusturuldu" ? <Alert tone="ok">Banner eklendi. Sitede 1 dakika içinde görünür.</Alert> : null}
      {sp.ok === "silindi" ? <Alert tone="ok">Banner silindi.</Alert> : null}
      {sp.ok === "kaydedildi" ? <Alert tone="ok">Banner güncellendi.</Alert> : null}
      {sp.hata ? <Alert>{sp.hata}</Alert> : null}
      {tenantRows.length > 1 ? (
        <TabNav
          label="Site"
          active={tenantId ?? "all"}
          items={[{ key: "all", label: "Tüm siteler", href: "/content/banners" }, ...tenantRows.map((t) => ({ key: t.id, label: t.name, href: `/content/banners?site=${t.id}` }))]}
        />
      ) : null}
      {rows.length === 0 ? (
        <Panel>
          <EmptyState title="Henüz banner yok" description="İlk kampanya görselinizi ekleyerek ana sayfa slider’ını özelleştirin." />
        </Panel>
      ) : (
        BANNER_PLACEMENTS.map((pl) => {
          const list = rows.filter((r) => r.placement === pl.key);
          if (!list.length) return null;
          return (
            <Panel key={pl.key} title={placementLabel(pl.key)} description={pl.hint}>
              <div className="banner-grid">
                {list.map((b) => (
                  <article key={b.id} className={`banner-card${b.isActive ? "" : " is-off"}`}>
                    <Link href={`/content/banners/${b.id}`} className="banner-thumb">
                      <img src={b.imageUrl} alt={b.title} loading="lazy" />
                    </Link>
                    <div className="banner-body">
                      <strong className="truncate">{b.title}</strong>
                      <span className="muted text-sm truncate">
                        {tenantRows.length > 1 ? `${tenantName.get(b.tenantId) ?? "—"} · ` : ""}Sıra {b.sortOrder}
                        {b.href ? ` · ${b.href}` : ""}
                      </span>
                    </div>
                    <div className="banner-foot">
                      <StatusToggle
                        action={`/api/content/banners/${b.id}`}
                        fields={{ _action: "toggle" }}
                        on={Boolean(b.isActive)}
                        tone={b.isActive ? "ok" : "neutral"}
                        label={b.isActive ? "Aktif" : "Pasif"}
                        turnOn="Yayına al"
                        turnOff="Kapat"
                      />
                      <Link className="btn btn-secondary btn-sm" href={`/content/banners/${b.id}`}>
                        Düzenle
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            </Panel>
          );
        })
      )}
      {rows.some((r) => !BANNER_PLACEMENTS.some((p) => p.key === r.placement)) ? (
        <Panel title="Diğer konumlar" description="Bu konumlar sitede gösterilmiyor; düzenleyip geçerli bir konum seçin.">
          <div className="banner-grid">
            {rows
              .filter((r) => !BANNER_PLACEMENTS.some((p) => p.key === r.placement))
              .map((b) => (
                <article key={b.id} className="banner-card is-off">
                  <Link href={`/content/banners/${b.id}`} className="banner-thumb">
                    <img src={b.imageUrl} alt={b.title} loading="lazy" />
                  </Link>
                  <div className="banner-body">
                    <strong className="truncate">{b.title}</strong>
                    <span className="muted text-sm">{placementLabel(b.placement)}</span>
                  </div>
                </article>
              ))}
          </div>
        </Panel>
      ) : null}
    </>
  );
}

import Link from "next/link";
import { asc, count } from "drizzle-orm";
import { db, tenantDomains, tenantSettings, tenants, tenantVisibleBrands } from "@guntan/db";
import { BrandLogo } from "@/src/brand-logo";
import { IconExternal, IconGlobe, IconPlus } from "@/src/icons";
import { ScoreRing } from "@/src/seo-checklist";
import { assetUrl } from "@/src/storefront";
import { TENANT_STATUS_META, seoAudit } from "@/src/tenant-seo";
import { Alert, EmptyState, PageHeader, StatusBadge } from "@/src/ui";

export const metadata = { title: "Siteler" };

export default async function TenantsPage({ searchParams }: { searchParams: Promise<{ ok?: string; hata?: string }> }) {
  const sp = await searchParams;
  const [rows, domains, settings, brandCounts] = await Promise.all([
    db.select().from(tenants).orderBy(asc(tenants.name)),
    db.select().from(tenantDomains),
    db.select().from(tenantSettings),
    db.select({ tenantId: tenantVisibleBrands.tenantId, n: count() }).from(tenantVisibleBrands).groupBy(tenantVisibleBrands.tenantId),
  ]);
  const settingsBy = new Map(settings.map((s) => [s.tenantId, s]));
  const brandsBy = new Map(brandCounts.map((b) => [b.tenantId, b.n]));

  const cards = rows.map((t) => {
    const s = settingsBy.get(t.id);
    const ds = domains.filter((d) => d.tenantId === t.id);
    const primary = ds.find((d) => d.isPrimary) ?? ds[0];
    const audit = seoAudit({
      status: t.status,
      siteName: s?.siteName ?? t.name,
      defaultMetaTitle: s?.defaultMetaTitle ?? null,
      defaultMetaDescription: s?.defaultMetaDescription ?? null,
      seoTitleTemplate: s?.seoTitleTemplate ?? null,
      seoContent: s?.seoContent ?? null,
      ogImageUrl: s?.ogImageUrl ?? null,
      faviconUrl: s?.faviconUrl ?? null,
      logoUrl: s?.logoUrl ?? null,
      phone: s?.phone ?? null,
      address: s?.address ?? null,
      gaId: s?.gaId ?? null,
      gtmId: s?.gtmId ?? null,
      social: (s?.socialJson ?? {}) as Record<string, string>,
      hasPrimaryDomain: !!primary,
    });
    return { t, s, ds, primary, audit, todo: audit.checks.filter((c) => !c.ok).length };
  });
  const active = cards.filter((c) => c.t.status === "active").length;
  const avg = cards.length ? Math.round(cards.reduce((a, c) => a + c.audit.score, 0) / cards.length) : 0;

  return (
    <>
      <PageHeader
        title="Siteler"
        description={
          cards.length
            ? `${cards.length} site · ${active} yayında · ortalama SEO puanı ${avg}`
            : "Her site kendi alan adı, markası, SEO ayarları ve kataloğuyla yayınlanır."
        }
        actions={
          <Link className="btn btn-primary" href="/tenants/new">
            <IconPlus />
            Yeni site
          </Link>
        }
      />
      {sp.ok === "silindi" ? <Alert tone="ok">Site silindi.</Alert> : null}
      {sp.hata ? <Alert>{sp.hata}</Alert> : null}

      {cards.length === 0 ? (
        <div className="panel">
          <EmptyState title="Henüz site yok" description="İlk siteyi oluşturarak başlayın." icon={IconGlobe} />
        </div>
      ) : (
        <div className="site-grid">
          {cards.map(({ t, s, ds, primary, audit, todo }) => {
            const status = TENANT_STATUS_META[t.status] ?? TENANT_STATUS_META.draft!;
            const name = s?.siteName ?? t.name;
            return (
              <article key={t.id} className="site-card">
                <Link href={`/tenants/${t.id}`} className="site-card-main">
                  <BrandLogo src={assetUrl(s?.faviconUrl ?? s?.logoUrl)} name={name} size={44} />
                  <div>
                    <strong>{name}</strong>
                    <span>{primary?.hostname ?? "Alan adı yok"}</span>
                  </div>
                  <ScoreRing score={audit.score} tone={audit.tone} size={46} />
                </Link>
                <div className="site-card-meta">
                  <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
                  <StatusBadge tone="neutral">
                    {t.visibilityMode === "ALL" ? "Tüm katalog" : `${(brandsBy.get(t.id) ?? 0).toLocaleString("tr-TR")} marka`}
                  </StatusBadge>
                  {ds.length > 1 ? <StatusBadge tone="neutral">{ds.length} alan adı</StatusBadge> : null}
                </div>
                <p className="site-card-desc">{s?.defaultMetaDescription || <em>Meta açıklama girilmemiş.</em>}</p>
                <div className="site-card-foot">
                  <Link href={`/tenants/${t.id}?sekme=seo`} className={todo ? "text-warn" : "text-ok"}>
                    {todo ? `${todo} SEO eksiği` : "SEO tamam"}
                  </Link>
                  <div className="icon-actions">
                    {primary && t.status !== "draft" ? (
                      <a className="icon-btn" href={`https://${primary.hostname}`} target="_blank" rel="noreferrer" title="Siteyi aç" aria-label="Siteyi aç">
                        <IconExternal />
                      </a>
                    ) : null}
                    <Link className="btn btn-secondary btn-sm" href={`/tenants/${t.id}`}>
                      Düzenle
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </>
  );
}

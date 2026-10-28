import Link from "next/link";
import { asc } from "drizzle-orm";
import { blogAdminCounts, db, getTenantContext, listBlogPostsAdmin, tenants } from "@guntan/db";
import { IconPlus } from "@/src/icons";
import { assetUrl } from "@/src/storefront";
import { withBase } from "@/src/paths";
import { StatusToggle } from "@/src/status-toggle";
import { Alert, EmptyState, Kpi, PageHeader, Panel, StatusBadge, formatDate } from "@/src/ui";
import { Pager, TabNav, buildHref, pageNumber } from "@/src/ui-ext";

export const metadata = { title: "Blog" };
export const dynamic = "force-dynamic";

const PER = 30;

export default async function BlogAdmin({
  searchParams,
}: {
  searchParams: Promise<{ site?: string; durum?: string; q?: string; sayfa?: string; ok?: string; adet?: string; hata?: string }>;
}) {
  const sp = await searchParams;
  const tenantRows = await db.select({ id: tenants.id, name: tenants.name }).from(tenants).orderBy(asc(tenants.name));
  const tenantId = tenantRows.find((t) => t.id === sp.site)?.id ?? null;
  const tenantName = new Map(tenantRows.map((t) => [t.id, t.name]));
  const page = pageNumber(sp.sayfa);
  const [list, counts] = await Promise.all([
    listBlogPostsAdmin({ tenantId, status: sp.durum, q: sp.q?.trim() || null, limit: PER, offset: (page - 1) * PER }),
    blogAdminCounts(tenantId),
  ]);
  const urls = new Map<string, string>();
  for (const id of new Set(list.items.map((p) => p.tenantId))) urls.set(id, (await getTenantContext(id)).url);
  const now = Date.now();
  const base = { site: tenantId ?? undefined, q: sp.q };

  return (
    <>
      <PageHeader
        title="Blog"
        description="Arama motorlarından trafik çekmek için rehber ve bilgi yazıları. /blog altında yayınlanır, site haritasına ve RSS'e otomatik eklenir."
        actions={
          <>
            <form method="post" action={withBase("/api/content/blog/seed-plan")}>
              {tenantId ? <input type="hidden" name="site" value={tenantId} /> : null}
              <button className="btn btn-secondary" type="submit" title="SEO haritasındaki 48 konuyu taslak olarak ekler; var olanlara dokunmaz">
                SEO planını yükle
              </button>
            </form>
            <Link className="btn btn-secondary" href="/content/blog/categories">
              Kategoriler
            </Link>
            <Link className="btn btn-primary" href={tenantId ? `/content/blog/new?site=${tenantId}` : "/content/blog/new"}>
              <IconPlus />
              Yeni yazı
            </Link>
          </>
        }
      />
      {sp.ok === "silindi" ? <Alert tone="ok">Yazı silindi.</Alert> : null}
      {sp.ok === "plan" ? <Alert tone="ok">SEO planından {sp.adet ?? "0"} yeni taslak eklendi. Metinleri tamamlayıp yayınlayın.</Alert> : null}
      {sp.ok === "kaydedildi" ? <Alert tone="ok">Yazı güncellendi.</Alert> : null}
      {sp.hata ? <Alert>{sp.hata}</Alert> : null}

      <div className="kpis">
        <Kpi label="Yayında" value={counts.live} tone="ok" />
        <Kpi label="Zamanlanmış" value={counts.scheduled} />
        <Kpi label="Taslak" value={counts.draft} />
        <Kpi label="Toplam" value={counts.total} />
      </div>

      {tenantRows.length > 1 ? (
        <TabNav
          label="Site"
          active={tenantId ?? "all"}
          items={[
            { key: "all", label: "Tüm siteler", href: buildHref("/content/blog", { durum: sp.durum }) },
            ...tenantRows.map((t) => ({ key: t.id, label: t.name, href: buildHref("/content/blog", { site: t.id, durum: sp.durum }) })),
          ]}
        />
      ) : null}
      <Panel>
        <form className="toolbar filter-bar" method="get" action="">
          {tenantId ? <input type="hidden" name="site" value={tenantId} /> : null}
          {[
            { k: "", l: "Tümü" },
            { k: "published", l: "Yayında" },
            { k: "scheduled", l: "Zamanlanmış" },
            { k: "draft", l: "Taslak" },
          ].map((f) => (
            <Link key={f.k} className={`btn btn-sm ${(sp.durum ?? "") === f.k ? "btn-primary" : "btn-secondary"}`} href={buildHref("/content/blog", { ...base, durum: f.k })}>
              {f.l}
            </Link>
          ))}
          {sp.durum ? <input type="hidden" name="durum" value={sp.durum} /> : null}
          <input className="input" name="q" defaultValue={sp.q ?? ""} placeholder="Başlık veya adres ara" style={{ maxWidth: 260, marginLeft: "auto" }} />
        </form>
        {list.items.length === 0 ? (
          <EmptyState
            title="Henüz yazı yok"
            description="Müşterilerinizin Google'da aradığı soruları (ör. “fren balatası ne zaman değişir”) yanıtlayan yazılar, ürün sayfalarınıza nitelikli trafik getirir."
          />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: 76 }} aria-label="Kapak" />
                  <th>Başlık</th>
                  {tenantRows.length > 1 ? <th>Site</th> : null}
                  <th>Kategori</th>
                  <th>SEO</th>
                  <th>Durum</th>
                  <th>Yayın</th>
                  <th aria-label="İşlemler" />
                </tr>
              </thead>
              <tbody>
                {list.items.map((p) => {
                  const scheduled = p.status === "published" && p.publishedAt && p.publishedAt.getTime() > now;
                  const seoIssues = [!p.metaDescription && "açıklama", !p.coverUrl && "kapak", p.wordCount < 600 && "kısa", !p.focusKeyword && "anahtar kelime"].filter(Boolean);
                  return (
                    <tr key={p.id} className="row-link" data-href={`/content/blog/${p.id}`}>
                      <td>{p.coverUrl ? <img className="blog-thumb" src={assetUrl(p.coverUrl) ?? ""} alt="" /> : <span className="blog-thumb" style={{ display: "block" }} />}</td>
                      <td>
                        <Link href={`/content/blog/${p.id}`}>
                          <strong>{p.title}</strong>
                        </Link>
                        <div className="muted text-sm">
                          /blog/{p.slug} · {p.wordCount} kelime{p.noindex ? " · noindex" : ""}
                        </div>
                      </td>
                      {tenantRows.length > 1 ? <td className="text-sm">{tenantName.get(p.tenantId) ?? "—"}</td> : null}
                      <td className="text-sm">{p.category?.name ?? "—"}</td>
                      <td>
                        {seoIssues.length ? <StatusBadge tone="warn">Eksik: {seoIssues.join(", ")}</StatusBadge> : <StatusBadge tone="ok">Tamam</StatusBadge>}
                      </td>
                      <td>
                        {scheduled ? (
                          <StatusBadge tone="info">Zamanlandı</StatusBadge>
                        ) : (
                          <StatusToggle
                            action={`/api/content/blog/${p.id}`}
                            fields={{ _action: "toggle", back: "list" }}
                            on={p.status === "published"}
                            tone={p.status === "published" ? "ok" : "neutral"}
                            label={p.status === "published" ? "Yayında" : "Taslak"}
                            turnOn="Yayınla"
                            turnOff="Taslağa al"
                          />
                        )}
                      </td>
                      <td className="text-sm muted">{p.publishedAt ? formatDate(p.publishedAt, true) : "—"}</td>
                      <td className="table-actions">
                        {p.status === "published" && !scheduled ? (
                          <a className="btn btn-ghost btn-sm" href={`${urls.get(p.tenantId)}/blog/${p.slug}`} target="_blank" rel="noreferrer">
                            Gör
                          </a>
                        ) : null}
                        <Link className="btn btn-secondary btn-sm" href={`/content/blog/${p.id}`}>
                          Düzenle
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <Pager base="/content/blog" page={page} total={list.total} perPage={PER} params={{ site: tenantId ?? undefined, durum: sp.durum, q: sp.q }} />
      </Panel>
    </>
  );
}

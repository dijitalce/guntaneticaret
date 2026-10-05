import Link from "next/link";
import { asc, desc, eq } from "drizzle-orm";
import { db, pages, tenants } from "@guntan/db";
import { IconPlus } from "@/src/icons";
import { StatusToggle } from "@/src/status-toggle";
import { Alert, EmptyState, PageHeader, Panel, StatusBadge, formatDate } from "@/src/ui";
import { TabNav } from "@/src/ui-ext";

export const metadata = { title: "Sayfalar" };
export const dynamic = "force-dynamic";

export default async function PagesAdmin({ searchParams }: { searchParams: Promise<{ site?: string; ok?: string; hata?: string }> }) {
  const sp = await searchParams;
  const tenantRows = await db.select({ id: tenants.id, name: tenants.name }).from(tenants).orderBy(asc(tenants.name));
  const tenantId = tenantRows.find((t) => t.id === sp.site)?.id ?? null;
  const tenantName = new Map(tenantRows.map((t) => [t.id, t.name]));
  const rows = await db
    .select()
    .from(pages)
    .where(tenantId ? eq(pages.tenantId, tenantId) : undefined)
    .orderBy(desc(pages.updatedAt))
    .limit(300);

  return (
    <>
      <PageHeader
        title="Sayfalar"
        description="Hakkımızda, SSS, kargo bilgisi gibi içerik sayfaları. /sayfa/adres şeklinde yayınlanır."
        actions={
          <Link className="btn btn-primary" href={tenantId ? `/content/pages/new?site=${tenantId}` : "/content/pages/new"}>
            <IconPlus />
            Yeni sayfa
          </Link>
        }
      />
      {sp.ok === "silindi" ? <Alert tone="ok">Sayfa silindi.</Alert> : null}
      {sp.ok === "kaydedildi" ? <Alert tone="ok">Sayfa güncellendi.</Alert> : null}
      {sp.hata ? <Alert>{sp.hata}</Alert> : null}
      {tenantRows.length > 1 ? (
        <TabNav
          label="Site"
          active={tenantId ?? "all"}
          items={[{ key: "all", label: "Tüm siteler", href: "/content/pages" }, ...tenantRows.map((t) => ({ key: t.id, label: t.name, href: `/content/pages?site=${t.id}` }))]}
        />
      ) : null}
      <Panel>
        {rows.length === 0 ? (
          <EmptyState
            title="Henüz sayfa yok"
            description="Gizlilik, iade ve mesafeli satış sayfaları sistemde hazır gelir; ek sayfaları buradan oluşturabilirsiniz."
          />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Başlık</th>
                  {tenantRows.length > 1 ? <th>Site</th> : null}
                  <th>Adres</th>
                  <th>SEO</th>
                  <th>Durum</th>
                  <th>Güncellendi</th>
                  <th aria-label="İşlemler" />
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => (
                  <tr key={p.id} className="row-link" data-href={`/content/pages/${p.id}`}>
                    <td>
                      <Link href={`/content/pages/${p.id}`}>
                        <strong>{p.title}</strong>
                      </Link>
                    </td>
                    {tenantRows.length > 1 ? <td className="text-sm">{tenantName.get(p.tenantId) ?? "—"}</td> : null}
                    <td>
                      <code className="text-sm">/sayfa/{p.slug}</code>
                    </td>
                    <td>
                      {p.metaDescription ? <StatusBadge tone="ok">Tamam</StatusBadge> : <StatusBadge tone="warn">Açıklama yok</StatusBadge>}
                    </td>
                    <td>
                      <StatusToggle
                        action={`/api/content/pages/${p.id}`}
                        fields={{ _action: "toggle", back: "list" }}
                        on={Boolean(p.isPublished)}
                        tone={p.isPublished ? "ok" : "neutral"}
                        label={p.isPublished ? "Yayında" : "Taslak"}
                        turnOn="Yayınla"
                        turnOff="Taslağa al"
                      />
                    </td>
                    <td className="text-sm muted">{formatDate(p.updatedAt, true)}</td>
                    <td className="table-actions">
                      <Link className="btn btn-secondary btn-sm" href={`/content/pages/${p.id}`}>
                        Düzenle
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </>
  );
}

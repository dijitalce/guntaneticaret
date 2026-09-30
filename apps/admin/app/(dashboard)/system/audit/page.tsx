import { asc, sql } from "drizzle-orm";
import { adminUsers, auditLogs, db } from "@guntan/db";
import { ACTION_LABELS, ENTITY_LABELS } from "@/src/audit-labels";
import { AuditTable } from "@/src/audit-table";
import { queryAudit, type AuditFilters } from "@/src/audit-query";
import { IconDownload, IconSearch } from "@/src/icons";
import { withBase } from "@/src/paths";
import { EmptyState, Kpi, PageHeader, Panel } from "@/src/ui";
import { Pager, buildHref, pageNumber } from "@/src/ui-ext";

export const metadata = { title: "İşlem kayıtları" };
export const dynamic = "force-dynamic";

const PER_PAGE = 50;

export default async function AuditPage({ searchParams }: { searchParams: Promise<AuditFilters & { sayfa?: string }> }) {
  const sp = await searchParams;
  const page = pageNumber(sp.sayfa);
  const filters: AuditFilters = {
    q: sp.q,
    kullanici: sp.kullanici,
    kayit: sp.kayit,
    islem: sp.islem,
    baslangic: sp.baslangic,
    bitis: sp.bitis,
  };
  const [{ rows, total }, users, entities, actions, stats] = await Promise.all([
    queryAudit(filters, PER_PAGE, (page - 1) * PER_PAGE),
    db.select({ id: adminUsers.id, name: adminUsers.name, email: adminUsers.email }).from(adminUsers).orderBy(asc(adminUsers.name)),
    db.selectDistinct({ entity: auditLogs.entity }).from(auditLogs).limit(100),
    db.selectDistinct({ action: auditLogs.action }).from(auditLogs).limit(100),
    db
      .select({
        today: sql<number>`sum(${auditLogs.createdAt} >= curdate())`,
        week: sql<number>`sum(${auditLogs.createdAt} >= curdate() - interval 7 day)`,
        failed: sql<number>`sum(${auditLogs.action} = 'login_failed' and ${auditLogs.createdAt} >= curdate() - interval 7 day)`,
        actors: sql<number>`count(distinct case when ${auditLogs.createdAt} >= curdate() - interval 7 day then ${auditLogs.actorId} end)`,
      })
      .from(auditLogs),
  ]);
  const s = stats[0];
  const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v)) as Record<string, string>;
  const exportHref = withBase(buildHref("/api/audit/export", params));

  return (
    <>
      <PageHeader
        title="İşlem kayıtları"
        description="Panelde yapılan tüm değişiklikler, girişler ve başarısız giriş denemeleri. Kim, ne zaman, hangi kayıtta, hangi IP'den."
        actions={
          <a className="btn btn-secondary" href={exportHref}>
            <IconDownload />
            CSV indir
          </a>
        }
      />
      <div className="kpis">
        <Kpi label="Bugün" value={Number(s?.today ?? 0).toLocaleString("tr-TR")} hint="işlem" />
        <Kpi label="Son 7 gün" value={Number(s?.week ?? 0).toLocaleString("tr-TR")} hint="işlem" />
        <Kpi label="Aktif kullanıcı (7 gün)" value={Number(s?.actors ?? 0)} />
        <Kpi label="Başarısız giriş (7 gün)" value={Number(s?.failed ?? 0)} tone={Number(s?.failed ?? 0) > 0 ? "warn" : undefined} />
      </div>
      <Panel>
        <form className="toolbar filter-bar" method="get">
          <div className="search-field">
            <IconSearch />
            <input className="input" name="q" defaultValue={sp.q ?? ""} placeholder="Kayıt no, e-posta, IP veya içerik ara" />
          </div>
          <select className="select" name="kullanici" defaultValue={sp.kullanici ?? ""} aria-label="Kullanıcı">
            <option value="">Tüm kullanıcılar</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} ({u.email})
              </option>
            ))}
          </select>
          <select className="select" name="kayit" defaultValue={sp.kayit ?? ""} aria-label="Kayıt türü">
            <option value="">Tüm kayıt türleri</option>
            {entities.map((e) => (
              <option key={e.entity} value={e.entity}>
                {ENTITY_LABELS[e.entity] ?? e.entity}
              </option>
            ))}
          </select>
          <select className="select" name="islem" defaultValue={sp.islem ?? ""} aria-label="İşlem">
            <option value="">Tüm işlemler</option>
            {actions.map((a) => (
              <option key={a.action} value={a.action}>
                {ACTION_LABELS[a.action] ?? a.action}
              </option>
            ))}
          </select>
          <input className="input" type="date" name="baslangic" defaultValue={sp.baslangic ?? ""} aria-label="Başlangıç" />
          <input className="input" type="date" name="bitis" defaultValue={sp.bitis ?? ""} aria-label="Bitiş" />
          <button className="btn btn-primary" type="submit">
            Filtrele
          </button>
          {Object.keys(params).length ? (
            <a className="btn btn-secondary" href={withBase("/system/audit")}>
              Temizle
            </a>
          ) : null}
        </form>
        {rows.length === 0 ? <EmptyState title="Kayıt bulunamadı" description="Filtreleri değiştirmeyi deneyin." /> : <AuditTable rows={rows} />}
        <Pager base="/system/audit" page={page} total={total} perPage={PER_PAGE} params={params} />
      </Panel>
    </>
  );
}

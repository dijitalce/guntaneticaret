import Link from "next/link";
import { customerKpis, listCustomers } from "@guntan/db";
import { IconDownload, IconSearch } from "@/src/icons";
import { withBase } from "@/src/paths";
import { Alert, EmptyState, Kpi, PageHeader, Panel, StatusBadge, formatDate, formatTry } from "@/src/ui";
import { Pager, TabNav, buildHref, pageNumber, percent, relativeTime } from "@/src/ui-ext";

export const metadata = { title: "Müşteriler" };
export const dynamic = "force-dynamic";

const PER_PAGE = 40;
const FILTERS = [
  { key: "", label: "Tümü" },
  { key: "buyers", label: "Sipariş verenler" },
  { key: "no_orders", label: "Siparişi olmayanlar" },
  { key: "new", label: "Son 30 gün" },
  { key: "corporate", label: "Kurumsal" },
  { key: "blocked", label: "Engelliler" },
];
const SORTS = [
  { key: "", label: "Kayıt tarihi (yeni)" },
  { key: "spent", label: "Toplam harcama" },
  { key: "orders", label: "Sipariş sayısı" },
  { key: "last_order", label: "Son sipariş" },
];

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; filtre?: string; sirala?: string; sayfa?: string; ok?: string }>;
}) {
  const sp = await searchParams;
  const page = pageNumber(sp.sayfa);
  const [kpis, { rows, total }] = await Promise.all([
    customerKpis(),
    listCustomers({ q: sp.q, filter: sp.filtre, sort: sp.sirala, limit: PER_PAGE, offset: (page - 1) * PER_PAGE }),
  ]);
  const params = { q: sp.q, filtre: sp.filtre, sirala: sp.sirala };

  return (
    <>
      <PageHeader
        title="Müşteriler"
        description="Kayıtlı müşteri hesapları, sipariş geçmişleri ve harcamaları."
        actions={
          <a className="btn btn-secondary" href={withBase(buildHref("/api/customers/export", params))}>
            <IconDownload />
            CSV indir
          </a>
        }
      />
      {sp.ok === "silindi" ? <Alert tone="ok">Müşteri silindi.</Alert> : null}
      {sp.ok === "anonim" ? <Alert tone="ok">Müşterinin siparişleri olduğu için hesap anonimleştirildi; sipariş kayıtları korundu.</Alert> : null}
      <div className="kpis">
        <Kpi label="Toplam müşteri" value={kpis.total.toLocaleString("tr-TR")} />
        <Kpi label="Son 30 gün" value={kpis.new30.toLocaleString("tr-TR")} hint="yeni kayıt" tone="info" />
        <Kpi label="Sipariş veren" value={kpis.buyers.toLocaleString("tr-TR")} hint={`${percent(kpis.buyers, kpis.total)} dönüşüm`} tone="ok" />
        <Kpi label="Tekrar alan" value={kpis.repeat.toLocaleString("tr-TR")} hint={`${percent(kpis.repeat, kpis.buyers)} sadakat`} tone="violet" />
      </div>
      <TabNav
        label="Müşteri filtreleri"
        active={sp.filtre ?? ""}
        items={FILTERS.map((f) => ({ key: f.key, label: f.label, href: buildHref("/customers", { ...params, filtre: f.key, sayfa: undefined }) }))}
      />
      <Panel>
        <form className="toolbar filter-bar" method="get">
          {sp.filtre ? <input type="hidden" name="filtre" value={sp.filtre} /> : null}
          <label className="search-field">
            <IconSearch />
            <input name="q" defaultValue={sp.q ?? ""} placeholder="Ad, e-posta veya telefon ara" />
          </label>
          <select className="input" name="sirala" defaultValue={sp.sirala ?? ""} aria-label="Sıralama">
            {SORTS.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
          <button className="btn btn-primary" type="submit">
            Ara
          </button>
        </form>
        {rows.length === 0 ? (
          <EmptyState title="Müşteri bulunamadı" description={sp.q ? "Aramayı değiştirmeyi deneyin." : "Henüz kayıtlı müşteri yok."} />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Müşteri</th>
                  <th>Telefon</th>
                  <th>Sipariş</th>
                  <th>Toplam harcama</th>
                  <th>Son sipariş</th>
                  <th>Kayıt</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <Link href={`/customers/${c.id}`}>
                        <strong>
                          {c.first_name} {c.last_name}
                        </strong>
                      </Link>
                      {c.invoice_type === "corporate" ? (
                        <>
                          {" "}
                          <StatusBadge tone="info">Kurumsal</StatusBadge>
                        </>
                      ) : null}
                      {c.is_blocked ? (
                        <>
                          {" "}
                          <StatusBadge tone="bad">Engelli</StatusBadge>
                        </>
                      ) : null}
                      <div className="muted text-sm">{c.email}</div>
                      {c.tags.length ? (
                        <div className="tag-list">
                          {c.tags.map((t) => (
                            <span key={t} className="tag">
                              {t}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </td>
                    <td className="text-sm">{c.phone ?? "—"}</td>
                    <td>{Number(c.orders)}</td>
                    <td>
                      <strong>{c.spent ? formatTry(c.spent) : "—"}</strong>
                    </td>
                    <td className="text-sm">{c.last_order_at ? relativeTime(c.last_order_at) : <span className="muted">—</span>}</td>
                    <td className="text-sm muted">{formatDate(c.created_at, false)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pager base="/customers" page={page} total={total} perPage={PER_PAGE} params={params} />
      </Panel>
    </>
  );
}

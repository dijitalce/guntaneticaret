import Link from "next/link";
import { asc } from "drizzle-orm";
import { abandonedStats, db, getAutomationSettings, listAbandonedCarts, listRecoveredCarts, tenants } from "@guntan/db";
import { IconSearch, IconSend } from "@/src/icons";
import { withBase } from "@/src/paths";
import { Alert, EmptyState, Kpi, PageHeader, Panel, StatusBadge, formatDate, formatTry } from "@/src/ui";
import { Pager, TabNav, buildHref, pageNumber, percent, relativeTime } from "@/src/ui-ext";

export const metadata = { title: "Terk edilmiş sepetler" };
export const dynamic = "force-dynamic";

const PER_PAGE = 30;

export default async function AbandonedCartsPage({
  searchParams,
}: {
  searchParams: Promise<{ sekme?: string; q?: string; site?: string; sayfa?: string; ok?: string; hata?: string }>;
}) {
  const sp = await searchParams;
  const tab = sp.sekme === "kurtarilan" ? "kurtarilan" : sp.sekme === "iletisim" ? "iletisim" : "";
  const page = pageNumber(sp.sayfa);
  const tenantRows = await db.select({ id: tenants.id, name: tenants.name }).from(tenants).orderBy(asc(tenants.name));
  const tenantId = tenantRows.find((t) => t.id === sp.site)?.id ?? null;
  const tenantName = new Map(tenantRows.map((t) => [t.id, t.name]));
  const [stats, automation, list, recovered] = await Promise.all([
    abandonedStats(tenantId),
    getAutomationSettings(),
    tab === "kurtarilan"
      ? Promise.resolve(null)
      : listAbandonedCarts({ tenantId, search: sp.q, limit: PER_PAGE, offset: (page - 1) * PER_PAGE, withContactOnly: tab === "iletisim" }),
    tab === "kurtarilan" ? listRecoveredCarts({ tenantId, limit: PER_PAGE + 1, offset: (page - 1) * PER_PAGE }) : Promise.resolve(null),
  ]);
  const params = { sekme: tab || undefined, q: sp.q, site: tenantId ?? undefined };
  const auto = automation.abandoned_cart;

  return (
    <>
      <PageHeader
        title="Terk edilmiş sepetler"
        description="Sepete ürün ekleyip 1 saatten uzun süredir işlem yapmayan ziyaretçiler (son 30 gün)."
        actions={
          <Link className="btn btn-secondary" href="/marketing/automations#abandoned_cart">
            Hatırlatma otomasyonu
          </Link>
        }
      />
      {sp.ok === "hatirlatildi" ? <Alert tone="ok">Hatırlatma gönderildi.</Alert> : null}
      {sp.hata ? <Alert>{sp.hata}</Alert> : null}
      {!auto.enabled ? (
        <Alert tone="warn">
          Otomatik sepet hatırlatması kapalı. <Link href="/marketing/automations#abandoned_cart">Otomasyonlar</Link> sayfasından açarak terk edilen sepetleri
          otomatik geri kazanabilirsiniz.
        </Alert>
      ) : null}

      <div className="kpis">
        <Kpi label="Terk edilen sepet" value={stats.abandoned.toLocaleString("tr-TR")} hint="son 30 gün" tone="warn" />
        <Kpi label="Bekleyen sepet tutarı" value={formatTry(stats.abandonedValue)} hint="geri kazanılabilir ciro" />
        <Kpi label="Kurtarılan sepet" value={stats.recovered.toLocaleString("tr-TR")} hint={`Oran ${percent(stats.recovered, stats.abandoned)}`} tone="ok" />
        <Kpi label="Kurtarılan ciro" value={formatTry(stats.recoveredRevenue)} hint={`${stats.reminded} hatırlatma gönderildi`} tone="violet" />
      </div>

      <TabNav
        label="Sepet filtreleri"
        active={tab}
        items={[
          { key: "", label: "Tümü", href: buildHref("/abandoned-carts", { ...params, sekme: undefined, sayfa: undefined }) },
          { key: "iletisim", label: "İletişim bilgisi olanlar", href: buildHref("/abandoned-carts", { ...params, sekme: "iletisim", sayfa: undefined }) },
          { key: "kurtarilan", label: "Kurtarılanlar", href: buildHref("/abandoned-carts", { ...params, sekme: "kurtarilan", q: undefined, sayfa: undefined }) },
        ]}
      />

      <Panel>
        <form className="toolbar filter-bar" method="get">
          {tab ? <input type="hidden" name="sekme" value={tab} /> : null}
          {tab !== "kurtarilan" ? (
            <label className="search-field">
              <IconSearch />
              <input name="q" defaultValue={sp.q ?? ""} placeholder="Ad veya e-posta ara" />
            </label>
          ) : null}
          {tenantRows.length > 1 ? (
            <select className="input" name="site" defaultValue={tenantId ?? ""} aria-label="Site">
              <option value="">Tüm siteler</option>
              {tenantRows.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          ) : null}
          <button className="btn btn-primary" type="submit">
            Filtrele
          </button>
        </form>

        {list ? (
          list.rows.length === 0 ? (
            <EmptyState title="Terk edilmiş sepet yok" description={sp.q ? "Aramayı değiştirmeyi deneyin." : "Harika! Şu an bekleyen sepet bulunmuyor."} />
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Ziyaretçi</th>
                    {tenantRows.length > 1 ? <th>Site</th> : null}
                    <th>Ürün</th>
                    <th>Tutar</th>
                    <th>Son işlem</th>
                    <th>Hatırlatma</th>
                    <th aria-label="İşlemler" />
                  </tr>
                </thead>
                <tbody>
                  {list.rows.map((c) => (
                    <tr key={c.id}>
                      <td>
                        <Link href={`/abandoned-carts/${c.id}`}>
                          <strong>{c.name || c.email || "Anonim ziyaretçi"}</strong>
                        </Link>
                        {c.customer_id ? (
                          <>
                            {" "}
                            <StatusBadge tone="info">Üye</StatusBadge>
                          </>
                        ) : null}
                        <div className="muted text-sm">{c.name && c.email ? c.email : c.email ? "" : "İletişim bilgisi yok"}</div>
                        {c.phone ? <div className="muted text-sm">{c.phone}</div> : null}
                      </td>
                      {tenantRows.length > 1 ? <td className="text-sm">{tenantName.get(c.tenant_id) ?? "—"}</td> : null}
                      <td className="text-sm">
                        {c.qty} adet · {c.lines} çeşit
                      </td>
                      <td>
                        <strong>{formatTry(c.total)}</strong>
                      </td>
                      <td className="text-sm">{relativeTime(c.last_activity)}</td>
                      <td className="text-sm">
                        {c.reminder_count ? (
                          <StatusBadge tone="info">{c.reminder_count}× gönderildi</StatusBadge>
                        ) : (
                          <span className="muted">Gönderilmedi</span>
                        )}
                        {c.last_reminded_at ? <div className="muted text-sm">{relativeTime(c.last_reminded_at)}</div> : null}
                      </td>
                      <td className="table-actions">
                        {c.email ? (
                          <form action={withBase(`/api/abandoned-carts/${c.id}/remind`)} method="post">
                            <input type="hidden" name="back" value="list" />
                            <button className="btn btn-secondary btn-sm" type="submit" title="Hatırlatma e-postası gönder">
                              <IconSend width={14} height={14} />
                              Hatırlat
                            </button>
                          </form>
                        ) : null}
                        <Link className="btn btn-ghost btn-sm" href={`/abandoned-carts/${c.id}`}>
                          Detay
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : null}
        {list ? <Pager base="/abandoned-carts" page={page} total={list.total} perPage={PER_PAGE} params={params} /> : null}

        {recovered ? (
          recovered.length === 0 ? (
            <EmptyState title="Henüz kurtarılan sepet yok" description="Hatırlatma e-postasındaki bağlantıdan dönüp sipariş veren ziyaretçiler burada listelenir." />
          ) : (
            <>
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Müşteri</th>
                      <th>Sipariş</th>
                      <th>Ürün</th>
                      <th>Tutar</th>
                      <th>Hatırlatma</th>
                      <th>Kurtarılma</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recovered.slice(0, PER_PAGE).map((r) => (
                      <tr key={r.cart_id}>
                        <td>
                          <strong>{r.full_name || r.email || "—"}</strong>
                          {r.full_name && r.email ? <div className="muted text-sm">{r.email}</div> : null}
                        </td>
                        <td>
                          <Link href={`/orders/${r.order_id}`}>
                            <strong>{r.order_no}</strong>
                          </Link>
                        </td>
                        <td className="text-sm">{r.qty} adet</td>
                        <td>
                          <strong>{formatTry(r.grand_total)}</strong>
                        </td>
                        <td className="text-sm">{r.reminder_count}×</td>
                        <td className="text-sm muted">{formatDate(r.recovered_at, true)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="pager">
                <span className="muted text-sm">Sayfa {page}</span>
                <div className="pager-links">
                  {page > 1 ? (
                    <Link className="btn btn-secondary btn-sm" href={buildHref("/abandoned-carts", { ...params, sayfa: page - 1 })}>
                      Önceki
                    </Link>
                  ) : null}
                  {recovered.length > PER_PAGE ? (
                    <Link className="btn btn-secondary btn-sm" href={buildHref("/abandoned-carts", { ...params, sayfa: page + 1 })}>
                      Sonraki
                    </Link>
                  ) : null}
                </div>
              </div>
            </>
          )
        ) : null}
      </Panel>
    </>
  );
}

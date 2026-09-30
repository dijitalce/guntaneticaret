import { asc } from "drizzle-orm";
import { db, liveOverview, tenants } from "@guntan/db";
import { AutoRefresh } from "@/src/auto-refresh";
import { IconActivity, IconCart, IconUsers, IconWallet } from "@/src/icons";
import { EmptyState, Kpi, PageHeader, Panel, formatTry } from "@/src/ui";
import { BarChart, TabNav, percent, relativeTime } from "@/src/ui-ext";

export const metadata = { title: "Canlı takip" };
export const dynamic = "force-dynamic";

const DEVICE_LABEL: Record<string, string> = { desktop: "Masaüstü", mobile: "Mobil", tablet: "Tablet" };
const EVENT_LABEL: Record<string, string> = {
  product: "Ürün inceledi",
  add_to_cart: "Sepete ekledi",
  checkout: "Ödemeye geçti",
  purchase: "Satın aldı",
};

function Bars({ items }: { items: { label: string; value: number }[] }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <ul className="bar-list">
      {items.map((i) => (
        <li key={i.label}>
          <div className="bar-list-row">
            <span className="truncate">{i.label}</span>
            <strong>{i.value.toLocaleString("tr-TR")}</strong>
          </div>
          <div className="meter">
            <span style={{ width: `${(i.value / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

export default async function LivePage({ searchParams }: { searchParams: Promise<{ site?: string }> }) {
  const sp = await searchParams;
  const tenantRows = await db.select({ id: tenants.id, name: tenants.name }).from(tenants).orderBy(asc(tenants.name));
  const tenantId = tenantRows.find((t) => t.id === sp.site)?.id ?? null;
  const live = await liveOverview(tenantId);
  const f = live.funnel;
  const funnel = [
    { label: "Ziyaretçi", value: f.visitors },
    { label: "Sepete ekleyen", value: f.cart },
    { label: "Ödemeye geçen", value: f.checkout },
    { label: "Sipariş veren", value: f.order },
  ];
  const deviceTotal = live.devices.reduce((s, d) => s + d.c, 0);

  return (
    <>
      <AutoRefresh everyMs={10_000} />
      <PageHeader
        title="Canlı takip"
        description="Sitedeki anlık hareketler. Sayfa 10 saniyede bir kendini yeniler."
        actions={
          <span className="live-pill">
            <span className="live-dot" aria-hidden />
            Canlı
          </span>
        }
      />
      {tenantRows.length > 1 ? (
        <TabNav
          label="Site"
          active={tenantId ?? "all"}
          items={[{ key: "all", label: "Tüm siteler", href: "/live" }, ...tenantRows.map((t) => ({ key: t.id, label: t.name, href: `/live?site=${t.id}` }))]}
        />
      ) : null}

      <div className="kpis">
        <Kpi label="Şu an sitede" value={live.activeVisitors.toLocaleString("tr-TR")} hint="Son 5 dakikada aktif" icon={IconActivity} tone="ok" />
        <Kpi label="Bugünkü ziyaretçi" value={live.todayVisitors.toLocaleString("tr-TR")} icon={IconUsers} tone="info" />
        <Kpi label="Bugünkü sipariş" value={live.todayOrders.toLocaleString("tr-TR")} icon={IconCart} tone="brand" href="/orders" />
        <Kpi
          label="Bugünkü satış"
          value={formatTry(live.todaySales)}
          hint={live.todayVisitors ? `Dönüşüm ${percent(live.todayOrders, live.todayVisitors)}` : undefined}
          icon={IconWallet}
          tone="violet"
        />
      </div>

      <Panel title="Son 30 dakika" description="Dakika başına aktif oturum">
        <div className="panel-pad">
          <BarChart data={live.history.map((h) => ({ key: h.m, label: h.m, value: h.c }))} labelEvery={5} height={140} />
        </div>
      </Panel>

      <div className="grid-halves">
        <Panel title="Satış hunisi" description="Son 30 dakikadaki oturumlar" padded>
          <div className="funnel">
            {funnel.map((s, i) => (
              <div key={s.label} className="funnel-step">
                <div className="funnel-bar" style={{ width: `${Math.max(f.visitors ? (s.value / f.visitors) * 100 : 0, 4)}%` }} />
                <div className="funnel-meta">
                  <span>{s.label}</span>
                  <strong>{s.value.toLocaleString("tr-TR")}</strong>
                  {i > 0 ? <span className="muted text-sm">{percent(s.value, f.visitors)}</span> : null}
                </div>
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Canlı akış" description="Son 30 dakikadaki önemli hareketler">
          {live.feed.length === 0 ? (
            <EmptyState title="Henüz hareket yok" description="Ziyaretçiler ürün inceledikçe burada görünür." />
          ) : (
            <ul className="live-feed">
              {live.feed.map((e, i) => (
                <li key={`${e.created_at}-${i}`} className={`is-${e.type}`}>
                  <span className="live-feed-dot" aria-hidden />
                  <div>
                    <strong>{EVENT_LABEL[e.type] ?? e.type}</strong>
                    <span className="truncate">{e.title || e.path || "—"}</span>
                    <small className="muted">
                      {relativeTime(e.created_at)} · {e.source ?? "Doğrudan"} · {DEVICE_LABEL[e.device ?? "desktop"] ?? e.device}
                    </small>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <div className="grid-halves">
        <Panel title="Bugün en çok satanlar">
          {live.bestSellers.length === 0 ? (
            <EmptyState title="Bugün henüz satış yok" />
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Ürün</th>
                    <th>Adet</th>
                    <th>Tutar</th>
                  </tr>
                </thead>
                <tbody>
                  {live.bestSellers.map((b) => (
                    <tr key={b.product_id}>
                      <td>
                        <div className="cell-product">
                          {b.image_url ? <img src={b.image_url} alt="" width={36} height={36} loading="lazy" /> : null}
                          <span>{b.name}</span>
                        </div>
                      </td>
                      <td>{b.qty}</td>
                      <td>{formatTry(b.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
        <Panel title="Şu an görüntülenen sayfalar" padded>
          {live.pages.length === 0 ? <p className="muted text-sm">Şu an aktif ziyaretçi yok.</p> : <Bars items={live.pages.map((p) => ({ label: p.path, value: p.c }))} />}
        </Panel>
      </div>

      <div className="grid-halves">
        <Panel title="Trafik kaynakları" description="Bugün" padded>
          {live.sources.length === 0 ? <p className="muted text-sm">Veri yok.</p> : <Bars items={live.sources.map((s) => ({ label: s.source, value: s.c }))} />}
        </Panel>
        <Panel title="Cihazlar" description="Bugün" padded>
          {deviceTotal === 0 ? (
            <p className="muted text-sm">Veri yok.</p>
          ) : (
            <Bars items={live.devices.map((d) => ({ label: `${DEVICE_LABEL[d.device] ?? d.device} · ${percent(d.c, deviceTotal)}`, value: d.c }))} />
          )}
        </Panel>
      </div>
    </>
  );
}

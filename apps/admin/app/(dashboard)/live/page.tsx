import Link from "next/link";
import { asc } from "drizzle-orm";
import { db, LIVE_RANGES, liveOverview, tenants, type LiveRange } from "@guntan/db";
import { AutoRefresh } from "@/src/auto-refresh";
import { IconActivity, IconCart, IconEye, IconUsers } from "@/src/icons";
import { EmptyState, Kpi, PageHeader, Panel, formatTry } from "@/src/ui";
import { TabNav, durationText, percent, relativeTime } from "@/src/ui-ext";

export const metadata = { title: "Canlı takip" };
export const dynamic = "force-dynamic";

const DEVICE_LABEL: Record<string, string> = { desktop: "Masaüstü", mobile: "Mobil", tablet: "Tablet" };
const EVENT_LABEL: Record<string, string> = {
  pv: "Sayfa gezdi",
  product: "Ürün inceledi",
  add_to_cart: "Sepete ekledi",
  cart: "Sepete baktı",
  checkout: "Ödemeye geçti",
  purchase: "Satın aldı",
  search: "Arama yaptı",
};
const STAGE: Record<string, { label: string; tone: string }> = {
  browse: { label: "Geziyor", tone: "neutral" },
  product: { label: "Ürün inceliyor", tone: "info" },
  cart: { label: "Sepette", tone: "warn" },
  checkout: { label: "Ödemede", tone: "violet" },
  order: { label: "Sipariş verdi", tone: "ok" },
};

const clock = new Intl.DateTimeFormat("tr-TR", { hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: "Europe/Istanbul" });
const dayClock = new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Istanbul" });

function when(d: Date | string) {
  const date = new Date(d);
  return Date.now() - date.getTime() < 20 * 3600_000 ? clock.format(date) : dayClock.format(date);
}

function shortPath(path: string | null) {
  if (!path) return "/";
  try {
    return decodeURIComponent(path);
  } catch {
    return path;
  }
}

function Bars({ items }: { items: { label: string; value: number; hint?: string }[] }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <ul className="bar-list">
      {items.map((i) => (
        <li key={i.label}>
          <div className="bar-list-row">
            <span className="truncate" title={i.label}>
              {i.label}
            </span>
            <strong>
              {i.value.toLocaleString("tr-TR")}
              {i.hint ? <span className="muted text-sm"> · {i.hint}</span> : null}
            </strong>
          </div>
          <div className="meter">
            <span style={{ width: `${(i.value / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

function TrafficChart({ data, labelEvery }: { data: { key: string; label: string; visitors: number; pageviews: number }[]; labelEvery: number }) {
  const max = Math.max(1, ...data.map((d) => d.pageviews), ...data.map((d) => d.visitors));
  return (
    <div className="chart lchart">
      <div className="chart-bars">
        {data.map((d) => (
          <div key={d.key} className="lchart-col">
            <div className="lchart-pv" style={{ height: `${(d.pageviews / max) * 100}%` }} />
            <div className={`lchart-v${d.visitors ? "" : " is-empty"}`} style={{ height: `${Math.max((d.visitors / max) * 100, 1.5)}%` }} />
            <span className="lchart-tip">
              <strong>{d.label}</strong>
              {d.visitors} ziyaretçi · {d.pageviews} görüntüleme
            </span>
          </div>
        ))}
      </div>
      <div className="chart-labels">
        {data.map((d, i) => (
          <span key={d.key}>{i % labelEvery === 0 || i === data.length - 1 ? d.label : ""}</span>
        ))}
      </div>
      <div className="lchart-legend">
        <span className="is-v">Ziyaretçi</span>
        <span className="is-pv">Sayfa görüntüleme</span>
      </div>
    </div>
  );
}

export default async function LivePage({ searchParams }: { searchParams: Promise<{ site?: string; aralik?: string }> }) {
  const sp = await searchParams;
  const range: LiveRange = sp.aralik && sp.aralik in LIVE_RANGES ? (sp.aralik as LiveRange) : "bugun";
  const tenantRows = await db.select({ id: tenants.id, name: tenants.name }).from(tenants).orderBy(asc(tenants.name));
  const tenantId = tenantRows.find((t) => t.id === sp.site)?.id ?? null;
  const live = await liveOverview(tenantId, range);
  const f = live.funnel;
  const funnel = [
    { label: "Ziyaretçi", value: f.visitors },
    { label: "Ürün inceleyen", value: f.product },
    { label: "Sepete ekleyen", value: f.cart },
    { label: "Ödemeye geçen", value: f.checkout },
    { label: "Sipariş veren", value: f.order },
  ];
  const deviceTotal = live.devices.reduce((s, d) => s + d.c, 0);
  const href = (patch: { site?: string | null; aralik?: string | null }) => {
    const params = new URLSearchParams();
    const site = patch.site === undefined ? tenantId : patch.site;
    const aralik = patch.aralik === undefined ? range : patch.aralik;
    if (site) params.set("site", site);
    if (aralik && aralik !== "bugun") params.set("aralik", aralik);
    const s = params.toString();
    return s ? `/live?${s}` : "/live";
  };
  const labelEvery = Math.max(1, Math.ceil(live.chart.length / 12));
  const activeCount = live.sessions.filter((s) => s.active).length;

  return (
    <>
      <AutoRefresh everyMs={10_000} />
      <PageHeader
        title="Canlı takip"
        description="Ziyaretçiler, gezilen sayfalar ve satış hunisi. Saatler Türkiye saatidir; sayfa 10 saniyede bir kendini yeniler."
        actions={
          <span className="live-pill" title="Son yenileme">
            <span className="live-dot" aria-hidden />
            Canlı · {clock.format(new Date())}
          </span>
        }
      />
      {tenantRows.length > 1 ? (
        <TabNav
          label="Site"
          active={tenantId ?? "all"}
          items={[{ key: "all", label: "Tüm siteler", href: href({ site: null }) }, ...tenantRows.map((t) => ({ key: t.id, label: t.name, href: href({ site: t.id }) }))]}
        />
      ) : null}

      <div className="live-ranges" role="tablist" aria-label="Zaman aralığı">
        {(Object.keys(LIVE_RANGES) as LiveRange[]).map((key) => (
          <Link key={key} href={href({ aralik: key })} className={key === range ? "is-active" : undefined} role="tab" aria-selected={key === range}>
            {LIVE_RANGES[key].label}
          </Link>
        ))}
      </div>

      <div className="kpis">
        <Kpi label="Şu an sitede" value={live.activeVisitors.toLocaleString("tr-TR")} hint="Son 5 dakikada aktif" icon={IconActivity} tone="ok" />
        <Kpi label="Ziyaretçi" value={live.visitors.toLocaleString("tr-TR")} hint={LIVE_RANGES[range].label} icon={IconUsers} tone="info" />
        <Kpi
          label="Sayfa görüntüleme"
          value={live.pageviews.toLocaleString("tr-TR")}
          hint={live.visitors ? `Ziyaretçi başına ${(live.pageviews / live.visitors).toLocaleString("tr-TR", { maximumFractionDigits: 1 })}` : LIVE_RANGES[range].label}
          icon={IconEye}
          tone="violet"
        />
        <Kpi
          label="Sipariş"
          value={`${live.orders.toLocaleString("tr-TR")} · ${formatTry(live.sales)}`}
          hint={live.visitors ? `Dönüşüm ${percent(live.orders, live.visitors)}` : LIVE_RANGES[range].label}
          icon={IconCart}
          tone="brand"
          href="/orders"
        />
      </div>

      <Panel title="Trafik" description={`${LIVE_RANGES[range].label} · ${LIVE_RANGES[range].unit === "minute" ? "dakika" : LIVE_RANGES[range].unit === "hour" ? "saat" : "gün"} bazında`}>
        <TrafficChart data={live.chart} labelEvery={labelEvery} />
      </Panel>

      <div className="live-grid">
        <Panel
          title="Ziyaretçiler"
          description={activeCount ? `${activeCount} kişi şu an sitede · son 25 ziyaretçi` : "Şu an aktif ziyaretçi yok · son 25 ziyaretçi"}
        >
          {live.sessions.length === 0 ? (
            <EmptyState title="Henüz ziyaretçi yok" description="Siteye gelen ilk ziyaretçiyle burada görünür." icon={IconUsers} />
          ) : (
            <div className="table-wrap live-table">
              <table className="table">
                <thead>
                  <tr>
                    <th>Ziyaretçi</th>
                    <th>Sayfa</th>
                    <th>Durum</th>
                    <th className="num">Sayfa</th>
                    <th>Süre</th>
                    <th>Son görülme</th>
                  </tr>
                </thead>
                <tbody>
                  {live.sessions.map((s) => {
                    const stage = STAGE[s.stage] ?? STAGE.browse!;
                    const seconds = Math.max(0, Math.round((new Date(s.last_seen).getTime() - new Date(s.first_seen).getTime()) / 1000));
                    return (
                      <tr key={s.id} className={s.active ? "is-live" : "is-past"}>
                        <td>
                          <div className="live-who">
                            <span className={`live-status${s.active ? " is-on" : ""}`} aria-label={s.active ? "Aktif" : "Ayrıldı"} />
                            <div>
                              <strong>
                                {s.city || "Bilinmeyen konum"}
                                {s.customer_id ? <span className="badge badge-info is-plain live-member">Üye</span> : null}
                              </strong>
                              <span className="sub">
                                {DEVICE_LABEL[s.device ?? "desktop"] ?? s.device}
                                {s.browser ? ` · ${s.browser}` : ""} · {s.source ?? "Doğrudan"}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="live-path">
                          <span className="truncate" title={shortPath(s.last_path)}>
                            {shortPath(s.last_path)}
                          </span>
                          {s.landing && s.landing !== s.last_path ? (
                            <span className="sub truncate" title={shortPath(s.landing)}>
                              Giriş: {shortPath(s.landing)}
                            </span>
                          ) : null}
                        </td>
                        <td>
                          <span className={`badge badge-${stage.tone}`}>{stage.label}</span>
                        </td>
                        <td className="num">{s.pageviews}</td>
                        <td className="text-sm">{durationText(seconds)}</td>
                        <td className="text-sm" title={when(s.last_seen)}>
                          {s.active ? <strong className="text-ok">Şu an</strong> : relativeTime(s.last_seen)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        <Panel title="Canlı akış" description="Son 60 hareket, en yenisi üstte">
          {live.feed.length === 0 ? (
            <EmptyState title="Henüz hareket yok" description="Ziyaretçiler sitede gezindikçe burada görünür." />
          ) : (
            <ul className="live-feed">
              {live.feed.map((e) => (
                <li key={e.id} className={`is-${e.type}`}>
                  <span className="live-feed-dot" aria-hidden />
                  <div>
                    <div className="live-feed-head">
                      <strong>{EVENT_LABEL[e.type] ?? e.type}</strong>
                      <time className="muted">{when(e.created_at)}</time>
                    </div>
                    <span className="truncate" title={e.title || shortPath(e.path)}>
                      {e.title || shortPath(e.path)}
                    </span>
                    <small className="muted">
                      {relativeTime(e.created_at)} · {e.city ? `${e.city} · ` : ""}
                      {e.source ?? "Doğrudan"} · {DEVICE_LABEL[e.device ?? "desktop"] ?? e.device}
                    </small>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <div className="grid-halves">
        <Panel title="Satış hunisi" description={`${LIVE_RANGES[range].label} içindeki ziyaretçiler`} padded>
          {f.visitors === 0 ? (
            <p className="muted text-sm">Bu aralıkta ziyaretçi yok.</p>
          ) : (
            <div className="funnel">
              {funnel.map((s, i) => (
                <div key={s.label} className="funnel-step">
                  <div className="funnel-bar" style={{ width: `${Math.max((s.value / f.visitors) * 100, 3)}%` }} />
                  <div className="funnel-meta">
                    <span>{s.label}</span>
                    <strong>{s.value.toLocaleString("tr-TR")}</strong>
                    {i > 0 ? <span className="muted text-sm">{percent(s.value, f.visitors)}</span> : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>
        <Panel title="En çok gezilen sayfalar" description={LIVE_RANGES[range].label} padded>
          {live.topPages.length === 0 ? (
            <p className="muted text-sm">Bu aralıkta sayfa görüntüleme yok.</p>
          ) : (
            <Bars items={live.topPages.map((p) => ({ label: p.title || shortPath(p.path), value: p.c, hint: `${p.v} kişi` }))} />
          )}
        </Panel>
      </div>

      <div className="grid-halves">
        <Panel title="En çok satanlar" description={LIVE_RANGES[range].label}>
          {live.bestSellers.length === 0 ? (
            <EmptyState title={`${LIVE_RANGES[range].label} satış yok`} />
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Ürün</th>
                    <th className="num">Adet</th>
                    <th className="num">Tutar</th>
                  </tr>
                </thead>
                <tbody>
                  {live.bestSellers.map((b) => (
                    <tr key={b.product_id}>
                      <td>
                        <div className="cell-product">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          {b.image_url ? <img src={b.image_url} alt="" width={36} height={36} loading="lazy" /> : null}
                          <span>{b.name}</span>
                        </div>
                      </td>
                      <td className="num">{b.qty}</td>
                      <td className="num">{formatTry(b.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
        <Panel title="Trafik kaynakları" description={LIVE_RANGES[range].label} padded>
          {live.sources.length === 0 ? <p className="muted text-sm">Veri yok.</p> : <Bars items={live.sources.map((s) => ({ label: s.source, value: s.c }))} />}
        </Panel>
      </div>

      <div className="grid-halves">
        <Panel title="Cihazlar" description={LIVE_RANGES[range].label} padded>
          {deviceTotal === 0 ? (
            <p className="muted text-sm">Veri yok.</p>
          ) : (
            <Bars items={live.devices.map((d) => ({ label: DEVICE_LABEL[d.device] ?? d.device, value: d.c, hint: percent(d.c, deviceTotal) }))} />
          )}
        </Panel>
        <Panel title="Şehirler" description={LIVE_RANGES[range].label} padded>
          {live.cities.length === 0 ? <p className="muted text-sm">Konum bilgisi yok.</p> : <Bars items={live.cities.map((c) => ({ label: c.city, value: c.c }))} />}
        </Panel>
      </div>
    </>
  );
}

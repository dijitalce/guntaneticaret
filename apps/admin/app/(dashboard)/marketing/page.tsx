import Link from "next/link";
import { abandonedStats, automationStats, getAutomationSettings, marketingSummary } from "@guntan/db";
import { MarketingNav } from "@/src/marketing-nav";
import { EmptyState, Kpi, PageHeader, Panel, formatTry } from "@/src/ui";
import { BarChart, percent } from "@/src/ui-ext";

export const metadata = { title: "Pazarlama" };
export const dynamic = "force-dynamic";

const RANGES = [7, 30, 90];

export default async function MarketingPage({ searchParams }: { searchParams: Promise<{ gun?: string }> }) {
  const sp = await searchParams;
  const days = RANGES.includes(Number(sp.gun)) ? Number(sp.gun) : 30;
  const [summary, carts, autos, autoSettings] = await Promise.all([
    marketingSummary(days),
    abandonedStats(),
    automationStats().catch(() => null),
    getAutomationSettings(),
  ]);
  const autoEnabled = Object.values(autoSettings).filter((a) => a.enabled).length;
  const autoTotal = Object.keys(autoSettings).length;
  const autoSent = autos ? [...autos.byKey.values()].reduce((s, r) => s + r.sent, 0) : 0;
  const email = summary.messages.find((m) => m.channel === "email");
  const sms = summary.messages.find((m) => m.channel === "sms");

  const daily: { key: string; label: string; value: number }[] = [];
  const byDay = new Map(summary.daily.map((d) => [d.day, d.revenue]));
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86_400_000);
    const key = d.toISOString().slice(0, 10);
    daily.push({ key, label: d.toLocaleDateString("tr-TR", { day: "numeric", month: "short" }), value: byDay.get(key) ?? 0 });
  }
  const maxSource = Math.max(1, ...summary.bySource.map((s) => s.revenue));

  return (
    <>
      <PageHeader
        title="Pazarlama"
        description="Satışların nereden geldiği, kampanya ve otomasyonların getirdiği ciro."
        actions={
          <div className="segmented">
            {RANGES.map((r) => (
              <Link key={r} href={`/marketing?gun=${r}`} className={r === days ? "is-active" : undefined}>
                {r} gün
              </Link>
            ))}
          </div>
        }
      />
      <MarketingNav active="summary" />
      <div className="kpis">
        <Kpi label="Toplam ciro" value={formatTry(summary.revenue)} hint={`${summary.orders} sipariş`} />
        <Kpi
          label="Pazarlama kaynaklı ciro"
          value={formatTry(summary.marketingRevenue)}
          hint={`${summary.marketingOrders} sipariş · cironun ${percent(summary.marketingRevenue, summary.revenue)}`}
          tone="violet"
        />
        <Kpi label="Kurtarılan sepet cirosu" value={formatTry(summary.recoveredRevenue)} hint={`${carts.recovered} sepet (30 gün)`} tone="ok" href="/abandoned-carts?sekme=kurtarilan" />
        <Kpi label="Ortalama sepet" value={summary.orders ? formatTry(summary.revenue / summary.orders) : "—"} />
      </div>

      <Panel title="Günlük ciro" description={`Son ${days} gün`}>
        <div className="panel-pad">
          <BarChart data={daily} format={(v) => formatTry(v)} labelEvery={days > 30 ? 10 : days > 7 ? 5 : 1} />
        </div>
      </Panel>

      <div className="grid-halves">
        <Panel title="Satış kaynakları" description="Siparişin geldiği trafik kaynağı (ilk ziyaret)">
          {summary.bySource.length === 0 ? (
            <EmptyState title="Veri yok" description="Ziyaret takibi yeni başladıysa birkaç gün içinde dolacak." />
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Kaynak</th>
                    <th>Sipariş</th>
                    <th>Ciro</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.bySource.map((s) => (
                    <tr key={s.source}>
                      <td>
                        <strong>{s.source}</strong>
                        {s.medium && s.medium !== "unknown" ? <span className="muted text-sm"> · {s.medium}</span> : null}
                        <div className="meter">
                          <span style={{ width: `${(s.revenue / maxSource) * 100}%` }} />
                        </div>
                      </td>
                      <td>{s.orders}</td>
                      <td>{formatTry(s.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
        <div>
          <Panel title="Mesaj performansı" description={`Son ${days} gün (kampanya + otomasyon + bildirim)`} padded>
            <div className="stat-row">
              <div className="stat">
                <span className="stat-label">E-posta gönderildi</span>
                <strong className="stat-value">{(email?.sent ?? 0).toLocaleString("tr-TR")}</strong>
                <span className="stat-hint">
                  Açılma {percent(email?.opened ?? 0, email?.sent ?? 0)} · Tıklama {percent(email?.clicked ?? 0, email?.sent ?? 0)}
                </span>
              </div>
              <div className="stat">
                <span className="stat-label">SMS gönderildi</span>
                <strong className="stat-value">{(sms?.sent ?? 0).toLocaleString("tr-TR")}</strong>
              </div>
            </div>
          </Panel>
          <Panel title="Terk edilen sepetler" padded action={<Link className="btn btn-secondary btn-sm" href="/abandoned-carts">Aç</Link>}>
            <div className="stat-row">
              <div className="stat">
                <span className="stat-label">Bekleyen sepet</span>
                <strong className="stat-value">{carts.abandoned - carts.recovered}</strong>
                <span className="stat-hint">{formatTry(carts.abandonedValue)} değerinde</span>
              </div>
              <div className="stat">
                <span className="stat-label">Kurtarma oranı</span>
                <strong className="stat-value">{percent(carts.recovered, carts.reminded || carts.abandoned)}</strong>
                <span className="stat-hint">{carts.reminded} hatırlatma</span>
              </div>
            </div>
          </Panel>
          {autos ? (
            <Panel title="Otomasyonlar" padded action={<Link className="btn btn-secondary btn-sm" href="/marketing/automations">Yönet</Link>}>
              <p className="muted text-sm" style={{ margin: 0 }}>
                {autoEnabled} / {autoTotal} otomasyon açık · son 30 günde {autoSent.toLocaleString("tr-TR")} mesaj gönderildi.
              </p>
            </Panel>
          ) : null}
        </div>
      </div>
    </>
  );
}

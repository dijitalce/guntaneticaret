import { and, count, desc, gte, inArray, sql, sum } from "drizzle-orm";
import Link from "next/link";
import { db, orders, products, tenants, xmlFeeds, xmlImportRuns } from "@guntan/db";
import { orderStatusLabel } from "@guntan/ecommerce";
import {
  IconAlert,
  IconBox,
  IconCart,
  IconChart,
  IconClock,
  IconRefresh,
  IconWallet,
} from "@/src/icons";
import { SyncClock } from "@/src/sync-status";
import { formatDuration } from "@/src/sync-time";
import { getSyncHours, syncIntervalHours } from "@/src/sync-schedule";
import { EmptyState, Kpi, PageHeader, Panel, StatusBadge, formatDate, formatTry, statusTone } from "@/src/ui";

export const metadata = { title: "Özet" };

const REVENUE_STATUSES = ["paid", "preparing", "shipped", "completed"];
const TR_OFFSET = "+03:00";
const DAYS = 14;
const RUN_STALE_MS = 6 * 3600_000;
const FEED_LABELS: Record<string, string> = { "Güntan ürün XML": "Altay (XML)" };


function trDayKey(d: Date) {
  return new Date(d.getTime() + 3 * 3600_000).toISOString().slice(0, 10);
}

async function revenueSince(from: Date) {
  const [row] = await db
    .select({ total: sum(orders.grandTotal), n: count() })
    .from(orders)
    .where(and(inArray(orders.status, REVENUE_STATUSES), gte(orders.createdAt, from)));
  return { total: Number(row?.total ?? 0), n: row?.n ?? 0 };
}

const PRODUCT_STATS_TTL_MS = 5 * 60_000;
let productStatsCache: { at: number; rows: { total: number; active: number; oos: number; fresh24: number }[] } | null = null;

/** Tüm ürün tablosunu tarar; özet her açıldığında tekrar saymamak için 5 dk saklanır. */
async function cachedProductStats() {
  if (productStatsCache && Date.now() - productStatsCache.at < PRODUCT_STATS_TTL_MS) return productStatsCache.rows;
  const rows = await db
    .select({
      total: count(),
      active: sql<number>`sum(${products.status} = 'active')`,
      oos: sql<number>`sum(${products.stockStatus} = 'out_of_stock')`,
      fresh24: sql<number>`sum(${products.updatedAt} >= now() - interval 24 hour)`,
    })
    .from(products);
  productStatsCache = { at: Date.now(), rows };
  return rows;
}

export default async function DashboardPage() {
  const now = new Date();
  const startOfTrDay = new Date(`${trDayKey(now)}T00:00:00${TR_OFFSET}`);
  const daysAgo = (n: number) => new Date(startOfTrDay.getTime() - n * 86400_000);

  const [today, week, month, statusRows, daily, recent, productStats, tenantCount, feeds, runs] = await Promise.all([
    revenueSince(startOfTrDay),
    revenueSince(daysAgo(6)),
    revenueSince(daysAgo(29)),
    db.select({ status: orders.status, n: count() }).from(orders).groupBy(orders.status),
    db
      .select({
        day: sql<string>`date_format(convert_tz(${orders.createdAt}, @@session.time_zone, ${TR_OFFSET}), '%Y-%m-%d')`,
        total: sum(orders.grandTotal),
      })
      .from(orders)
      .where(and(inArray(orders.status, REVENUE_STATUSES), gte(orders.createdAt, daysAgo(DAYS - 1))))
      .groupBy(sql`1`),
    db.select().from(orders).orderBy(desc(orders.createdAt)).limit(8),
    cachedProductStats(),
    db.select({ n: count() }).from(tenants),
    db.select({ id: xmlFeeds.id, name: xmlFeeds.name, isActive: xmlFeeds.isActive }).from(xmlFeeds),
    db.select().from(xmlImportRuns).orderBy(desc(xmlImportRuns.createdAt)).limit(40),
  ]);

  const byStatus = Object.fromEntries(statusRows.map((r) => [r.status, r.n]));
  const pending = byStatus.pending_payment ?? 0;
  const toPrepare = byStatus.paid ?? 0;
  const toShip = byStatus.preparing ?? 0;
  const inTransit = byStatus.shipped ?? 0;
  const p = productStats[0];

  const isSuccess = (s: string) => s === "completed" || s === "completed_with_warnings";
  const feedStatus = feeds
    .filter((f) => f.isActive)
    .map((f) => {
      const feedRuns = runs.filter((r) => r.feedId === f.id);
      const latest = feedRuns[0];
      const lastOk = feedRuns.find((r) => isSuccess(r.status) && r.finishedAt);
      const running =
        latest?.status === "running" && !!latest.startedAt && now.getTime() - Date.parse(latest.startedAt) < RUN_STALE_MS;
      const durationMs =
        lastOk?.startedAt && lastOk.finishedAt ? Date.parse(lastOk.finishedAt) - Date.parse(lastOk.startedAt) : null;
      return { feed: f, latest, lastOk, running, durationMs };
    })
    .filter((f) => f.latest);
  const lastSuccessMs = Math.max(0, ...feedStatus.map((f) => (f.lastOk?.finishedAt ? Date.parse(f.lastOk.finishedAt) : 0)));
  const anyRunning = feedStatus.some((f) => f.running);
  const syncHours = await getSyncHours();
  const intervalH = syncIntervalHours(syncHours);
  const ageH = lastSuccessMs ? (now.getTime() - lastSuccessMs) / 3600_000 : Infinity;
  const freshness = anyRunning
    ? { tone: "info" as const, label: "Güncelleniyor", note: "Tedarikçi verileri şu an işleniyor." }
    : !feedStatus.length
      ? { tone: "neutral" as const, label: "Kayıt yok", note: "Henüz tamamlanmış bir senkron yok." }
      : ageH <= intervalH + 1
      ? { tone: "ok" as const, label: "Güncel", note: "Fiyat ve stoklar planlandığı gibi güncelleniyor." }
      : ageH <= intervalH * 2 + 1
        ? { tone: "warn" as const, label: "Bir senkron atlandı", note: "Son planlı güncelleme çalışmamış görünüyor; cron kaydını kontrol edin." }
        : { tone: "bad" as const, label: "Güncel değil", note: "Uzun süredir başarılı güncelleme yok. Fiyat/stoklar eski olabilir; cron ve tedarikçi erişimini kontrol edin." };

  const dailyBy = new Map(daily.map((d) => [d.day, Number(d.total ?? 0)]));
  const series = Array.from({ length: DAYS }, (_, i) => {
    const d = daysAgo(DAYS - 1 - i);
    const key = trDayKey(d);
    return {
      key,
      label: d.toLocaleDateString("tr-TR", { day: "2-digit", month: "short", timeZone: "Europe/Istanbul" }),
      total: dailyBy.get(key) ?? 0,
    };
  });
  const max = Math.max(...series.map((s) => s.total), 1);
  const avgBasket = month.n ? month.total / month.n : 0;

  const todos = [
    { href: "/orders?status=pending_payment", label: "Ödeme bekleyen", hint: "Havale onayı veya kart dönüşü", n: pending, dot: "is-warn" },
    { href: "/orders?status=paid", label: "Hazırlanacak", hint: "Ödemesi alınmış siparişler", n: toPrepare, dot: "is-info" },
    { href: "/orders?status=preparing", label: "Kargoya verilecek", hint: "Hazırlığı süren siparişler", n: toShip, dot: "is-violet" },
    { href: "/orders?status=shipped", label: "Kargoda", hint: "Teslim bekleniyor", n: inTransit, dot: "" },
    { href: "/catalog/products?status=stoksuz", label: "Stoksuz ürün", hint: "Vitrinde tükendi görünür", n: Number(p?.oos ?? 0), dot: "is-bad" },
  ];

  return (
    <>
      <PageHeader
        title="Özet"
        description={`${now.toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Istanbul" })} · Satışlar, bekleyen işler ve katalog durumu`}
        actions={
          <Link className="btn btn-primary" href="/orders">
            <IconCart />
            Siparişler
          </Link>
        }
      />

      <div className="kpis">
        <Kpi label="Bugünkü ciro" value={formatTry(today.total)} hint={`${today.n} sipariş`} icon={IconWallet} tone="brand" />
        <Kpi label="Son 7 gün" value={formatTry(week.total)} hint={`${week.n} sipariş`} icon={IconChart} tone="ok" />
        <Kpi label="Son 30 gün" value={formatTry(month.total)} hint={`Ort. sepet ${formatTry(avgBasket)}`} icon={IconChart} tone="info" />
        <Kpi
          label="İşlem bekleyen"
          value={(pending + toPrepare + toShip).toLocaleString("tr-TR")}
          hint={pending ? `${pending} ödeme bekliyor` : "Ödeme bekleyen yok"}
          icon={IconClock}
          tone="warn"
          href="/orders"
        />
      </div>

      <Panel
        title="Ürün güncelliği"
        description="Tedarikçi fiyat ve stok senkronu"
        action={
          <div className="row-actions" style={{ alignItems: "center" }}>
            <StatusBadge tone={freshness.tone}>{freshness.label}</StatusBadge>
            <Link className="btn btn-ghost btn-sm" href="/integrations/xml">
              <IconRefresh />
              Detay
            </Link>
          </div>
        }
      >
        {feedStatus.length === 0 ? (
          <EmptyState title="Henüz senkron çalışmadı" description="İlk tedarikçi senkronu bittiğinde burada görünür." icon={IconRefresh} />
        ) : (
          <div className="sync-grid">
            <div className="sync-summary">
              <SyncClock
                lastSuccessIso={lastSuccessMs ? new Date(lastSuccessMs).toISOString() : null}
                hours={syncHours}
                running={anyRunning}
                initialNow={now.toISOString()}
              />
              {freshness.tone === "ok" ? null : (
                <p className={`sync-note is-${freshness.tone}`}>
                  <IconAlert width={15} height={15} />
                  {freshness.note}
                </p>
              )}
              <dl className="dl-rows">
                <div>
                  <dt>Son 24 saatte değişen ürün</dt>
                  <dd>{Number(p?.fresh24 ?? 0).toLocaleString("tr-TR")}</dd>
                </div>
                <div>
                  <dt>Vitrinde aktif / toplam</dt>
                  <dd>
                    {Number(p?.active ?? 0).toLocaleString("tr-TR")} / {Number(p?.total ?? 0).toLocaleString("tr-TR")}
                  </dd>
                </div>
              </dl>
            </div>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Tedarikçi</th>
                    <th>Son başarılı</th>
                    <th className="num">Ürün</th>
                    <th className="num">Değişen</th>
                    <th className="num">Kaldırılan</th>
                    <th>Durum</th>
                  </tr>
                </thead>
                <tbody>
                  {feedStatus.map(({ feed, latest, lastOk, running, durationMs }) => {
                    const run = lastOk ?? latest!;
                    const failedNow = latest!.status === "failed" && !running;
                    return (
                      <tr key={feed.id}>
                        <td>
                          {FEED_LABELS[feed.name] ?? feed.name}
                          <span className="sub">{durationMs ? `Süre ${formatDuration(durationMs)}` : "—"}</span>
                        </td>
                        <td>
                          {lastOk?.finishedAt ? formatDate(lastOk.finishedAt) : "Yok"}
                          {lastOk?.finishedAt ? (
                            <span className="sub">{formatDuration(now.getTime() - Date.parse(lastOk.finishedAt))} önce</span>
                          ) : null}
                        </td>
                        <td className="num">{run.total.toLocaleString("tr-TR")}</td>
                        <td className="num">
                          {(run.createdCount + run.updatedCount).toLocaleString("tr-TR")}
                          {run.failedCount ? (
                            <span className="sub" style={{ color: "var(--a-bad)" }}>
                              {run.failedCount} hatalı
                            </span>
                          ) : null}
                        </td>
                        <td className="num">{run.inactivatedCount.toLocaleString("tr-TR")}</td>
                        <td>
                          {running ? (
                            <StatusBadge tone="info">Çalışıyor</StatusBadge>
                          ) : failedNow ? (
                            <StatusBadge tone="bad">
                              <span title={latest!.errorMessage ?? undefined}>Son deneme başarısız</span>
                            </StatusBadge>
                          ) : (
                            <StatusBadge tone={run.status === "completed" ? "ok" : "warn"}>
                              {run.status === "completed" ? "Başarılı" : "Uyarılı"}
                            </StatusBadge>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Panel>

      <div className="grid-2">
        <div>
          <Panel title="Satışlar" description={`Son ${DAYS} gün · ödenmiş siparişler`}>
            <div className="chart">
              <div className="chart-bars">
                {series.map((s) => (
                  <div
                    key={s.key}
                    className={`chart-bar${s.total ? "" : " is-empty"}`}
                    style={{ height: `${Math.max((s.total / max) * 100, 2)}%` }}
                  >
                    <span>
                      {s.label}: {formatTry(s.total)}
                    </span>
                  </div>
                ))}
              </div>
              <div className="chart-labels">
                {series.map((s, i) => (
                  <span key={s.key}>{i % 2 === 0 ? s.label : ""}</span>
                ))}
              </div>
            </div>
          </Panel>

          <Panel
            title="Son siparişler"
            action={
              <Link className="btn btn-secondary btn-sm" href="/orders">
                Tümü
              </Link>
            }
          >
            {recent.length === 0 ? (
              <EmptyState title="Henüz sipariş yok" description="İlk sipariş geldiğinde burada görünür." icon={IconCart} />
            ) : (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Sipariş</th>
                      <th>Müşteri</th>
                      <th>Durum</th>
                      <th className="num">Tutar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recent.map((o) => (
                      <tr key={o.id}>
                        <td>
                          <Link href={`/orders/${o.id}`}>{o.orderNo}</Link>
                          <span className="sub">{formatDate(o.createdAt)}</span>
                        </td>
                        <td>
                          {o.fullName}
                          <span className="sub">{o.shippingAddress?.city ?? o.email}</span>
                        </td>
                        <td>
                          <StatusBadge tone={statusTone(o.status)}>{orderStatusLabel(o.status)}</StatusBadge>
                        </td>
                        <td className="num">{formatTry(o.grandTotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        </div>

        <div>
          <Panel title="Yapılacaklar">
            <div className="todo-list">
              {todos.map((t) => (
                <Link key={t.label} className="todo" href={t.href}>
                  <span className={`todo-dot ${t.dot}`} />
                  <div>
                    <strong>{t.label}</strong>
                    <small>{t.hint}</small>
                  </div>
                  <em>{t.n.toLocaleString("tr-TR")}</em>
                </Link>
              ))}
            </div>
          </Panel>

          <Panel title="Katalog">
            <div className="panel-pad">
              <dl className="dl-rows">
                <div>
                  <dt>Toplam ürün</dt>
                  <dd>{Number(p?.total ?? 0).toLocaleString("tr-TR")}</dd>
                </div>
                <div>
                  <dt>Vitrinde aktif</dt>
                  <dd>{Number(p?.active ?? 0).toLocaleString("tr-TR")}</dd>
                </div>
                <div>
                  <dt>Stoksuz</dt>
                  <dd>{Number(p?.oos ?? 0).toLocaleString("tr-TR")}</dd>
                </div>
                <div>
                  <dt>Site</dt>
                  <dd>{tenantCount[0]?.n ?? 0}</dd>
                </div>
              </dl>
              <Link className="btn btn-secondary btn-sm" href="/catalog/products" style={{ marginTop: "0.6rem", width: "100%" }}>
                <IconBox />
                Ürünleri yönet
              </Link>
            </div>
          </Panel>
        </div>
      </div>
    </>
  );
}

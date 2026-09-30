import { and, count, desc, gte, inArray, sql, sum } from "drizzle-orm";
import Link from "next/link";
import { db, orders, products, tenants, xmlImportRuns } from "@guntan/db";
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
import { EmptyState, Kpi, PageHeader, Panel, StatusBadge, formatDate, formatTry, statusTone } from "@/src/ui";

export const metadata = { title: "Özet" };

const REVENUE_STATUSES = ["paid", "preparing", "shipped", "completed"];
const TR_OFFSET = "+03:00";
const DAYS = 14;

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

export default async function DashboardPage() {
  const now = new Date();
  const startOfTrDay = new Date(`${trDayKey(now)}T00:00:00${TR_OFFSET}`);
  const daysAgo = (n: number) => new Date(startOfTrDay.getTime() - n * 86400_000);

  const [today, week, month, statusRows, daily, recent, productStats, tenantCount, lastRuns] = await Promise.all([
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
    db
      .select({
        total: count(),
        active: sql<number>`sum(${products.status} = 'active')`,
        oos: sql<number>`sum(${products.stockStatus} = 'out_of_stock')`,
      })
      .from(products),
    db.select({ n: count() }).from(tenants),
    db.select().from(xmlImportRuns).orderBy(desc(xmlImportRuns.createdAt)).limit(5),
  ]);

  const byStatus = Object.fromEntries(statusRows.map((r) => [r.status, r.n]));
  const pending = byStatus.pending_payment ?? 0;
  const toPrepare = byStatus.paid ?? 0;
  const toShip = byStatus.preparing ?? 0;
  const inTransit = byStatus.shipped ?? 0;
  const p = productStats[0];

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

          <Panel
            title="XML senkron"
            action={
              <Link className="btn btn-ghost btn-sm" href="/integrations/xml">
                <IconRefresh />
                Detay
              </Link>
            }
          >
            {lastRuns.length === 0 ? (
              <EmptyState title="Henüz çalışma yok" icon={IconRefresh} />
            ) : (
              <div className="todo-list">
                {lastRuns.map((r) => (
                  <div key={r.id} className="todo">
                    <div>
                      <strong>
                        <StatusBadge tone={statusTone(r.status)}>{r.status}</StatusBadge>
                      </strong>
                      <small>
                        {formatDate(r.createdAt)} · {r.createdCount} yeni · {r.updatedCount} güncel
                      </small>
                    </div>
                    {r.failedCount ? (
                      <em style={{ color: "var(--a-bad)" }} title="Hatalı kayıt">
                        <IconAlert width={14} height={14} style={{ verticalAlign: "-2px" }} /> {r.failedCount}
                      </em>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </div>
      </div>
    </>
  );
}

import Link from "next/link";
import { and, asc, count, desc, eq, inArray, sum } from "drizzle-orm";
import { db, orders, tagsForOrders, tenants } from "@guntan/db";
import { orderStatusLabel } from "@guntan/ecommerce";
import { ConfirmButton } from "@/src/form-fields";
import { IconBank, IconCard, IconCart, IconCheck, IconDownload, IconSearch, IconTruck, IconWallet } from "@/src/icons";
import { BulkLabelButton, BulkStatusButtons, SelectAllOrders } from "@/src/order-bulk";
import { withBase } from "@/src/paths";
import { Alert, EmptyState, Kpi, PageHeader, Panel, StatusBadge, formatDate, formatTry, statusTone } from "@/src/ui";
import { PAYMENTS, PERIODS, orderBaseFilters } from "@/src/order-filters";
import { Pager, relativeTime } from "@/src/ui-ext";

export const metadata = { title: "Siparişler" };

const PAGE_SIZE = 50;
const TABS = [
  { value: "", label: "Tümü" },
  { value: "pending_payment", label: "Ödeme bekliyor" },
  { value: "paid", label: "Ödendi" },
  { value: "preparing", label: "Hazırlanıyor" },
  { value: "shipped", label: "Kargoda" },
  { value: "completed", label: "Tamamlandı" },
  { value: "cancelled", label: "İptal" },
  { value: "refunded", label: "İade" },
];

const SORTS: Record<string, { col: typeof orders.createdAt | typeof orders.grandTotal | typeof orders.orderNo; label: string }> = {
  tarih: { col: orders.createdAt, label: "Tarih" },
  tutar: { col: orders.grandTotal, label: "Tutar" },
  no: { col: orders.orderNo, label: "Sipariş" },
};
const REVENUE_STATUSES = ["paid", "preparing", "shipped", "completed"];
const OK_MESSAGES: Record<string, string> = {
  "1": "Ödeme alındı olarak işaretlendi; müşteriye bilgi gönderildi.",
  prepare: "Sipariş hazırlığa alındı.",
  complete: "Sipariş teslim edildi olarak tamamlandı.",
  revert: "Sipariş bir önceki duruma alındı.",
};
const STALE_MS = 24 * 3600 * 1000;

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ tenant?: string; status?: string; q?: string; sayfa?: string; donem?: string; sirala?: string; yon?: string; odeme?: string; ok?: string; hata?: string; mesaj?: string }>;
}) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const page = Math.max(1, Number.parseInt(sp.sayfa ?? "1", 10) || 1);

  const period = PERIODS.find((p) => p.value === (sp.donem ?? "")) ?? PERIODS[0]!;
  const sortKey = sp.sirala && SORTS[sp.sirala] ? sp.sirala : "tarih";
  const dir = sp.yon === "asc" ? "asc" : "desc";
  const orderBy = dir === "asc" ? asc(SORTS[sortKey]!.col) : desc(SORTS[sortKey]!.col);

  const base = orderBaseFilters({ ...sp, q });
  const where = [...base, ...(sp.status ? [eq(orders.status, sp.status)] : [])];

  const [tenantRows, statusCounts, totalRows, revenueRows, pendingRows, rows] = await Promise.all([
    db.select().from(tenants),
    db
      .select({ status: orders.status, n: count() })
      .from(orders)
      .where(base.length ? and(...base) : undefined)
      .groupBy(orders.status),
    db.select({ total: count() }).from(orders).where(where.length ? and(...where) : undefined),
    db
      .select({ total: sum(orders.grandTotal), n: count() })
      .from(orders)
      .where(and(inArray(orders.status, REVENUE_STATUSES), ...base)),
    db
      .select({ total: sum(orders.grandTotal) })
      .from(orders)
      .where(and(eq(orders.status, "pending_payment"), ...base)),
    db
      .select()
      .from(orders)
      .where(where.length ? and(...where) : undefined)
      .orderBy(orderBy, desc(orders.createdAt))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
  ]);
  const total = totalRows[0]?.total ?? 0;
  const tagMap = await tagsForOrders(rows.map((o) => o.id)).catch(() => new Map<string, string[]>());

  const nameBy = Object.fromEntries(tenantRows.map((t) => [t.id, t.name]));
  const countBy = Object.fromEntries(statusCounts.map((r) => [r.status, r.n]));
  const allCount = statusCounts.reduce((a, r) => a + r.n, 0);
  const revenue = Number(revenueRows[0]?.total ?? 0);
  const paidCount = revenueRows[0]?.n ?? 0;
  const pendingAmount = Number(pendingRows[0]?.total ?? 0);
  const toShip = (countBy.paid ?? 0) + (countBy.preparing ?? 0);
  const href = (patch: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    const merged = { tenant: sp.tenant, status: sp.status, q: q || undefined, donem: sp.donem, odeme: sp.odeme, sirala: sp.sirala, yon: sp.yon, ...patch };
    for (const [k, v] of Object.entries(merged)) if (v) params.set(k, v);
    const s = params.toString();
    return s ? `/orders?${s}` : "/orders";
  };

  return (
    <>
      <PageHeader
        title="Siparişler"
        description="Her satırdaki buton siparişi bir sonraki adıma taşır; ayrıntı ve iade işlemleri sipariş detayındadır."
        actions={
          <>
            <a className="btn btn-secondary" href={withBase(href({ sayfa: undefined }).replace("/orders", "/api/orders/export"))}>
              <IconDownload />
              CSV indir
            </a>
            <form id="bulk-labels" action={withBase("/api/orders/labels")} method="get" target="_blank" style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              <BulkLabelButton form="bulk-labels" />
              <BulkStatusButtons form="bulk-labels" next={href({})} />
            </form>
          </>
        }
      />
      {sp.ok === "bulk" ? <Alert tone="ok">{sp.mesaj || "Toplu işlem tamamlandı."}</Alert> : sp.ok && OK_MESSAGES[sp.ok] ? <Alert tone="ok">{OK_MESSAGES[sp.ok]}</Alert> : null}
      {sp.hata ? <Alert>{sp.mesaj || "İşlem yapılamadı."}</Alert> : null}

      <div className="kpis order-kpis">
        <Kpi label="Sipariş" value={allCount.toLocaleString("tr-TR")} hint={period.value ? period.label : "Toplam kayıt"} icon={IconCart} tone="info" />
        <Kpi label="Ciro" value={formatTry(revenue)} hint="Ödenen, hazırlanan, kargodaki ve tamamlanan" icon={IconWallet} tone="ok" />
        <Kpi label="Ort. sepet" value={formatTry(paidCount ? revenue / paidCount : 0)} hint={`${paidCount.toLocaleString("tr-TR")} ödenmiş sipariş`} icon={IconCard} tone="violet" />
        <Kpi label="Tahsilat bekleyen" value={formatTry(pendingAmount)} hint={`${(countBy.pending_payment ?? 0).toLocaleString("tr-TR")} sipariş ödeme bekliyor`} icon={IconBank} tone="warn" href="/orders?status=pending_payment" />
        <Kpi label="Gönderilecek" value={toShip.toLocaleString("tr-TR")} hint={`${(countBy.shipped ?? 0).toLocaleString("tr-TR")} sipariş kargoda`} icon={IconTruck} tone="violet" href="/orders?status=paid" />
      </div>

      <Panel>
        <nav className="tabs" aria-label="Sipariş durumu">
          {TABS.map((t) => (
            <Link
              key={t.value || "all"}
              href={href({ status: t.value || undefined, sayfa: undefined })}
              className={(sp.status ?? "") === t.value ? "is-active" : undefined}
            >
              {t.label}
              <span>{(t.value ? countBy[t.value] ?? 0 : allCount).toLocaleString("tr-TR")}</span>
            </Link>
          ))}
        </nav>

        <form className="toolbar" method="get">
          {sp.status ? <input type="hidden" name="status" value={sp.status} /> : null}
          <div className="search-field">
            <IconSearch />
            <input className="input" name="q" defaultValue={q} placeholder="Sipariş no, müşteri adı, e-posta veya telefon" aria-label="Sipariş ara" />
          </div>
          {tenantRows.length > 1 ? (
            <select className="select" name="tenant" defaultValue={sp.tenant ?? ""} aria-label="Site" style={{ width: "auto" }}>
              <option value="">Tüm siteler</option>
              {tenantRows.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          ) : null}
          <select className="select" name="odeme" defaultValue={sp.odeme ?? ""} aria-label="Ödeme yöntemi" style={{ width: "auto" }}>
            {PAYMENTS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
          {sp.donem ? <input type="hidden" name="donem" value={sp.donem} /> : null}
          <button className="btn btn-secondary" type="submit">
            Ara
          </button>
          {q || sp.tenant || sp.odeme ? (
            <Link className="btn btn-ghost" href={href({ q: undefined, tenant: undefined, odeme: undefined, sayfa: undefined })}>
              Temizle
            </Link>
          ) : null}
        </form>

        <div className="chip-filters" aria-label="Dönem">
          {PERIODS.map((p) => (
            <Link key={p.value || "all"} href={href({ donem: p.value || undefined, sayfa: undefined })} className={period.value === p.value ? "is-active" : undefined}>
              {p.label}
            </Link>
          ))}
        </div>

        {rows.length === 0 ? (
          <EmptyState
            title="Sipariş bulunamadı"
            description={q ? `“${q}” için eşleşen sipariş yok.` : "Bu durumda sipariş yok."}
            icon={IconCart}
          />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: 28 }}>
                    <SelectAllOrders form="bulk-labels" />
                  </th>
                  <th>
                    <Link className="th-sort" href={href({ sirala: "tarih", yon: sortKey === "tarih" && dir === "desc" ? "asc" : "desc", sayfa: undefined })}>
                      Sipariş
                      {sortKey === "tarih" ? <span className="arrow">{dir === "asc" ? "↑" : "↓"}</span> : null}
                    </Link>
                  </th>
                  <th>Müşteri</th>
                  {tenantRows.length > 1 ? <th>Site</th> : null}
                  <th>Ödeme</th>
                  <th>Durum</th>
                  <th className="num">
                    <Link className="th-sort" href={href({ sirala: "tutar", yon: sortKey === "tutar" && dir === "desc" ? "asc" : "desc", sayfa: undefined })}>
                      Tutar
                      {sortKey === "tutar" ? <span className="arrow">{dir === "asc" ? "↑" : "↓"}</span> : null}
                    </Link>
                  </th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((o) => {
                  const card = o.shippingAddress?.paymentMethod === "credit_card";
                  const inst = Number(o.shippingAddress?.installments ?? "1");
                  return (
                    <tr key={o.id} className="row-link" data-href={`/orders/${o.id}`}>
                      <td>
                        <input type="checkbox" name="ids" value={o.id} form="bulk-labels" aria-label={`${o.orderNo} seç`} />
                      </td>
                      <td>
                        <Link href={`/orders/${o.id}`}>{o.orderNo}</Link>
                        <span className="sub">{formatDate(o.createdAt)}</span>
                        {tagMap.get(o.id)?.length ? (
                          <span className="tag-list">
                            {tagMap.get(o.id)!.map((t) => (
                              <span key={t} className="tag">
                                {t}
                              </span>
                            ))}
                          </span>
                        ) : null}
                      </td>
                      <td>
                        {o.fullName}
                        <span className="sub">{o.email}</span>
                      </td>
                      {tenantRows.length > 1 ? <td>{nameBy[o.tenantId] ?? "—"}</td> : null}
                      <td>
                        <span className="muted text-sm" style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
                          {card ? <IconCard width={15} height={15} /> : <IconBank width={15} height={15} />}
                          {card ? (inst > 1 ? `Kart · ${inst} taksit` : "Kart") : "Havale"}
                        </span>
                      </td>
                      <td>
                        <StatusBadge tone={statusTone(o.status)}>{orderStatusLabel(o.status)}</StatusBadge>
                        {o.status === "pending_payment" ? (
                          <span className={`sub${Date.now() - new Date(o.createdAt).getTime() > STALE_MS ? " text-warn" : ""}`}>{relativeTime(o.createdAt)} oluşturuldu</span>
                        ) : null}
                      </td>
                      <td className="num">{formatTry(o.grandTotal)}</td>
                      <td>
                        <div className="row-actions">
                          {o.status === "pending_payment" && !card ? (
                            <form action={withBase(`/api/orders/${o.id}/confirm`)} method="post">
                              <input type="hidden" name="next" value={href({})} />
                              <ConfirmButton
                                className="btn btn-primary btn-sm"
                                message={`${o.orderNo} numaralı siparişin havale ödemesi alındı olarak işaretlensin mi? Müşteriye bilgi e-postası gider.`}
                              >
                                <IconCheck />
                                Ödeme alındı
                              </ConfirmButton>
                            </form>
                          ) : null}
                          {o.status === "paid" ? (
                            <form action={withBase(`/api/orders/${o.id}/prepare`)} method="post">
                              <input type="hidden" name="next" value={href({})} />
                              <button className="btn btn-primary btn-sm" type="submit">
                                Hazırlığa al
                              </button>
                            </form>
                          ) : null}
                          {o.status === "preparing" ? (
                            <Link className="btn btn-primary btn-sm" href={`/orders/${o.id}`}>
                              <IconTruck />
                              Kargoya ver
                            </Link>
                          ) : null}
                          {o.status === "shipped" ? (
                            <form action={withBase(`/api/orders/${o.id}/complete`)} method="post">
                              <input type="hidden" name="next" value={href({})} />
                              <ConfirmButton className="btn btn-secondary btn-sm" message={`${o.orderNo} teslim edildi olarak tamamlansın mı?`}>
                                <IconCheck />
                                Teslim edildi
                              </ConfirmButton>
                            </form>
                          ) : null}
                          <Link className="btn btn-secondary btn-sm" href={`/orders/${o.id}`}>
                            Detay
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <Pager base="/orders" page={page} total={total} perPage={PAGE_SIZE} params={{ tenant: sp.tenant, status: sp.status, q: q || undefined, donem: sp.donem, odeme: sp.odeme, sirala: sp.sirala, yon: sp.yon }} />
      </Panel>
    </>
  );
}

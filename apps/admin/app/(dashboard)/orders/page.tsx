import Link from "next/link";
import { and, count, desc, eq, like, or, type SQL } from "drizzle-orm";
import { db, orders, tagsForOrders, tenants } from "@guntan/db";
import { orderStatusLabel } from "@guntan/ecommerce";
import { IconBank, IconCard, IconCart, IconPrinter, IconSearch } from "@/src/icons";
import { withBase } from "@/src/paths";
import { EmptyState, PageHeader, Panel, StatusBadge, formatDate, formatTry, statusTone } from "@/src/ui";

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
];

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ tenant?: string; status?: string; q?: string; sayfa?: string }>;
}) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const page = Math.max(1, Number.parseInt(sp.sayfa ?? "1", 10) || 1);

  const base: SQL[] = [];
  if (sp.tenant) base.push(eq(orders.tenantId, sp.tenant));
  if (q) {
    const pattern = `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
    base.push(or(like(orders.orderNo, pattern), like(orders.email, pattern), like(orders.fullName, pattern), like(orders.phone, pattern))!);
  }
  const where = [...base, ...(sp.status ? [eq(orders.status, sp.status)] : [])];

  const [tenantRows, statusCounts, totalRows, rows] = await Promise.all([
    db.select().from(tenants),
    db
      .select({ status: orders.status, n: count() })
      .from(orders)
      .where(base.length ? and(...base) : undefined)
      .groupBy(orders.status),
    db.select({ total: count() }).from(orders).where(where.length ? and(...where) : undefined),
    db
      .select()
      .from(orders)
      .where(where.length ? and(...where) : undefined)
      .orderBy(desc(orders.createdAt))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
  ]);
  const total = totalRows[0]?.total ?? 0;
  const tagMap = await tagsForOrders(rows.map((o) => o.id)).catch(() => new Map<string, string[]>());

  const nameBy = Object.fromEntries(tenantRows.map((t) => [t.id, t.name]));
  const countBy = Object.fromEntries(statusCounts.map((r) => [r.status, r.n]));
  const allCount = statusCounts.reduce((a, r) => a + r.n, 0);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const href = (patch: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    const merged = { tenant: sp.tenant, status: sp.status, q: q || undefined, ...patch };
    for (const [k, v] of Object.entries(merged)) if (v) params.set(k, v);
    const s = params.toString();
    return s ? `/orders?${s}` : "/orders";
  };

  return (
    <>
      <PageHeader
        title="Siparişler"
        description="Ödeme, hazırlık, kargo ve teslim adımlarını sipariş detayından yönetin."
        actions={
          <form id="bulk-labels" action={withBase("/api/orders/labels")} method="get" target="_blank">
            <button className="btn btn-secondary" type="submit">
              <IconPrinter />
              Seçilenlerin etiketini yazdır
            </button>
          </form>
        }
      />

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
          <button className="btn btn-secondary" type="submit">
            Ara
          </button>
          {q || sp.tenant ? (
            <Link className="btn btn-ghost" href={href({ q: undefined, tenant: undefined, sayfa: undefined })}>
              Temizle
            </Link>
          ) : null}
        </form>

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
                  <th style={{ width: 28 }} aria-label="Seç" />
                  <th>Sipariş</th>
                  <th>Müşteri</th>
                  {tenantRows.length > 1 ? <th>Site</th> : null}
                  <th>Ödeme</th>
                  <th>Durum</th>
                  <th className="num">Tutar</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((o) => {
                  const card = o.shippingAddress?.paymentMethod === "credit_card";
                  const inst = Number(o.shippingAddress?.installments ?? "1");
                  return (
                    <tr key={o.id}>
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
                      </td>
                      <td className="num">{formatTry(o.grandTotal)}</td>
                      <td>
                        <div className="row-actions">
                          {o.status === "pending_payment" && !card ? (
                            <form action={withBase(`/api/orders/${o.id}/confirm`)} method="post">
                              <button className="btn btn-primary btn-sm" type="submit">
                                Ödeme alındı
                              </button>
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

        {pages > 1 ? (
          <div className="toolbar" style={{ justifyContent: "space-between", borderTop: "1px solid var(--a-border)", borderBottom: 0 }}>
            <span className="muted text-sm">
              {total.toLocaleString("tr-TR")} sipariş · Sayfa {page}/{pages}
            </span>
            <div className="row-actions">
              {page > 1 ? (
                <Link className="btn btn-secondary btn-sm" href={href({ sayfa: String(page - 1) })}>
                  Önceki
                </Link>
              ) : null}
              {page < pages ? (
                <Link className="btn btn-secondary btn-sm" href={href({ sayfa: String(page + 1) })}>
                  Sonraki
                </Link>
              ) : null}
            </div>
          </div>
        ) : null}
      </Panel>
    </>
  );
}

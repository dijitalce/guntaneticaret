import { sql, type SQL } from "drizzle-orm";
import { ensureExtTables } from "./tables";
import { num, rows } from "./sql";

function tenantFilter(column: string, tenantId?: string | null): SQL {
  return tenantId ? sql`and ${sql.raw(column)} = ${tenantId}` : sql``;
}

export const LIVE_RANGES = {
  "30dk": { label: "Son 30 dk", unit: "minute", span: 30 },
  "1sa": { label: "Son 1 saat", unit: "minute", span: 60 },
  bugun: { label: "Bugün", unit: "hour", span: 0 },
  "24sa": { label: "Son 24 saat", unit: "hour", span: 24 },
  "7gun": { label: "Son 7 gün", unit: "day", span: 7 },
} as const;
export type LiveRange = keyof typeof LIVE_RANGES;

/** Türkiye 2016'dan beri sabit UTC+3; sunucu ve veritabanı UTC olsa da etiketler Türkiye saatiyle çıkar. */
const TR_OFFSET_MS = 3 * 3600_000;
const trTime = (col: string) => sql.raw(`convert_tz(${col}, @@session.time_zone, '+03:00')`);
const TR_TODAY_START = sql.raw(`convert_tz(timestamp(date(convert_tz(now(), @@session.time_zone, '+03:00'))), '+03:00', @@session.time_zone)`);
const pad = (n: number) => String(n).padStart(2, "0");

function rangeStart(range: LiveRange): SQL {
  if (range === "30dk") return sql`now() - interval 30 minute`;
  if (range === "1sa") return sql`now() - interval 60 minute`;
  if (range === "bugun") return TR_TODAY_START;
  if (range === "24sa") return sql`now() - interval 24 hour`;
  return sql`now() - interval 7 day`;
}

function rangeBuckets(range: LiveRange): { key: string; label: string }[] {
  const tr = new Date(Date.now() + TR_OFFSET_MS);
  const out: { key: string; label: string }[] = [];
  const unit = LIVE_RANGES[range].unit;
  if (unit === "minute") {
    for (let i = LIVE_RANGES[range].span - 1; i >= 0; i--) {
      const d = new Date(tr.getTime() - i * 60_000);
      const key = `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
      out.push({ key, label: key });
    }
  } else if (unit === "hour") {
    const count = range === "bugun" ? tr.getUTCHours() + 1 : 24;
    for (let i = count - 1; i >= 0; i--) {
      const d = new Date(tr.getTime() - i * 3600_000);
      out.push({ key: `${d.toISOString().slice(0, 10)} ${pad(d.getUTCHours())}`, label: `${pad(d.getUTCHours())}:00` });
    }
  } else {
    for (let i = 6; i >= 0; i--) {
      const d = new Date(tr.getTime() - i * 86_400_000);
      out.push({ key: d.toISOString().slice(0, 10), label: `${pad(d.getUTCDate())}.${pad(d.getUTCMonth() + 1)}` });
    }
  }
  return out;
}

const BUCKET_FORMAT = { minute: "%H:%i", hour: "%Y-%m-%d %H", day: "%Y-%m-%d" } as const;

export type LiveSession = {
  id: string;
  first_seen: Date;
  last_seen: Date;
  pageviews: number;
  device: string | null;
  browser: string | null;
  source: string | null;
  city: string | null;
  landing: string | null;
  last_path: string | null;
  stage: string;
  customer_id: string | null;
  active: boolean;
};

export type LiveEvent = {
  id: number;
  type: string;
  path: string | null;
  title: string | null;
  created_at: Date;
  session_id: string;
  source: string | null;
  device: string | null;
  city: string | null;
};

export async function liveOverview(tenantId?: string | null, range: LiveRange = "bugun") {
  await ensureExtTables();
  const t = (col: string) => tenantFilter(col, tenantId);
  const since = rangeStart(range);
  const fmt = sql.raw(`'${BUCKET_FORMAT[LIVE_RANGES[range].unit]}'`);
  const views = sql`type in ('pv','product')`;
  const [active, visitors, pageviews, orderTotals, chart, funnel, bestSellers, topPages, sources, devices, cities, sessions, feed] = await Promise.all([
    rows<{ c: number }>(sql`select count(*) c from visitor_sessions where last_seen >= now() - interval 5 minute ${t("tenant_id")}`),
    rows<{ c: number }>(sql`select count(*) c from visitor_sessions where last_seen >= ${since} ${t("tenant_id")}`),
    rows<{ c: number }>(sql`select count(*) c from visitor_events where created_at >= ${since} and ${views} ${t("tenant_id")}`),
    rows<{ c: number; s: string | null }>(
      sql`select count(*) c, sum(grand_total) s from orders where created_at >= ${since} and status not in ('cancelled','refunded') ${t("tenant_id")}`,
    ),
    rows<{ b: string; v: number; p: number }>(
      sql`select date_format(${trTime("created_at")}, ${fmt}) b, count(distinct session_id) v, sum(${views}) p
        from visitor_events where created_at >= ${since} ${t("tenant_id")} group by b`,
    ),
    rows<{ stage: string; c: number }>(
      sql`select stage, count(*) c from visitor_sessions where last_seen >= ${since} ${t("tenant_id")} group by stage`,
    ),
    rows<{ product_id: string; name: string; image_url: string | null; qty: number; amount: string }>(
      sql`select oi.product_id, max(oi.name) name, max(oi.image_url) image_url, sum(oi.qty) qty, sum(oi.qty * oi.unit_price) amount
        from order_items oi join orders o on o.id = oi.order_id
        where o.created_at >= ${since} and o.status not in ('cancelled','refunded') ${t("o.tenant_id")}
        group by oi.product_id order by qty desc limit 8`,
    ),
    rows<{ path: string | null; title: string | null; c: number; v: number }>(
      sql`select path, max(title) title, count(*) c, count(distinct session_id) v from visitor_events
        where created_at >= ${since} and ${views} ${t("tenant_id")} group by path order by c desc limit 10`,
    ),
    rows<{ source: string; c: number }>(
      sql`select coalesce(source, 'Doğrudan') source, count(*) c from visitor_sessions where last_seen >= ${since} ${t("tenant_id")}
        group by source order by c desc limit 8`,
    ),
    rows<{ device: string; c: number }>(
      sql`select coalesce(device, 'desktop') device, count(*) c from visitor_sessions where last_seen >= ${since} ${t("tenant_id")} group by device`,
    ),
    rows<{ city: string; c: number }>(
      sql`select city, count(*) c from visitor_sessions where last_seen >= ${since} and city is not null and city <> '' ${t("tenant_id")}
        group by city order by c desc limit 8`,
    ),
    rows<Omit<LiveSession, "active"> & { is_active: number }>(
      sql`select id, first_seen, last_seen, pageviews, device, browser, source, city, landing, last_path, stage, customer_id,
        last_seen >= now() - interval 5 minute is_active
        from visitor_sessions where 1 = 1 ${t("tenant_id")} order by last_seen desc limit 25`,
    ),
    rows<LiveEvent>(
      sql`select e.id, e.type, e.path, e.title, e.created_at, e.session_id, s.source, s.device, s.city from visitor_events e
        left join visitor_sessions s on s.id = e.session_id
        where 1 = 1 ${t("e.tenant_id")} order by e.created_at desc, e.id desc limit 60`,
    ),
  ]);

  const byBucket = new Map(chart.map((c) => [c.b, { v: num(c.v), p: num(c.p) }]));
  const stageCount = new Map(funnel.map((f) => [f.stage, num(f.c)]));
  const totalSessions = [...stageCount.values()].reduce((a, b) => a + b, 0);
  const order = stageCount.get("order") ?? 0;
  const checkout = (stageCount.get("checkout") ?? 0) + order;
  const cart = (stageCount.get("cart") ?? 0) + checkout;
  const product = (stageCount.get("product") ?? 0) + cart;
  return {
    range,
    activeVisitors: num(active[0]?.c),
    visitors: num(visitors[0]?.c),
    pageviews: num(pageviews[0]?.c),
    orders: num(orderTotals[0]?.c),
    sales: num(orderTotals[0]?.s),
    chart: rangeBuckets(range).map((b) => ({ ...b, visitors: byBucket.get(b.key)?.v ?? 0, pageviews: byBucket.get(b.key)?.p ?? 0 })),
    funnel: { visitors: totalSessions, product, cart, checkout, order },
    bestSellers: bestSellers.map((b) => ({ ...b, qty: num(b.qty), amount: num(b.amount) })),
    topPages: topPages.map((p) => ({ path: p.path ?? "/", title: p.title, c: num(p.c), v: num(p.v) })),
    sources: sources.map((s) => ({ source: s.source, c: num(s.c) })),
    devices: devices.map((d) => ({ device: d.device, c: num(d.c) })),
    cities: cities.map((c) => ({ city: c.city, c: num(c.c) })),
    sessions: sessions.map(({ is_active, ...s }): LiveSession => ({ ...s, pageviews: num(s.pageviews), active: num(is_active) === 1 })),
    feed: feed.map((e) => ({ ...e, id: num(e.id) })),
  };
}

export type AbandonedCartRow = {
  id: string;
  tenant_id: string;
  customer_id: string | null;
  last_activity: Date;
  qty: number;
  lines: number;
  total: number;
  email: string | null;
  name: string | null;
  phone: string | null;
  reminder_count: number;
  last_reminded_at: Date | null;
  recovered_order_id: string | null;
};

const ABANDON_MINUTES = 60;

function abandonedBase(tenantId?: string | null, search?: string | null, contactOnly = false): SQL {
  const q = search?.trim() ? `%${search.trim()}%` : null;
  return sql`from carts c
    join cart_items ci on ci.cart_id = c.id
    join products p on p.id = ci.product_id
    left join cart_contacts cc on cc.cart_id = c.id
    left join customers cu on cu.id = c.customer_id
    where c.updated_at > now() - interval 30 day
    ${tenantId ? sql`and c.tenant_id = ${tenantId}` : sql``}
    ${q ? sql`and (cc.email like ${q} or cu.email like ${q} or cc.full_name like ${q} or concat(cu.first_name, ' ', cu.last_name) like ${q})` : sql``}
    group by c.id
    having greatest(max(c.updated_at), max(ci.updated_at)) < now() - interval ${sql.raw(String(ABANDON_MINUTES))} minute
    ${contactOnly ? sql`and coalesce(max(cc.email), max(cu.email)) is not null` : sql``}`;
}

export async function listAbandonedCarts(opts: { tenantId?: string | null; search?: string | null; limit: number; offset: number; withContactOnly?: boolean }) {
  await ensureExtTables();
  const list = await rows<Record<string, unknown>>(sql`select c.id, c.tenant_id, c.customer_id,
      greatest(max(c.updated_at), max(ci.updated_at)) last_activity,
      sum(ci.qty) qty, count(ci.id) line_count, sum(ci.qty * p.price) total,
      coalesce(max(cc.email), max(cu.email)) email,
      coalesce(max(cc.full_name), max(concat(cu.first_name, ' ', cu.last_name))) name,
      coalesce(max(cc.phone), max(cu.phone)) phone,
      coalesce(max(cc.reminder_count), 0) reminder_count, max(cc.last_reminded_at) last_reminded_at,
      max(cc.recovered_order_id) recovered_order_id
    ${abandonedBase(opts.tenantId, opts.search, opts.withContactOnly)}
    order by last_activity desc limit ${opts.limit} offset ${opts.offset}`);
  const [count] = await rows<{ c: number }>(
    sql`select count(*) c from (select c.id ${abandonedBase(opts.tenantId, opts.search, opts.withContactOnly)}) x`,
  );
  return {
    total: num(count?.c),
    rows: list.map(
      (r): AbandonedCartRow => ({
        id: String(r.id),
        tenant_id: String(r.tenant_id),
        customer_id: (r.customer_id as string) ?? null,
        last_activity: new Date(String(r.last_activity)),
        qty: num(r.qty),
        lines: num(r.line_count),
        total: num(r.total),
        email: (r.email as string) ?? null,
        name: ((r.name as string) ?? "").trim() || null,
        phone: (r.phone as string) ?? null,
        reminder_count: num(r.reminder_count),
        last_reminded_at: r.last_reminded_at ? new Date(String(r.last_reminded_at)) : null,
        recovered_order_id: (r.recovered_order_id as string) ?? null,
      }),
    ),
  };
}

export async function listRecoveredCarts(opts: { tenantId?: string | null; limit: number; offset: number }) {
  await ensureExtTables();
  const list = await rows<{
    cart_id: string;
    email: string | null;
    full_name: string | null;
    reminder_count: number;
    recovered_at: Date;
    order_id: string;
    order_no: string;
    grand_total: string;
    tenant_id: string;
    qty: number;
  }>(sql`select cc.cart_id, cc.email, cc.full_name, cc.reminder_count, cc.recovered_at, o.id order_id, o.order_no, o.grand_total, o.tenant_id,
      (select sum(qty) from order_items where order_id = o.id) qty
    from cart_contacts cc join orders o on o.id = cc.recovered_order_id
    where 1 = 1 ${tenantFilter("o.tenant_id", opts.tenantId)}
    order by cc.recovered_at desc limit ${opts.limit} offset ${opts.offset}`);
  return list.map((r) => ({ ...r, qty: num(r.qty), grand_total: num(r.grand_total) }));
}

export async function getAbandonedCart(cartId: string) {
  await ensureExtTables();
  const [cart] = await rows<Record<string, unknown>>(sql`select c.id, c.tenant_id, c.customer_id, c.created_at, c.updated_at,
      t.name tenant_name,
      cc.email contact_email, cc.phone contact_phone, cc.full_name contact_name, cc.reminder_count, cc.last_reminded_at,
      cc.recovered_order_id, cc.recovered_at,
      cu.email customer_email, cu.phone customer_phone, concat(cu.first_name, ' ', cu.last_name) customer_name,
      o.order_no recovered_order_no
    from carts c
    left join tenants t on t.id = c.tenant_id
    left join cart_contacts cc on cc.cart_id = c.id
    left join customers cu on cu.id = c.customer_id
    left join orders o on o.id = cc.recovered_order_id
    where c.id = ${cartId} limit 1`);
  if (!cart) return null;
  const [items, messages] = await Promise.all([
    rows<{ product_id: string; name: string; sku: string | null; slug: string; qty: number; price: string; stock_qty: number; image_url: string | null; updated_at: Date }>(
      sql`select ci.product_id, p.name, p.sku, p.slug, ci.qty, p.price, p.stock_qty, ci.updated_at,
        (select min(url) from product_images pi where pi.product_id = p.id) image_url
      from cart_items ci join products p on p.id = ci.product_id where ci.cart_id = ${cartId} order by ci.updated_at desc`,
    ),
    rows<{ id: string; channel: string; recipient: string; template_key: string | null; status: string; error: string | null; created_at: Date; opened_at: Date | null; clicked_at: Date | null }>(
      sql`select id, channel, recipient, template_key, status, error, created_at, opened_at, clicked_at
      from message_log where related_type = 'cart' and related_id = ${cartId} order by created_at desc limit 20`,
    ),
  ]);
  const str = (v: unknown) => (v === null || v === undefined ? null : String(v).trim() || null);
  const lines = items.map((i) => ({ ...i, qty: num(i.qty), price: num(i.price), stock_qty: num(i.stock_qty) }));
  const lastActivity = [new Date(String(cart.updated_at)), ...lines.map((l) => new Date(l.updated_at))].reduce((a, b) => (b > a ? b : a));
  return {
    id: String(cart.id),
    tenantId: String(cart.tenant_id),
    tenantName: str(cart.tenant_name),
    customerId: str(cart.customer_id),
    createdAt: new Date(String(cart.created_at)),
    lastActivity,
    email: str(cart.contact_email) ?? str(cart.customer_email),
    phone: str(cart.contact_phone) ?? str(cart.customer_phone),
    name: str(cart.contact_name) ?? str(cart.customer_name),
    reminderCount: num(cart.reminder_count),
    lastRemindedAt: cart.last_reminded_at ? new Date(String(cart.last_reminded_at)) : null,
    recoveredOrderId: str(cart.recovered_order_id),
    recoveredOrderNo: str(cart.recovered_order_no),
    recoveredAt: cart.recovered_at ? new Date(String(cart.recovered_at)) : null,
    items: lines,
    total: lines.reduce((s, l) => s + l.price * l.qty, 0),
    messages,
  };
}

export async function abandonedStats(tenantId?: string | null) {
  await ensureExtTables();
  const [abandoned] = await rows<{ c: number; v: string | null }>(
    sql`select count(*) c, sum(total) v from (select sum(ci.qty * p.price) total ${abandonedBase(tenantId, null)}) x`,
  );
  const [recovered] = await rows<{ c: number; v: string | null; q: string | null }>(
    sql`select count(*) c, sum(o.grand_total) v, sum((select sum(qty) from order_items where order_id = o.id)) q
      from cart_contacts cc join orders o on o.id = cc.recovered_order_id
      where cc.recovered_at > now() - interval 30 day and o.status not in ('cancelled','refunded') ${tenantFilter("o.tenant_id", tenantId)}`,
  );
  const [reminded] = await rows<{ c: number }>(
    sql`select count(*) c from cart_contacts where last_reminded_at > now() - interval 30 day ${tenantFilter("tenant_id", tenantId)}`,
  );
  return {
    abandoned: num(abandoned?.c) + num(recovered?.c),
    abandonedValue: num(abandoned?.v),
    recovered: num(recovered?.c),
    recoveredRevenue: num(recovered?.v),
    recoveredItems: num(recovered?.q),
    reminded: num(reminded?.c),
  };
}

export async function marketingSummary(days: number, tenantId?: string | null) {
  await ensureExtTables();
  const range = sql`o.created_at >= curdate() - interval ${sql.raw(String(Math.max(1, Math.min(365, days))))} day`;
  const valid = sql`o.status not in ('cancelled','refunded')`;
  const tf = tenantFilter("o.tenant_id", tenantId);
  const [totals, bySource, daily, marketing, messages, recovered] = await Promise.all([
    rows<{ c: number; s: string | null }>(sql`select count(*) c, sum(o.grand_total) s from orders o where ${range} and ${valid} ${tf}`),
    rows<{ source: string | null; medium: string | null; c: number; s: string | null }>(
      sql`select coalesce(a.source, 'Bilinmiyor') source, max(a.medium) medium, count(*) c, sum(o.grand_total) s
        from orders o left join order_attribution a on a.order_id = o.id
        where ${range} and ${valid} ${tf} group by coalesce(a.source, 'Bilinmiyor') order by s desc limit 12`,
    ),
    rows<{ d: string; c: number; s: string | null }>(
      sql`select date_format(o.created_at, '%Y-%m-%d') d, count(*) c, sum(o.grand_total) s from orders o
        where ${range} and ${valid} ${tf} group by d order by d`,
    ),
    rows<{ c: number; s: string | null }>(
      sql`select count(*) c, sum(o.grand_total) s from orders o join order_attribution a on a.order_id = o.id
        where ${range} and ${valid} ${tf} and (a.medium in ('email','sms','automation','campaign') or a.campaign is not null)`,
    ),
    rows<{ channel: string; sent: number; opened: number; clicked: number }>(
      sql`select channel, sum(status = 'sent') sent, sum(opened_at is not null) opened, sum(clicked_at is not null) clicked
        from message_log where created_at >= curdate() - interval ${sql.raw(String(days))} day
        ${tenantId ? sql`and tenant_id = ${tenantId}` : sql``} group by channel`,
    ),
    rows<{ c: number; s: string | null }>(
      sql`select count(*) c, sum(o.grand_total) s from cart_contacts cc join orders o on o.id = cc.recovered_order_id
        where ${range} and ${valid} ${tf}`,
    ),
  ]);
  return {
    orders: num(totals[0]?.c),
    revenue: num(totals[0]?.s),
    bySource: bySource.map((r) => ({ source: r.source ?? "Bilinmiyor", medium: r.medium, orders: num(r.c), revenue: num(r.s) })),
    daily: daily.map((r) => ({ day: r.d, orders: num(r.c), revenue: num(r.s) })),
    marketingOrders: num(marketing[0]?.c) + num(recovered[0]?.c),
    marketingRevenue: num(marketing[0]?.s) + num(recovered[0]?.s),
    recoveredRevenue: num(recovered[0]?.s),
    messages: messages.map((m) => ({ channel: m.channel, sent: num(m.sent), opened: num(m.opened), clicked: num(m.clicked) })),
  };
}

import { sql } from "drizzle-orm";
import { ensureExtTables } from "./tables";
import { exec, first, num, rows } from "./sql";
import { csvList, getAutomationSettings, type AutomationKey } from "./settings";
import { getTenantContext, sendAdminTemplate, sendTemplate } from "./messaging";
import { addOrderEventSafe, formatMoney, notifyOrder } from "./orders";
import { escapeHtml, itemsTableHtml } from "./templates";
import { processCampaignQueue } from "./campaigns";

type RunResult = { processed: number; sent: number; note?: string };

async function logRun(automation: string, r: RunResult) {
  if (!r.processed && !r.sent && !r.note) return;
  await exec(sql`insert into automation_runs (automation, processed, sent, note) values (${automation}, ${r.processed}, ${r.sent}, ${r.note ?? null})`);
}

async function productImages(ids: string[]) {
  if (!ids.length) return new Map<string, string>();
  const list = await rows<{ product_id: string; url: string }>(
    sql`select product_id, min(url) url from product_images where product_id in (${sql.join(ids.map((i) => sql`${i}`), sql`, `)}) group by product_id`,
  );
  return new Map(list.map((r) => [r.product_id, r.url]));
}

async function runAbandonedCart(): Promise<RunResult> {
  const s = (await getAutomationSettings()).abandoned_cart;
  if (!s.enabled) return { processed: 0, sent: 0 };
  const delay = Math.max(15, Math.floor(s.delayMinutes));
  const secondDelay = Math.max(1, Math.floor(s.secondDelayHours));
  const candidates = await rows<{
    id: string;
    tenant_id: string;
    session_id: string;
    email: string | null;
    name: string | null;
    phone: string | null;
    reminder_count: number;
  }>(sql`select c.id, c.tenant_id, c.session_id,
      coalesce(max(cc.email), max(cu.email)) email,
      coalesce(max(cc.full_name), max(concat(cu.first_name, ' ', cu.last_name))) name,
      coalesce(max(cc.phone), max(cu.phone)) phone,
      coalesce(max(cc.reminder_count), 0) reminder_count
    from carts c
    join cart_items ci on ci.cart_id = c.id
    left join cart_contacts cc on cc.cart_id = c.id
    left join customers cu on cu.id = c.customer_id
    where c.updated_at > now() - interval 3 day
    group by c.id
    having greatest(c.updated_at, max(ci.updated_at)) < now() - interval ${sql.raw(String(delay))} minute
      and email is not null
      and (reminder_count = 0 or (${s.secondEnabled ? 1 : 0} = 1 and reminder_count = 1
        and max(cc.last_reminded_at) < now() - interval ${sql.raw(String(secondDelay))} hour))
    limit 30`);
  let sent = 0;
  for (const cart of candidates) {
    const email = cart.email!;
    const ordered = await first<{ c: number }>(
      sql`select count(*) c from orders where lower(email) = ${email.toLowerCase()} and created_at > now() - interval 3 day`,
    );
    const nextCount = num(cart.reminder_count) + 1;
    await exec(sql`insert into cart_contacts (cart_id, tenant_id, email, reminder_count, last_reminded_at)
      values (${cart.id}, ${cart.tenant_id}, ${email}, ${nextCount}, now())
      on duplicate key update reminder_count = ${nextCount}, last_reminded_at = now(), email = coalesce(email, values(email))`);
    if (num(ordered?.c) > 0) continue;
    const r = await deliverCartReminder({ ...cart, email }, nextCount, s.sms, s.couponCode, "automation");
    if (r.ok) sent++;
  }
  return { processed: candidates.length, sent };
}

async function deliverCartReminder(
  cart: { id: string; tenant_id: string; email: string | null; name: string | null; phone: string | null },
  count: number,
  sms: boolean,
  couponCode: string,
  medium: string,
) {
  const items = await rows<{ product_id: string; name: string; qty: number; price: string }>(
    sql`select ci.product_id, p.name, ci.qty, p.price from cart_items ci join products p on p.id = ci.product_id where ci.cart_id = ${cart.id} limit 10`,
  );
  if (!items.length) return { ok: false, error: "Sepet boş." };
  const images = await productImages(items.map((i) => i.product_id));
  const tenant = await getTenantContext(cart.tenant_id);
  const total = items.reduce((a, i) => a + Number(i.price) * i.qty, 0);
  const useSms = sms && Boolean(cart.phone);
  const r = await sendTemplate({
    key: count <= 1 ? "abandoned_cart" : "abandoned_cart_2",
    tenantId: cart.tenant_id,
    email: cart.email,
    phone: useSms ? cart.phone : null,
    force: { email: Boolean(cart.email), sms: useSms },
    vars: {
      customer_name: (cart.name ?? "").trim().split(" ")[0] || "Merhaba",
      cart_total: formatMoney(total),
      cart_url: `${tenant.url}/api/cart/restore?c=${cart.id}&utm_source=${cart.email ? "email" : "sms"}&utm_medium=${medium}&utm_campaign=abandoned_cart`,
      coupon_code: couponCode,
      coupon_block: couponCode ? `<p>Size özel indirim kodu:</p><div class="coupon">${escapeHtml(couponCode)}</div>` : "",
      items_table: itemsTableHtml(
        items.map((i) => ({ name: i.name, qty: i.qty, price: formatMoney(Number(i.price) * i.qty), imageUrl: images.get(i.product_id) ?? null })),
      ),
    },
    relatedType: "cart",
    relatedId: cart.id,
  });
  const ok = Boolean(r.email?.ok || r.sms?.ok);
  return { ok, error: ok ? undefined : (r.email?.error ?? r.sms?.error ?? "Gönderilemedi.") };
}

export async function sendCartReminderNow(cartId: string, opts: { sms?: boolean; couponCode?: string } = {}) {
  await ensureExtTables();
  const cart = await first<{ id: string; tenant_id: string; email: string | null; name: string | null; phone: string | null; reminder_count: number }>(
    sql`select c.id, c.tenant_id,
      coalesce(max(cc.email), max(cu.email)) email,
      coalesce(max(cc.full_name), max(concat(cu.first_name, ' ', cu.last_name))) name,
      coalesce(max(cc.phone), max(cu.phone)) phone,
      coalesce(max(cc.reminder_count), 0) reminder_count
    from carts c
    left join cart_contacts cc on cc.cart_id = c.id
    left join customers cu on cu.id = c.customer_id
    where c.id = ${cartId} group by c.id`,
  );
  if (!cart) return { ok: false, error: "Sepet bulunamadı." };
  if (!cart.email && !(opts.sms && cart.phone)) return { ok: false, error: "Bu sepette iletişim bilgisi yok." };
  const nextCount = num(cart.reminder_count) + 1;
  const r = await deliverCartReminder(cart, nextCount, Boolean(opts.sms), opts.couponCode ?? "", "manual");
  if (r.ok) {
    await exec(sql`insert into cart_contacts (cart_id, tenant_id, email, phone, reminder_count, last_reminded_at)
      values (${cart.id}, ${cart.tenant_id}, ${cart.email}, ${cart.phone}, ${nextCount}, now())
      on duplicate key update reminder_count = ${nextCount}, last_reminded_at = now(), email = coalesce(email, values(email)), phone = coalesce(phone, values(phone))`);
  }
  return r;
}

async function runBankReminder(): Promise<RunResult> {
  const s = (await getAutomationSettings()).bank_reminder;
  if (!s.enabled) return { processed: 0, sent: 0 };
  const hours = Math.max(1, Math.floor(s.afterHours));
  const list = await rows<{ id: string }>(sql`select o.id from orders o
    join payments p on p.order_id = o.id and p.method = 'bank_transfer'
    where o.status = 'pending_payment' and o.created_at < now() - interval ${sql.raw(String(hours))} hour
      and o.created_at > now() - interval 10 day
      and not exists (select 1 from order_events e where e.order_id = o.id and e.kind = 'automation' and e.title = 'Havale hatırlatması gönderildi')
    limit 30`);
  for (const o of list) {
    await addOrderEventSafe({ orderId: o.id, kind: "automation", title: "Havale hatırlatması gönderildi" });
    await notifyOrder(o.id, "bank_reminder");
  }
  return { processed: list.length, sent: list.length };
}

async function cancelPendingOrder(orderId: string) {
  const items = await rows<{ product_id: string; qty: number }>(sql`select product_id, qty from order_items where order_id = ${orderId}`);
  const res = await exec(sql`update orders set status = 'cancelled' where id = ${orderId} and status = 'pending_payment'`);
  if (!res.affectedRows) return false;
  for (const item of items) {
    await exec(sql`update products set reserved_qty = greatest(reserved_qty - ${item.qty}, 0) where id = ${item.product_id}`);
  }
  await exec(sql`update payments set status = 'cancelled' where order_id = ${orderId}`);
  return true;
}

async function runBankCancel(): Promise<RunResult> {
  const s = (await getAutomationSettings()).bank_cancel;
  if (!s.enabled) return { processed: 0, sent: 0 };
  const hours = Math.max(6, Math.floor(s.afterHours));
  const list = await rows<{ id: string }>(sql`select o.id from orders o
    join payments p on p.order_id = o.id and p.method = 'bank_transfer'
    where o.status = 'pending_payment' and o.created_at < now() - interval ${sql.raw(String(hours))} hour
    limit 30`);
  let cancelled = 0;
  for (const o of list) {
    if (await cancelPendingOrder(o.id)) {
      cancelled++;
      await addOrderEventSafe({
        orderId: o.id,
        kind: "automation",
        title: "Otomatik iptal",
        body: `Havale ödemesi ${hours} saat içinde gelmediği için sipariş iptal edildi, stok rezervasyonu bırakıldı.`,
      });
      await notifyOrder(o.id, "bank_cancelled");
    }
  }
  return { processed: list.length, sent: cancelled };
}

async function runBackInStock(): Promise<RunResult> {
  const s = (await getAutomationSettings()).back_in_stock;
  if (!s.enabled) return { processed: 0, sent: 0 };
  const list = await rows<{ id: number; tenant_id: string; email: string; product_id: string; name: string; slug: string }>(
    sql`select a.id, a.tenant_id, a.email, a.product_id, p.name, p.slug from stock_alerts a
      join products p on p.id = a.product_id
      where a.notified_at is null and p.status = 'active' and p.stock_qty - p.reserved_qty > 0
      limit 50`,
  );
  let sent = 0;
  for (const a of list) {
    const tenant = await getTenantContext(a.tenant_id);
    const r = await sendTemplate({
      key: "back_in_stock",
      tenantId: a.tenant_id,
      email: a.email,
      vars: {
        customer_name: "",
        product_name: a.name,
        product_url: `${tenant.url}/urun/${a.slug}?utm_source=email&utm_medium=automation&utm_campaign=back_in_stock`,
      },
      relatedType: "product",
      relatedId: a.product_id,
    });
    await exec(sql`update stock_alerts set notified_at = now() where id = ${a.id}`);
    if (r.email?.ok) sent++;
  }
  return { processed: list.length, sent };
}

async function runReviewRequest(): Promise<RunResult> {
  const s = (await getAutomationSettings()).review_request;
  if (!s.enabled) return { processed: 0, sent: 0 };
  const days = Math.max(1, Math.floor(s.afterDays));
  const list = await rows<{ id: string }>(sql`select o.id from orders o
    where o.status = 'completed' and o.updated_at < now() - interval ${sql.raw(String(days))} day
      and o.updated_at > now() - interval ${sql.raw(String(days + 14))} day
      and not exists (select 1 from order_events e where e.order_id = o.id and e.kind = 'automation' and e.title = 'Değerlendirme isteği gönderildi')
    limit 30`);
  for (const o of list) {
    await addOrderEventSafe({ orderId: o.id, kind: "automation", title: "Değerlendirme isteği gönderildi" });
    await notifyOrder(o.id, "review_request");
  }
  return { processed: list.length, sent: list.length };
}

async function runLowStock(): Promise<RunResult> {
  const s = (await getAutomationSettings()).low_stock;
  if (!s.enabled) return { processed: 0, sent: 0 };
  const last = await first<{ c: number }>(
    sql`select count(*) c from automation_runs where automation = 'low_stock' and sent > 0 and created_at > now() - interval 24 hour`,
  );
  if (num(last?.c) > 0) return { processed: 0, sent: 0 };
  const threshold = Math.max(0, Math.floor(s.threshold));
  const list = await rows<{ id: string; name: string; sku: string; available: number }>(sql`select p.id, p.name, p.sku, p.stock_qty - p.reserved_qty available
    from products p
    where p.status = 'active' and p.stock_qty - p.reserved_qty <= ${threshold}
      and p.id in (select oi.product_id from order_items oi join orders o on o.id = oi.order_id where o.created_at > now() - interval 60 day)
    order by available asc limit 100`);
  if (!list.length) return { processed: 0, sent: 0 };
  await sendAdminTemplate(
    "low_stock_admin",
    null,
    {
      count: String(list.length),
      threshold: String(threshold),
      items_table: itemsTableHtml(list.map((p) => ({ name: `${p.name} (${p.sku})`, qty: num(p.available), price: `${num(p.available)} adet` }))),
    },
    csvList(s.emails),
  );
  return { processed: list.length, sent: 1 };
}

async function pruneTracking(): Promise<RunResult> {
  const last = await first<{ c: number }>(
    sql`select count(*) c from automation_runs where automation = 'prune' and created_at > now() - interval 1 day`,
  );
  if (num(last?.c) > 0) return { processed: 0, sent: 0 };
  const a = await exec(sql`delete from visitor_events where created_at < now() - interval 45 day limit 20000`);
  const b = await exec(sql`delete from visitor_sessions where last_seen < now() - interval 120 day limit 20000`);
  return { processed: a.affectedRows + b.affectedRows, sent: 0, note: "Eski ziyaret kayıtları temizlendi" };
}

export const AUTOMATION_RUNNERS: Record<AutomationKey | "campaigns" | "prune", () => Promise<RunResult>> = {
  abandoned_cart: runAbandonedCart,
  bank_reminder: runBankReminder,
  bank_cancel: runBankCancel,
  back_in_stock: runBackInStock,
  review_request: runReviewRequest,
  low_stock: runLowStock,
  campaigns: async () => {
    const r = await processCampaignQueue();
    return { processed: r.sent, sent: r.sent };
  },
  prune: pruneTracking,
};

const LOCK_KEY = "automation.lock";
const MIN_GAP_MS = 4 * 60_000;

/** Birden çok süreç aynı anda çalıştırmasın diye app_settings üzerinde atomik zaman kilidi. */
async function acquireLock(): Promise<boolean> {
  const now = Date.now();
  await exec(sql`insert ignore into app_settings (setting_key, setting_value) values (${LOCK_KEY}, '0')`);
  const res = await exec(sql`update app_settings set setting_value = ${String(now)}
    where setting_key = ${LOCK_KEY} and cast(setting_value as unsigned) < ${now - MIN_GAP_MS}`);
  return res.affectedRows > 0;
}

export async function runAllAutomations(opts: { force?: boolean } = {}) {
  await ensureExtTables();
  if (!opts.force && !(await acquireLock())) return { skipped: true as const };
  const summary: Record<string, RunResult | { error: string }> = {};
  for (const [key, runner] of Object.entries(AUTOMATION_RUNNERS)) {
    try {
      const r = await runner();
      summary[key] = r;
      await logRun(key, r).catch(() => undefined);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      summary[key] = { error: message };
      await logRun(key, { processed: 0, sent: 0, note: `Hata: ${message.slice(0, 500)}` }).catch(() => undefined);
    }
  }
  return { skipped: false as const, summary };
}

export async function automationStats() {
  await ensureExtTables();
  const list = await rows<{ automation: string; runs: number; processed: number; sent: number; last_at: Date | null }>(
    sql`select automation, count(*) runs, sum(processed) processed, sum(sent) sent, max(created_at) last_at
      from automation_runs where created_at > now() - interval 30 day group by automation`,
  );
  const lastRun = await first<{ v: string }>(sql`select setting_value v from app_settings where setting_key = ${LOCK_KEY}`);
  return {
    byKey: new Map(list.map((r) => [r.automation, { runs: num(r.runs), processed: num(r.processed), sent: num(r.sent), lastAt: r.last_at }])),
    lastRunAt: lastRun && Number(lastRun.v) > 0 ? new Date(Number(lastRun.v)) : null,
  };
}

export async function recentAutomationRuns(limit = 30) {
  await ensureExtTables();
  return rows<{ id: number; automation: string; processed: number; sent: number; note: string | null; created_at: Date }>(
    sql`select * from automation_runs order by created_at desc limit ${limit}`,
  );
}

let started = false;

/** Sunucu sürecinde periyodik çalıştırıcı. Hostinger süreci sık yenilediği için ilk tur kısa gecikmeyle başlar. */
export function startAutomationScheduler() {
  if (started) return;
  if (process.env.NODE_ENV !== "production" || process.env.AUTOMATIONS_DISABLED === "1") return;
  started = true;
  const tick = () => {
    void runAllAutomations().catch(() => undefined);
  };
  setTimeout(tick, 20_000).unref?.();
  setInterval(tick, 60_000).unref?.();
}

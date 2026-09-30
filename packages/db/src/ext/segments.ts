import { sql } from "drizzle-orm";
import { ensureExtTables } from "./tables";
import { num, rows } from "./sql";
import { getCustomSegments, type CustomSegment } from "./settings";

export type Contact = {
  email: string;
  name: string;
  phone: string | null;
  customerId: string | null;
  tenantId: string | null;
  orders: number;
  spent: number;
  lastOrderAt: Date | null;
  firstOrderAt: Date | null;
  registeredAt: Date | null;
  marketing: boolean;
  unsubscribed: boolean;
  abandoned: boolean;
  subscriber: boolean;
};

export const SEGMENT_TEMPLATES: (CustomSegment & { builtin: true })[] = [
  { builtin: true, key: "all", name: "Tüm pazarlama izinli kişiler", description: "Pazarlama iletisi almayı kabul etmiş herkes." },
  { builtin: true, key: "repeat_30", name: "Son 30 günde tekrar alışveriş yapanlar", description: "Son 30 günde en az 2 sipariş.", minOrders: 2, lastOrderWithinDays: 30 },
  { builtin: true, key: "new_30", name: "Yeni müşteriler", description: "İlk siparişini son 30 günde verenler.", maxOrders: 1, lastOrderWithinDays: 30 },
  { builtin: true, key: "lapsed_90", name: "90 gündür alışveriş yapmayanlar", description: "En az 1 siparişi olan ama 90 gündür sipariş vermeyenler.", minOrders: 1, lastOrderOlderThanDays: 90 },
  { builtin: true, key: "high_value", name: "Yüksek harcama yapanlar", description: "Toplam harcaması 5.000 TL ve üzeri.", minSpent: 5000 },
  { builtin: true, key: "no_orders", name: "Hiç sipariş vermeyen üyeler", description: "Üye olup henüz sipariş vermeyenler.", maxOrders: 0 },
  { builtin: true, key: "abandoned", name: "Terk edilmiş sepeti olanlar", description: "Son 7 günde sepetinde ürün bırakanlar.", hasAbandonedCart: true },
  { builtin: true, key: "subscribers", name: "Bülten aboneleri", description: "Popup veya bülten formundan abone olanlar." },
];

let cache: { at: number; contacts: Contact[] } | null = null;

export async function loadContacts(force = false): Promise<Contact[]> {
  if (!force && cache && Date.now() - cache.at < 60_000) return cache.contacts;
  await ensureExtTables();
  const [orderRows, customerRows, subscriberRows, abandonedRows] = await Promise.all([
    rows<{ email: string; name: string; phone: string | null; customer_id: string | null; tenant_id: string; c: number; s: string; last_at: Date; first_at: Date; mk: number }>(
      sql`select lower(email) email, max(full_name) name, max(phone) phone, max(customer_id) customer_id, max(tenant_id) tenant_id,
        count(*) c, sum(grand_total) s, max(created_at) last_at, min(created_at) first_at,
        max(json_unquote(json_extract(shipping_address, '$.acceptMarketing')) = '1') mk
        from orders where status not in ('cancelled','refunded') group by lower(email)`,
    ),
    rows<{ id: string; email: string; first_name: string; last_name: string; phone: string | null; created_at: Date }>(
      sql`select id, lower(email) email, first_name, last_name, phone, created_at from customers`,
    ),
    rows<{ email: string; full_name: string | null; phone: string | null; tenant_id: string | null; unsubscribed_at: Date | null; created_at: Date }>(
      sql`select email, full_name, phone, tenant_id, unsubscribed_at, created_at from marketing_contacts`,
    ),
    rows<{ email: string }>(
      sql`select distinct lower(coalesce(cc.email, cu.email)) email from carts c
        join cart_items ci on ci.cart_id = c.id
        left join cart_contacts cc on cc.cart_id = c.id left join customers cu on cu.id = c.customer_id
        where c.updated_at > now() - interval 7 day and coalesce(cc.email, cu.email) is not null`,
    ),
  ]);
  const map = new Map<string, Contact>();
  const blank = (email: string): Contact => ({
    email,
    name: "",
    phone: null,
    customerId: null,
    tenantId: null,
    orders: 0,
    spent: 0,
    lastOrderAt: null,
    firstOrderAt: null,
    registeredAt: null,
    marketing: false,
    unsubscribed: false,
    abandoned: false,
    subscriber: false,
  });
  for (const r of orderRows) {
    const c = blank(r.email);
    c.name = r.name;
    c.phone = r.phone;
    c.customerId = r.customer_id;
    c.tenantId = r.tenant_id;
    c.orders = num(r.c);
    c.spent = num(r.s);
    c.lastOrderAt = new Date(r.last_at);
    c.firstOrderAt = new Date(r.first_at);
    c.marketing = num(r.mk) === 1;
    map.set(r.email, c);
  }
  for (const r of customerRows) {
    const c = map.get(r.email) ?? blank(r.email);
    c.customerId = r.id;
    c.name = c.name || `${r.first_name} ${r.last_name}`.trim();
    c.phone = c.phone ?? r.phone;
    c.registeredAt = new Date(r.created_at);
    map.set(r.email, c);
  }
  for (const r of subscriberRows) {
    const c = map.get(r.email) ?? blank(r.email);
    c.name = c.name || r.full_name || "";
    c.phone = c.phone ?? r.phone;
    c.tenantId = c.tenantId ?? r.tenant_id;
    c.registeredAt = c.registeredAt ?? new Date(r.created_at);
    c.subscriber = !r.unsubscribed_at;
    if (r.unsubscribed_at) {
      c.unsubscribed = true;
      c.marketing = false;
    } else {
      c.marketing = true;
    }
    map.set(r.email, c);
  }
  for (const r of abandonedRows) {
    const c = map.get(r.email);
    if (c) c.abandoned = true;
  }
  const contacts = [...map.values()].filter((c) => c.email.includes("@"));
  cache = { at: Date.now(), contacts };
  return contacts;
}

const DAY = 86_400_000;

export function matchesSegment(c: Contact, s: CustomSegment, subscribersOnly = false): boolean {
  const now = Date.now();
  if (s.minOrders != null && c.orders < s.minOrders) return false;
  if (s.maxOrders != null && c.orders > s.maxOrders) return false;
  if (s.minSpent != null && c.spent < s.minSpent) return false;
  if (s.lastOrderWithinDays != null && (!c.lastOrderAt || now - c.lastOrderAt.getTime() > s.lastOrderWithinDays * DAY)) return false;
  if (s.lastOrderOlderThanDays != null && (!c.lastOrderAt || now - c.lastOrderAt.getTime() < s.lastOrderOlderThanDays * DAY)) return false;
  if (s.registeredWithinDays != null && (!c.registeredAt || now - c.registeredAt.getTime() > s.registeredWithinDays * DAY)) return false;
  if (s.tenantId && c.tenantId && c.tenantId !== s.tenantId) return false;
  if (s.hasAbandonedCart && !c.abandoned) return false;
  if (s.key === "no_orders" && !c.customerId) return false;
  if (s.key === "subscribers" && !c.subscriber) return false;
  if (subscribersOnly && !c.marketing) return false;
  return true;
}

export async function allSegments(): Promise<(CustomSegment & { builtin?: boolean })[]> {
  const custom = await getCustomSegments();
  return [...SEGMENT_TEMPLATES, ...custom.items];
}

export async function segmentContacts(key: string, opts: { marketingOnly?: boolean; channel?: "email" | "sms" } = {}) {
  const segments = await allSegments();
  const seg = segments.find((s) => s.key === key) ?? SEGMENT_TEMPLATES[0]!;
  const contacts = await loadContacts();
  return contacts.filter((c) => {
    if (c.unsubscribed) return false;
    if ((opts.marketingOnly ?? true) && !c.marketing) return false;
    if (opts.channel === "sms" && !c.phone) return false;
    return matchesSegment(c, seg);
  });
}

export async function segmentSizes() {
  const segments = await allSegments();
  const contacts = await loadContacts();
  return segments.map((s) => {
    const all = contacts.filter((c) => !c.unsubscribed && matchesSegment(c, s));
    return { ...s, total: all.length, reachable: all.filter((c) => c.marketing).length };
  });
}

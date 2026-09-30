import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "../client";
import { orderItems, orders, shipments, tenantBankAccounts } from "../schema";
import { ensureExtTables } from "./tables";
import { exec, parseJson, rows } from "./sql";
import { getTenantContext, sendAdminTemplate, sendTemplate } from "./messaging";
import { itemsTableHtml, escapeHtml } from "./templates";

export type OrderEventKind =
  | "created"
  | "status"
  | "payment"
  | "shipment"
  | "comment"
  | "notification"
  | "automation"
  | "conversion"
  | "system";

export type OrderEvent = {
  id: number;
  order_id: string;
  kind: OrderEventKind;
  title: string;
  body: string | null;
  meta: Record<string, unknown> | null;
  actor: string | null;
  created_at: Date;
};

export async function addOrderEvent(input: {
  orderId: string;
  kind: OrderEventKind;
  title: string;
  body?: string | null;
  meta?: Record<string, unknown> | null;
  actor?: string | null;
}) {
  await ensureExtTables();
  await exec(sql`insert into order_events (order_id, kind, title, body, meta, actor)
    values (${input.orderId}, ${input.kind}, ${input.title.slice(0, 255)}, ${input.body ?? null},
      ${input.meta ? JSON.stringify(input.meta) : null}, ${input.actor ?? null})`);
}

/** Sipariş akışını bozmamak için hata yutulur. */
export function addOrderEventSafe(input: Parameters<typeof addOrderEvent>[0]) {
  return addOrderEvent(input).catch(() => undefined);
}

export async function listOrderEvents(orderId: string): Promise<OrderEvent[]> {
  await ensureExtTables();
  const list = await rows<OrderEvent>(
    sql`select * from order_events where order_id = ${orderId} order by created_at desc, id desc limit 300`,
  );
  return list.map((e) => ({ ...e, meta: parseJson(e.meta, null) }));
}

export async function deleteOrderComment(orderId: string, eventId: number) {
  await ensureExtTables();
  await exec(sql`delete from order_events where id = ${eventId} and order_id = ${orderId} and kind = 'comment'`);
}

export async function getOrderTags(orderId: string): Promise<string[]> {
  await ensureExtTables();
  const [row] = await rows<{ tags: unknown }>(sql`select tags from order_meta where order_id = ${orderId} limit 1`);
  return parseJson<string[]>(row?.tags, []);
}

export async function setOrderTags(orderId: string, tags: string[]) {
  await ensureExtTables();
  const clean = [...new Set(tags.map((t) => t.trim()).filter(Boolean))].slice(0, 20);
  await exec(sql`insert into order_meta (order_id, tags) values (${orderId}, ${JSON.stringify(clean)})
    on duplicate key update tags = values(tags)`);
  return clean;
}

export async function allOrderTags(): Promise<string[]> {
  await ensureExtTables();
  const list = await rows<{ tags: unknown }>(sql`select tags from order_meta where tags is not null limit 2000`);
  const set = new Set<string>();
  for (const r of list) for (const t of parseJson<string[]>(r.tags, [])) set.add(t);
  return [...set].sort((a, b) => a.localeCompare(b, "tr"));
}

export async function tagsForOrders(orderIds: string[]): Promise<Map<string, string[]>> {
  const map = new Map<string, string[]>();
  if (!orderIds.length) return map;
  await ensureExtTables();
  const list = await rows<{ order_id: string; tags: unknown }>(
    sql`select order_id, tags from order_meta where order_id in (${sql.join(orderIds.map((id) => sql`${id}`), sql`, `)})`,
  );
  for (const r of list) map.set(r.order_id, parseJson<string[]>(r.tags, []));
  return map;
}

const PAYMENT_LABEL: Record<string, string> = { bank_transfer: "Havale / EFT", credit_card: "Kredi kartı" };

export function formatMoney(value: string | number): string {
  return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(Number(value) || 0);
}

function trackingUrl(carrier: string | null, trackingNo: string | null, siteUrl: string): string {
  if (!trackingNo) return `${siteUrl}/hesabim/siparisler`;
  if ((carrier ?? "").toLowerCase().includes("aras")) {
    return `https://kargotakip.araskargo.com.tr/mainpage.aspx?code=${encodeURIComponent(trackingNo)}`;
  }
  return `${siteUrl}/hesabim/siparisler`;
}

export async function buildOrderVars(orderId: string) {
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!order) return null;
  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
  const [shipment] = await db
    .select()
    .from(shipments)
    .where(eq(shipments.orderId, orderId))
    .orderBy(desc(shipments.createdAt))
    .limit(1);
  const tenant = await getTenantContext(order.tenantId);
  const address = (order.shippingAddress ?? {}) as Record<string, string>;
  const accounts = await db
    .select()
    .from(tenantBankAccounts)
    .where(and(eq(tenantBankAccounts.tenantId, order.tenantId), eq(tenantBankAccounts.isActive, true)));
  const bankHtml = accounts.length
    ? `<table class="items">${accounts
        .map(
          (a) =>
            `<tr><td><strong>${escapeHtml(a.bankName)}</strong><br>${escapeHtml(a.accountHolder)}<br><span style="font-family:monospace">${escapeHtml(a.iban)}</span></td></tr>`,
        )
        .join("")}</table>`
    : "";
  const adminBase = `${(process.env.STOREFRONT_URL ?? tenant.url).replace(/\/$/, "")}${process.env.ADMIN_BASE_PATH ?? "/yonetim"}`;
  const vars: Record<string, string> = {
    customer_name: order.fullName.split(" ")[0] || order.fullName,
    customer_full_name: order.fullName,
    customer_email: order.email,
    customer_phone: order.phone ?? "",
    order_no: order.orderNo,
    order_total: formatMoney(order.grandTotal),
    order_date: new Date(order.createdAt).toLocaleString("tr-TR", { timeZone: "Europe/Istanbul" }),
    order_url: `${tenant.url}/hesabim/siparisler`,
    admin_order_url: `${adminBase}/orders/${order.id}`,
    items_table: itemsTableHtml(
      items.map((i) => ({ name: i.name, qty: i.qty, price: formatMoney(Number(i.unitPrice) * i.qty), imageUrl: i.imageUrl })),
    ),
    payment_method: PAYMENT_LABEL[address.paymentMethod ?? ""] ?? address.paymentMethod ?? "",
    bank_accounts: bankHtml,
    carrier: shipment?.carrier ?? "",
    tracking_no: shipment?.trackingNo ?? "",
    tracking_url: trackingUrl(shipment?.carrier ?? null, shipment?.trackingNo ?? null, tenant.url),
  };
  return { order, items, vars, tenant };
}

const EVENT_TITLE: Record<string, string> = {
  order_created: "Sipariş oluşturuldu e-postası",
  order_created_bank: "Havale bilgileri e-postası",
  payment_confirmed: "Ödeme onayı bildirimi",
  order_preparing: "Hazırlanıyor bildirimi",
  order_updated: "Sipariş güncelleme bildirimi",
  order_cancelled: "İptal bildirimi",
  order_shipped: "Kargo bildirimi",
  order_delivered: "Teslimat bildirimi",
  bank_reminder: "Havale hatırlatması",
  bank_cancelled: "Otomatik iptal bildirimi",
  review_request: "Değerlendirme isteği",
  return_requested: "İade talebi bildirimi",
  return_approved: "İade onayı bildirimi",
  return_rejected: "İade reddi bildirimi",
};

/** Sipariş şablonunu müşteriye gönderir ve zaman çizelgesine işler. */
export async function notifyOrder(orderId: string, key: string, extraVars: Record<string, string> = {}) {
  try {
    const built = await buildOrderVars(orderId);
    if (!built) return;
    const { order, vars } = built;
    const result = await sendTemplate({
      key,
      tenantId: order.tenantId,
      email: order.email,
      phone: order.phone,
      vars: { ...vars, ...extraVars },
      relatedType: "order",
      relatedId: order.id,
    });
    const parts: string[] = [];
    if (result.email) parts.push(result.email.ok ? `E-posta gönderildi (${order.email})` : `E-posta gönderilemedi: ${result.email.error ?? ""}`);
    if (result.sms) parts.push(result.sms.ok ? `SMS gönderildi (${order.phone})` : `SMS gönderilemedi: ${result.sms.error ?? ""}`);
    if (parts.length) {
      await addOrderEventSafe({
        orderId,
        kind: "notification",
        title: EVENT_TITLE[key] ?? key,
        body: parts.join(" · "),
        meta: { template: key },
      });
    }
    if (key === "order_created" || key === "order_created_bank") {
      await sendAdminTemplate("admin_new_order", order.tenantId, vars);
    }
  } catch {
    /* bildirim hatası siparişi etkilemez */
  }
}

export function notifyOrderInBackground(orderId: string, key: string, extraVars: Record<string, string> = {}) {
  void notifyOrder(orderId, key, extraVars);
}

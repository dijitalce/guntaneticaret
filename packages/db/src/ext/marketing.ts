import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { ensureExtTables } from "./tables";
import { exec, first, num, rows } from "./sql";

export type Popup = {
  id: string;
  tenant_id: string | null;
  name: string;
  kind: "newsletter" | "announcement" | "coupon";
  title: string;
  body: string | null;
  image_url: string | null;
  cta_text: string | null;
  cta_url: string | null;
  coupon_code: string | null;
  trigger_type: "delay" | "exit" | "scroll";
  delay_sec: number;
  scroll_pct: number;
  pages: "all" | "home" | "product" | "category";
  device: "all" | "mobile" | "desktop";
  frequency_days: number;
  is_active: number;
  starts_at: Date | null;
  ends_at: Date | null;
  views: number;
  clicks: number;
  leads: number;
  created_at: Date;
  updated_at: Date;
};

export type PublicPopup = Pick<
  Popup,
  "id" | "kind" | "title" | "body" | "image_url" | "cta_text" | "cta_url" | "coupon_code" | "trigger_type" | "delay_sec" | "scroll_pct" | "pages" | "device" | "frequency_days"
>;

export async function listPopups() {
  await ensureExtTables();
  return rows<Popup>(sql`select * from popups order by created_at desc`);
}

export async function getPopup(id: string) {
  await ensureExtTables();
  return first<Popup>(sql`select * from popups where id = ${id} limit 1`);
}

export type PopupInput = Omit<Popup, "id" | "views" | "clicks" | "leads" | "created_at" | "updated_at">;

export async function savePopup(id: string | null, p: PopupInput) {
  await ensureExtTables();
  if (id) {
    await exec(sql`update popups set tenant_id = ${p.tenant_id}, name = ${p.name}, kind = ${p.kind}, title = ${p.title}, body = ${p.body},
      image_url = ${p.image_url}, cta_text = ${p.cta_text}, cta_url = ${p.cta_url}, coupon_code = ${p.coupon_code},
      trigger_type = ${p.trigger_type}, delay_sec = ${p.delay_sec}, scroll_pct = ${p.scroll_pct}, pages = ${p.pages}, device = ${p.device},
      frequency_days = ${p.frequency_days}, is_active = ${p.is_active}, starts_at = ${p.starts_at}, ends_at = ${p.ends_at}
      where id = ${id}`);
    popupCache.clear();
    return id;
  }
  const newId = randomUUID();
  await exec(sql`insert into popups (id, tenant_id, name, kind, title, body, image_url, cta_text, cta_url, coupon_code, trigger_type, delay_sec,
      scroll_pct, pages, device, frequency_days, is_active, starts_at, ends_at)
    values (${newId}, ${p.tenant_id}, ${p.name}, ${p.kind}, ${p.title}, ${p.body}, ${p.image_url}, ${p.cta_text}, ${p.cta_url}, ${p.coupon_code},
      ${p.trigger_type}, ${p.delay_sec}, ${p.scroll_pct}, ${p.pages}, ${p.device}, ${p.frequency_days}, ${p.is_active}, ${p.starts_at}, ${p.ends_at})`);
  popupCache.clear();
  return newId;
}

export async function deletePopup(id: string) {
  await ensureExtTables();
  await exec(sql`delete from popups where id = ${id}`);
  popupCache.clear();
}

export async function setPopupActive(id: string, active: boolean) {
  await ensureExtTables();
  await exec(sql`update popups set is_active = ${active ? 1 : 0} where id = ${id}`);
  popupCache.clear();
}

const popupCache = new Map<string, { at: number; value: PublicPopup | null }>();

export async function getActivePopup(tenantId: string): Promise<PublicPopup | null> {
  const hit = popupCache.get(tenantId);
  if (hit && Date.now() - hit.at < 60_000) return hit.value;
  try {
    await ensureExtTables();
    const p = await first<Popup>(sql`select * from popups where is_active = 1 and (tenant_id is null or tenant_id = ${tenantId})
      and (starts_at is null or starts_at <= now()) and (ends_at is null or ends_at >= now())
      order by tenant_id is null asc, updated_at desc limit 1`);
    const value: PublicPopup | null = p
      ? {
          id: p.id,
          kind: p.kind,
          title: p.title,
          body: p.body,
          image_url: p.image_url,
          cta_text: p.cta_text,
          cta_url: p.cta_url,
          coupon_code: p.coupon_code,
          trigger_type: p.trigger_type,
          delay_sec: num(p.delay_sec),
          scroll_pct: num(p.scroll_pct),
          pages: p.pages,
          device: p.device,
          frequency_days: num(p.frequency_days),
        }
      : null;
    popupCache.set(tenantId, { at: Date.now(), value });
    return value;
  } catch {
    return null;
  }
}

export async function bumpPopup(id: string, field: "views" | "clicks" | "leads") {
  await ensureExtTables();
  const col = sql.raw(field);
  await exec(sql`update popups set ${col} = ${col} + 1 where id = ${id}`);
}

export async function subscribeContact(input: { email: string; tenantId?: string | null; name?: string | null; phone?: string | null; source: string; popupId?: string | null }) {
  await ensureExtTables();
  const email = input.email.trim().toLowerCase().slice(0, 191);
  await exec(sql`insert into marketing_contacts (email, tenant_id, full_name, phone, source, popup_id)
    values (${email}, ${input.tenantId ?? null}, ${input.name ?? null}, ${input.phone ?? null}, ${input.source}, ${input.popupId ?? null})
    on duplicate key update unsubscribed_at = null, full_name = coalesce(values(full_name), full_name), phone = coalesce(values(phone), phone)`);
}

export async function unsubscribeContact(email: string) {
  await ensureExtTables();
  const e = email.trim().toLowerCase().slice(0, 191);
  await exec(sql`insert into marketing_contacts (email, source, unsubscribed_at) values (${e}, 'unsubscribe', now())
    on duplicate key update unsubscribed_at = now()`);
}

export async function listMarketingContacts(limit = 200) {
  await ensureExtTables();
  return rows<{ email: string; full_name: string | null; source: string | null; unsubscribed_at: Date | null; created_at: Date }>(
    sql`select email, full_name, source, unsubscribed_at, created_at from marketing_contacts order by created_at desc limit ${limit}`,
  );
}

export async function addStockAlert(input: { tenantId: string; productId: string; email: string }) {
  await ensureExtTables();
  await exec(sql`insert into stock_alerts (tenant_id, product_id, email) values (${input.tenantId}, ${input.productId}, ${input.email.trim().toLowerCase().slice(0, 191)})
    on duplicate key update notified_at = null, tenant_id = values(tenant_id)`);
}

export async function stockAlertSummary() {
  await ensureExtTables();
  const [row] = await rows<{ waiting: number; notified: number }>(
    sql`select sum(notified_at is null) waiting, sum(notified_at is not null) notified from stock_alerts`,
  );
  return { waiting: num(row?.waiting), notified: num(row?.notified) };
}

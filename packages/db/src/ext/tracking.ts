import { sql } from "drizzle-orm";
import { ensureExtTables } from "./tables";
import { exec, first, parseJson, rows } from "./sql";

export function parseUserAgent(ua: string): { device: string; browser: string; os: string } {
  const s = ua.toLowerCase();
  const device = /ipad|tablet|(android(?!.*mobile))/.test(s) ? "tablet" : /mobi|iphone|android/.test(s) ? "mobile" : "desktop";
  const os = /iphone|ipad|ios/.test(s)
    ? "iOS"
    : /android/.test(s)
      ? "Android"
      : /windows/.test(s)
        ? "Windows"
        : /mac os/.test(s)
          ? "macOS"
          : /linux/.test(s)
            ? "Linux"
            : "Diğer";
  const browser = /instagram/.test(s)
    ? "Instagram"
    : /fban|fbav/.test(s)
      ? "Facebook"
      : /edg\//.test(s)
        ? "Edge"
        : /opr\/|opera/.test(s)
          ? "Opera"
          : /samsungbrowser/.test(s)
            ? "Samsung"
            : /yabrowser/.test(s)
              ? "Yandex"
              : /chrome|crios/.test(s)
                ? "Chrome"
                : /firefox|fxios/.test(s)
                  ? "Firefox"
                  : /safari/.test(s)
                    ? "Safari"
                    : "Diğer";
  return { device, browser, os };
}

export function isBot(ua: string): boolean {
  return /bot|crawl|spider|slurp|facebookexternalhit|preview|lighthouse|headless|monitor|curl|wget|python|axios|node-fetch/i.test(ua);
}

const REFERRER_SOURCES: [RegExp, string, string][] = [
  [/(^|\.)google\./, "Google", "organic"],
  [/(^|\.)bing\.com/, "Bing", "organic"],
  [/(^|\.)yandex\./, "Yandex", "organic"],
  [/duckduckgo\.com/, "DuckDuckGo", "organic"],
  [/instagram\.com/, "Instagram", "social"],
  [/(facebook\.com|fb\.me|m\.facebook)/, "Facebook", "social"],
  [/(t\.co|twitter\.com|x\.com)$/, "X", "social"],
  [/tiktok\.com/, "TikTok", "social"],
  [/youtube\.com|youtu\.be/, "YouTube", "social"],
  [/linkedin\.com|lnkd\.in/, "LinkedIn", "social"],
  [/whatsapp\.com|wa\.me/, "WhatsApp", "social"],
  [/pinterest\./, "Pinterest", "social"],
  [/(mail\.google|outlook\.|mail\.yahoo|yandex\.com\.tr\/mail)/, "E-posta", "email"],
];

export function classifySource(input: {
  referrer?: string | null;
  query?: string | null;
  host?: string | null;
}): { source: string; medium: string; campaign: string | null } {
  const params = new URLSearchParams(input.query?.replace(/^\?/, "") ?? "");
  const utmSource = params.get("utm_source");
  const utmMedium = params.get("utm_medium");
  const campaign = params.get("utm_campaign");
  if (utmSource) {
    return { source: utmSource.slice(0, 64), medium: (utmMedium ?? "referral").slice(0, 64), campaign: campaign?.slice(0, 191) ?? null };
  }
  if (params.get("gclid") || params.get("gbraid") || params.get("wbraid")) return { source: "Google", medium: "cpc", campaign };
  if (params.get("fbclid")) return { source: "Facebook", medium: "social", campaign };
  if (params.get("ttclid")) return { source: "TikTok", medium: "cpc", campaign };
  let refHost = "";
  try {
    refHost = input.referrer ? new URL(input.referrer).hostname.toLowerCase() : "";
  } catch {
    refHost = "";
  }
  const own = (input.host ?? "").split(":")[0]?.toLowerCase().replace(/^www\./, "") ?? "";
  if (!refHost || (own && refHost.replace(/^www\./, "") === own)) return { source: "Doğrudan", medium: "direct", campaign };
  for (const [re, source, medium] of REFERRER_SOURCES) {
    if (re.test(refHost)) return { source, medium, campaign };
  }
  return { source: refHost.replace(/^www\./, "").slice(0, 64), medium: "referral", campaign };
}

const STAGE_RANK: Record<string, number> = { browse: 0, product: 1, cart: 2, checkout: 3, order: 4 };

export type TrackInput = {
  sid: string;
  isNew: boolean;
  tenantId: string;
  type: string;
  path?: string | null;
  title?: string | null;
  referrer?: string | null;
  query?: string | null;
  host?: string | null;
  ua: string;
  ip?: string | null;
  customerId?: string | null;
  fbp?: string | null;
  fbc?: string | null;
  gaCid?: string | null;
  city?: string | null;
  meta?: Record<string, unknown> | null;
};

export async function recordVisit(input: TrackInput) {
  await ensureExtTables();
  const stage =
    input.type === "checkout" ? "checkout" : input.type === "add_to_cart" || input.type === "cart" ? "cart" : input.type === "product" ? "product" : input.type === "purchase" ? "order" : "browse";
  const path = input.path?.slice(0, 512) ?? null;
  const existing = await first<{ id: string; stage: string }>(sql`select id, stage from visitor_sessions where id = ${input.sid} limit 1`);
  if (!existing) {
    const { device, browser, os } = parseUserAgent(input.ua);
    const src = classifySource({ referrer: input.referrer, query: input.query, host: input.host });
    const landing = `${path ?? "/"}${input.query ? (input.query.startsWith("?") ? input.query : `?${input.query}`) : ""}`.slice(0, 512);
    await exec(sql`insert ignore into visitor_sessions
      (id, tenant_id, customer_id, pageviews, device, browser, os, source, medium, campaign, referrer, landing, last_path, stage, ip, ua, fbp, fbc, ga_cid, city)
      values (${input.sid}, ${input.tenantId}, ${input.customerId ?? null}, ${input.type === "pv" || input.type === "product" ? 1 : 0},
        ${device}, ${browser}, ${os}, ${src.source}, ${src.medium}, ${src.campaign}, ${input.referrer?.slice(0, 512) ?? null},
        ${landing}, ${path}, ${stage}, ${input.ip ?? null}, ${input.ua.slice(0, 512)}, ${input.fbp ?? null}, ${input.fbc ?? null},
        ${input.gaCid ?? null}, ${input.city ?? null})`);
  } else {
    const nextStage = (STAGE_RANK[stage] ?? 0) > (STAGE_RANK[existing.stage] ?? 0) ? stage : existing.stage;
    const isView = input.type === "pv" || input.type === "product";
    await exec(sql`update visitor_sessions set last_seen = now(),
      pageviews = pageviews + ${isView ? 1 : 0},
      last_path = coalesce(${isView ? path : null}, last_path),
      stage = ${nextStage},
      customer_id = coalesce(${input.customerId ?? null}, customer_id),
      fbp = coalesce(${input.fbp ?? null}, fbp),
      fbc = coalesce(${input.fbc ?? null}, fbc),
      ga_cid = coalesce(${input.gaCid ?? null}, ga_cid)
      where id = ${input.sid}`);
  }
  if (input.type !== "hb") {
    await exec(sql`insert into visitor_events (session_id, tenant_id, type, path, title, meta)
      values (${input.sid}, ${input.tenantId}, ${input.type.slice(0, 24)}, ${path}, ${input.title?.slice(0, 255) ?? null},
        ${input.meta ? JSON.stringify(input.meta) : null})`);
  }
}

export async function saveCartContact(input: {
  cartId: string;
  tenantId: string;
  email?: string | null;
  phone?: string | null;
  fullName?: string | null;
  sid?: string | null;
}) {
  await ensureExtTables();
  const email = input.email?.trim().toLowerCase().slice(0, 191) || null;
  const phone = input.phone?.trim().slice(0, 32) || null;
  const name = input.fullName?.trim().slice(0, 191) || null;
  if (!email && !phone) return;
  await exec(sql`insert into cart_contacts (cart_id, tenant_id, email, phone, full_name, session_id)
    values (${input.cartId}, ${input.tenantId}, ${email}, ${phone}, ${name}, ${input.sid ?? null})
    on duplicate key update email = coalesce(values(email), email), phone = coalesce(values(phone), phone),
      full_name = coalesce(values(full_name), full_name), session_id = coalesce(values(session_id), session_id)`);
}

/** Sipariş anında ziyaret oturumunu siparişe kopyalar; hatırlatma gönderilmiş sepeti kurtarılmış sayar. */
export async function attachOrderAttribution(input: { orderId: string; sid?: string | null; cartId?: string | null; ip?: string | null; ua?: string | null }) {
  await ensureExtTables();
  if (input.sid) {
    const s = await first<Record<string, unknown>>(sql`select * from visitor_sessions where id = ${input.sid} limit 1`);
    if (s) {
      const journey = await rows<{ type: string; path: string | null; title: string | null; created_at: Date }>(
        sql`select type, path, title, created_at from visitor_events where session_id = ${input.sid} order by created_at asc limit 60`,
      );
      const firstSeen = new Date(String(s.first_seen));
      const duration = Math.max(0, Math.round((Date.now() - firstSeen.getTime()) / 1000));
      await exec(sql`insert ignore into order_attribution
        (order_id, session_id, source, medium, campaign, referrer, landing, device, browser, os, pageviews, duration_sec, first_seen, ip, ua, fbp, fbc, ga_cid, journey)
        values (${input.orderId}, ${input.sid}, ${s.source as string}, ${s.medium as string}, ${(s.campaign as string) ?? null},
          ${(s.referrer as string) ?? null}, ${(s.landing as string) ?? null}, ${s.device as string}, ${s.browser as string}, ${s.os as string},
          ${Number(s.pageviews ?? 0)}, ${duration}, ${firstSeen}, ${input.ip ?? (s.ip as string) ?? null}, ${input.ua ?? (s.ua as string) ?? null},
          ${(s.fbp as string) ?? null}, ${(s.fbc as string) ?? null}, ${(s.ga_cid as string) ?? null}, ${JSON.stringify(journey)})`);
      await exec(sql`update visitor_sessions set stage = 'order', last_seen = now() where id = ${input.sid}`);
    }
  }
  if (!input.sid && (input.ip || input.ua)) {
    await exec(sql`insert ignore into order_attribution (order_id, ip, ua, source, medium) values (${input.orderId}, ${input.ip ?? null}, ${input.ua?.slice(0, 512) ?? null}, 'Bilinmiyor', 'unknown')`);
  }
  if (input.cartId) {
    await exec(sql`update cart_contacts set recovered_order_id = ${input.orderId}, recovered_at = now()
      where cart_id = ${input.cartId} and reminder_count > 0 and recovered_order_id is null`);
  }
}

export type OrderAttribution = {
  order_id: string;
  session_id: string | null;
  source: string | null;
  medium: string | null;
  campaign: string | null;
  referrer: string | null;
  landing: string | null;
  device: string | null;
  browser: string | null;
  os: string | null;
  pageviews: number;
  duration_sec: number;
  first_seen: Date | null;
  ip: string | null;
  ua: string | null;
  fbp: string | null;
  fbc: string | null;
  ga_cid: string | null;
  journey: { type: string; path: string | null; title: string | null; created_at: string }[];
  created_at: Date;
};

export async function getOrderAttribution(orderId: string): Promise<OrderAttribution | null> {
  await ensureExtTables();
  const row = await first<OrderAttribution>(sql`select * from order_attribution where order_id = ${orderId} limit 1`);
  if (!row) return null;
  return { ...row, journey: parseJson(row.journey, []) };
}

export async function customerOrderStats(customerId: string | null, email: string) {
  const [row] = await rows<{ c: number; total: string | null; first_at: Date | null }>(
    sql`select count(*) c, sum(grand_total) total, min(created_at) first_at from orders
      where status not in ('cancelled','refunded') and (${customerId ? sql`customer_id = ${customerId} or ` : sql``} email = ${email})`,
  );
  return { count: Number(row?.c ?? 0), total: Number(row?.total ?? 0), firstAt: row?.first_at ?? null };
}

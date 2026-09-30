import { createHmac, randomUUID } from "node:crypto";
import { asc, eq, sql } from "drizzle-orm";
import { db } from "../client";
import { tenantDomains, tenantSettings, tenants } from "../schema";
import { ensureExtTables } from "./tables";
import { exec, first } from "./sql";
import { csvList, getNotifySettings, type NotifySettings } from "./settings";
import { emailLayout, renderText, resolveTemplate } from "./templates";

export type TenantContext = { id: string; name: string; url: string; logoUrl: string | null; email: string | null; phone: string | null };

const tenantCache = new Map<string, { at: number; value: TenantContext }>();

export async function getTenantContext(tenantId: string | null | undefined): Promise<TenantContext> {
  const fallbackUrl = (process.env.STOREFRONT_URL ?? "https://guntanotoyedekparca.com").replace(/\/$/, "");
  if (!tenantId) return { id: "", name: "Güntan", url: fallbackUrl, logoUrl: null, email: null, phone: null };
  const hit = tenantCache.get(tenantId);
  if (hit && Date.now() - hit.at < 300_000) return hit.value;
  const [tenant] = await db.select().from(tenants).where(eq(tenants.id, tenantId)).limit(1);
  const [settings] = await db.select().from(tenantSettings).where(eq(tenantSettings.tenantId, tenantId)).limit(1);
  const domains = await db
    .select()
    .from(tenantDomains)
    .where(eq(tenantDomains.tenantId, tenantId))
    .orderBy(sql`${tenantDomains.isPrimary} desc`, asc(tenantDomains.createdAt));
  const host = domains.find((d) => !d.hostname.includes("localhost"))?.hostname;
  const url = host ? `https://${host}` : fallbackUrl;
  const logo = settings?.logoUrl ?? null;
  const value: TenantContext = {
    id: tenantId,
    name: settings?.siteName ?? tenant?.name ?? "Mağaza",
    url,
    logoUrl: logo ? (/^https?:\/\//.test(logo) ? logo : `${url}${logo.startsWith("/") ? "" : "/"}${logo}`) : null,
    email: settings?.email ?? null,
    phone: settings?.phone ?? null,
  };
  tenantCache.set(tenantId, { at: Date.now(), value });
  return value;
}

function secret(): string {
  return process.env.APP_SECRET || process.env.AUTH_SECRET || process.env.SESSION_SECRET || process.env.DATABASE_URL || "guntan";
}

export function signValue(value: string): string {
  return createHmac("sha256", secret()).update(value).digest("hex").slice(0, 24);
}

export function unsubscribeUrl(siteUrl: string, email: string): string {
  const e = email.toLowerCase().trim();
  return `${siteUrl}/abonelik?e=${encodeURIComponent(e)}&k=${signValue(`unsub:${e}`)}`;
}

export function verifyUnsubscribe(email: string, key: string): boolean {
  return signValue(`unsub:${email.toLowerCase().trim()}`) === key;
}

export type SendResult = { ok: boolean; provider: string; error?: string };

export async function sendEmailRaw(
  settings: NotifySettings,
  input: { to: string; subject: string; html: string; fromName?: string },
): Promise<SendResult> {
  const provider = settings.emailProvider;
  if (provider === "none" || !settings.emailApiKey || !settings.fromEmail) {
    return { ok: false, provider, error: "E-posta sağlayıcısı ayarlanmamış." };
  }
  const fromName = input.fromName || settings.fromName || "Mağaza";
  try {
    if (provider === "resend") {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${settings.emailApiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: `${fromName} <${settings.fromEmail}>`,
          to: [input.to],
          subject: input.subject,
          html: input.html,
          ...(settings.replyTo ? { reply_to: settings.replyTo } : {}),
        }),
        signal: AbortSignal.timeout(15_000),
      });
      if (!res.ok) return { ok: false, provider, error: `${res.status} ${(await res.text()).slice(0, 300)}` };
      return { ok: true, provider };
    }
    if (provider === "brevo") {
      const res = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: { "api-key": settings.emailApiKey, "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          sender: { name: fromName, email: settings.fromEmail },
          to: [{ email: input.to }],
          subject: input.subject,
          htmlContent: input.html,
          ...(settings.replyTo ? { replyTo: { email: settings.replyTo } } : {}),
        }),
        signal: AbortSignal.timeout(15_000),
      });
      if (!res.ok) return { ok: false, provider, error: `${res.status} ${(await res.text()).slice(0, 300)}` };
      return { ok: true, provider };
    }
  } catch (err) {
    return { ok: false, provider, error: err instanceof Error ? err.message : String(err) };
  }
  return { ok: false, provider, error: "Bilinmeyen sağlayıcı" };
}

export function normalizeGsm(phone: string): string | null {
  let d = phone.replace(/\D/g, "");
  if (d.startsWith("90")) d = d.slice(2);
  if (d.startsWith("0")) d = d.slice(1);
  return /^5\d{9}$/.test(d) ? d : null;
}

export async function sendSmsRaw(settings: NotifySettings, input: { to: string; text: string }): Promise<SendResult> {
  const provider = settings.smsProvider;
  if (provider !== "netgsm" || !settings.netgsmUser || !settings.netgsmPass || !settings.netgsmHeader) {
    return { ok: false, provider, error: "SMS sağlayıcısı ayarlanmamış." };
  }
  const gsm = normalizeGsm(input.to);
  if (!gsm) return { ok: false, provider, error: "Geçersiz telefon" };
  try {
    const res = await fetch("https://api.netgsm.com.tr/sms/rest/v2/send", {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${settings.netgsmUser}:${settings.netgsmPass}`).toString("base64")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ msgheader: settings.netgsmHeader, encoding: "TR", messages: [{ msg: input.text, no: gsm }] }),
      signal: AbortSignal.timeout(15_000),
    });
    const body = await res.text();
    if (!res.ok) return { ok: false, provider, error: `${res.status} ${body.slice(0, 200)}` };
    try {
      const json = JSON.parse(body) as { code?: string; description?: string };
      if (json.code && json.code !== "00") return { ok: false, provider, error: `${json.code} ${json.description ?? ""}` };
    } catch {
      /* düz metin yanıt */
    }
    return { ok: true, provider };
  } catch (err) {
    return { ok: false, provider, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function logMessage(input: {
  id?: string;
  channel: "email" | "sms";
  recipient: string;
  subject?: string | null;
  templateKey?: string | null;
  campaignId?: string | null;
  tenantId?: string | null;
  relatedType?: string | null;
  relatedId?: string | null;
  status: string;
  error?: string | null;
  provider?: string | null;
}) {
  await ensureExtTables();
  const id = input.id ?? randomUUID();
  await exec(sql`insert into message_log (id, channel, recipient, subject, template_key, campaign_id, tenant_id, related_type, related_id, status, error, provider)
    values (${id}, ${input.channel}, ${input.recipient.slice(0, 191)}, ${input.subject?.slice(0, 255) ?? null}, ${input.templateKey ?? null},
      ${input.campaignId ?? null}, ${input.tenantId ?? null}, ${input.relatedType ?? null}, ${input.relatedId ?? null}, ${input.status},
      ${input.error?.slice(0, 2000) ?? null}, ${input.provider ?? null})`);
  return id;
}

export async function isUnsubscribed(email: string): Promise<boolean> {
  await ensureExtTables();
  const row = await first<{ u: unknown }>(
    sql`select unsubscribed_at as u from marketing_contacts where email = ${email.toLowerCase().trim()} limit 1`,
  );
  return Boolean(row?.u);
}

/** Tek bir şablonu e-posta ve/veya SMS olarak gönderir, her gönderimi message_log'a yazar. */
export async function sendTemplate(input: {
  key: string;
  tenantId?: string | null;
  email?: string | null;
  phone?: string | null;
  vars: Record<string, string>;
  relatedType?: string;
  relatedId?: string;
  force?: { email?: boolean; sms?: boolean };
}): Promise<{ email?: SendResult; sms?: SendResult }> {
  const tpl = await resolveTemplate(input.key);
  if (!tpl) return {};
  const settings = await getNotifySettings();
  const tenant = await getTenantContext(input.tenantId);
  const vars: Record<string, string> = {
    site_name: tenant.name,
    site_url: tenant.url,
    coupon_block: "",
    ...input.vars,
  };
  const out: { email?: SendResult; sms?: SendResult } = {};
  const wantEmail = input.force?.email ?? tpl.email;
  const wantSms = input.force?.sms ?? tpl.sms;

  if (wantEmail && input.email) {
    const to = input.email.trim();
    const marketingBlocked = tpl.marketing && (await isUnsubscribed(to));
    if (!marketingBlocked) {
      const id = randomUUID();
      const footer = tpl.marketing
        ? ` · <a class="muted" href="${unsubscribeUrl(tenant.url, to)}">Abonelikten çık</a>`
        : "";
      const html = emailLayout({
        siteName: tenant.name,
        siteUrl: tenant.url,
        logoUrl: tenant.logoUrl,
        body: renderText(tpl.body, vars, true),
        footer,
      });
      const subject = renderText(tpl.subject, vars, false);
      const result = await sendEmailRaw(settings, { to, subject, html, fromName: tenant.name });
      out.email = result;
      await logMessage({
        id,
        channel: "email",
        recipient: to,
        subject,
        templateKey: tpl.key,
        tenantId: input.tenantId,
        relatedType: input.relatedType,
        relatedId: input.relatedId,
        status: result.ok ? "sent" : settings.emailProvider === "none" ? "skipped" : "failed",
        error: result.error,
        provider: result.provider,
      }).catch(() => undefined);
    }
  }

  if (wantSms && input.phone) {
    const text = renderText(tpl.smsBody, vars, false);
    const result = await sendSmsRaw(settings, { to: input.phone, text });
    out.sms = result;
    await logMessage({
      channel: "sms",
      recipient: input.phone,
      subject: text.slice(0, 255),
      templateKey: tpl.key,
      tenantId: input.tenantId,
      relatedType: input.relatedType,
      relatedId: input.relatedId,
      status: result.ok ? "sent" : settings.smsProvider === "none" ? "skipped" : "failed",
      error: result.error,
      provider: result.provider,
    }).catch(() => undefined);
  }
  return out;
}

export async function sendAdminTemplate(key: string, tenantId: string | null, vars: Record<string, string>, extraEmails: string[] = []) {
  const settings = await getNotifySettings();
  const recipients = [...new Set([...csvList(settings.adminEmails), ...extraEmails])];
  for (const email of recipients) {
    await sendTemplate({ key, tenantId, email, vars, relatedType: "admin", force: { sms: false } }).catch(() => undefined);
  }
}

export async function markMessage(id: string, kind: "open" | "click") {
  await ensureExtTables();
  if (kind === "open") {
    await exec(sql`update message_log set opened_at = coalesce(opened_at, now()) where id = ${id}`);
  } else {
    await exec(sql`update message_log set clicked_at = coalesce(clicked_at, now()), opened_at = coalesce(opened_at, now()) where id = ${id}`);
  }
}
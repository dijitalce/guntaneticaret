import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { ensureExtTables } from "./tables";
import { exec, first, num, rows } from "./sql";
import { getMarketingSettings, getNotifySettings } from "./settings";
import { getTenantContext, logMessage, sendEmailRaw, sendSmsRaw, signValue, unsubscribeUrl } from "./messaging";
import { emailLayout, escapeHtml, renderText } from "./templates";
import { loadContacts, segmentContacts } from "./segments";

export type Campaign = {
  id: string;
  tenant_id: string | null;
  name: string;
  channel: "email" | "sms";
  segment_key: string;
  subject: string | null;
  preheader: string | null;
  body: string | null;
  coupon_code: string | null;
  status: "draft" | "sending" | "sent" | "cancelled";
  total: number;
  sent: number;
  failed: number;
  scheduled_at: Date | null;
  started_at: Date | null;
  finished_at: Date | null;
  created_by: string | null;
  created_at: Date;
  updated_at: Date;
};

export function campaignUtm(id: string) {
  return `c-${id.slice(0, 8)}`;
}

export async function listCampaigns(channel?: "email" | "sms") {
  await ensureExtTables();
  const list = await rows<Campaign>(
    sql`select * from campaigns ${channel ? sql`where channel = ${channel}` : sql``} order by created_at desc limit 200`,
  );
  const stats = await campaignStatsMap(list.map((c) => c.id));
  return list.map((c) => ({ ...c, stats: stats.get(c.id) ?? emptyStats() }));
}

export async function getCampaign(id: string) {
  await ensureExtTables();
  return first<Campaign>(sql`select * from campaigns where id = ${id} limit 1`);
}

export type CampaignInput = {
  tenantId: string | null;
  name: string;
  channel: "email" | "sms";
  segmentKey: string;
  subject: string;
  preheader: string;
  body: string;
  couponCode: string;
  scheduledAt: Date | null;
};

export async function saveCampaign(id: string | null, input: CampaignInput, actor: string) {
  await ensureExtTables();
  if (id) {
    await exec(sql`update campaigns set tenant_id = ${input.tenantId}, name = ${input.name}, channel = ${input.channel},
      segment_key = ${input.segmentKey}, subject = ${input.subject}, preheader = ${input.preheader}, body = ${input.body},
      coupon_code = ${input.couponCode || null}, scheduled_at = ${input.scheduledAt}
      where id = ${id} and status = 'draft'`);
    return id;
  }
  const newId = randomUUID();
  await exec(sql`insert into campaigns (id, tenant_id, name, channel, segment_key, subject, preheader, body, coupon_code, scheduled_at, created_by)
    values (${newId}, ${input.tenantId}, ${input.name}, ${input.channel}, ${input.segmentKey}, ${input.subject}, ${input.preheader},
      ${input.body}, ${input.couponCode || null}, ${input.scheduledAt}, ${actor})`);
  return newId;
}

export async function deleteCampaign(id: string) {
  await ensureExtTables();
  await exec(sql`delete from message_log where campaign_id = ${id} and status = 'queued'`);
  await exec(sql`delete from campaigns where id = ${id}`);
}

export async function cancelCampaign(id: string) {
  await ensureExtTables();
  await exec(sql`update message_log set status = 'cancelled' where campaign_id = ${id} and status = 'queued'`);
  await exec(sql`update campaigns set status = 'cancelled', finished_at = now() where id = ${id} and status in ('sending','draft')`);
}

/** Alıcıları kuyruğa alır; gönderimi zamanlayıcı küçük partiler halinde yapar. */
export async function startCampaign(id: string) {
  const campaign = await getCampaign(id);
  if (!campaign || campaign.status !== "draft") throw new Error("Kampanya gönderilemez.");
  const recipients = await segmentContacts(campaign.segment_key, { marketingOnly: true, channel: campaign.channel });
  const filtered = recipients.filter((c) => !campaign.tenant_id || !c.tenantId || c.tenantId === campaign.tenant_id);
  if (!filtered.length) throw new Error("Bu segmentte pazarlama izni olan alıcı yok.");
  for (let i = 0; i < filtered.length; i += 200) {
    const chunk = filtered.slice(i, i + 200);
    const values = chunk.map(
      (c) =>
        sql`(${randomUUID()}, ${campaign.channel}, ${(campaign.channel === "sms" ? c.phone ?? "" : c.email).slice(0, 191)}, ${campaign.subject ?? campaign.name}, ${"campaign"}, ${campaign.id}, ${campaign.tenant_id}, 'contact', ${c.email.slice(0, 64)}, 'queued')`,
    );
    await exec(sql`insert into message_log (id, channel, recipient, subject, template_key, campaign_id, tenant_id, related_type, related_id, status)
      values ${sql.join(values, sql`, `)}`);
  }
  await exec(sql`update campaigns set status = 'sending', total = ${filtered.length}, started_at = now() where id = ${id}`);
  return filtered.length;
}

function istanbulHour(): number {
  return Number(new Intl.DateTimeFormat("en-GB", { hour: "2-digit", hour12: false, timeZone: "Europe/Istanbul" }).format(new Date())) % 24;
}

function inQuietHours(start: number, end: number): boolean {
  const h = istanbulHour();
  if (start === end) return false;
  return start < end ? h >= start && h < end : h >= start || h < end;
}

function withUtm(url: string, campaign: string): string {
  try {
    const u = new URL(url);
    if (!u.searchParams.has("utm_source")) {
      u.searchParams.set("utm_source", "email");
      u.searchParams.set("utm_medium", "campaign");
      u.searchParams.set("utm_campaign", campaign);
    }
    return u.toString();
  } catch {
    return url;
  }
}

export function trackLinks(html: string, siteUrl: string, messageId: string, utmCampaign: string): string {
  return html.replace(/href="(https?:\/\/[^"]+)"/g, (_, url: string) => {
    if (url.includes("/abonelik?")) return `href="${url}"`;
    const target = withUtm(url.replaceAll("&amp;", "&"), utmCampaign);
    const sig = signValue(`click:${messageId}:${target}`);
    return `href="${siteUrl}/api/m/c?id=${messageId}&u=${encodeURIComponent(target)}&s=${sig}"`;
  });
}

export function verifyClick(messageId: string, target: string, sig: string) {
  return signValue(`click:${messageId}:${target}`) === sig;
}

export function renderCampaignEmail(campaign: Pick<Campaign, "id" | "subject" | "preheader" | "body" | "coupon_code">, ctx: {
  siteName: string;
  siteUrl: string;
  logoUrl: string | null;
  name: string;
  email: string;
  messageId: string;
}) {
  const vars: Record<string, string> = {
    site_name: ctx.siteName,
    site_url: ctx.siteUrl,
    customer_name: ctx.name.split(" ")[0] || "Değerli müşterimiz",
    customer_email: ctx.email,
    coupon_code: campaign.coupon_code ?? "",
    coupon_block: campaign.coupon_code ? `<div class="coupon">${escapeHtml(campaign.coupon_code)}</div>` : "",
  };
  const unsub = unsubscribeUrl(ctx.siteUrl, ctx.email);
  let body = renderText(campaign.body ?? "", vars, true);
  body = trackLinks(body, ctx.siteUrl, ctx.messageId, campaignUtm(campaign.id));
  const html = emailLayout({
    siteName: ctx.siteName,
    siteUrl: ctx.siteUrl,
    logoUrl: ctx.logoUrl,
    body: `${body}<img src="${ctx.siteUrl}/api/m/o?id=${ctx.messageId}" width="1" height="1" alt="" style="display:block;border:0">`,
    preheader: campaign.preheader ?? "",
    footer: ` · <a class="muted" href="${unsub}">Abonelikten çık</a>`,
  });
  return { subject: renderText(campaign.subject ?? "", vars, false), html };
}

export async function processCampaignQueue(batch = 40) {
  await ensureExtTables();
  const scheduledDrafts = await rows<{ id: string }>(
    sql`select id from campaigns where status = 'draft' and scheduled_at is not null and scheduled_at <= now() limit 3`,
  );
  for (const d of scheduledDrafts) await startCampaign(d.id).catch(() => undefined);
  const active = await rows<Campaign>(sql`select * from campaigns where status = 'sending' order by started_at asc limit 3`);
  if (!active.length) return { sent: 0 };
  const notify = await getNotifySettings();
  const marketing = await getMarketingSettings();
  const contacts = new Map((await loadContacts()).map((c) => [c.email, c]));
  let sent = 0;
  for (const campaign of active) {
    if (campaign.channel === "sms" && inQuietHours(marketing.smsQuietStart, marketing.smsQuietEnd)) continue;
    const tenant = await getTenantContext(campaign.tenant_id);
    const queue = await rows<{ id: string; recipient: string; related_id: string }>(
      sql`select id, recipient, related_id from message_log where campaign_id = ${campaign.id} and status = 'queued' limit ${batch}`,
    );
    for (const msg of queue) {
      const email = msg.related_id;
      if (marketing.frequencyHours > 0) {
        const recent = await first<{ c: number }>(
          sql`select count(*) c from message_log where related_id = ${email} and campaign_id is not null and campaign_id <> ${campaign.id}
            and status = 'sent' and created_at > now() - interval ${sql.raw(String(Math.floor(marketing.frequencyHours)))} hour`,
        );
        if (num(recent?.c) > 0) {
          await exec(sql`update message_log set status = 'skipped', error = 'Gönderim sıklığı sınırı' where id = ${msg.id}`);
          continue;
        }
      }
      const contact = contacts.get(email);
      let ok = false;
      let error: string | undefined;
      let provider = "";
      if (campaign.channel === "email") {
        const { subject, html } = renderCampaignEmail(campaign, {
          siteName: tenant.name,
          siteUrl: tenant.url,
          logoUrl: tenant.logoUrl,
          name: contact?.name ?? "",
          email,
          messageId: msg.id,
        });
        const r = await sendEmailRaw(notify, { to: msg.recipient, subject, html, fromName: tenant.name });
        ok = r.ok;
        error = r.error;
        provider = r.provider;
      } else {
        const text = renderText(campaign.body ?? "", { site_name: tenant.name, customer_name: contact?.name?.split(" ")[0] ?? "", coupon_code: campaign.coupon_code ?? "" }, false);
        const r = await sendSmsRaw(notify, { to: msg.recipient, text: `${text} IYS ret icin: ${tenant.url.replace(/^https?:\/\//, "")}/abonelik` });
        ok = r.ok;
        error = r.error;
        provider = r.provider;
      }
      await exec(sql`update message_log set status = ${ok ? "sent" : "failed"}, error = ${error?.slice(0, 2000) ?? null}, provider = ${provider}, created_at = now() where id = ${msg.id}`);
      await exec(sql`update campaigns set ${ok ? sql`sent = sent + 1` : sql`failed = failed + 1`} where id = ${campaign.id}`);
      if (ok) sent++;
    }
    const remaining = await first<{ c: number }>(sql`select count(*) c from message_log where campaign_id = ${campaign.id} and status = 'queued'`);
    if (num(remaining?.c) === 0) await exec(sql`update campaigns set status = 'sent', finished_at = now() where id = ${campaign.id}`);
  }
  return { sent };
}

export type CampaignStats = { queued: number; sent: number; failed: number; skipped: number; opened: number; clicked: number; orders: number; revenue: number };

function emptyStats(): CampaignStats {
  return { queued: 0, sent: 0, failed: 0, skipped: 0, opened: 0, clicked: 0, orders: 0, revenue: 0 };
}

export async function campaignStatsMap(ids: string[]) {
  const map = new Map<string, CampaignStats>();
  if (!ids.length) return map;
  const list = await rows<{ campaign_id: string; queued: number; sent: number; failed: number; skipped: number; opened: number; clicked: number }>(
    sql`select campaign_id, sum(status='queued') queued, sum(status='sent') sent, sum(status='failed') failed, sum(status='skipped') skipped,
      sum(opened_at is not null) opened, sum(clicked_at is not null) clicked
      from message_log where campaign_id in (${sql.join(ids.map((i) => sql`${i}`), sql`, `)}) group by campaign_id`,
  );
  const settings = await getMarketingSettings();
  const days = Math.max(1, Math.min(30, Math.floor(settings.attributionDays)));
  const touch = sql.raw(settings.attribution === "open" ? "m.opened_at" : "m.clicked_at");
  const utmCase = sql.join(
    ids.map((i) => sql`when ${campaignUtm(i)} then ${i}`),
    sql` `,
  );
  const orders = await rows<{ campaign_id: string; c: number; s: string }>(
    sql`select x.campaign_id, count(*) c, sum(x.grand_total) s from (
      select distinct case a.campaign ${utmCase} end campaign_id, o.id, o.grand_total
        from order_attribution a join orders o on o.id = a.order_id
        where o.status not in ('cancelled','refunded') and a.campaign in (${sql.join(ids.map((i) => sql`${campaignUtm(i)}`), sql`, `)})
      union
      select distinct m.campaign_id, o.id, o.grand_total
        from message_log m join orders o on lower(o.email) = m.related_id
        where m.campaign_id in (${sql.join(ids.map((i) => sql`${i}`), sql`, `)}) and ${touch} is not null
          and o.created_at between ${touch} and ${touch} + interval ${sql.raw(String(days))} day
          and o.status not in ('cancelled','refunded')
    ) x group by x.campaign_id`,
  );
  const byCampaign = new Map(orders.map((o) => [o.campaign_id, o]));
  for (const id of ids) {
    const r = list.find((l) => l.campaign_id === id);
    const o = byCampaign.get(id);
    map.set(id, {
      queued: num(r?.queued),
      sent: num(r?.sent),
      failed: num(r?.failed),
      skipped: num(r?.skipped),
      opened: num(r?.opened),
      clicked: num(r?.clicked),
      orders: num(o?.c),
      revenue: num(o?.s),
    });
  }
  return map;
}

export async function sendCampaignTest(id: string, to: string) {
  const campaign = await getCampaign(id);
  if (!campaign) throw new Error("Kampanya bulunamadı.");
  const notify = await getNotifySettings();
  const tenant = await getTenantContext(campaign.tenant_id);
  if (campaign.channel === "sms") {
    const r = await sendSmsRaw(notify, { to, text: renderText(campaign.body ?? "", { site_name: tenant.name, customer_name: "Test", coupon_code: campaign.coupon_code ?? "" }, false) });
    await logMessage({ channel: "sms", recipient: to, subject: `[TEST] ${campaign.name}`, templateKey: "campaign_test", status: r.ok ? "sent" : "failed", error: r.error, provider: r.provider });
    return r;
  }
  const messageId = randomUUID();
  const { subject, html } = renderCampaignEmail(campaign, { siteName: tenant.name, siteUrl: tenant.url, logoUrl: tenant.logoUrl, name: "Test Kullanıcı", email: to, messageId });
  const r = await sendEmailRaw(notify, { to, subject: `[TEST] ${subject}`, html, fromName: tenant.name });
  await logMessage({ id: messageId, channel: "email", recipient: to, subject: `[TEST] ${subject}`, templateKey: "campaign_test", status: r.ok ? "sent" : "failed", error: r.error, provider: r.provider });
  return r;
}

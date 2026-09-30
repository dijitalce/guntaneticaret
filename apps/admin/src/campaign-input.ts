import type { CampaignInput } from "@guntan/db";
import { text } from "./api-helpers";

export function campaignFromForm(form: FormData): CampaignInput | { error: string } {
  const channel = text(form, "channel") === "sms" ? "sms" : "email";
  const name = text(form, "name").slice(0, 191);
  const body = String(form.get("body") ?? "").trim();
  const subject = text(form, "subject").slice(0, 255);
  if (!name) return { error: "Kampanya adını yazın." };
  if (!body) return { error: channel === "sms" ? "SMS metnini yazın." : "E-posta içeriğini yazın." };
  if (channel === "email" && !subject) return { error: "E-posta konusunu yazın." };
  const when = text(form, "scheduledAt");
  const scheduledAt = when ? new Date(`${when}:00+03:00`) : null;
  return {
    tenantId: text(form, "tenantId") || null,
    name,
    channel,
    segmentKey: text(form, "segmentKey") || "all",
    subject,
    preheader: text(form, "preheader").slice(0, 255),
    body: channel === "sms" ? body.slice(0, 600) : body.slice(0, 100_000),
    couponCode: text(form, "couponCode").toUpperCase().slice(0, 64),
    scheduledAt: scheduledAt && !Number.isNaN(scheduledAt.getTime()) ? scheduledAt : null,
  };
}

import { getAutomationSettings, runAllAutomations, saveAutomationSettings, type AutomationSettings } from "@guntan/db";
import { writeAudit } from "@guntan/observability";
import { apiAdminSession, redirectTo, text } from "../../../src/api-helpers";

function int(value: string, fallback: number, min: number, max: number) {
  const n = Math.round(Number(value.replace(",", ".")));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
}

export async function POST(request: Request) {
  const session = await apiAdminSession();
  if (!session) return redirectTo(request, "/login");
  const form = await request.formData();
  const action = text(form, "_action");
  const back = "/marketing/automations";

  if (action === "run") {
    const result = await runAllAutomations({ force: true });
    await writeAudit({ actorId: session.user.id, actorEmail: session.user.email, entity: "automation", entityId: "all", action: "run_full" });
    const sent = result.skipped ? 0 : Object.values(result.summary).reduce((s, r) => s + ("sent" in r ? r.sent : 0), 0);
    return redirectTo(request, back, { ok: "calisti", adet: String(sent) });
  }

  const key = text(form, "key") as keyof AutomationSettings;
  const cur = await getAutomationSettings();
  if (!(key in cur)) return redirectTo(request, back);
  const next: AutomationSettings = { ...cur };
  const enabled = form.get("enabled") === "1";
  switch (key) {
    case "abandoned_cart":
      next.abandoned_cart = {
        enabled,
        delayMinutes: int(text(form, "delayMinutes"), 60, 15, 1440),
        secondEnabled: form.get("secondEnabled") === "1",
        secondDelayHours: int(text(form, "secondDelayHours"), 24, 1, 168),
        couponCode: text(form, "couponCode").toUpperCase().slice(0, 64),
        sms: form.get("sms") === "1",
      };
      break;
    case "review_request":
      next.review_request = { enabled, afterDays: int(text(form, "afterDays"), 3, 1, 60) };
      break;
    case "low_stock":
      next.low_stock = { enabled, threshold: int(text(form, "threshold"), 2, 0, 1000), emails: text(form, "emails") };
      break;
    case "back_in_stock":
      next.back_in_stock = { enabled };
      break;
    case "bank_reminder":
      next.bank_reminder = { enabled, afterHours: int(text(form, "afterHours"), 12, 1, 240), sms: form.get("sms") === "1" };
      break;
    case "bank_cancel":
      next.bank_cancel = { enabled, afterHours: int(text(form, "afterHours"), 72, 6, 720) };
      break;
  }
  await saveAutomationSettings(next);
  await writeAudit({
    actorId: session.user.id,
    actorEmail: session.user.email,
    entity: "automation",
    entityId: key,
    action: "update",
    before: cur[key],
    after: next[key],
  });
  return redirectTo(request, `${back}#${key}`, { ok: "kaydedildi" });
}

import { getMarketingSettings, saveMarketingSettings, type MarketingSettings } from "@guntan/db";
import { writeAudit } from "@guntan/observability";
import { apiAdminSession, redirectTo, text } from "../../../../src/api-helpers";

function int(v: string, d: number, min: number, max: number) {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : d;
}

export async function POST(request: Request) {
  const session = await apiAdminSession();
  if (!session) return redirectTo(request, "/login");
  const form = await request.formData();
  const before = await getMarketingSettings();
  const next: MarketingSettings = {
    attribution: text(form, "attribution") === "open" ? "open" : "click",
    attributionDays: int(text(form, "attributionDays"), 5, 1, 30),
    frequencyHours: int(text(form, "frequencyHours"), 24, 0, 720),
    smsQuietStart: int(text(form, "smsQuietStart"), 21, 0, 23),
    smsQuietEnd: int(text(form, "smsQuietEnd"), 9, 0, 23),
  };
  await saveMarketingSettings(next);
  await writeAudit({ actorId: session.user.id, actorEmail: session.user.email, entity: "marketing_settings", entityId: "global", action: "update", before, after: next });
  return redirectTo(request, "/marketing/settings", { ok: "1" });
}

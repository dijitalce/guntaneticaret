import { getPaymentSettings, savePaymentSettings, type PaymentSettings } from "@guntan/db";
import { writeAudit } from "@guntan/observability";
import { apiAdminSession, redirectTo, text } from "../../../../src/api-helpers";

function decimal(value: string): number | null {
  if (!value) return null;
  const n = Number(value.replace(/\s|%/g, "").replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", "."));
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : null;
}

export async function POST(request: Request) {
  const session = await apiAdminSession();
  if (!session) return redirectTo(request, "/login");
  const form = await request.formData();
  const before = await getPaymentSettings();
  const installmentRates: Record<string, number> = {};
  for (let n = 2; n <= 12; n++) {
    const rate = decimal(text(form, `rate-${n}`));
    if (rate !== null && rate <= 100) installmentRates[String(n)] = rate;
  }
  const next: PaymentSettings = {
    installmentRates,
    installmentMinAmount: decimal(text(form, "installmentMinAmount")) ?? 0,
  };
  await savePaymentSettings(next);
  await writeAudit({
    actorId: session.user.id,
    actorEmail: session.user.email,
    entity: "payment_settings",
    entityId: "global",
    action: "update",
    before,
    after: next,
  });
  return redirectTo(request, "/settings/payment", { ok: "1" });
}

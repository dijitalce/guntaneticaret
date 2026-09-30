import { getShippingSettings, saveShippingSettings, type ShippingSettings } from "@guntan/db";
import { writeAudit } from "@guntan/observability";
import { apiAdminSession, redirectTo, text } from "../../../../src/api-helpers";

function money(value: string, fallback: number) {
  const n = Number(value.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : fallback;
}

export async function POST(request: Request) {
  const session = await apiAdminSession();
  if (!session) return redirectTo(request, "/login");
  const form = await request.formData();
  const before = await getShippingSettings();
  const size = text(form, "labelSize");
  const next: ShippingSettings = {
    defaultCarrier: text(form, "defaultCarrier") === "manual" ? "manual" : "aras",
    flatFee: money(text(form, "flatFee"), before.flatFee),
    freeShippingThreshold: money(text(form, "freeShippingThreshold"), 0),
    defaultWeightKg: Math.max(0.1, money(text(form, "defaultWeightKg"), 1)),
    defaultPieces: Math.max(1, Math.round(Number(text(form, "defaultPieces")) || 1)),
    estimatedDays: text(form, "estimatedDays").slice(0, 60),
    senderName: text(form, "senderName").slice(0, 120),
    senderPhone: text(form, "senderPhone").slice(0, 40),
    senderAddress: text(form, "senderAddress").slice(0, 300),
    senderCity: text(form, "senderCity").slice(0, 60),
    senderDistrict: text(form, "senderDistrict").slice(0, 60),
    labelSize: size === "100x100" || size === "a4" ? size : "100x150",
    labelShowPrice: form.get("labelShowPrice") === "1",
    labelShowItems: form.get("labelShowItems") === "1",
    labelNote: text(form, "labelNote").slice(0, 200),
  };
  await saveShippingSettings(next);
  await writeAudit({
    actorId: session.user.id,
    actorEmail: session.user.email,
    entity: "shipping_settings",
    entityId: "global",
    action: "update",
    before,
    after: next,
  });
  return redirectTo(request, "/settings/shipping", { ok: "1" });
}

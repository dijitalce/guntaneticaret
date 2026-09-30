import { sendCartReminderNow } from "@guntan/db";
import { writeAudit } from "@guntan/observability";
import { apiAdminSession, redirectTo, text } from "../../../../../src/api-helpers";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await apiAdminSession();
  if (!session) return redirectTo(request, "/login");
  const { id } = await params;
  const form = await request.formData();
  const back = text(form, "back") === "list" ? "/abandoned-carts" : `/abandoned-carts/${id}`;
  const couponCode = text(form, "couponCode").toUpperCase().replace(/[^A-Z0-9_-]/g, "").slice(0, 40);
  const result = await sendCartReminderNow(id, { sms: form.get("sms") === "1", couponCode });
  if (!result.ok) return redirectTo(request, back, { hata: result.error ?? "Hatırlatma gönderilemedi." });
  await writeAudit({
    actorId: session.user.id,
    actorEmail: session.user.email,
    entity: "abandoned_cart",
    entityId: id,
    action: "remind",
    after: { couponCode: couponCode || null, sms: form.get("sms") === "1" },
  });
  return redirectTo(request, back, { ok: "hatirlatildi" });
}

import { cancelPaymentLink, deletePaymentLink, getPaymentLink, markPaymentLinkPaidManually, reopenPaymentLink } from "@guntan/db";
import { writeAudit } from "@guntan/observability";
import { apiAdminSession, redirectTo, safeNext, text } from "../../../../src/api-helpers";

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await apiAdminSession();
  if (!session) return redirectTo(request, "/login");
  const { id } = await ctx.params;
  const form = await request.formData();
  const back = safeNext(form.get("back"), "/payment-links");
  const link = await getPaymentLink(id);
  if (!link) return redirectTo(request, back);
  const action = text(form, "_action");
  const audit = (act: string) =>
    writeAudit({ actorId: session.user.id, actorEmail: session.user.email, entity: "payment_link", entityId: id, action: act, before: link });

  if (action === "cancel" && (await cancelPaymentLink(id))) {
    await audit("cancel");
    return redirectTo(request, back, { ok: "cancelled" });
  }
  if (action === "reopen" && (await reopenPaymentLink(id))) {
    await audit("reopen");
    return redirectTo(request, back, { ok: "reopened" });
  }
  if (action === "markpaid") {
    const methods = ["Havale / EFT", "Nakit", "Diğer"];
    const method = methods.includes(text(form, "method")) ? text(form, "method") : "Diğer";
    const raw = text(form, "amount").replace(/\./g, "").replace(",", ".");
    const amount = raw ? Number(raw) : undefined;
    if (amount !== undefined && !(amount > 0)) return redirectTo(request, back, { hata: "Geçerli bir tutar girin." });
    const updated = await markPaymentLinkPaidManually(id, { method, note: text(form, "note").slice(0, 120), amount, actor: session.user.name || session.user.email });
    if (!updated) return redirectTo(request, back, { hata: "Tahsilat ödendi olarak işaretlenemedi." });
    await audit("mark_paid");
    return redirectTo(request, back, { ok: "markpaid" });
  }
  if (action === "delete" && (await deletePaymentLink(id))) {
    await audit("delete");
    return redirectTo(request, back, { ok: "deleted" });
  }
  return redirectTo(request, back);
}

import { cancelPaymentLink, deletePaymentLink, getPaymentLink, reopenPaymentLink } from "@guntan/db";
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
  if (action === "delete" && (await deletePaymentLink(id))) {
    await audit("delete");
    return redirectTo(request, back, { ok: "deleted" });
  }
  return redirectTo(request, back);
}

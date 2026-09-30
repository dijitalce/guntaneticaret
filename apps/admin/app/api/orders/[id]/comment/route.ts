import { addOrderEvent, deleteOrderComment, notifyOrder } from "@guntan/db";
import { writeAudit } from "@guntan/observability";
import { apiAdminSession, redirectTo, text } from "../../../../../src/api-helpers";

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await apiAdminSession();
  if (!session) return redirectTo(request, "/login");
  const { id } = await ctx.params;
  const back = `/orders/${id}#zaman-cizelgesi`;
  const form = await request.formData();
  const actor = session.user.name || session.user.email;

  if (text(form, "_action") === "delete") {
    const eventId = Number(text(form, "eventId"));
    if (Number.isFinite(eventId)) await deleteOrderComment(id, eventId);
    return redirectTo(request, back);
  }

  const body = text(form, "body").slice(0, 4000);
  if (!body) return redirectTo(request, back);
  const notify = form.get("notify") === "1";
  await addOrderEvent({ orderId: id, kind: "comment", title: notify ? "Müşteriye not gönderildi" : "Not eklendi", body, actor, meta: { visibleToCustomer: notify } });
  if (notify) await notifyOrder(id, "order_updated", { message: body });
  await writeAudit({ actorId: session.user.id, actorEmail: session.user.email, entity: "order", entityId: id, action: "comment", after: { body, notify } });
  return redirectTo(request, back);
}

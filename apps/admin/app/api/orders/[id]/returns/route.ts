import { and, eq } from "drizzle-orm";
import { addOrderEvent, db, notifyOrder, orders, returnRequests } from "@guntan/db";
import { writeAudit } from "@guntan/observability";
import { apiAdminSession, redirectTo, text } from "../../../../../src/api-helpers";

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await apiAdminSession();
  if (!session) return redirectTo(request, "/login");
  const { id } = await ctx.params;
  const back = `/orders/${id}`;
  const [order] = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
  if (!order) return redirectTo(request, "/orders");
  const form = await request.formData();
  const action = text(form, "_action");
  const actor = session.user.name || session.user.email;
  const notify = form.get("notify") === "1";
  const message = text(form, "message").slice(0, 2000);
  const audit = (act: string, after: unknown) =>
    writeAudit({ actorId: session.user.id, actorEmail: session.user.email, entity: "order", entityId: id, action: act, after });

  if (action === "create") {
    const reason = text(form, "reason").slice(0, 2000);
    if (!reason) return redirectTo(request, back, { hata: "1", mesaj: "İade sebebini yazın." });
    await db.insert(returnRequests).values({ orderId: id, tenantId: order.tenantId, reason, status: "open" });
    await addOrderEvent({ orderId: id, kind: "status", title: "İade talebi oluşturuldu", body: reason, actor });
    if (notify) await notifyOrder(id, "return_requested");
    await audit("return_create", { reason, notify });
    return redirectTo(request, back, { ok: "1" });
  }

  const returnId = text(form, "returnId");
  const [ret] = await db
    .select()
    .from(returnRequests)
    .where(and(eq(returnRequests.id, returnId), eq(returnRequests.orderId, id)))
    .limit(1);
  if (!ret || ret.status !== "open") return redirectTo(request, back, { hata: "1", mesaj: "İade talebi bulunamadı veya zaten sonuçlandı." });

  if (action === "approve") {
    await db.update(returnRequests).set({ status: "approved" }).where(eq(returnRequests.id, ret.id));
    const refund = form.get("refund") === "1";
    if (refund) await db.update(orders).set({ status: "refunded" }).where(eq(orders.id, id));
    await addOrderEvent({
      orderId: id,
      kind: "status",
      title: refund ? "İade onaylandı, sipariş iade edildi" : "İade onaylandı",
      body: message || null,
      actor,
    });
    if (notify) await notifyOrder(id, "return_approved", { message });
    await audit("return_approve", { returnId: ret.id, refund, message });
    return redirectTo(request, back, { ok: "1" });
  }

  if (action === "reject") {
    await db.update(returnRequests).set({ status: "rejected" }).where(eq(returnRequests.id, ret.id));
    await addOrderEvent({ orderId: id, kind: "status", title: "İade reddedildi", body: message || null, actor });
    if (notify) await notifyOrder(id, "return_rejected", { message });
    await audit("return_reject", { returnId: ret.id, message });
    return redirectTo(request, back, { ok: "1" });
  }

  return redirectTo(request, back);
}

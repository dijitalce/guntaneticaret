import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { COOKIE_ADMIN_SESSION } from "@guntan/config";
import { getAdminBySession } from "@guntan/auth";
import { cancelOrder } from "@guntan/ecommerce";
import { writeAudit } from "@guntan/observability";
import { adminRedirect } from "../../../../../src/paths";

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const token = (await cookies()).get(COOKIE_ADMIN_SESSION)?.value;
  const session = token ? await getAdminBySession(token) : null;
  if (!session) return NextResponse.redirect(adminRedirect("/login", request), 303);
  const { id } = await ctx.params;
  const form = await request.formData().catch(() => new FormData());
  const reason = String(form.get("reason") ?? "").trim().slice(0, 300) || undefined;
  const notify = form.get("notify") === "1";
  try {
    await cancelOrder(id, { actor: session.user.name || session.user.email, reason, notify });
  } catch {
    return NextResponse.redirect(adminRedirect(`/orders/${id}?hata=1`, request), 303);
  }
  await writeAudit({
    actorId: session.user.id,
    actorEmail: session.user.email,
    entity: "order",
    entityId: id,
    action: "cancel",
    after: { reason, notify },
  });
  return NextResponse.redirect(adminRedirect(`/orders/${id}?ok=1`, request), 303);
}

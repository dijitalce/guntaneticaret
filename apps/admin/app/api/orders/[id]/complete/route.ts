import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { COOKIE_ADMIN_SESSION } from "@guntan/config";
import { getAdminBySession } from "@guntan/auth";
import { completeOrder } from "@guntan/ecommerce";
import { writeAudit } from "@guntan/observability";
import { adminRedirect } from "../../../../../src/paths";

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const token = (await cookies()).get(COOKIE_ADMIN_SESSION)?.value;
  const session = token ? await getAdminBySession(token) : null;
  if (!session) return NextResponse.redirect(adminRedirect("/login", request), 303);
  const { id } = await ctx.params;
  try {
    await completeOrder(id);
    await writeAudit({
      actorId: session.user.id,
      actorEmail: session.user.email,
      entity: "order",
      entityId: id,
      action: "complete",
    });
  } catch {
    return NextResponse.redirect(adminRedirect(`/orders/${id}?hata=1`, request), 303);
  }
  return NextResponse.redirect(adminRedirect(`/orders/${id}?ok=1`, request), 303);
}

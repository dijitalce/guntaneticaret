import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { COOKIE_ADMIN_SESSION } from "@guntan/config";
import { getAdminBySession } from "@guntan/auth";
import { cancelOrder } from "@guntan/ecommerce";
import { writeAudit } from "@guntan/observability";

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const token = (await cookies()).get(COOKIE_ADMIN_SESSION)?.value;
  const session = token ? await getAdminBySession(token) : null;
  if (!session) return NextResponse.redirect(new URL("/login", request.url), 303);
  const { id } = await ctx.params;
  await cancelOrder(id);
  await writeAudit({
    actorId: session.user.id,
    actorEmail: session.user.email,
    entity: "order",
    entityId: id,
    action: "cancel",
  });
  return NextResponse.redirect(new URL("/orders", request.url), 303);
}

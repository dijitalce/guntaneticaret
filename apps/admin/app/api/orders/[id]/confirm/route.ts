import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { COOKIE_ADMIN_SESSION } from "@guntan/config";
import { getAdminBySession } from "@guntan/auth";
import { confirmBankTransfer } from "@guntan/ecommerce";
import { writeAudit } from "@guntan/observability";
import { adminRedirect } from "../../../../../src/paths";

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const token = (await cookies()).get(COOKIE_ADMIN_SESSION)?.value;
  const session = token ? await getAdminBySession(token) : null;
  if (!session) return NextResponse.redirect(adminRedirect("/login", request), 303);
  const { id } = await ctx.params;
  await confirmBankTransfer(id);
  await writeAudit({
    actorId: session.user.id,
    actorEmail: session.user.email,
    entity: "order",
    entityId: id,
    action: "confirm_payment",
  });
  return NextResponse.redirect(adminRedirect("/orders", request), 303);
}

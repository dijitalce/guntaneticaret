import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { COOKIE_ADMIN_SESSION } from "@guntan/config";
import { getAdminBySession } from "@guntan/auth";
import { markOrderPreparing } from "@guntan/ecommerce";
import { writeAudit } from "@guntan/observability";
import { safeNext } from "../../../../../src/api-helpers";
import { adminRedirect } from "../../../../../src/paths";

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const token = (await cookies()).get(COOKIE_ADMIN_SESSION)?.value;
  const session = token ? await getAdminBySession(token) : null;
  if (!session) return NextResponse.redirect(adminRedirect("/login", request), 303);
  const { id } = await ctx.params;
  const form = await request.formData().catch(() => null);
  const next = safeNext(form?.get("next") ?? null, `/orders/${id}`);
  const sep = next.includes("?") ? "&" : "?";
  const fromList = !next.startsWith(`/orders/${id}`);
  try {
    await markOrderPreparing(id, session.user.name || session.user.email);
    await writeAudit({
      actorId: session.user.id,
      actorEmail: session.user.email,
      entity: "order",
      entityId: id,
      action: "prepare",
    });
  } catch {
    return NextResponse.redirect(adminRedirect(`${next}${sep}hata=1`, request), 303);
  }
  return NextResponse.redirect(adminRedirect(`${next}${sep}ok=${fromList ? "prepare" : "1"}`, request), 303);
}

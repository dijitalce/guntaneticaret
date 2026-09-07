import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { COOKIE_ADMIN_SESSION } from "@guntan/config";
import { getAdminBySession } from "@guntan/auth";
import { shipOrder } from "@guntan/ecommerce";
import { writeAudit } from "@guntan/observability";
import { adminRedirect } from "../../../../../src/paths";

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const token = (await cookies()).get(COOKIE_ADMIN_SESSION)?.value;
  const session = token ? await getAdminBySession(token) : null;
  if (!session) return NextResponse.redirect(adminRedirect("/login", request), 303);
  const { id } = await ctx.params;
  const form = await request.formData();
  try {
    await shipOrder(id, {
      carrier: String(form.get("carrier") ?? ""),
      trackingNo: String(form.get("trackingNo") ?? ""),
    });
    await writeAudit({
      actorId: session.user.id,
      actorEmail: session.user.email,
      entity: "order",
      entityId: id,
      action: "ship",
      after: {
        carrier: form.get("carrier"),
        trackingNo: form.get("trackingNo"),
      },
    });
  } catch {
    return NextResponse.redirect(adminRedirect(`/orders/${id}?hata=1`, request), 303);
  }
  return NextResponse.redirect(adminRedirect(`/orders/${id}?ok=1`, request), 303);
}

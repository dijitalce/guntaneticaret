import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { COOKIE_ADMIN_SESSION } from "@guntan/config";
import { getAdminBySession } from "@guntan/auth";
import { confirmBankTransfer } from "@guntan/ecommerce";
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
  try {
    await confirmBankTransfer(id, session.user.name || session.user.email);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Ödeme onaylanamadı.";
    return NextResponse.redirect(adminRedirect(`${next}${sep}hata=1&mesaj=${encodeURIComponent(message)}`, request), 303);
  }
  await writeAudit({
    actorId: session.user.id,
    actorEmail: session.user.email,
    entity: "order",
    entityId: id,
    action: "confirm_payment",
  });
  return NextResponse.redirect(adminRedirect(`${next}${sep}ok=1`, request), 303);
}

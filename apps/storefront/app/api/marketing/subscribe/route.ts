import { NextResponse } from "next/server";
import { bumpPopup, subscribeContact } from "@guntan/db";
import { isValidEmail, tenantFromRequest } from "../../../../src/request-tenant";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { email?: string; popupId?: string; name?: string };
  const email = String(body.email ?? "").trim();
  if (!isValidEmail(email)) return NextResponse.json({ ok: false }, { status: 400 });
  const tenant = await tenantFromRequest();
  const popupId = typeof body.popupId === "string" && /^[a-f0-9-]{36}$/.test(body.popupId) ? body.popupId : null;
  await subscribeContact({
    email,
    tenantId: tenant?.tenant.id ?? null,
    name: typeof body.name === "string" ? body.name.slice(0, 191) : null,
    source: popupId ? "popup" : "form",
    popupId,
  });
  if (popupId) await bumpPopup(popupId, "leads").catch(() => undefined);
  return NextResponse.json({ ok: true });
}

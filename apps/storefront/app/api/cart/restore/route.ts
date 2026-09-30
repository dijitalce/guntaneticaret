import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { COOKIE_CART, publicRedirect } from "@guntan/config";
import { carts, db } from "@guntan/db";
import { tenantFromRequest } from "../../../../src/request-tenant";

/** Terk edilmiş sepet e-postasındaki bağlantı: sepeti bu tarayıcıya bağlar ve sepete yönlendirir. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const cartId = url.searchParams.get("c") ?? "";
  const target = publicRedirect("/sepet", request);
  for (const key of ["utm_source", "utm_medium", "utm_campaign"]) {
    const v = url.searchParams.get(key);
    if (v) target.searchParams.set(key, v);
  }
  const res = NextResponse.redirect(target, 303);
  if (!/^[a-f0-9-]{36}$/.test(cartId)) return res;
  const tenant = await tenantFromRequest();
  const [cart] = await db.select().from(carts).where(eq(carts.id, cartId)).limit(1);
  if (!cart || !tenant || cart.tenantId !== tenant.tenant.id || !cart.sessionId) return res;
  res.cookies.set(COOKIE_CART, cart.sessionId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}

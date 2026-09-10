import { NextResponse } from "next/server";
import { cookies, headers } from "next/headers";
import { COOKIE_CART, COOKIE_CUSTOMER_SESSION, publicRedirect } from "@guntan/config";
import { loginCustomer } from "@guntan/auth";
import { attachCartToCustomer, getCartSummary } from "@guntan/ecommerce";
import { resolveTenantByHost } from "@guntan/tenant";

export async function POST(request: Request) {
  const form = await request.formData();
  const result = await loginCustomer(String(form.get("email")), String(form.get("password")));
  if (!result) return NextResponse.redirect(publicRedirect("/hesabim?hata=1", request), 303);

  const host = (await headers()).get("x-request-host") ?? (await headers()).get("host") ?? "";
  const tenant = await resolveTenantByHost(host);
  const sessionId = (await cookies()).get(COOKIE_CART)?.value;
  let cartQty = 0;
  if (tenant) {
    await attachCartToCustomer(tenant.tenant.id, result.user.id, sessionId);
    const summary = await getCartSummary(tenant.tenant.id, sessionId, result.user.id);
    cartQty = summary.qty;
  }

  const next = cartQty > 0 ? "/sepet?giris=1" : "/hesabim";
  const res = NextResponse.redirect(publicRedirect(next, request), 303);
  res.cookies.set(COOKIE_CUSTOMER_SESSION, result.token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 14,
  });
  return res;
}

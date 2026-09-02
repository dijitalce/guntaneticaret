import { NextResponse } from "next/server";
import { cookies, headers } from "next/headers";
import { COOKIE_CART, COOKIE_CUSTOMER_SESSION } from "@guntan/config";
import { checkout, getOrCreateCart } from "@guntan/ecommerce";
import { resolveTenantByHost } from "@guntan/tenant";
import { getCustomerBySession } from "@guntan/auth";
import { sendOrderReceivedEmail } from "@guntan/email";

export async function POST(request: Request) {
  const host = (await headers()).get("x-request-host") ?? (await headers()).get("host") ?? "";
  const tenant = await resolveTenantByHost(host);
  if (!tenant) return NextResponse.json({ error: "tenant" }, { status: 404 });
  const form = await request.formData();
  const sessionId = (await cookies()).get(COOKIE_CART)?.value;
  if (!sessionId) return NextResponse.redirect(new URL("/sepet", request.url), 303);
  const token = (await cookies()).get(COOKIE_CUSTOMER_SESSION)?.value;
  const user = token ? await getCustomerBySession(token) : null;
  const cart = await getOrCreateCart(tenant.tenant.id, user?.id, sessionId);
  const result = await checkout({
    tenantId: tenant.tenant.id,
    cartId: cart.id,
    customerId: user?.id,
    email: String(form.get("email")),
    phone: String(form.get("phone")),
    fullName: String(form.get("fullName")),
    city: String(form.get("city")),
    district: String(form.get("district")),
    line1: String(form.get("line1")),
  });
  await sendOrderReceivedEmail({
    to: result.order.email,
    siteName: tenant.siteName,
    orderNo: result.order.orderNo,
    amount: result.order.grandTotal,
    ibanLines: result.intent.instructions.map((i) => `${i.bankName} ${i.iban}`),
  });
  return NextResponse.redirect(new URL(`/odeme/basarili?order=${result.order.orderNo}`, request.url), 303);
}

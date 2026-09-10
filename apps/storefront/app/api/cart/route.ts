import { NextResponse } from "next/server";
import { cookies, headers } from "next/headers";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { COOKIE_CART, publicRedirect } from "@guntan/config";
import { addToCart, cartQty, getOrCreateCart } from "@guntan/ecommerce";
import { resolveTenantByHost } from "@guntan/tenant";
import { db, products } from "@guntan/db";

export async function GET() {
  const host = (await headers()).get("x-request-host") ?? (await headers()).get("host") ?? "";
  const tenant = await resolveTenantByHost(host);
  if (!tenant) {
    return NextResponse.json({ qty: 0 }, { headers: { "Cache-Control": "private, no-store" } });
  }
  const sessionId = (await cookies()).get(COOKIE_CART)?.value;
  const qty = await cartQty(tenant.tenant.id, sessionId);
  return NextResponse.json({ qty }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(request: Request) {
  const host = (await headers()).get("x-request-host") ?? (await headers()).get("host") ?? "";
  const tenant = await resolveTenantByHost(host);
  if (!tenant) return NextResponse.json({ error: "tenant" }, { status: 404 });
  const form = await request.formData();
  const slug = String(form.get("slug") ?? "");
  const qty = Number(form.get("qty") ?? 1);
  const jar = await cookies();
  let sessionId = jar.get(COOKIE_CART)?.value;
  if (!sessionId) sessionId = randomUUID();
  const [product] = await db.select().from(products).where(eq(products.slug, slug)).limit(1);
  if (!product) return NextResponse.redirect(publicRedirect("/", request), 303);
  try {
    const cart = await getOrCreateCart(tenant.tenant.id, null, sessionId);
    await addToCart(cart.id, tenant.tenant.id, product.id, qty);
  } catch {
    return NextResponse.redirect(publicRedirect(`/urun/${encodeURIComponent(slug)}?sepet=hata`, request), 303);
  }
  const res = NextResponse.redirect(publicRedirect("/sepet", request), 303);
  res.cookies.set(COOKIE_CART, sessionId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}

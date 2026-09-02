import { NextResponse } from "next/server";
import { cookies, headers } from "next/headers";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { COOKIE_CART } from "@guntan/config";
import { addToCart, getOrCreateCart } from "@guntan/ecommerce";
import { resolveTenantByHost } from "@guntan/tenant";
import { db, products } from "@guntan/db";

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
  if (!product) return NextResponse.json({ error: "product" }, { status: 404 });
  const cart = await getOrCreateCart(tenant.tenant.id, null, sessionId);
  await addToCart(cart.id, tenant.tenant.id, product.id, qty);
  const res = NextResponse.redirect(new URL("/sepet", request.url), 303);
  res.cookies.set(COOKIE_CART, sessionId, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30 });
  return res;
}

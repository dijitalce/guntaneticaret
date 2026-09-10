import { NextResponse } from "next/server";
import { cookies, headers } from "next/headers";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { COOKIE_CART, publicRedirect } from "@guntan/config";
import { addToCart, cartQty, getOrCreateCart, removeCartItem, updateCartItemQty } from "@guntan/ecommerce";
import { resolveTenantByHost } from "@guntan/tenant";
import { db, products } from "@guntan/db";

function withCartCookie(res: NextResponse, sessionId: string) {
  res.cookies.set(COOKIE_CART, sessionId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}

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
  const action = String(form.get("action") ?? "add");
  const jar = await cookies();
  let sessionId = jar.get(COOKIE_CART)?.value;
  if (!sessionId) sessionId = randomUUID();

  const cart = await getOrCreateCart(tenant.tenant.id, null, sessionId);
  const backToCart = () => withCartCookie(NextResponse.redirect(publicRedirect("/sepet", request), 303), sessionId);

  if (action === "remove") {
    const itemId = String(form.get("itemId") ?? "");
    if (itemId) await removeCartItem(cart.id, itemId);
    return backToCart();
  }

  if (action === "update") {
    const itemId = String(form.get("itemId") ?? "");
    const qty = Number(form.get("qty") ?? 0);
    if (!itemId) return backToCart();
    try {
      await updateCartItemQty(cart.id, itemId, qty);
    } catch {
      return withCartCookie(
        NextResponse.redirect(publicRedirect("/sepet?hata=stok", request), 303),
        sessionId,
      );
    }
    return backToCart();
  }

  // default: add
  const slug = String(form.get("slug") ?? "");
  const qty = Number(form.get("qty") ?? 1);
  const [product] = await db.select().from(products).where(eq(products.slug, slug)).limit(1);
  if (!product) return NextResponse.redirect(publicRedirect("/", request), 303);
  try {
    await addToCart(cart.id, tenant.tenant.id, product.id, qty);
  } catch {
    return NextResponse.redirect(publicRedirect(`/urun/${encodeURIComponent(slug)}?sepet=hata`, request), 303);
  }
  return backToCart();
}

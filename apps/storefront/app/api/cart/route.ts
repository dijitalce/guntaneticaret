import { NextResponse } from "next/server";
import { cookies, headers } from "next/headers";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { COOKIE_CART, publicRedirect } from "@guntan/config";
import {
  addToCart,
  getCartSummary,
  getOrCreateCart,
  removeCartItem,
  updateCartItemQty,
} from "@guntan/ecommerce";
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

function isSafeReturnPath(path: string) {
  return path.startsWith("/") && !path.startsWith("//") && !path.includes("://");
}

function stripSepetParam(path: string) {
  try {
    const u = new URL(path, "https://local.invalid");
    u.searchParams.delete("sepet");
    const q = u.searchParams.toString();
    return q ? `${u.pathname}?${q}` : u.pathname;
  } catch {
    return path;
  }
}

function withSepetFlag(path: string, flag: "ok" | "hata") {
  const u = new URL(stripSepetParam(path), "https://local.invalid");
  u.searchParams.set("sepet", flag);
  const q = u.searchParams.toString();
  return `${u.pathname}?${q}`;
}

function resolveStayPath(request: Request, form: FormData, slug: string) {
  const fromForm = String(form.get("returnTo") ?? "").trim();
  if (isSafeReturnPath(fromForm)) return stripSepetParam(fromForm);

  const referer = request.headers.get("referer");
  if (referer) {
    try {
      const ref = new URL(referer);
      const host = request.headers.get("x-request-host") ?? request.headers.get("host") ?? "";
      const hostName = host.split(":")[0]?.toLowerCase();
      if (hostName && ref.hostname.toLowerCase() === hostName) {
        return stripSepetParam(`${ref.pathname}${ref.search}`);
      }
    } catch {
      /* ignore */
    }
  }
  return `/urun/${encodeURIComponent(slug)}`;
}

function wantsJson(request: Request, form: FormData) {
  if (String(form.get("ajax") ?? "") === "1") return true;
  const accept = request.headers.get("accept") ?? "";
  return accept.includes("application/json");
}

async function jsonCart(tenantId: string, sessionId: string, extra?: Record<string, unknown>) {
  const summary = await getCartSummary(tenantId, sessionId);
  return NextResponse.json({ ok: true, ...summary, ...extra }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function GET() {
  const host = (await headers()).get("x-request-host") ?? (await headers()).get("host") ?? "";
  const tenant = await resolveTenantByHost(host);
  if (!tenant) {
    return NextResponse.json(
      { qty: 0, items: [], subtotal: 0, shippingAmount: 0, freeShippingMin: 2500, remainingForFreeShipping: 2500, freeShippingUnlocked: false },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  }
  const sessionId = (await cookies()).get(COOKIE_CART)?.value;
  const summary = await getCartSummary(tenant.tenant.id, sessionId);
  return NextResponse.json(summary, { headers: { "Cache-Control": "private, no-store" } });
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
  const json = wantsJson(request, form);

  const cart = await getOrCreateCart(tenant.tenant.id, null, sessionId);
  const backToCart = () => withCartCookie(NextResponse.redirect(publicRedirect("/sepet", request), 303), sessionId);

  if (action === "remove") {
    const itemId = String(form.get("itemId") ?? "");
    if (itemId) await removeCartItem(cart.id, itemId);
    if (json) return withCartCookie(await jsonCart(tenant.tenant.id, sessionId), sessionId);
    return backToCart();
  }

  if (action === "update") {
    const itemId = String(form.get("itemId") ?? "");
    const qty = Number(form.get("qty") ?? 0);
    if (!itemId) {
      if (json) return withCartCookie(await jsonCart(tenant.tenant.id, sessionId), sessionId);
      return backToCart();
    }
    try {
      await updateCartItemQty(cart.id, itemId, qty);
    } catch {
      if (json) {
        return withCartCookie(
          NextResponse.json({ ok: false, error: "stock" }, { status: 409 }),
          sessionId,
        );
      }
      return withCartCookie(
        NextResponse.redirect(publicRedirect("/sepet?hata=stok", request), 303),
        sessionId,
      );
    }
    if (json) return withCartCookie(await jsonCart(tenant.tenant.id, sessionId), sessionId);
    return backToCart();
  }

  // default: add — stay on current page
  const slug = String(form.get("slug") ?? "");
  const qty = Number(form.get("qty") ?? 1);
  const [product] = await db.select().from(products).where(eq(products.slug, slug)).limit(1);
  if (!product) {
    if (json) return NextResponse.json({ ok: false, error: "product" }, { status: 404 });
    return NextResponse.redirect(publicRedirect("/", request), 303);
  }
  try {
    await addToCart(cart.id, tenant.tenant.id, product.id, qty);
  } catch {
    if (json) return withCartCookie(NextResponse.json({ ok: false, error: "stock" }, { status: 409 }), sessionId);
    return withCartCookie(
      NextResponse.redirect(publicRedirect(withSepetFlag(resolveStayPath(request, form, slug), "hata"), request), 303),
      sessionId,
    );
  }

  if (json) return withCartCookie(await jsonCart(tenant.tenant.id, sessionId), sessionId);
  return withCartCookie(
    NextResponse.redirect(publicRedirect(withSepetFlag(resolveStayPath(request, form, slug), "ok"), request), 303),
    sessionId,
  );
}

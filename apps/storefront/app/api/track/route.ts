import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { COOKIE_CART, COOKIE_CUSTOMER_SESSION } from "@guntan/config";
import { getCustomerBySession } from "@guntan/auth";
import { bumpPopup, carts, db, isBot, recordVisit, saveCartContact } from "@guntan/db";
import { clientIp } from "../../../src/garanti-redirect";
import { COOKIE_VISITOR, VISITOR_SESSION_SECONDS, isValidEmail, requestHost, tenantFromRequest } from "../../../src/request-tenant";

const ALLOWED = new Set(["pv", "hb", "product", "add_to_cart", "checkout", "purchase", "contact", "popup_view", "popup_click"]);

function str(value: unknown, max: number) {
  return typeof value === "string" ? value.slice(0, max) : "";
}

function gaClientId(raw: string | undefined) {
  const m = raw?.match(/^GA\d\.\d\.(\d+\.\d+)$/);
  return m?.[1] ?? null;
}

export async function POST(request: Request) {
  const ua = request.headers.get("user-agent") ?? "";
  if (!ua || isBot(ua)) return new NextResponse(null, { status: 204 });
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return new NextResponse(null, { status: 204 });
  }
  const type = str(body.t, 24);
  if (!ALLOWED.has(type)) return new NextResponse(null, { status: 204 });
  const tenant = await tenantFromRequest();
  if (!tenant) return new NextResponse(null, { status: 204 });

  const jar = await cookies();
  let sid = jar.get(COOKIE_VISITOR)?.value;
  const isNew = !sid || !/^[a-f0-9-]{36}$/.test(sid);
  if (isNew) sid = randomUUID();

  const query = str(body.q, 512);
  const fbclid = new URLSearchParams(query.replace(/^\?/, "")).get("fbclid");
  const fbc = jar.get("_fbc")?.value ?? (fbclid ? `fb.1.${Date.now()}.${fbclid}` : null);
  const meta = body.meta && typeof body.meta === "object" ? (body.meta as Record<string, unknown>) : null;

  try {
    let customerId: string | null = null;
    if (type !== "hb") {
      const token = jar.get(COOKIE_CUSTOMER_SESSION)?.value;
      customerId = token ? ((await getCustomerBySession(token).catch(() => null))?.id ?? null) : null;
    }
    await recordVisit({
      sid: sid!,
      isNew,
      tenantId: tenant.tenant.id,
      type,
      path: str(body.p, 512) || "/",
      title: str(body.title, 255) || null,
      referrer: str(body.r, 512) || null,
      query,
      host: await requestHost(),
      ua,
      ip: clientIp(request.headers),
      customerId,
      fbp: jar.get("_fbp")?.value ?? null,
      fbc,
      gaCid: gaClientId(jar.get("_ga")?.value),
      meta,
    });

    if (type === "contact") {
      const email = str(body.email, 191).trim();
      const phone = str(body.phone, 32).trim();
      const cartSession = jar.get(COOKIE_CART)?.value;
      if (cartSession && ((email && isValidEmail(email)) || phone.replace(/\D/g, "").length >= 10)) {
        const [cart] = await db
          .select({ id: carts.id })
          .from(carts)
          .where(and(eq(carts.tenantId, tenant.tenant.id), eq(carts.sessionId, cartSession)))
          .limit(1);
        if (cart) {
          await saveCartContact({
            cartId: cart.id,
            tenantId: tenant.tenant.id,
            email: email && isValidEmail(email) ? email : null,
            phone: phone || null,
            fullName: str(body.name, 191) || null,
            sid,
          });
        }
      }
    }
    if ((type === "popup_view" || type === "popup_click") && typeof meta?.popupId === "string") {
      await bumpPopup(meta.popupId.slice(0, 36), type === "popup_view" ? "views" : "clicks");
    }
  } catch {
    /* takip hatası ziyaretçiyi etkilemez */
  }

  const res = new NextResponse(null, { status: 204 });
  res.cookies.set(COOKIE_VISITOR, sid!, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: VISITOR_SESSION_SECONDS,
  });
  return res;
}

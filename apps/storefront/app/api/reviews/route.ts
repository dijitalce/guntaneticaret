import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { COOKIE_CUSTOMER_SESSION, publicRedirect } from "@guntan/config";
import { getCustomerBySession } from "@guntan/auth";
import { db, products, reviewAuthorName, reviewEligibility, submitReview } from "@guntan/db";
import { tenantFromRequest } from "../../../src/request-tenant";

const BODY_MIN = 10;
const BODY_MAX = 2000;

export async function POST(request: Request) {
  const form = await request.formData();
  const productId = String(form.get("productId") ?? "");
  if (!/^[a-f0-9-]{36}$/.test(productId)) return NextResponse.redirect(publicRedirect("/", request), 303);

  const [product] = await db.select({ id: products.id, slug: products.slug }).from(products).where(eq(products.id, productId)).limit(1);
  if (!product) return NextResponse.redirect(publicRedirect("/", request), 303);
  const back = (result: string) =>
    NextResponse.redirect(publicRedirect(`/urun/${encodeURIComponent(product.slug)}?degerlendirme=${result}#degerlendirmeler`, request), 303);

  const token = (await cookies()).get(COOKIE_CUSTOMER_SESSION)?.value;
  const user = token ? await getCustomerBySession(token) : null;
  if (!user) return NextResponse.redirect(publicRedirect("/hesabim", request), 303);

  const tenant = await tenantFromRequest();
  if (!tenant) return back("hata");

  const rating = Number(form.get("rating"));
  const title = String(form.get("title") ?? "").trim().slice(0, 150);
  const body = String(form.get("body") ?? "").trim();
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return back("puan");
  if (body.length < BODY_MIN || body.length > BODY_MAX) return back("metin");

  const { orderId } = await reviewEligibility(user.id, product.id);
  if (!orderId) return back("yetki");

  await submitReview({
    tenantId: tenant.tenant.id,
    productId: product.id,
    customerId: user.id,
    orderId,
    rating,
    title: title || null,
    body,
    authorName: reviewAuthorName(user.firstName, user.lastName),
  });
  return back("ok");
}

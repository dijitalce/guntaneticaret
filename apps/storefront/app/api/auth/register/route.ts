import { NextResponse } from "next/server";
import { cookies, headers } from "next/headers";
import { COOKIE_CART, COOKIE_CUSTOMER_SESSION, publicRedirect } from "@guntan/config";
import { createCustomer, loginCustomer } from "@guntan/auth";
import { attachCartToCustomer, getCartSummary } from "@guntan/ecommerce";
import { customerAddresses, db } from "@guntan/db";
import { resolveTenantByHost } from "@guntan/tenant";

function field(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}

export async function POST(request: Request) {
  const form = await request.formData();
  const email = field(form, "email");
  const password = field(form, "password");
  const firstName = field(form, "firstName");
  const lastName = field(form, "lastName");
  const phone = field(form, "phone") || undefined;
  const invoiceType = field(form, "invoiceType") === "corporate" ? "corporate" : "individual";
  const companyName = field(form, "companyName");
  const taxOffice = field(form, "taxOffice");
  const taxNumber = field(form, "taxNumber");
  const nationalId = field(form, "nationalId");
  const city = field(form, "billingCity");
  const district = field(form, "billingDistrict");
  const line1 = field(form, "billingLine1");
  const postalCode = field(form, "billingPostalCode") || null;
  const alsoShipping = field(form, "alsoShipping") === "1";

  if (field(form, "acceptTerms") !== "1" || field(form, "acceptPrivacy") !== "1") {
    return NextResponse.redirect(publicRedirect("/hesabim?kayit=onay", request), 303);
  }

  if (!email || !password || password.length < 6 || !firstName || !lastName) {
    return NextResponse.redirect(publicRedirect("/hesabim?kayit=eksik", request), 303);
  }

  if (invoiceType === "corporate" && (!companyName || !taxOffice || !taxNumber)) {
    return NextResponse.redirect(publicRedirect("/hesabim?kayit=fatura", request), 303);
  }

  if (!city || !district || !line1) {
    return NextResponse.redirect(publicRedirect("/hesabim?kayit=adres", request), 303);
  }

  let user;
  try {
    user = await createCustomer({
      email,
      password,
      firstName,
      lastName,
      phone,
      invoiceType,
      companyName,
      taxOffice,
      taxNumber,
      nationalId,
    });
  } catch {
    return NextResponse.redirect(publicRedirect("/hesabim?kayit=email", request), 303);
  }

  const fullName = `${firstName} ${lastName}`.trim();
  const contactPhone = phone || "0000000000";
  await db.insert(customerAddresses).values({
    customerId: user.id,
    title: invoiceType === "corporate" ? "Fatura (Kurumsal)" : "Fatura",
    kind: "billing",
    fullName: invoiceType === "corporate" ? companyName : fullName,
    phone: contactPhone,
    city,
    district,
    line1,
    postalCode,
    isDefault: 1,
  });
  if (alsoShipping) {
    await db.insert(customerAddresses).values({
      customerId: user.id,
      title: "Teslimat",
      kind: "shipping",
      fullName,
      phone: contactPhone,
      city,
      district,
      line1,
      postalCode,
      isDefault: 1,
    });
  }

  const result = await loginCustomer(email, password);
  const host = (await headers()).get("x-request-host") ?? (await headers()).get("host") ?? "";
  const tenant = await resolveTenantByHost(host);
  const sessionId = (await cookies()).get(COOKIE_CART)?.value;
  let cartQty = 0;
  if (tenant && result) {
    await attachCartToCustomer(tenant.tenant.id, result.user.id, sessionId);
    const summary = await getCartSummary(tenant.tenant.id, sessionId, result.user.id);
    cartQty = summary.qty;
  }

  const next = cartQty > 0 ? "/sepet?uyelik=1" : "/hesabim?kayit=1";
  const res = NextResponse.redirect(publicRedirect(next, request), 303);
  if (result) {
    res.cookies.set(COOKIE_CUSTOMER_SESSION, result.token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 14,
    });
  }
  return res;
}

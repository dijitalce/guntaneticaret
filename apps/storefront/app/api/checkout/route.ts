import { NextResponse } from "next/server";
import { cookies, headers } from "next/headers";
import { COOKIE_CART, COOKIE_CUSTOMER_SESSION, publicRedirect } from "@guntan/config";
import { buildOosPayForm, checkout, garantiConfigFromEnv, getOrCreateCart } from "@guntan/ecommerce";
import { resolveTenantByHost } from "@guntan/tenant";
import { getCustomerBySession } from "@guntan/auth";
import { sendOrderReceivedEmail } from "@guntan/email";
import { autoPostHtml, clientIp } from "../../../src/garanti-redirect";

function field(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}

export async function POST(request: Request) {
  const host = (await headers()).get("x-request-host") ?? (await headers()).get("host") ?? "";
  const tenant = await resolveTenantByHost(host);
  if (!tenant) return NextResponse.json({ error: "tenant" }, { status: 404 });
  const form = await request.formData();
  const jar = await cookies();
  let sessionId = jar.get(COOKIE_CART)?.value;
  const token = jar.get(COOKIE_CUSTOMER_SESSION)?.value;
  const user = token ? await getCustomerBySession(token) : null;
  if (!sessionId && !user) return NextResponse.redirect(publicRedirect("/sepet", request), 303);
  if (!sessionId) sessionId = crypto.randomUUID();

  if (field(form, "acceptDistanceSales") !== "1" || field(form, "acceptPrivacy") !== "1") {
    return NextResponse.redirect(publicRedirect("/odeme?hata=1", request), 303);
  }

  const invoiceType = field(form, "invoiceType") === "corporate" ? "corporate" : "individual";
  const shipDifferent = field(form, "shipDifferent") === "1";
  const billing = {
    city: field(form, "billingCity"),
    district: field(form, "billingDistrict"),
    line1: field(form, "billingLine1"),
    postalCode: field(form, "billingPostalCode"),
  };
  const shipping = shipDifferent
    ? {
        city: field(form, "shipCity"),
        district: field(form, "shipDistrict"),
        line1: field(form, "shipLine1"),
        postalCode: field(form, "shipPostalCode"),
        fullName: field(form, "shipFullName"),
        phone: field(form, "shipPhone"),
      }
    : {
        city: billing.city,
        district: billing.district,
        line1: billing.line1,
        postalCode: billing.postalCode,
      };

  const garanti = garantiConfigFromEnv();
  const payByCard = field(form, "paymentMethod") === "credit_card" && garanti !== null;
  const installments = Math.max(1, Number.parseInt(field(form, "installments") || "1", 10) || 1);

  const cart = await getOrCreateCart(tenant.tenant.id, user?.id, sessionId);
  let result;
  try {
    result = await checkout({
      tenantId: tenant.tenant.id,
      cartId: cart.id,
      customerId: user?.id,
      email: field(form, "email"),
      phone: field(form, "phone"),
      fullName: field(form, "fullName"),
      invoiceType,
      companyName: field(form, "companyName"),
      taxOffice: field(form, "taxOffice"),
      taxNumber: field(form, "taxNumber"),
      nationalId: field(form, "nationalId"),
      billing,
      shipping,
      shipDifferent,
      notes: field(form, "notes"),
      acceptMarketing: field(form, "acceptMarketing") === "1",
      card: payByCard ? { installments } : undefined,
    });
  } catch {
    return NextResponse.redirect(publicRedirect("/odeme?hata=1", request), 303);
  }

  if (payByCard && garanti) {
    const callback = publicRedirect("/api/payments/garanti/callback", request).toString();
    const { action, fields } = buildOosPayForm(garanti, {
      orderId: result.order.orderNo,
      amount: Number(result.order.grandTotal),
      installment: installments,
      email: result.order.email,
      customerIp: clientIp(request.headers),
      successUrl: callback,
      errorUrl: callback,
    });
    return autoPostHtml(action, fields);
  }

  try {
    await sendOrderReceivedEmail({
      to: result.order.email,
      siteName: tenant.siteName,
      orderNo: result.order.orderNo,
      amount: result.order.grandTotal,
      ibanLines: (result.intent?.instructions ?? []).map((i) => `${i.bankName} ${i.iban}`),
    });
  } catch {
    /* sipariş oluştu; e-posta başarısız olsa da başarı sayfasına git */
  }
  return NextResponse.redirect(
    publicRedirect(`/odeme/basarili?order=${result.order.orderNo}`, request),
    303,
  );
}

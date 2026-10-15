import { NextResponse } from "next/server";
import { publicRedirect } from "@guntan/config";
import { getPaymentLinkByCode, startPaymentLinkAttempt, type PaymentLinkBilling } from "@guntan/db";
import { buildOosPayForm, garantiConfig, installmentOptions } from "@guntan/ecommerce";
import { autoPostHtml, clientIp } from "../../../../src/garanti-redirect";

export const dynamic = "force-dynamic";

function field(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}

/** Fatura bilgisi isteğe bağlıdır; kutu işaretliyse eksik ya da hatalı alan "invalid" döner. */
function parseBilling(form: FormData): PaymentLinkBilling | null | "invalid" {
  if (field(form, "addBilling") !== "1") return null;
  const corporate = field(form, "invoiceType") === "corporate";
  const city = field(form, "billingCity").slice(0, 64);
  const district = field(form, "billingDistrict").slice(0, 64);
  const line1 = field(form, "billingLine1").slice(0, 500);
  const postalCode = field(form, "billingPostalCode").replace(/\D/g, "").slice(0, 5);
  if (!city || !district || line1.length < 5) return "invalid";
  if (corporate) {
    const companyName = field(form, "companyName").slice(0, 255);
    const taxOffice = field(form, "taxOffice").slice(0, 128);
    const taxNumber = field(form, "taxNumber").replace(/\D/g, "");
    if (companyName.length < 2 || !taxOffice || !/^\d{10,11}$/.test(taxNumber)) return "invalid";
    return { invoiceType: "corporate", companyName, taxOffice, taxNumber, city, district, line1, postalCode: postalCode || undefined };
  }
  const nationalId = field(form, "nationalId").replace(/\D/g, "");
  if (nationalId && !/^[1-9]\d{10}$/.test(nationalId)) return "invalid";
  return { invoiceType: "individual", nationalId: nationalId || undefined, city, district, line1, postalCode: postalCode || undefined };
}

export async function POST(request: Request, ctx: { params: Promise<{ code: string }> }) {
  const { code } = await ctx.params;
  const back = (hata: string) => NextResponse.redirect(publicRedirect(`/tahsilat/${code}?hata=${hata}`, request), 303);
  const link = await getPaymentLinkByCode(code);
  if (!link || link.status !== "pending") return NextResponse.redirect(publicRedirect(`/tahsilat/${code}`, request), 303);

  const garanti = await garantiConfig();
  if (!garanti) return back("kapali");

  const form = await request.formData();
  if (field(form, "acceptPrivacy") !== "1" || field(form, "acceptDistanceSales") !== "1") return back("onay");
  const payerName = field(form, "fullName").slice(0, 191);
  const payerEmail = field(form, "email").slice(0, 191);
  const payerPhone = field(form, "phone").slice(0, 32);
  if (payerName.length < 3 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payerEmail) || payerPhone.replace(/\D/g, "").length < 10) {
    return back("bilgi");
  }
  const billing = parseBilling(form);
  if (billing === "invalid") return back("fatura");

  const requested = Math.max(1, Number.parseInt(field(form, "installments") || "1", 10) || 1);
  const option = installmentOptions(Number(link.amount), garanti).find((o) => o.count === requested);
  if (!option) return back("taksit");

  let orderId: string;
  try {
    orderId = await startPaymentLinkAttempt(code, {
      amount: option.total,
      installment: option.count,
      payerName,
      payerEmail,
      payerPhone,
      billing,
    });
  } catch {
    return NextResponse.redirect(publicRedirect(`/tahsilat/${code}`, request), 303);
  }

  const callback = publicRedirect("/api/payments/garanti/callback", request).toString();
  const { action, fields } = buildOosPayForm(garanti, {
    orderId,
    amount: option.total,
    installment: option.count,
    email: payerEmail,
    customerIp: clientIp(request.headers),
    successUrl: callback,
    errorUrl: callback,
  });
  return autoPostHtml(action, fields);
}

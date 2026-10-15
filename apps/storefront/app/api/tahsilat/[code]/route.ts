import { NextResponse } from "next/server";
import { publicRedirect } from "@guntan/config";
import { getPaymentLinkByCode, startPaymentLinkAttempt } from "@guntan/db";
import { buildOosPayForm, garantiConfig, installmentOptions } from "@guntan/ecommerce";
import { autoPostHtml, clientIp } from "../../../../src/garanti-redirect";

export const dynamic = "force-dynamic";

function field(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
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

  const requested = Math.max(1, Number.parseInt(field(form, "installments") || "1", 10) || 1);
  const option = installmentOptions(Number(link.amount), garanti).find((o) => o.count === requested);
  if (!option) return back("taksit");

  let orderId: string;
  try {
    orderId = await startPaymentLinkAttempt(code, { amount: option.total, installment: option.count, payerName, payerEmail, payerPhone });
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

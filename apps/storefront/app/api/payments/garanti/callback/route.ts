import { NextResponse } from "next/server";
import { publicRedirect } from "@guntan/config";
import { confirmPaymentLink, failPaymentLink, paymentLinkCodeFromOrderId } from "@guntan/db";
import { confirmCardPayment, failCardPayment, garantiConfigFromEnv, parseCallback } from "@guntan/ecommerce";

export const dynamic = "force-dynamic";

function fail(request: Request, reason: string, linkCode?: string | null) {
  const url = publicRedirect(linkCode ? `/tahsilat/${linkCode}` : "/odeme", request);
  url.searchParams.set("hata", "kart");
  url.searchParams.set("mesaj", reason.slice(0, 160));
  return NextResponse.redirect(url, 303);
}

export async function POST(request: Request) {
  const config = garantiConfigFromEnv();
  if (!config) return fail(request, "Kartla ödeme şu an kullanılamıyor.");

  const form = await request.formData();
  const data: Record<string, string> = {};
  for (const [k, v] of form.entries()) {
    if (typeof v === "string") data[k.toLowerCase()] = v;
  }

  const result = parseCallback(config, data);
  const linkCode = result.orderId ? paymentLinkCodeFromOrderId(result.orderId) : null;
  if (!result.ok) {
    console.warn("[garanti] ödeme başarısız", {
      orderId: result.orderId,
      reason: result.reason,
      detail: result.detail,
    });
    // Hash tutmuyorsa cevap bankadan gelmemiş olabilir; siparişe dokunma.
    if (result.orderId && result.verified) {
      if (linkCode) await failPaymentLink(result.orderId, `${result.reason} (${result.detail})`).catch(() => undefined);
      else await failCardPayment(result.orderId, result).catch(() => undefined);
    }
    return fail(request, result.reason, linkCode);
  }

  const payment = { amountKurus: result.amountKurus, authCode: result.authCode, hostRef: result.hostRef };
  try {
    if (linkCode) await confirmPaymentLink(result.orderId, payment);
    else await confirmCardPayment(result.orderId, payment);
  } catch (err) {
    console.error("[garanti] onaylı ödeme kayda işlenemedi", {
      orderId: result.orderId,
      amountKurus: result.amountKurus,
      error: err instanceof Error ? err.message : String(err),
    });
    return fail(
      request,
      `Ödeme bankadan onaylandı ancak ${linkCode ? "tahsilat" : "sipariş"} güncellenemedi. Lütfen ${result.orderId} numarasıyla bizimle iletişime geçin.`,
      linkCode,
    );
  }

  if (linkCode) {
    const ok = publicRedirect(`/tahsilat/${linkCode}`, request);
    ok.searchParams.set("durum", "odendi");
    return NextResponse.redirect(ok, 303);
  }
  const ok = publicRedirect("/odeme/basarili", request);
  ok.searchParams.set("order", result.orderId);
  return NextResponse.redirect(ok, 303);
}

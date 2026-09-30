import { NextResponse } from "next/server";
import { publicRedirect } from "@guntan/config";
import { confirmCardPayment, failCardPayment, garantiConfigFromEnv, parseCallback } from "@guntan/ecommerce";

export const dynamic = "force-dynamic";

function fail(request: Request, reason: string) {
  const url = publicRedirect("/odeme", request);
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
  if (!result.ok) {
    console.warn("[garanti] ödeme başarısız", {
      orderId: result.orderId,
      reason: result.reason,
      mdstatus: data.mdstatus,
      procreturncode: data.procreturncode,
    });
    // Hash tutmuyorsa cevap bankadan gelmemiş olabilir; siparişe dokunma.
    if (result.orderId && result.verified) {
      await failCardPayment(result.orderId).catch(() => undefined);
    }
    return fail(request, result.reason);
  }

  try {
    await confirmCardPayment(result.orderId, {
      amountKurus: result.amountKurus,
      authCode: result.authCode,
      hostRef: result.hostRef,
    });
  } catch (err) {
    console.error("[garanti] onaylı ödeme siparişe işlenemedi", {
      orderId: result.orderId,
      amountKurus: result.amountKurus,
      error: err instanceof Error ? err.message : String(err),
    });
    return fail(
      request,
      `Ödeme bankadan onaylandı ancak sipariş güncellenemedi. Lütfen ${result.orderId} numarasıyla bizimle iletişime geçin.`,
    );
  }

  const ok = publicRedirect("/odeme/basarili", request);
  ok.searchParams.set("order", result.orderId);
  return NextResponse.redirect(ok, 303);
}

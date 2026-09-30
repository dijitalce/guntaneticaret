import { NextResponse } from "next/server";
import { markMessage, verifyClick } from "@guntan/db";
import { publicRedirect } from "@guntan/config";

/** Kampanya bağlantı tıklaması: imzalı hedefe yönlendirir, imza tutmazsa ana sayfaya. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const id = url.searchParams.get("id") ?? "";
  const target = url.searchParams.get("u") ?? "";
  const sig = url.searchParams.get("s") ?? "";
  if (/^[a-f0-9-]{36}$/.test(id) && /^https?:\/\//.test(target) && verifyClick(id, target, sig)) {
    await markMessage(id, "click").catch(() => undefined);
    return NextResponse.redirect(target, 302);
  }
  return NextResponse.redirect(publicRedirect("/", request), 302);
}

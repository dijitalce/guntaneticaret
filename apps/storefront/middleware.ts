import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isReservedSlug } from "@guntan/config";

export function middleware(request: NextRequest) {
  const hostHeader = request.headers.get("host") ?? "";
  const host = (hostHeader.split(":")[0] ?? "").toLowerCase();

  // Klasörlü admin.* Node’a gelmez; gelirse ana site paneline yönlendir.
  if (host === "admin.guntanotoyedekparca.com" || host.startsWith("admin.")) {
    const store = process.env.STOREFRONT_URL ?? "https://guntanotoyedekparca.com";
    return NextResponse.redirect(new URL("/yonetim/login", store), 302);
  }

  const response = NextResponse.next();
  response.headers.set("x-request-host", host);

  const first = request.nextUrl.pathname.split("/").filter(Boolean)[0];
  if (first && !isReservedSlug(first) && first.length > 80) {
    return NextResponse.rewrite(new URL("/404", request.url));
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next|favicon.ico|placeholder-product.jpg|placeholder-product.svg|api/health|yonetim).*)"],
};

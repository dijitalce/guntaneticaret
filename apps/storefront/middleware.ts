import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isReservedSlug } from "@guntan/config";

function resolvePublicHost(request: NextRequest): string {
  const raw =
    request.headers.get("x-forwarded-host")?.split(",")[0]?.trim() ||
    request.headers.get("host") ||
    "";
  let host = (raw.split(":")[0] ?? "").toLowerCase();
  if (!host || host === "0.0.0.0" || host === "127.0.0.1") {
    try {
      host = new URL(process.env.STOREFRONT_URL ?? "https://guntanotoyedekparca.com").hostname;
    } catch {
      host = "guntanotoyedekparca.com";
    }
  }
  return host;
}

export function middleware(request: NextRequest) {
  const host = resolvePublicHost(request);

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

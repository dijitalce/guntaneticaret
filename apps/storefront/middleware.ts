import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isReservedSlug } from "@guntan/config";

export function middleware(request: NextRequest) {
  const host = request.headers.get("host") ?? "";
  const response = NextResponse.next();
  response.headers.set("x-request-host", host);

  const first = request.nextUrl.pathname.split("/").filter(Boolean)[0];
  if (first && !isReservedSlug(first) && first.length > 80) {
    return NextResponse.rewrite(new URL("/404", request.url));
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next|favicon.ico|placeholder-product.jpg|placeholder-product.svg|api/health).*)"],
};

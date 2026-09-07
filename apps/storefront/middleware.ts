import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isReservedSlug } from "@guntan/config";

export function middleware(request: NextRequest) {
  const host = (request.headers.get("host") ?? "").split(":")[0].toLowerCase();

  // Dual gateway çalışmıyorsa admin.* vitrine düşer → boş 404 yerine net uyarı.
  if (host === "admin.guntanotoyedekparca.com" || host.startsWith("admin.")) {
    return new NextResponse(
      `<!doctype html><html lang="tr"><meta charset="utf-8"/><title>Admin gateway yok</title>
<body style="font-family:system-ui;padding:2rem;max-width:40rem;line-height:1.5">
<h1>Admin paneli bu süreçte yok</h1>
<p>İstek vitrine düştü. Hostinger’da start dosyası/komutu şunu çalıştırmalı:</p>
<pre style="background:#f4f4f5;padding:0.75rem;overflow:auto">node scripts/hostinger-start.mjs</pre>
<p>veya <code>pnpm start</code> / storefront <code>start</code> (artık aynı gateway). Sonra <strong>Rebuild + Restart</strong>.</p>
</body></html>`,
      {
        status: 503,
        headers: {
          "content-type": "text/html; charset=utf-8",
          "x-guntan-app": "storefront-fallback",
          "x-request-host": host,
        },
      },
    );
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
  matcher: ["/((?!_next|favicon.ico|placeholder-product.jpg|placeholder-product.svg|api/health).*)"],
};

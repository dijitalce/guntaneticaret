function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Bankanın 3D sayfasına tarayıcıdan otomatik POST eden ara sayfa. */
export function autoPostHtml(action: string, fields: Record<string, string>): Response {
  const inputs = Object.entries(fields)
    .map(([k, v]) => `<input type="hidden" name="${esc(k)}" value="${esc(v)}">`)
    .join("");
  const html = `<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="robots" content="noindex"><title>Güvenli ödemeye yönlendiriliyorsunuz</title>
<style>body{font-family:system-ui,sans-serif;display:grid;place-items:center;min-height:100vh;margin:0;color:#222}main{text-align:center}button{margin-top:1rem;padding:.7rem 1.2rem;font-size:1rem}</style></head>
<body><main><p>Garanti BBVA güvenli ödeme sayfasına yönlendiriliyorsunuz…</p>
<form id="f" method="post" action="${esc(action)}">${inputs}<noscript><button type="submit">Devam et</button></noscript></form></main>
<script>document.getElementById("f").submit()</script></body></html>`;
  return new Response(html, {
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
  });
}

export function clientIp(headers: Headers): string {
  const raw =
    headers.get("cf-connecting-ip") ||
    headers.get("x-real-ip") ||
    headers.get("x-forwarded-for")?.split(",")[0] ||
    "";
  const ip = raw.trim();
  return /^[0-9a-fA-F:.]{3,45}$/.test(ip) ? ip : "127.0.0.1";
}

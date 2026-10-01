export type LiveCheck = { label: string; url: string; ok: boolean; status: string; ms: number; detail: string };

const TIMEOUT_MS = 25_000;

async function hit(url: string, method: "GET" | "HEAD" = "GET") {
  const started = Date.now();
  try {
    const res = await fetch(url, {
      method,
      cache: "no-store",
      redirect: "manual",
      headers: { "User-Agent": "GuntanSeoCheck/1.0" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const body = method === "GET" ? await res.text() : "";
    return { status: res.status, body, ms: Date.now() - started, error: "" };
  } catch (err) {
    const timeout = err instanceof Error && err.name === "TimeoutError";
    return { status: 0, body: "", ms: Date.now() - started, error: timeout ? "Zaman aşımı" : "Bağlantı hatası" };
  }
}

const count = (body: string, tag: string) => body.split(`<${tag}>`).length - 1;
const n = (v: number) => v.toLocaleString("tr-TR");

/** Canlı vitrine istek atar; arama motorlarının göreceği yanıtları özetler. */
export async function liveSeoCheck(site: string, sample: { product?: string; category?: string }): Promise<LiveCheck[]> {
  const out: LiveCheck[] = [];
  const push = (label: string, url: string, r: Awaited<ReturnType<typeof hit>>, ok: boolean, detail: string) =>
    out.push({ label, url, ok, status: r.error || String(r.status), ms: r.ms, detail });

  const indexUrl = `${site}/sitemap.xml`;
  const index = await hit(indexUrl);
  const files = [...index.body.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]!);
  push("Site haritası dizini", indexUrl, index, index.status === 200 && files.length > 0, index.status === 200 ? `${files.length} dosya` : "Dizin okunamadı");

  const productFiles = files.filter((f) => /\/urunler-\d+\.xml$/.test(f));
  const otherFiles = files.filter((f) => !productFiles.includes(f));
  const results = await Promise.all([
    ...otherFiles.map(async (url) => ({ url, r: await hit(url), head: false })),
    ...productFiles.map(async (url, i) => ({ url, r: await hit(url, i === 0 ? "GET" : "HEAD"), head: i > 0 })),
  ]);
  for (const { url, r, head } of results) {
    const name = url.split("/").pop() ?? url;
    const urls = count(r.body, "url");
    const ok = r.status === 200 && (head || urls > 0);
    push(`Harita: ${name}`, url, r, ok, r.status !== 200 ? "Açılmadı" : head ? "Erişilebilir" : `${n(urls)} adres`);
  }

  const robotsUrl = `${site}/robots.txt`;
  const robots = await hit(robotsUrl);
  const hasSitemap = robots.body.includes(indexUrl);
  push("robots.txt", robotsUrl, robots, robots.status === 200 && hasSitemap, hasSitemap ? "Site haritası bildirili" : "Sitemap satırı yok");

  const llmsUrl = `${site}/llms.txt`;
  const llms = await hit(llmsUrl);
  push("llms.txt (yapay zekâ özeti)", llmsUrl, llms, llms.status === 200, llms.status === 200 ? `${n(llms.body.length)} karakter` : "Açılmadı");

  const htmlMapUrl = `${site}/site-haritasi`;
  const htmlMap = await hit(htmlMapUrl);
  push("HTML site haritası", htmlMapUrl, htmlMap, htmlMap.status === 200, htmlMap.status === 200 ? "Yayında" : "Açılmadı");

  if (sample.product) {
    const url = `${site}/urun/${sample.product}`;
    const r = await hit(url);
    const jsonLd = r.body.includes('"@type":"Product"');
    const canonical = r.body.includes('rel="canonical"');
    const noindex = /<meta[^>]+name="robots"[^>]+noindex/i.test(r.body);
    const issues = [!jsonLd && "ürün verisi (JSON-LD) yok", !canonical && "canonical yok", noindex && "noindex var"].filter(Boolean);
    const detail = r.status !== 200 ? "Sayfa açılmadı" : issues.length ? issues.join(", ") : "Ürün verisi ve canonical var";
    push("Örnek ürün sayfası", url, r, r.status === 200 && issues.length === 0, detail);
  }
  if (sample.category) {
    const url = `${site}/kategori/${sample.category}`;
    const r = await hit(url);
    const noindex = /<meta[^>]+name="robots"[^>]+noindex/i.test(r.body);
    push("Örnek kategori sayfası", url, r, r.status === 200 && !noindex, r.status !== 200 ? "Sayfa açılmadı" : noindex ? "noindex var" : "Dizine eklenebilir");
  }

  const missingUrl = `${site}/urun/seo-kontrol-olmayan-urun`;
  const missing = await hit(missingUrl, "HEAD");
  push("Olmayan sayfa", missingUrl, missing, missing.status === 404, missing.status === 404 ? "Doğru: 404 dönüyor" : "404 dönmüyor (yumuşak 404)");

  return out;
}

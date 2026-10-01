import { tryGetTenant } from "../../src/tenant";
import { cachedPopularCategories, cachedVisibleBrands } from "../../src/cached-catalog";
import { sentenceCaseTr } from "../../src/format";
import { absoluteUrl, tenantNoIndex } from "../../src/seo";

export const revalidate = 3600;

const FEEDS: { flag: string; path: string; label: string }[] = [
  { flag: "merchantFeed", path: "/feeds/google.xml", label: "Google Merchant ürün beslemesi (RSS 2.0)" },
  { flag: "chatgptFeed", path: "/feeds/chatgpt.jsonl", label: "OpenAI ürün beslemesi (JSONL)" },
  { flag: "bingFeed", path: "/feeds/bing.xml", label: "Microsoft Merchant ürün beslemesi (RSS 2.0)" },
];

export async function GET() {
  const tenant = await tryGetTenant();
  if (!tenant || tenantNoIndex(tenant)) return new Response("Bulunamadı", { status: 404 });
  const host = tenant.tenant.canonicalHost;
  const url = (path: string) => absoluteUrl(host, path);
  const [brands, cats] = await Promise.all([cachedVisibleBrands(tenant.tenant.id), cachedPopularCategories(50)]);
  const social = (tenant.social ?? {}) as Record<string, string>;
  const feeds = FEEDS.filter((f) => social[f.flag] === "1");
  const summary =
    tenant.defaultMetaDescription && tenant.defaultMetaDescription.length >= 80
      ? tenant.defaultMetaDescription
      : `${tenant.siteName}, Türkiye'de araç marka ve modeline göre oto yedek parça satan online mağazadır. Fiyatlar KDV dahildir.`;

  const lines = [
    `# ${tenant.siteName}`,
    "",
    `> ${summary}`,
    "",
    "Oto yedek parça (fren, filtre, süspansiyon, debriyaj, motor, elektrik vb.) satışı yapılır. Her ürün sayfasında marka, ürün kodu, OEM numaraları, barkod, KDV dahil fiyat, stok durumu ve uyumlu araç listesi bulunur.",
    "",
    "## Ürün bulma",
    "",
    `- [Ürün araması](${url("/arama?q=")}): parça adı, ürün kodu veya OEM numarasıyla arama, örnek: ${url("/arama?q=fren+balatasi")}`,
    `- Araç markası sayfası: ${url("/{marka}")}, örnek: ${brands[0] ? url(`/${brands[0].slug}`) : url("/renault")}`,
    `- Araç modeli sayfası: ${url("/{marka}/{model}")}`,
    `- Kategori sayfası: ${url("/kategori/{kategori}")}`,
    `- Ürün sayfası: ${url("/urun/{urun}")}`,
    `- [Site haritası](${url("/sitemap.xml")}): tüm ürün, kategori, marka ve model adresleri`,
    ...feeds.map((f) => `- [${f.label}](${url(f.path)})`),
    "",
    "## Alışveriş koşulları",
    "",
    "- Fiyatlar Türk lirası ve KDV dahildir.",
    "- Ürünler sıfırdır.",
    "- Teslimattan itibaren 14 gün içinde iade hakkı vardır; ayrıntılar iade sayfasındadır.",
    "- Sipariş sonrası kargo takip bilgisi SMS ve e-posta ile iletilir.",
    "- Ödeme seçenekleri ödeme sayfasında listelenir.",
    "",
    "## Sayfalar",
    "",
    `- [İade ve değişim](${url("/sayfa/iade")})`,
    `- [Mesafeli satış sözleşmesi](${url("/sayfa/mesafeli-satis")})`,
    `- [Gizlilik](${url("/sayfa/gizlilik")})`,
    `- [Hakkımızda](${url("/sayfa/hakkimizda")})`,
    `- [İletişim](${url("/iletisim")})${tenant.phone ? `: ${tenant.phone}` : ""}`,
    "",
  ];
  if (cats.length) {
    lines.push("## Kategoriler", "", ...cats.filter((c) => !c.parentId).map((c) => `- [${sentenceCaseTr(c.name)}](${url(`/kategori/${c.slug}`)})`), "");
  }
  if (brands.length) {
    lines.push("## Araç markaları", "", ...brands.map((b) => `- [${b.name}](${url(`/${b.slug}`)})`), "");
  }

  return new Response(lines.join("\n"), {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" },
  });
}

import { latestBlogPosts } from "@guntan/db";
import { tryGetTenant } from "../../../src/tenant";
import { absoluteUrl, tenantNoIndex } from "../../../src/seo";
import { blogImageUrl } from "../../../src/blog";

function esc(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

export async function GET() {
  const tenant = await tryGetTenant();
  if (!tenant || tenantNoIndex(tenant)) return new Response("Bulunamadı", { status: 404 });
  const host = tenant.tenant.canonicalHost;
  const posts = (await latestBlogPosts(tenant.tenant.id, 30)).filter((p) => !p.noindex);
  const self = absoluteUrl(host, "/blog/rss.xml");
  const items = posts
    .map((p) => {
      const link = absoluteUrl(host, `/blog/${p.slug}`);
      const img = blogImageUrl(host, p.coverUrl);
      return [
        "<item>",
        `<title>${esc(p.title)}</title>`,
        `<link>${esc(link)}</link>`,
        `<guid isPermaLink="true">${esc(link)}</guid>`,
        p.publishedAt ? `<pubDate>${p.publishedAt.toUTCString()}</pubDate>` : "",
        p.category ? `<category>${esc(p.category.name)}</category>` : "",
        `<dc:creator>${esc(p.authorName || tenant.siteName)}</dc:creator>`,
        `<description>${esc(p.excerpt || p.metaDescription || p.title)}</description>`,
        img ? `<media:content url="${esc(img)}" medium="image"${p.coverAlt ? `><media:description>${esc(p.coverAlt)}</media:description></media:content>` : " />"}` : "",
        "</item>",
      ]
        .filter(Boolean)
        .join("");
    })
    .join("\n");
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:media="http://search.yahoo.com/mrss/">
<channel>
<title>${esc(`${tenant.siteName} Blog`)}</title>
<link>${esc(absoluteUrl(host, "/blog"))}</link>
<atom:link href="${esc(self)}" rel="self" type="application/rss+xml" />
<description>${esc(`${tenant.siteName}: oto yedek parça rehberleri, bakım ve arıza ipuçları`)}</description>
<language>tr-TR</language>
${posts[0]?.publishedAt ? `<lastBuildDate>${posts[0].publishedAt.toUTCString()}</lastBuildDate>` : ""}
${items}
</channel>
</rss>
`;
  return new Response(xml, { headers: { "Content-Type": "application/rss+xml; charset=utf-8", "Cache-Control": "public, max-age=900, s-maxage=900" } });
}

/** Blog gövdesi için izinli HTML; yönetici editöründen gelir ama yine de temizlenir. */

const DROP_WITH_CONTENT = /<(script|style|noscript|object|embed|svg|math|template|form|textarea|select|button|head|title)\b[\s\S]*?<\/\1\s*>/gi;
const TAG_RE = /<!--[\s\S]*?-->|<\/?([a-zA-Z][a-zA-Z0-9]*)\b((?:[^>"']|"[^"]*"|'[^']*')*)>/g;
const ATTR_RE = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*(?:=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;

const VOID = new Set(["br", "hr", "img"]);
const ALLOWED: Record<string, string[]> = {
  p: [],
  br: [],
  hr: [],
  h2: ["id"],
  h3: ["id"],
  h4: ["id"],
  strong: [],
  b: [],
  em: [],
  i: [],
  u: [],
  s: [],
  mark: [],
  sub: [],
  sup: [],
  small: [],
  code: [],
  pre: [],
  blockquote: [],
  ul: [],
  ol: ["start"],
  li: [],
  a: ["href", "title", "target", "rel"],
  img: ["src", "alt", "title", "width", "height"],
  figure: [],
  figcaption: [],
  table: [],
  caption: [],
  thead: [],
  tbody: [],
  tfoot: [],
  tr: [],
  th: ["colspan", "rowspan", "scope"],
  td: ["colspan", "rowspan"],
  iframe: ["src", "title", "allowfullscreen"],
  div: [],
};
/** Sayfada tek h1 başlık olur; gövdedeki h1 h2'ye, h5/h6 h4'e iner. */
const RENAME: Record<string, string> = { h1: "h2", h5: "h4", h6: "h4", span: "", font: "", section: "div", article: "div" };
const EMBED_RE = /^https:\/\/(www\.)?(youtube(-nocookie)?\.com\/embed\/|player\.vimeo\.com\/video\/)[\w-]+/i;

function escAttr(v: string) {
  return v.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function decodeEntities(v: string) {
  return v
    .replace(/&#x([0-9a-f]+);?/gi, (_, h: string) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);?/g, (_, d: string) => String.fromCodePoint(Number(d)))
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&nbsp;", " ")
    .replaceAll("&amp;", "&");
}

function safeUrl(raw: string, kind: "href" | "src"): string | null {
  const v = decodeEntities(raw).trim().replace(/[\u0000-\u001f\u007f\s]+/g, (m) => (m.trim() ? "" : m === " " ? "%20" : ""));
  if (kind === "href") return /^(https?:\/\/|mailto:|tel:|\/(?!\/)|#)/i.test(v) ? v : null;
  return /^(https?:\/\/|\/(?!\/))/i.test(v) ? v : null;
}

function cleanAttrs(tag: string, raw: string): string {
  const allowed = ALLOWED[tag] ?? [];
  if (!allowed.length || !raw.trim()) return "";
  const out: Record<string, string> = {};
  for (const m of raw.matchAll(ATTR_RE)) {
    const name = m[1]!.toLowerCase();
    if (!allowed.includes(name)) continue;
    const value = m[2] ?? m[3] ?? m[4] ?? "";
    if (name === "href") {
      const u = safeUrl(value, "href");
      if (u) out.href = u;
    } else if (name === "src") {
      const u = safeUrl(value, "src");
      if (u && (tag !== "iframe" || EMBED_RE.test(u))) out.src = u;
    } else if (name === "target") {
      if (value === "_blank") out.target = "_blank";
    } else if (name === "rel") {
      const rel = value.split(/\s+/).filter((r) => ["nofollow", "sponsored", "ugc", "noopener", "noreferrer"].includes(r));
      if (rel.length) out.rel = rel.join(" ");
    } else if (name === "width" || name === "height" || name === "colspan" || name === "rowspan" || name === "start") {
      const n = parseInt(value, 10);
      if (Number.isFinite(n) && n > 0 && n < 5000) out[name] = String(n);
    } else if (name === "allowfullscreen") {
      out.allowfullscreen = "";
    } else if (name === "scope") {
      if (value === "col" || value === "row") out.scope = value;
    } else if (name === "id") {
      const id = value.replace(/[^a-z0-9-]/gi, "").slice(0, 80);
      if (id) out.id = id;
    } else {
      out[name] = decodeEntities(value).slice(0, 500);
    }
  }
  if (tag === "iframe" && !out.src) return "\u0000";
  if (out.target === "_blank") out.rel = [...new Set([...(out.rel ?? "").split(" ").filter(Boolean), "noopener"])].join(" ");
  return Object.entries(out)
    .map(([k, v]) => (v === "" && k === "allowfullscreen" ? ` ${k}` : ` ${k}="${escAttr(v)}"`))
    .join("");
}

/** İzin listesi dışındaki etiket ve öznitelikleri atar; tehlikeli içerikleri (script vb.) tamamen siler. */
export function sanitizeBlogHtml(input: string): string {
  let html = (input ?? "").replace(/\r\n/g, "\n");
  if (!/<[a-z][\s\S]*>/i.test(html)) return plainToHtml(html);
  html = html.replace(DROP_WITH_CONTENT, "");
  const stack: string[] = [];
  let out = "";
  let last = 0;
  let skipIframe = 0;
  for (const m of html.matchAll(TAG_RE)) {
    const text = html.slice(last, m.index);
    if (!skipIframe) out += text.replaceAll("<", "&lt;");
    last = m.index! + m[0].length;
    if (!m[1]) continue; // yorum
    const closing = m[0].startsWith("</");
    let tag = m[1].toLowerCase();
    if (tag in RENAME) tag = RENAME[tag]!;
    if (!tag || !(tag in ALLOWED)) continue;
    if (closing) {
      if (tag === "iframe" && skipIframe) {
        skipIframe--;
        continue;
      }
      const at = stack.lastIndexOf(tag);
      if (at < 0) continue;
      while (stack.length > at) out += `</${stack.pop()}>`;
      continue;
    }
    const attrs = cleanAttrs(tag, m[2] ?? "");
    if (attrs === "\u0000") {
      if (tag === "iframe") skipIframe++;
      continue;
    }
    if (tag === "iframe") {
      out += `<iframe${attrs} loading="lazy" referrerpolicy="strict-origin-when-cross-origin"></iframe>`;
      skipIframe++;
      continue;
    }
    if (tag === "img" && !/ src=/.test(attrs)) continue;
    if (tag === "a" && !/ href=/.test(attrs)) continue;
    out += `<${tag}${attrs}>`;
    if (!VOID.has(tag) && !m[0].endsWith("/>")) stack.push(tag);
  }
  if (!skipIframe) out += html.slice(last).replaceAll("<", "&lt;");
  while (stack.length) out += `</${stack.pop()}>`;
  return out
    .replace(/<(p|h2|h3|h4|li|strong|em)>\s*(<br>)?\s*<\/\1>/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function escText(v: string) {
  return v.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

/** Düz metin gövde: boş satır paragraf, "## " başlık. */
function plainToHtml(text: string): string {
  return text
    .split(/\n{2,}/)
    .map((b) => b.trim())
    .filter(Boolean)
    .map((b) => {
      const h = /^(#{2,4})\s+(.+)$/.exec(b);
      if (h) return `<h${h[1]!.length}>${escText(h[2]!)}</h${h[1]!.length}>`;
      return `<p>${escText(b).replace(/\n/g, "<br>")}</p>`;
    })
    .join("\n");
}

export function blogSlug(value: string): string {
  return value
    .toLocaleLowerCase("tr-TR")
    .replaceAll("ı", "i")
    .replaceAll("ğ", "g")
    .replaceAll("ü", "u")
    .replaceAll("ş", "s")
    .replaceAll("ö", "o")
    .replaceAll("ç", "c")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 180);
}

export function blogPlainText(html: string): string {
  return decodeEntities(
    html
      .replace(/<(br|\/p|\/h[1-6]|\/li|\/tr|\/blockquote|\/figcaption)[^>]*>/gi, " ")
      .replace(/<[^>]+>/g, ""),
  )
    .replace(/\s+/g, " ")
    .trim();
}

export function blogWordCount(html: string): number {
  const text = blogPlainText(html);
  return text ? text.split(" ").length : 0;
}

/** Türkçe okuma hızı ~200 kelime/dk. */
export function blogReadingMinutes(words: number): number {
  return Math.max(1, Math.round(words / 200));
}

export type BlogTocItem = { id: string; text: string; level: 2 | 3 };

/** Vitrin için: başlıklara çapa kimliği, görsellere lazy-load, tablolara kaydırma sarmalayıcısı. */
export function prepareBlogHtml(html: string, opts: { siteHost?: string } = {}): { html: string; toc: BlogTocItem[] } {
  const toc: BlogTocItem[] = [];
  const used = new Set<string>();
  let imgIndex = 0;
  const host = (opts.siteHost ?? "").replace(/^https?:\/\//, "").replace(/\/.*$/, "").toLowerCase();
  const out = html
    .replace(/<(h[23])((?:\s[^>]*)?)>([\s\S]*?)<\/\1>/g, (_all, tag: string, attrs: string, inner: string) => {
      const text = blogPlainText(inner);
      const existing = /\sid="([^"]+)"/.exec(attrs)?.[1];
      let id = existing || blogSlug(text) || `bolum-${toc.length + 1}`;
      if (used.has(id)) {
        let n = 2;
        while (used.has(`${id}-${n}`)) n++;
        id = `${id}-${n}`;
      }
      used.add(id);
      if (text) toc.push({ id, text, level: tag === "h2" ? 2 : 3 });
      return `<${tag} id="${id}">${inner}</${tag}>`;
    })
    .replace(/<img\b([^>]*)>/g, (_all, attrs: string) => {
      imgIndex++;
      const extra = imgIndex === 1 ? ' decoding="async"' : ' loading="lazy" decoding="async"';
      return `<img${attrs}${extra}>`;
    })
    .replace(/<a\b([^>]*)\shref="(https?:\/\/[^"]+)"([^>]*)>/g, (all, pre: string, href: string, post: string) => {
      // Dış bağlantılar yeni sekmede açılır; site içi tam adresler olduğu gibi kalır.
      try {
        const h = new URL(href).hostname.toLowerCase();
        if (host && (h === host || h === `www.${host}` || `www.${h}` === host)) return all;
      } catch {
        return all;
      }
      const attrs = `${pre}${post}`;
      const target = /\starget=/.test(attrs) ? "" : ' target="_blank"';
      const rel = /\srel="/.test(attrs) ? "" : ' rel="noopener"';
      return `<a${pre} href="${href}"${post}${target}${rel}>`;
    })
    .replace(/<table>/g, '<div class="blog-table"><table>')
    .replace(/<\/table>/g, "</table></div>")
    .replace(/<iframe\b/g, '<div class="blog-embed"><iframe')
    .replace(/<\/iframe>/g, "</iframe></div>");
  return { html: out, toc };
}

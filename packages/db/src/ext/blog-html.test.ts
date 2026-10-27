import { describe, expect, it } from "vitest";
import { blogReadingMinutes, blogSlug, blogWordCount, prepareBlogHtml, sanitizeBlogHtml } from "./blog-html";

describe("sanitizeBlogHtml", () => {
  it("removes scripts, event handlers and javascript: urls", () => {
    const out = sanitizeBlogHtml(`<p onclick="x()">Merhaba<script>alert(1)</script></p><a href="javascript:alert(1)">x</a><img src="x" onerror="y">`);
    expect(out).toBe("<p>Merhaba</p>x");
  });

  it("keeps allowed structure and safe links", () => {
    const out = sanitizeBlogHtml(`<h2 style="color:red">Başlık</h2><p><strong>Kalın</strong> <a href="/kategori/fren" target="_blank">fren</a></p><ul><li>a</li></ul>`);
    expect(out).toBe(`<h2>Başlık</h2><p><strong>Kalın</strong> <a href="/kategori/fren" target="_blank" rel="noopener">fren</a></p><ul><li>a</li></ul>`);
  });

  it("demotes h1 to h2, unwraps spans and closes open tags", () => {
    expect(sanitizeBlogHtml(`<h1>Ana</h1><p><span>metin<em>eğik`)).toBe("<h2>Ana</h2><p>metin<em>eğik</em></p>");
  });

  it("allows only youtube/vimeo iframes", () => {
    expect(sanitizeBlogHtml(`<iframe src="https://evil.com/x"></iframe><p>a</p>`)).toBe("<p>a</p>");
    expect(sanitizeBlogHtml(`<iframe src="https://www.youtube-nocookie.com/embed/abcdefghijk" allowfullscreen></iframe>`)).toContain(
      `src="https://www.youtube-nocookie.com/embed/abcdefghijk"`,
    );
  });

  it("converts plain text with blank lines into paragraphs", () => {
    expect(sanitizeBlogHtml("## Giriş\n\nBirinci & < 2\nikinci")).toBe("<h2>Giriş</h2>\n<p>Birinci &amp; &lt; 2<br>ikinci</p>");
  });
});

describe("prepareBlogHtml", () => {
  it("adds unique heading ids and builds the table of contents", () => {
    const { html, toc } = prepareBlogHtml(`<h2>Fren Balatası</h2><p>a</p><h3>Belirtiler</h3><h2>Fren Balatası</h2>`);
    expect(toc).toEqual([
      { id: "fren-balatasi", text: "Fren Balatası", level: 2 },
      { id: "belirtiler", text: "Belirtiler", level: 3 },
      { id: "fren-balatasi-2", text: "Fren Balatası", level: 2 },
    ]);
    expect(html).toContain(`<h2 id="fren-balatasi-2">`);
  });

  it("lazy-loads images after the first and opens external links in a new tab", () => {
    const { html } = prepareBlogHtml(`<img src="/a.jpg"><img src="/b.jpg"><a href="https://ornek.com">o</a><a href="https://guntan.com/x">i</a>`, { siteHost: "guntan.com" });
    expect(html).toContain(`<img src="/a.jpg" decoding="async">`);
    expect(html).toContain(`<img src="/b.jpg" loading="lazy" decoding="async">`);
    expect(html).toContain(`<a href="https://ornek.com" target="_blank" rel="noopener">`);
    expect(html).toContain(`<a href="https://guntan.com/x">`);
  });
});

describe("helpers", () => {
  it("slugifies Turkish text", () => {
    expect(blogSlug("Şanzıman Yağı Ne Zaman Değişir?")).toBe("sanziman-yagi-ne-zaman-degisir");
  });
  it("counts words and reading time", () => {
    expect(blogWordCount("<p>bir iki</p><p>üç</p>")).toBe(3);
    expect(blogReadingMinutes(1000)).toBe(5);
    expect(blogReadingMinutes(10)).toBe(1);
  });
});

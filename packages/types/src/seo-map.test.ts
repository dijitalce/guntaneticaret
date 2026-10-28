import { describe, expect, it } from "vitest";
import { SEO_BLOG_TOPICS, SEO_CATEGORIES, seoCategory, seoCategoryParentSlug, seoTargetCategorySlug } from "./seo-map";

describe("SEO haritası", () => {
  it("97 kategori kaydı ve 48 blog konusu içerir", () => {
    expect(Object.keys(SEO_CATEGORIES)).toHaveLength(97);
    expect(SEO_BLOG_TOPICS).toHaveLength(48);
  });

  it("alt kategoriler var olan bir üst gruba bağlanır", () => {
    for (const entry of Object.values(SEO_CATEGORIES)) {
      if (entry.parentId) expect(seoCategoryParentSlug(entry)).toBeTruthy();
    }
  });

  it("blog yazıları benzersiz ve ilgili yazı kimlikleri geçerli", () => {
    const ids = new Set(SEO_BLOG_TOPICS.map((t) => t.id));
    expect(new Set(SEO_BLOG_TOPICS.map((t) => t.slug)).size).toBe(48);
    for (const t of SEO_BLOG_TOPICS) for (const r of t.related) expect(ids.has(r)).toBe(true);
  });

  it("slug araması prototip anahtarlarını görmez", () => {
    expect(seoCategory("constructor")).toBeUndefined();
    expect(seoCategory("fren-balatasi")?.name).toBe("Fren Balataları");
    expect(seoTargetCategorySlug(SEO_BLOG_TOPICS.find((t) => t.id === "B05")!)).toBe("fren-balatasi");
  });
});

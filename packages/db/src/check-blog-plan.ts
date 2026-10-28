import { SEO_BLOG_TOPICS } from "@guntan/types";
import { PLAN_ARTICLES } from "./content/blog-plan-articles";
import { planBody } from "./ext/blog-plan";
import { blogSlug } from "./ext/blog-html";

/** Yönetim editörünün SEO kontrollerini (apps/admin/src/blog-editor.tsx seoChecks) taklit eder: `pnpm --filter @guntan/db exec tsx src/check-blog-plan.ts` */
let bad = 0;
for (const t of SEO_BLOG_TOPICS) {
  const a = PLAN_ARTICLES[t.id];
  if (!a) {
    console.log(`${t.id} yazılmadı`);
    continue;
  }
  const html = planBody(t);
  const text = html.replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
  const lower = text.toLocaleLowerCase("tr-TR");
  const kw = a.kw.toLocaleLowerCase("tr-TR");
  const words = text.split(" ").length;
  const count = lower.split(kw).length - 1;
  const density = (count * kw.split(" ").length * 100) / words;
  const title = (a.metaTitle || t.title).trim();
  const fails: string[] = [];
  if (words < 600) fails.push(`kelime ${words}`);
  if (!title.toLocaleLowerCase("tr-TR").includes(kw)) fails.push("başlıkta yok");
  if (title.length < 30 || title.length > 60) fails.push(`başlık ${title.length}`);
  if (a.meta.length < 120 || a.meta.length > 160) fails.push(`meta ${a.meta.length}`);
  if (!a.meta.toLocaleLowerCase("tr-TR").includes(kw)) fails.push("metada yok");
  if (!t.slug.includes(blogSlug(kw))) fails.push("slug'da yok");
  if (!lower.split(" ").slice(0, 120).join(" ").includes(kw)) fails.push("ilk paragrafta yok");
  if (!a.sections.some(([h]) => h.toLocaleLowerCase("tr-TR").includes(kw))) fails.push("H2'de yok");
  if (density < 0.5 || density > 2.5) fails.push(`yoğunluk ${density.toFixed(2)} (${count})`);
  if ((html.match(/<h2[\s>]/gi) ?? []).length < 2) fails.push("H2<2");
  if ((html.match(/href="\//gi) ?? []).length < 2) fails.push("iç bağlantı<2");
  if (fails.length) bad++;
  console.log(`${t.id} ${fails.length ? "✗ " + fails.join(", ") : `✓ ${words} kelime, yoğunluk ${density.toFixed(2)}`}`);
}
console.log(bad ? `${bad} yazıda sorun var` : "Yazılan tüm konular geçti");
process.exit(bad ? 1 : 0);

import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { resolveTenantByHost } from "@guntan/tenant";
import { tenantNoIndex } from "../src/seo";

// Sepet/ödeme/hesap ve /yonetim engellenmez: Google noindex başlığını görebilsin diye taranabilir kalmalı.
const PRIVATE_PATHS = ["/api/"];

/** Yapay zekâ arama/asistan tarayıcıları: ürünlerin ChatGPT, Perplexity, Claude, Gemini, Copilot yanıtlarında yer alması için açık. */
const AI_CRAWLERS = [
  "OAI-SearchBot",
  "ChatGPT-User",
  "GPTBot",
  "PerplexityBot",
  "Perplexity-User",
  "ClaudeBot",
  "Claude-SearchBot",
  "Claude-User",
  "Google-Extended",
  "Applebot-Extended",
  "Bingbot",
];

export default async function robots(): Promise<MetadataRoute.Robots> {
  const host = (await headers()).get("x-request-host") ?? (await headers()).get("host") ?? "localhost";
  const tenant = await resolveTenantByHost(host);
  const base = `https://${tenant?.tenant.canonicalHost ?? host}`;
  if (tenant && tenantNoIndex(tenant)) {
    return { rules: { userAgent: "*", disallow: "/" } };
  }
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: PRIVATE_PATHS },
      { userAgent: AI_CRAWLERS, allow: "/", disallow: PRIVATE_PATHS },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}

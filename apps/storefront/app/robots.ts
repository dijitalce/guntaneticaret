import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { resolveTenantByHost } from "@guntan/tenant";
import { tenantNoIndex } from "../src/seo";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const host = (await headers()).get("x-request-host") ?? (await headers()).get("host") ?? "localhost";
  const tenant = await resolveTenantByHost(host);
  const base = `https://${tenant?.tenant.canonicalHost ?? host}`;
  if (tenant && tenantNoIndex(tenant)) {
    return { rules: { userAgent: "*", disallow: "/" } };
  }
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/sepet", "/odeme", "/hesabim"] },
    sitemap: `${base}/sitemap.xml`,
  };
}

import { sitemapIndexResponse } from "../../src/sitemaps";

export const dynamic = "force-dynamic";

export function GET() {
  return sitemapIndexResponse();
}

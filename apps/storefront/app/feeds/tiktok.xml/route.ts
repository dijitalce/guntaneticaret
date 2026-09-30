import { productFeedResponse } from "../../../src/product-feed";

export const dynamic = "force-dynamic";

export function GET() {
  return productFeedResponse("tiktok");
}

import { sitemapFileResponse } from "../../../src/sitemaps";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  return sitemapFileResponse(file);
}

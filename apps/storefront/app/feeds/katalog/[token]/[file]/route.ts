import { catalogExportResponse } from "../../../../../src/catalog-export";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ token: string; file: string }> }) {
  const { token, file } = await params;
  return catalogExportResponse(token, file);
}

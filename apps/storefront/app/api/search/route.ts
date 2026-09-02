import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { searchCatalog } from "@guntan/catalog";
import { resolveTenantByHost } from "@guntan/tenant";
import { searchProducts } from "@guntan/search";

export async function GET(request: Request) {
  const host = (await headers()).get("x-request-host") ?? (await headers()).get("host") ?? "";
  const tenant = await resolveTenantByHost(host);
  if (!tenant) return NextResponse.json({ hits: [] });
  const q = new URL(request.url).searchParams.get("q") ?? "";
  if (q.length < 2) return NextResponse.json({ hits: [] });
  const indexed = await searchProducts(tenant.tenant.id, q, 8).catch(() => []);
  if (indexed.length > 0) return NextResponse.json({ hits: indexed });
  const hits = await searchCatalog(tenant.tenant.id, q, 8);
  return NextResponse.json({ hits });
}

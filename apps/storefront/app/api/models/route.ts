import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { getBrandBySlug, listModelsForBrand } from "@guntan/catalog";
import { resolveTenantByHost } from "@guntan/tenant";

export async function GET(request: Request) {
  const host = (await headers()).get("x-request-host") ?? (await headers()).get("host") ?? "";
  const tenant = await resolveTenantByHost(host);
  if (!tenant) return NextResponse.json({ models: [] });
  const brand = new URL(request.url).searchParams.get("brand") ?? "";
  if (!brand) return NextResponse.json({ models: [] });
  const row = await getBrandBySlug(tenant.tenant.id, brand);
  if (!row) return NextResponse.json({ models: [] });
  const models = await listModelsForBrand(tenant.tenant.id, row.id);
  return NextResponse.json({ models });
}

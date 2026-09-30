import { timingSafeEqual } from "node:crypto";
import { catalogExportPlan, getCatalogExport, tenantSeesAllCatalog } from "@guntan/db";
import { catalogIndexXml, catalogPartStream } from "./catalog-export-xml";
import { requestHost, tenantFromRequest } from "./request-tenant";

function tokenMatches(expected: string | null, given: string) {
  if (!expected) return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(given);
  return a.length === b.length && timingSafeEqual(a, b);
}

const HEADERS = {
  "Content-Type": "application/xml; charset=utf-8",
  "Cache-Control": "public, max-age=600",
  "X-Robots-Tag": "noindex",
};

/** Birleşik ürün kataloğunu 40 MB altı parçalar halinde dışarı verir; anahtar panelden üretilir. */
export async function catalogExportResponse(token: string, file: string) {
  const tenant = await tenantFromRequest();
  if (!tenant) return new Response("Site bulunamadı", { status: 404 });
  const settings = await getCatalogExport(tenant.tenant.id);
  if (!tokenMatches(settings.token, token)) return new Response("Bağlantı geçersiz veya paylaşım kapatılmış.", { status: 404 });

  const host = (await requestHost()).split(":")[0];
  const base = `https://${host}`;
  const seesAll = await tenantSeesAllCatalog(tenant.tenant.id);
  const plan = await catalogExportPlan(tenant.tenant.id, seesAll);

  if (file === "index.xml") {
    return new Response(catalogIndexXml({ siteName: tenant.siteName, base, token, products: plan.products, parts: plan.parts }), { headers: HEADERS });
  }

  const match = /^parca-(\d+)\.xml$/.exec(file);
  const part = match ? plan.parts.find((p) => p.index === Number(match[1])) : undefined;
  if (!part) return new Response("Parça bulunamadı.", { status: 404 });

  const stream = catalogPartStream({ tenantId: tenant.tenant.id, seesAll, siteName: tenant.siteName, base, part, partCount: plan.parts.length });
  return new Response(stream, {
    headers: { ...HEADERS, "Content-Disposition": `inline; filename="katalog-parca-${part.index}.xml"` },
  });
}

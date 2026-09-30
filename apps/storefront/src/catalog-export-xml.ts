import { catalogExportPage, type ExportPart, type ExportProduct } from "@guntan/db";

const PAGE = 1000;

function xml(value: string) {
  return value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function cdata(value: string) {
  return `<![CDATA[${value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").replaceAll("]]>", "]]]]><![CDATA[>")}]]>`;
}

function absolute(url: string, base: string) {
  return /^https?:\/\//.test(url) ? url : `${base}${url.startsWith("/") ? "" : "/"}${url}`;
}

function itemXml(p: ExportProduct, base: string) {
  const price = Number(p.price);
  const compare = Number(p.compare_at_price ?? 0);
  const tag = (name: string, value: string | null | undefined) => (value ? `<${name}>${xml(value)}</${name}>` : "");
  return [
    "<urun>",
    tag("id", p.id),
    tag("stok_kodu", p.sku),
    tag("barkod", p.barcode),
    tag("ad", p.name),
    tag("marka", p.brand),
    tag("kategori", p.category),
    `<fiyat para_birimi="TRY" kdv_dahil="evet">${price.toFixed(2)}</fiyat>`,
    compare > price ? `<liste_fiyati para_birimi="TRY">${compare.toFixed(2)}</liste_fiyati>` : "",
    `<kdv_orani>${Number(p.vat_rate)}</kdv_orani>`,
    `<stok>${p.stock}</stok>`,
    `<durum>${p.stock > 0 ? "stokta" : "tukendi"}</durum>`,
    tag("url", `${base}/urun/${p.slug}`),
    p.images.length ? `<gorseller>${p.images.map((u) => `<gorsel>${xml(absolute(u, base))}</gorsel>`).join("")}</gorseller>` : "",
    p.oems.length ? `<oem_kodlari>${p.oems.map((o) => `<oem>${xml(o)}</oem>`).join("")}</oem_kodlari>` : "",
    p.description ? `<aciklama>${cdata(p.description)}</aciklama>` : "",
    "</urun>\n",
  ].join("");
}

type PartOpts = { tenantId: string; seesAll: boolean; siteName: string; base: string; part: ExportPart; partCount: number };

export function catalogIndexXml(o: { siteName: string; base: string; token: string; products: number; parts: ExportPart[] }) {
  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<katalog_parcalari site="${xml(o.siteName)}" olusturma="${new Date().toISOString()}" toplam_urun="${o.products}" parca_sayisi="${o.parts.length}">`,
    ...o.parts.map((p) => `<parca no="${p.index}" urun_sayisi="${p.products}"><url>${xml(`${o.base}/feeds/katalog/${o.token}/parca-${p.index}.xml`)}</url></parca>`),
    `</katalog_parcalari>`,
  ].join("\n");
}

export function catalogPartStream(o: PartOpts) {
  const encoder = new TextEncoder();
  return new ReadableStream<Uint8Array>({
    async start(controller) {
      controller.enqueue(
        encoder.encode(
          `<?xml version="1.0" encoding="UTF-8"?>\n<katalog site="${xml(o.siteName)}" olusturma="${new Date().toISOString()}" parca="${o.part.index}" parca_sayisi="${o.partCount}">\n`,
        ),
      );
      let afterId = o.part.afterId;
      try {
        for (;;) {
          const page = await catalogExportPage({ tenantId: o.tenantId, seesAll: o.seesAll, afterId, untilId: o.part.lastId, limit: PAGE });
          if (!page.length) break;
          controller.enqueue(encoder.encode(page.map((p) => itemXml(p, o.base)).join("")));
          afterId = page[page.length - 1]!.id;
          if (page.length < PAGE) break;
        }
      } catch (err) {
        // Eksik parça geçerli XML gibi görünmesin; indirme hata ile kesilir.
        controller.error(err);
        return;
      }
      controller.enqueue(encoder.encode("</katalog>\n"));
      controller.close();
    },
  });
}

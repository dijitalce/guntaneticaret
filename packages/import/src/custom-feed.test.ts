import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { assertSafeFeedUrl, feedConfigFromRow, feedRowMapping, guessMapping, probeFeed, mapCustomItem, parseFeedFile, parseNumber, parseStock } from "./custom-feed";

describe("custom feed parsing", () => {
  it("reads items with attributes, CDATA and windows-1254 encoding", async () => {
    const dir = await mkdtemp(join(tmpdir(), "feed-"));
    const path = join(dir, "f.xml");
    const xml = `<?xml version="1.0" encoding="windows-1254"?>
<Urunler><Urun id="17"><StokKodu>AB-1</StokKodu><UrunAdi><![CDATA[Fren Balatası Ön]]></UrunAdi><Fiyat para="USD">1.250,50</Fiyat>
<Resimler><Resim>https://x/1.jpg</Resim><Resim>https://x/2.jpg</Resim></Resimler></Urun>
<Urun id="18"><StokKodu>AB-2</StokKodu><UrunAdi>Şanzıman Yağı</UrunAdi><Fiyat para="TL">99.9</Fiyat></Urun></Urunler>`;
    await writeFile(path, Buffer.from(new Uint8Array([...xml].map((c) => ({ ş: 0xfe, ı: 0xfd, Ş: 0xde, ğ: 0xf0 } as Record<string, number>)[c] ?? c.charCodeAt(0)))));
    const items = await parseFeedFile(path, "Urun");
    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({ "@id": "17", StokKodu: "AB-1", UrunAdi: "Fren Balatası Ön", Fiyat: "1.250,50", "Fiyat.@para": "USD", "Resimler.Resim": "https://x/1.jpg" });
    expect(items[1]!.UrunAdi).toBe("Şanzıman Yağı");
  });

  it("probes a feed and detects the item tag", async () => {
    const xml = `<?xml version="1.0"?><root><info><count>3</count></info><products>${[1, 2, 3]
      .map((i) => `<product><code>P${i}</code><name>Ürün ${i}</name><price>${i}0.5</price><images><img>a</img><img>b</img><img>c</img></images></product>`)
      .join("")}</products></root>`;
    const original = globalThis.fetch;
    globalThis.fetch = (async () => new Response(xml, { status: 200 })) as typeof fetch;
    try {
      const probe = await probeFeed({ ...feedConfigFromRow("https://example.com/f.xml", {}) }, { username: "", password: "", headerName: "", headerValue: "" });
      expect(probe.ok).toBe(true);
      expect(probe.itemTag).toBe("product");
      expect(probe.itemCount).toBe(3);
      expect(probe.fields?.map((f) => f.path)).toEqual(["code", "name", "price", "images.img"]);
    } finally {
      globalThis.fetch = original;
    }
  });

  it("rejects internal addresses", () => {
    expect(() => assertSafeFeedUrl("http://127.0.0.1/x.xml")).toThrow();
    expect(() => assertSafeFeedUrl("http://192.168.1.5/x.xml")).toThrow();
    expect(() => assertSafeFeedUrl("ftp://example.com/x.xml")).toThrow();
    expect(assertSafeFeedUrl("https://tedarikci.com/x.xml").hostname).toBe("tedarikci.com");
  });

  it("guesses Turkish field names", () => {
    const m = guessMapping(["@id", "StokKodu", "UrunAdi", "Marka", "BayiFiyati", "ListeFiyati", "StokAdedi", "OemNo", "Kategori", "Resimler.Resim", "Barkod"]);
    expect(m).toMatchObject({
      externalId: "@id",
      sku: "StokKodu",
      name: "UrunAdi",
      manufacturer: "Marka",
      price: "BayiFiyati",
      compareAtPrice: "ListeFiyati",
      stock: "StokAdedi",
      oem: "OemNo",
      category: "Kategori",
      imageUrl: "Resimler.Resim",
      barcode: "Barkod",
    });
  });

  it("parses numbers and stock values", () => {
    expect(parseNumber("1.250,50 TL")).toBe(1250.5);
    expect(parseNumber("1,250.50")).toBe(1250.5);
    expect(parseNumber("99,9")).toBe(99.9);
    expect(parseNumber("99.9")).toBe(99.9);
    expect(parseStock("Var")).toBe(4);
    expect(parseStock("YOK")).toBe(0);
    expect(parseStock(">10")).toBe(10);
    expect(parseStock("12,00")).toBe(12);
  });

  it("maps a row with currency, VAT and fixed margin", () => {
    const cfg = feedConfigFromRow(
      "https://example.com/f.xml",
      feedRowMapping({
        ...feedConfigFromRow(null, {}),
        itemTag: "Urun",
        mapping: { sku: "StokKodu", name: "UrunAdi", price: "Fiyat", stock: "Stok" },
        currency: "field",
        currencyField: "Fiyat.@para",
        vat: "excl",
        vatRate: 20,
        margin: "fixed",
        marginPct: 25,
      }),
    );
    const row = mapCustomItem({ StokKodu: "AB-1", UrunAdi: "Balata", Fiyat: "10", "Fiyat.@para": "USD", Stok: "Var" }, cfg, { USD: 40, EUR: 45 });
    expect(row).toMatchObject({ externalId: "AB-1", sku: "AB-1", price: "600.00", stock: 4 });
    expect(mapCustomItem({ StokKodu: "AB-2", UrunAdi: "X", Fiyat: "0" }, cfg, { USD: 40, EUR: 45 })).toBeNull();
  });
});

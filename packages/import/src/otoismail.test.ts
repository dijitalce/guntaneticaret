import { describe, expect, it } from "vitest";
import {
  imageMatchKeys,
  mapOtoIsmailRow,
  otoIsmailBrand,
  otoIsmailCategory,
  otoIsmailCost,
  otoIsmailImageUrl,
  otoIsmailPartNumber,
  otoIsmailStock,
  splitOtoIsmailOems,
} from "./otoismail-map";

const row = {
  NetsisStokId: 84060,
  Kod: "GVA 3443210",
  OrjinalKod: "HL-119",
  Ad: "KLİMA KONDENSERİ 206",
  Marka: "GVA",
  MarkaFull: "GVA",
  ImageUrl: "http://resimler.otoismail.com.tr/GVA 3443210.jpg",
  Fiyat1: { ParaBirimi: "$", Deger: 55.78 },
  Fiyat3: { ParaBirimi: "$", Deger: 0 },
  Oem: "6455.W7-6455.Y0-6455.X9",
  StokSayisi: 50,
};

describe("Oto İsmail eşleme", () => {
  it("Fiyat3 doluysa kampanyalı fiyatı, değilse Fiyat1'i alır", () => {
    expect(otoIsmailCost(row)).toEqual({ amount: 55.78, currency: "USD" });
    expect(otoIsmailCost({ ...row, Fiyat3: { ParaBirimi: "$", Deger: 40 } })).toEqual({ amount: 40, currency: "USD" });
    expect(otoIsmailCost({ Fiyat1: { Deger: 0 } })).toBeNull();
    expect(otoIsmailCost(row, 25)).toEqual({ amount: 55.78 * 0.75, currency: "USD" });
    expect(otoIsmailCost({ ...row, Fiyat3: { ParaBirimi: "$", Deger: 40 } }, 25)).toEqual({ amount: 40, currency: "USD" });
  });

  it("marka önekini atıp parça no verir", () => {
    expect(otoIsmailPartNumber(row)).toBe("3443210");
  });

  it("tireyle ayrılmış OEM'leri böler, tek numaralı tireyi bölmez", () => {
    expect(splitOtoIsmailOems("6455.W7-6455.Y0-6455.X9")).toEqual(["6455.W7", "6455.Y0", "6455.X9"]);
    expect(splitOtoIsmailOems("1K0-615-301")).toEqual(["1K0-615-301"]);
  });

  it("stok yoksa Plaza+Gebze toplanır", () => {
    expect(otoIsmailStock({ Plaza: 20, Gebze: 30 })).toBe(50);
    expect(otoIsmailStock({ StokSayisi: 7 })).toBe(7);
  });

  it("stoğu 0 olan ürünü varsayılan stokla gösterir, kapatılabilir", () => {
    const zero = { ...row, StokSayisi: 0, Plaza: 0, Gebze: 0 };
    expect(mapOtoIsmailRow(zero, { EUR: 50, USD: 40 }, 20)!.stock).toBe(4);
    process.env.OTOISMAIL_ASSUME_IN_STOCK = "0";
    expect(mapOtoIsmailRow(zero, { EUR: 50, USD: 40 }, 20)!.stock).toBe(0);
    delete process.env.OTOISMAIL_ASSUME_IN_STOCK;
  });

  it("ürünü fiyat ve stokla eşler", () => {
    const m = mapOtoIsmailRow(row, { EUR: 50, USD: 40 }, 20)!;
    expect(m.externalId).toBe("84060");
    expect(m.sku).toBe("GVA 3443210");
    expect(m.stock).toBe(50);
    expect(Number(m.price)).toBeGreaterThan(55.78 * 40 * 1.2);
    expect(mapOtoIsmailRow({ ...row, Fiyat1: { Deger: 0 } })).toBeNull();
  });

  it("markayı stok kodu önekinden alır, ürün grubunu kategori yapar", () => {
    const r = { ...row, Marka: "GVA", MarkaFull: "GVA SİLİNDİR KAPAKLARI" };
    expect(otoIsmailBrand(r)).toBe("GVA");
    expect(otoIsmailCategory(r)).toBe("SİLİNDİR KAPAKLARI");
    expect(otoIsmailCategory(row)).toBeUndefined();
    expect(mapOtoIsmailRow(r, { EUR: 50, USD: 40 }, 20)!.manufacturer).toBe("GVA");
  });

  it("görsel adresini kodlar ve eşleme anahtarlarını üretir", () => {
    expect(otoIsmailImageUrl(row)).toBe("http://resimler.otoismail.com.tr/GVA%203443210.jpg");
    expect(otoIsmailImageUrl({ ImageUrl: "" })).toBeNull();
    expect(imageMatchKeys(row)).toContain("gva::3443210");
    expect(imageMatchKeys(row)).toContain("gva::HL119");
  });
});

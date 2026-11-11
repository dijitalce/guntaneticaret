import { describe, expect, it } from "vitest";
import { b2bIkimizCostTry, b2bIkimizInStock, b2bIkimizNumbers, b2bIkimizPartNumber, mapB2bIkimizRow, type B2bIkimizRaw } from "./b2b-ikimiz-map";

// Gerçek yanıttan bir satır (örnek veri; kimlik bilgisi içermez).
const row: B2bIkimizRaw = {
  Code: "VP DCDK-01-100",
  "Depo-1": "Var",
  "Depo-2": "Yok",
  Depo_1: "Var",
  Depo_2: "Yok",
  Manufacturer: "VAN PRES",
  Name: "DOKKER 12- / LODGY 17- ÖN TAMPON",
  Oem_No: "620223545R|620221477R|620222633R|620224983R|620222966R",
  SalePriceContact: 1269.6729024,
  SalePriceContactCurrency: "₺",
  SalePriceContactTax: 1523.6074828800001,
  SalePriceContactTaxCurrency: "₺",
  SpecialField_1: "620223545R|620221477R|620222633R|620224983R|620222966R",
  Unit: "ADET",
};
const rates = { EUR: 50, USD: 40 };

describe("İkimiz B2B eşleme", () => {
  it("KDV dahil hazır fiyatı maliyet olarak kullanır", () => {
    expect(b2bIkimizCostTry(row, rates)).toBeCloseTo(1523.607, 2);
  });

  it("KDV dahil fiyat yoksa KDV hariç fiyata oran ekler", () => {
    const cost = b2bIkimizCostTry({ ...row, SalePriceContactTax: null }, rates, 20);
    expect(cost).toBeCloseTo(1269.6729 * 1.2, 2);
  });

  it("fiyatsız satır elenir", () => {
    expect(mapB2bIkimizRow({ ...row, SalePriceContact: 0, SalePriceContactTax: 0 }, rates)).toBeNull();
    expect(mapB2bIkimizRow({ ...row, Code: " " }, rates)).toBeNull();
  });

  it("stok: herhangi bir depoda Var ise stokta", () => {
    expect(b2bIkimizInStock(row)).toBe(true);
    expect(b2bIkimizInStock({ Depo_2: "Var" })).toBe(true);
    expect(b2bIkimizInStock({ "Depo-1": "Yok", "Depo-2": "Yok", Depo_1: "Yok", Depo_2: "Yok" })).toBe(false);
  });

  it("OEM numaraları tekrarsız ve üretici parça no dahil", () => {
    const nums = b2bIkimizNumbers(row).map((n) => n.normalized);
    expect(nums).toEqual(["620223545R", "620221477R", "620222633R", "620224983R", "620222966R", "DCDK01100"]);
    expect(b2bIkimizPartNumber(row)).toBe("DCDK-01-100");
  });

  it("ürün satırı doğru alanlarla oluşur", () => {
    const mapped = mapB2bIkimizRow(row, rates)!;
    expect(mapped.externalId).toBe("VP DCDK-01-100");
    expect(mapped.manufacturer).toBe("VAN PRES");
    expect(mapped.stock).toBeGreaterThan(0);
    expect(Number(mapped.price)).toBeGreaterThan(1523.6); // marj eklenir
    expect(mapped.oem).toBe("620223545R");
  });
});

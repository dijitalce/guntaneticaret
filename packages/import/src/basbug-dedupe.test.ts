import { describe, expect, it } from "vitest";
import {
  fxRatesFromEnv,
  inferBasbugFitments,
  mapBasbugRow,
  priceToTry,
  splitOems,
} from "./basbug-map";
import { pickCheapestWinners } from "./dedupe-cheapest";

describe("basbug mapping", () => {
  it("maps TL row and splits multi OEMs", () => {
    const row = mapBasbugRow({
      no: "FILT OE 693/1",
      ac: "YAG FILTRESI",
      ac2: "FILTRE ELEMANI",
      oe: "5801403054 / 5801403055",
      uk: "FILTRON",
      dc: "TL",
      lf: 100,
      _listeGrubuAd: "AĞIR VASITA",
    });
    expect(row).toMatchObject({
      externalId: "FILT OE 693/1",
      sku: "FILT OE 693/1",
      manufacturer: "FILTRON",
      price: "100.00",
      category: "AĞIR VASITA",
      stock: 4,
    });
    expect(row?.name).toContain("YAG FILTRESI");
    expect(splitOems("5801403054 / 5801403055")).toEqual(["5801403054", "5801403055"]);
  });

  it("converts EUR and USD to TRY", () => {
    const rates = { EUR: 50, USD: 40 };
    expect(priceToTry(2, "EUR", rates)).toBe(100);
    expect(priceToTry(2, "USD", rates)).toBe(80);
    expect(priceToTry(2, "TL", rates)).toBe(2);
    const mapped = mapBasbugRow({ no: "X1", ac: "P", oe: "12345678", uk: "B", dc: "EUR", lf: 2 }, rates);
    expect(mapped?.price).toBe("100.00");
  });

  it("infers fitments from liste grubu + model field", () => {
    const fits = inferBasbugFitments({
      lgk: "FORD",
      _listeGrubu: "FORD",
      m: "FOCUS, FIESTA",
      ac: "FILTRE",
    });
    expect(fits.some((f) => f.brand === "Ford" && f.model === "Focus")).toBe(true);
  });

  it("reads fx defaults from env helpers", () => {
    const rates = fxRatesFromEnv();
    expect(rates.EUR).toBeGreaterThan(1);
    expect(rates.USD).toBeGreaterThan(1);
  });
});

describe("dedupe cheapest", () => {
  it("keeps cheaper product active among same OE+brand", () => {
    const decision = pickCheapestWinners([
      { id: "g1", price: 200, supplierCode: "DEMO", normalizedOem: "ABC123", manufacturerSlug: "bosch" },
      { id: "b1", price: 150, supplierCode: "BASBUG", normalizedOem: "ABC123", manufacturerSlug: "bosch" },
    ]);
    expect(decision.activateIds).toEqual(["b1"]);
    expect(decision.deactivateIds).toEqual(["g1"]);
  });

  it("prefers DEMO on equal price", () => {
    const decision = pickCheapestWinners([
      { id: "b1", price: 100, supplierCode: "BASBUG", normalizedOem: "ABC123", manufacturerSlug: "bosch" },
      { id: "g1", price: 100, supplierCode: "DEMO", normalizedOem: "ABC123", manufacturerSlug: "bosch" },
    ]);
    expect(decision.activateIds).toEqual(["g1"]);
    expect(decision.deactivateIds).toEqual(["b1"]);
  });

  it("keeps different brands with same OE both visible (no multi-group action)", () => {
    const decision = pickCheapestWinners([
      { id: "a", price: 100, supplierCode: "DEMO", normalizedOem: "ABC123", manufacturerSlug: "bosch" },
      { id: "b", price: 80, supplierCode: "BASBUG", normalizedOem: "ABC123", manufacturerSlug: "febi" },
    ]);
    expect(decision.groups).toBe(0);
    expect(decision.activateIds).toEqual([]);
    expect(decision.deactivateIds).toEqual([]);
  });
});

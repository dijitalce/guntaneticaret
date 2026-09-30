import { describe, expect, it } from "vitest";
import { parseTcmbRates } from "./fx";
import { validateEryazXml } from "./eryaz-fetch";
import { needsImport } from "./content-hashes";

describe("needsImport", () => {
  const row = (status: string, contentHash = "h1") => ({ id: "p1", contentHash, status });
  it("skips unchanged active/inactive products", () => {
    expect(needsImport(row("active"), "h1")).toBe(false);
    expect(needsImport(row("inactive"), "h1")).toBe(false);
  });
  it("reprocesses new, changed, returning or forced products", () => {
    expect(needsImport(undefined, "h1")).toBe(true);
    expect(needsImport(row("active"), "h2")).toBe(true);
    expect(needsImport(row("missing_from_feed"), "h1")).toBe(true);
    expect(needsImport(row("active"), "h1", true)).toBe(true);
  });
});

describe("TCMB rates", () => {
  it("reads EUR and USD forex selling", () => {
    const xml = `<Tarih_Date>
      <Currency CrossOrder="0" Kod="USD" CurrencyCode="USD"><Unit>1</Unit><ForexSelling>49.0013</ForexSelling></Currency>
      <Currency CrossOrder="9" Kod="EUR" CurrencyCode="EUR"><Unit>1</Unit><ForexSelling>55.6103</ForexSelling></Currency>
      <Currency CrossOrder="1" Kod="JPY" CurrencyCode="JPY"><Unit>100</Unit><ForexSelling>31.2</ForexSelling></Currency>
    </Tarih_Date>`;
    expect(parseTcmbRates(xml)).toEqual({ EUR: 55.6103, USD: 49.0013 });
  });

  it("returns null when a currency is missing", () => {
    expect(parseTcmbRates("<Tarih_Date></Tarih_Date>")).toBeNull();
  });
});

describe("Eryaz response validation", () => {
  it("accepts a healthy response", () => {
    expect(validateEryazXml("<Response><Status>true</Status><Count>124975</Count><Data></Data></Response>", 1000)).toBe(124975);
  });

  it("rejects IP errors, false status and suspiciously small feeds", () => {
    expect(() => validateEryazXml("Geçersiz IP", 1000)).toThrow(/whitelist/);
    expect(() => validateEryazXml("<Status>false</Status><Message>Hata</Message>", 1000)).toThrow(/Hata/);
    expect(() => validateEryazXml("<Status>true</Status><Count>12</Count>", 1000)).toThrow(/düşük/);
  });
});

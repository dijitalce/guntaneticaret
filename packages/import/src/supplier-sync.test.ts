import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { parseTcmbRates } from "./fx";
import { eryazHttpError, fetchEryazXml, validateEryazXml } from "./eryaz-fetch";
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

describe("Eryaz download retries", () => {
  const config = { endpoint: "https://eryaz.test", companyKey: "k", username: "u", password: "p", functionName: "GetProduct" };
  const okXml = "<Root><Status>true</Status><Count>1500</Count></Root>";
  const html502 = "<!DOCTYPE html PUBLIC \"-//W3C//DTD XHTML 1.0 Strict//EN\"><html><head><title>502 - Web server received an invalid response</title></head></html>";
  afterEach(() => vi.unstubAllGlobals());

  it("turns HTML error pages into a readable message", () => {
    const err = eryazHttpError(502, html502);
    expect(err.message).toContain("HTTP 502");
    expect(err.message).toContain("502 - Web server received an invalid response");
    expect(err.message).not.toContain("DOCTYPE");
  });

  it("retries 5xx responses and keeps the file once a retry succeeds", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(html502, { status: 502 }))
      .mockResolvedValueOnce(new Response(okXml, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const out = join(mkdtempSync(join(tmpdir(), "eryaz-")), "products.xml");
    const retries: number[] = [];
    const result = await fetchEryazXml(config, out, { retryDelaysMs: [1, 1], onRetry: (n) => retries.push(n) });
    expect(result.count).toBe(1500);
    expect(retries).toEqual([1]);
    expect(readFileSync(out, "utf8")).toBe(okXml);
  });

  it("gives up after the last retry and does not retry client errors", async () => {
    const fetch5xx = vi.fn(async () => new Response(html502, { status: 502 }));
    vi.stubGlobal("fetch", fetch5xx);
    const out = join(mkdtempSync(join(tmpdir(), "eryaz-")), "products.xml");
    await expect(fetchEryazXml(config, out, { retryDelaysMs: [1, 1] })).rejects.toThrow("HTTP 502");
    expect(fetch5xx).toHaveBeenCalledTimes(3);

    const fetch401 = vi.fn(async () => new Response("yetkisiz", { status: 401 }));
    vi.stubGlobal("fetch", fetch401);
    await expect(fetchEryazXml(config, out, { retryDelaysMs: [1, 1] })).rejects.toThrow("HTTP 401");
    expect(fetch401).toHaveBeenCalledTimes(1);
  });
});

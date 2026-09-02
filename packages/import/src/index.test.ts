import { describe, expect, it } from "vitest";
import { createReadStream } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { contentHash, mapRaw, normalizeOem, parseProductXml } from "./index";
import { inferFitments } from "./fitment-from-name";

describe("xml mapping", () => {
  it("maps fields and is idempotent by hash", () => {
    const mapping = { externalId: "id", sku: "sku", name: "name", price: "price" };
    const a = mapRaw({ id: "1", sku: "S", name: "N", price: "10" }, mapping);
    const b = mapRaw({ id: "1", sku: "S", name: "N", price: "10" }, mapping);
    expect(a?.sku).toBe("S");
    expect(contentHash(a!)).toBe(contentHash(b!));
  });
  it("maps VAR availability to in-stock qty", () => {
    const row = mapRaw({ Id: "1", Code: "S", Name: "N", Price: "10", Availability: "VAR" }, {
      externalId: "Id", sku: "Code", name: "Name", price: "Price", stock: "Availability",
    });
    expect(row?.stock).toBe(4);
  });
  it("streams fixture xml", async () => {
    const file = path.join(path.dirname(fileURLToPath(import.meta.url)), "../fixtures/demo-products.xml");
    const items = await parseProductXml(createReadStream(file));
    expect(items.length).toBe(2);
    expect(items[0]).toMatchObject({ sku: "XML-OIL-CIVIC" });
  });
});

describe("fitment from name", () => {
  it("finds toyota and honda models in titles", () => {
    expect(inferFitments("FREN BALATA COROLLA 02-06 ÖN").some((f) => f.model === "Corolla")).toBe(true);
    expect(inferFitments("SİS LAMBASI CIVIC 92-95 H.B SAĞ").some((f) => f.brand === "Honda")).toBe(true);
    expect(inferFitments("DENGE KOLU GOLF5 / A3 / JETTA").map((f) => f.brand).sort()).toEqual(
      expect.arrayContaining(["Audi", "Volkswagen"]),
    );
  });
});

import { describe, expect, it } from "vitest";
import { formatCardFitments, productImageUrl } from "./index";

describe("productImageUrl", () => {
  it("uses product image first", () => {
    expect(productImageUrl("/p.jpg", "/t.jpg", "/g.svg")).toBe("/p.jpg");
  });
  it("falls back to tenant placeholder", () => {
    expect(productImageUrl(null, "/t.jpg", "/g.svg")).toBe("/t.jpg");
  });
  it("falls back to global placeholder", () => {
    expect(productImageUrl(undefined, null, "/g.svg")).toBe("/g.svg");
  });
});

describe("formatCardFitments", () => {
  it("groups extra models of the same brand", () => {
    const { items, extra } = formatCardFitments([
      { brandName: "Toyota", brandSlug: "toyota", modelName: "Hilux", modelSlug: "hilux", modelSort: 1 },
      { brandName: "Toyota", brandSlug: "toyota", modelName: "Corolla", modelSlug: "corolla", modelSort: 2 },
      { brandName: "Toyota", brandSlug: "toyota", modelName: "Hilux", modelSlug: "hilux" },
    ]);
    expect(items.map((i) => i.label)).toEqual(["Toyota Hilux", "Corolla"]);
    expect(items[0]?.href).toBe("/toyota/hilux");
    expect(extra).toBe(0);
  });

  it("caps visible pairs and reports extras", () => {
    const { items, extra } = formatCardFitments(
      [
        { brandName: "Toyota", brandSlug: "toyota", brandSort: 1, modelName: "Hilux", modelSlug: "hilux" },
        { brandName: "Honda", brandSlug: "honda", brandSort: 2, modelName: "Civic", modelSlug: "civic" },
        { brandName: "Mazda", brandSlug: "mazda", brandSort: 3, modelName: "3", modelSlug: "3" },
        { brandName: "Ford", brandSlug: "ford", brandSort: 4, modelName: "Focus", modelSlug: "focus" },
      ],
      3,
    );
    expect(items.map((i) => i.label)).toEqual(["Toyota Hilux", "Honda Civic", "Mazda 3"]);
    expect(extra).toBe(1);
  });
});

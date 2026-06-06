import { describe, it, expect } from "vitest";
import {
  searchUrl,
  productUrl,
  toFoodHit,
  scaleMacros,
  parseSearchResults,
  parseProductResult,
} from "./openfoodfacts";

const sampleProduct = {
  code: "3017620422003",
  product_name: "Nutella",
  nutriments: {
    "energy-kcal_100g": 539,
    proteins_100g: 6.3,
    carbohydrates_100g: 57.5,
    fat_100g: 30.9,
  },
};

describe("url builders", () => {
  it("builds an encoded search URL with fields", () => {
    const u = searchUrl("greek yoghurt");
    expect(u).toContain("search_terms=greek+yoghurt");
    expect(u).toContain("fields=code%2Cproduct_name%2Cnutriments");
  });

  it("builds a product URL for a barcode", () => {
    expect(productUrl("3017620422003")).toContain(
      "/api/v2/product/3017620422003.json",
    );
  });
});

describe("toFoodHit", () => {
  it("maps OFF nutriments to per-100g macros", () => {
    expect(toFoodHit(sampleProduct)).toEqual({
      name: "Nutella",
      barcode: "3017620422003",
      per100g: { calories: 539, protein: 6.3, carbs: 57.5, fat: 30.9 },
    });
  });

  it("returns null when the product has no name", () => {
    expect(toFoodHit({ code: "123", nutriments: {} })).toBeNull();
  });

  it("defaults missing nutriments to 0", () => {
    const hit = toFoodHit({ product_name: "Mystery", nutriments: {} });
    expect(hit?.per100g).toEqual({ calories: 0, protein: 0, carbs: 0, fat: 0 });
  });
});

describe("scaleMacros", () => {
  it("scales per-100g values to a gram quantity", () => {
    const scaled = scaleMacros(
      { calories: 100, protein: 10, carbs: 5, fat: 2 },
      170,
    );
    expect(scaled).toEqual({ calories: 170, protein: 17, carbs: 8.5, fat: 3.4 });
  });
});

describe("parsers", () => {
  it("parses a search payload, dropping nameless products", () => {
    const hits = parseSearchResults({
      products: [sampleProduct, { code: "x", nutriments: {} }],
    });
    expect(hits).toHaveLength(1);
    expect(hits[0].name).toBe("Nutella");
  });

  it("parses a product payload and handles not-found", () => {
    expect(parseProductResult({ status: 1, product: sampleProduct })?.name).toBe(
      "Nutella",
    );
    expect(parseProductResult({ status: 0 })).toBeNull();
  });
});

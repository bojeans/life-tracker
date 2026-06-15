import { describe, expect, it } from "vitest";
import { toGrams, formatServing, isUnit } from "./units";

describe("toGrams", () => {
  it("converts mass units exactly", () => {
    expect(toGrams(50, "mg")).toBe(0.05);
    expect(toGrams(2, "kg")).toBe(2000);
    expect(toGrams(1, "oz")).toBe(28.35);
  });

  it("converts volume units at ~1 g/ml", () => {
    expect(toGrams(1, "tsp")).toBe(5);
    expect(toGrams(1, "tbsp")).toBe(15);
    expect(toGrams(0.5, "cup")).toBe(120);
  });
});

describe("formatServing", () => {
  it("shows the unit with its gram equivalent", () => {
    expect(formatServing(1, "tbsp", 15)).toBe("1 tbsp (15 g)");
  });

  it("falls back to grams when no real unit", () => {
    expect(formatServing(null, null, 30)).toBe("30 g");
    expect(formatServing(100, "g", 100)).toBe("100 g");
  });

  it("returns null when nothing is known", () => {
    expect(formatServing(null, null, null)).toBeNull();
  });
});

describe("isUnit", () => {
  it("guards unknown strings", () => {
    expect(isUnit("tbsp")).toBe(true);
    expect(isUnit("furlong")).toBe(false);
  });
});

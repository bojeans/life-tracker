import { describe, it, expect } from "vitest";
import { foodItemSchema } from "./food-item-schema";
import { foodItemFieldsFromHit } from "./food-item-serialize";
import type { FoodHit } from "./openfoodfacts";

describe("foodItemSchema", () => {
  it("requires a name and macros, coerces strings, leaves blank micros undefined", () => {
    const parsed = foodItemSchema.parse({
      name: "Chicken breast",
      brand: "",
      calories: "165",
      protein: "31",
      carbs: "0",
      fat: "3.6",
      fiber: "",
    });
    expect(parsed.name).toBe("Chicken breast");
    expect(parsed.calories).toBe(165);
    expect(parsed.brand).toBeUndefined();
    expect(parsed.fiber).toBeUndefined();
  });

  it("rejects an empty name", () => {
    const r = foodItemSchema.safeParse({ name: "", calories: 1, protein: 1, carbs: 1, fat: 1 });
    expect(r.success).toBe(false);
  });
});

describe("foodItemFieldsFromHit", () => {
  it("maps an OFF hit (per-100g) to catalog columns, micros -> null when absent", () => {
    const hit: FoodHit = {
      name: "Greek yoghurt",
      brand: "Chobani",
      barcode: "123",
      per100g: { calories: 97, protein: 9, carbs: 4, fat: 5 },
      micros: { sugar: 4, satFat: 3, fiber: undefined, sodium: undefined },
    };

    expect(foodItemFieldsFromHit(hit)).toEqual({
      name: "Greek yoghurt",
      brand: "Chobani",
      barcode: "123",
      calories: 97,
      protein: 9,
      carbs: 4,
      fat: 5,
      fiber: null,
      sugar: 4,
      sodium: null,
      satFat: 3,
    });
  });

  it("normalises an empty barcode to null", () => {
    const hit: FoodHit = {
      name: "Loose apple",
      barcode: "",
      per100g: { calories: 52, protein: 0, carbs: 14, fat: 0 },
      micros: {},
    };
    expect(foodItemFieldsFromHit(hit).barcode).toBeNull();
  });
});

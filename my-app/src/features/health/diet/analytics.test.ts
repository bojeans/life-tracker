import { describe, it, expect } from "vitest";
import { dailyMacros } from "./analytics";
import { summarizeDiet } from "./summary";
import type { DietEntryDTO } from "./types";

function entry(overrides: Partial<DietEntryDTO> = {}): DietEntryDTO {
  return {
    id: Math.random().toString(36).slice(2),
    name: "Food",
    date: "2026-06-01T00:00:00.000Z",
    mealType: null,
    isDailyTotal: false,
    quantityG: null,
    calories: 100,
    protein: 10,
    carbs: 20,
    fat: 5,
    barcode: null,
    foodItemId: null,
    source: "MANUAL",
    ...overrides,
  };
}

describe("dailyMacros", () => {
  it("sums per day and sorts oldest first", () => {
    const points = dailyMacros([
      entry({ date: "2026-06-02T00:00:00.000Z", calories: 200 }),
      entry({ date: "2026-06-01T00:00:00.000Z", calories: 100 }),
      entry({ date: "2026-06-01T00:00:00.000Z", calories: 50, protein: 5 }),
    ]);

    expect(points.map((p) => p.date)).toEqual(["2026-06-01", "2026-06-02"]);
    expect(points[0].calories).toBe(150);
    expect(points[0].protein).toBe(15);
  });

  it("returns an empty array for no entries", () => {
    expect(dailyMacros([])).toEqual([]);
  });
});

describe("summarizeDiet", () => {
  it("totals macros and averages calories over distinct logged days", () => {
    const s = summarizeDiet([
      entry({ date: "2026-06-01T00:00:00.000Z", calories: 1000 }),
      entry({ date: "2026-06-01T00:00:00.000Z", calories: 500 }),
      entry({ date: "2026-06-02T00:00:00.000Z", calories: 2100 }),
    ]);

    expect(s.totalCalories).toBe(3600);
    expect(s.entryCount).toBe(3);
    expect(s.dayCount).toBe(2);
    expect(s.avgCaloriesPerDay).toBe(1800);
  });

  it("handles an empty list without dividing by zero", () => {
    const s = summarizeDiet([]);
    expect(s).toMatchObject({ totalCalories: 0, dayCount: 0, avgCaloriesPerDay: 0 });
  });
});

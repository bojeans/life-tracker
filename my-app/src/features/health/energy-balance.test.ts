import { describe, it, expect } from "vitest";
import { dailyEnergyBalance, summarizeBalance } from "./energy-balance";
import type { DietEntryDTO } from "./diet/types";
import type { ExerciseEntryDTO } from "./exercise/types";

function diet(date: string, calories: number): DietEntryDTO {
  return {
    id: Math.random().toString(36).slice(2),
    name: "x",
    date: `${date}T00:00:00.000Z`,
    mealType: null,
    isDailyTotal: false,
    quantityG: null,
    calories,
    protein: 0,
    carbs: 0,
    fat: 0,
    barcode: null,
    foodItemId: null,
    source: "MANUAL",
  };
}

function ex(date: string, caloriesBurned: number): ExerciseEntryDTO {
  return {
    id: Math.random().toString(36).slice(2),
    activity: "Run",
    date: `${date}T00:00:00.000Z`,
    durationMin: null,
    met: null,
    caloriesBurned,
    steps: null,
    distanceKm: null,
    note: null,
    source: "MANUAL",
  };
}

describe("dailyEnergyBalance", () => {
  const baseline = 2000;

  it("computes out = baseline + burned and net = intake − out, over diet days", () => {
    const days = dailyEnergyBalance(
      [diet("2026-06-01", 2200), diet("2026-06-01", 300)],
      [ex("2026-06-01", 400)],
      baseline,
    );

    expect(days).toHaveLength(1);
    expect(days[0]).toMatchObject({
      intake: 2500,
      burned: 400,
      baseline: 2000,
      out: 2400,
      net: 100, // 2500 − 2400
    });
  });

  it("only includes days with food logged (intake drives it)", () => {
    const days = dailyEnergyBalance(
      [diet("2026-06-02", 1800)],
      [ex("2026-06-01", 500), ex("2026-06-02", 200)],
      baseline,
    );
    expect(days.map((d) => d.date)).toEqual(["2026-06-02"]);
    expect(days[0].out).toBe(2200); // 2000 + 200
  });
});

describe("summarizeBalance", () => {
  it("aggregates and predicts weight change from cumulative net", () => {
    // Two days at −7700 net each → −15400 kcal → −2 kg predicted
    const days = dailyEnergyBalance(
      [diet("2026-06-01", 0), diet("2026-06-02", 0)],
      [],
      7700,
    );
    const s = summarizeBalance(days);
    expect(s.dayCount).toBe(2);
    expect(s.cumulativeNet).toBe(-15400);
    expect(s.predictedWeightChangeKg).toBe(-2);
  });

  it("is zero-safe with no days", () => {
    expect(summarizeBalance([]).predictedWeightChangeKg).toBe(0);
  });
});

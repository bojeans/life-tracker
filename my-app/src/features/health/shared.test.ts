import { describe, it, expect, vi, beforeEach } from "vitest";

const findUnique = vi.fn();
vi.mock("@/lib/db", () => ({
  db: { user: { findUnique: (...a: unknown[]) => findUnique(...a) } },
}));

import { getSharedHealth } from "./shared";

const profile = {
  heightCm: 178,
  birthYear: 1992,
  sex: "MALE",
  activityLevel: "LIGHT",
  bodyFatPct: 18,
};

function weightRow(date: string, weightKg: number) {
  return { id: date, date: new Date(`${date}T00:00:00.000Z`), weightKg, note: null, source: "MANUAL" };
}
function bpRow(date: string, systolic: number, diastolic: number) {
  return {
    id: date,
    date: new Date(`${date}T00:00:00.000Z`),
    systolic,
    diastolic,
    pulse: null,
    note: null,
    source: "MANUAL",
  };
}
function dietRow(date: string, calories: number) {
  return {
    id: date,
    name: "Daily total",
    date: new Date(`${date}T00:00:00.000Z`),
    mealType: null,
    isDailyTotal: true,
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

beforeEach(() => vi.clearAllMocks());

describe("getSharedHealth", () => {
  it("returns null for an unknown token", async () => {
    findUnique.mockResolvedValue(null);
    expect(await getSharedHealth("nope")).toBeNull();
  });

  it("computes weight trend + energy balance from the snapshot", async () => {
    findUnique.mockResolvedValue({
      name: "Alex Demo",
      profile,
      weightEntries: [weightRow("2026-06-08", 81), weightRow("2026-06-01", 83)],
      dietEntries: [dietRow("2026-06-08", 2000)],
      exerciseEntries: [],
      bloodPressureEntries: [
        bpRow("2026-06-08", 118, 76),
        bpRow("2026-06-01", 138, 88),
      ],
    });

    const result = await getSharedHealth("example-user");

    expect(result).not.toBeNull();
    expect(result!.hasData).toBe(true);
    expect(result!.ownerName).toBe("Alex Demo");
    // Latest weight is the newest (query is date-desc; first element).
    expect(result!.latestWeightKg).toBe(81);
    // Trend is oldest-first.
    expect(result!.weightTrend.map((p) => p.weightKg)).toEqual([83, 81]);
    expect(result!.baseline).toBeGreaterThan(1500);
    // Balance covers the one diet day; avg intake matches it.
    expect(result!.balanceSummary.avgIntake).toBe(2000);
    // Latest BP is the newest reading, classified by AHA bands.
    expect(result!.latestBloodPressure).toEqual({
      systolic: 118,
      diastolic: 76,
      pulse: null,
    });
    expect(result!.bloodPressureCategory!.key).toBe("normal");
    // Trend is oldest-first.
    expect(result!.bloodPressureTrend.map((p) => p.systolic)).toEqual([
      138, 118,
    ]);
  });

  it("omits energy balance when there is no profile", async () => {
    findUnique.mockResolvedValue({
      name: "Alex Demo",
      profile: null,
      weightEntries: [weightRow("2026-06-01", 80)],
      dietEntries: [dietRow("2026-06-01", 2000)],
      exerciseEntries: [],
      bloodPressureEntries: [],
    });

    const result = await getSharedHealth("example-user");

    expect(result!.baseline).toBeNull();
    expect(result!.balance).toHaveLength(0);
    expect(result!.weightTrend).toHaveLength(1); // weight still shown
    // No readings → no BP summary, but still counts as having data via weight.
    expect(result!.latestBloodPressure).toBeNull();
    expect(result!.bloodPressureCategory).toBeNull();
    expect(result!.bloodPressureTrend).toHaveLength(0);
  });
});

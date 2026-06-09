import { describe, expect, it } from "vitest";
import {
  bloodPressureAverages,
  bloodPressureTrend,
  classifyBloodPressure,
} from "./analytics";
import type { BloodPressureEntryDTO } from "./types";

function entry(
  overrides: Partial<BloodPressureEntryDTO> & { date: string },
): BloodPressureEntryDTO {
  return {
    id: overrides.id ?? overrides.date,
    systolic: 120,
    diastolic: 80,
    pulse: null,
    note: null,
    source: "MANUAL",
    ...overrides,
  };
}

describe("classifyBloodPressure", () => {
  it("classifies by AHA thresholds", () => {
    expect(classifyBloodPressure(110, 70).key).toBe("normal");
    expect(classifyBloodPressure(85, 55).key).toBe("low");
    expect(classifyBloodPressure(122, 78).key).toBe("elevated");
    expect(classifyBloodPressure(135, 78).key).toBe("stage1");
    expect(classifyBloodPressure(118, 82).key).toBe("stage1"); // diastolic drives it
    expect(classifyBloodPressure(145, 85).key).toBe("stage2");
    expect(classifyBloodPressure(160, 125).key).toBe("crisis");
  });

  it("takes the worse of systolic/diastolic", () => {
    // Normal systolic but stage-2 diastolic still lands in stage2.
    expect(classifyBloodPressure(118, 95).key).toBe("stage2");
  });
});

describe("bloodPressureTrend", () => {
  it("sorts oldest-first and shapes points", () => {
    const points = bloodPressureTrend([
      entry({ date: "2026-06-03T00:00:00.000Z", systolic: 130 }),
      entry({ date: "2026-06-01T00:00:00.000Z", systolic: 120 }),
    ]);
    expect(points.map((p) => p.systolic)).toEqual([120, 130]);
    expect(points[0].date).toBe("2026-06-01");
  });
});

describe("bloodPressureAverages", () => {
  it("returns null with no entries", () => {
    expect(bloodPressureAverages([])).toBeNull();
  });

  it("averages systolic/diastolic and pulse over readings that have one", () => {
    const avg = bloodPressureAverages([
      entry({ date: "2026-06-01T00:00:00.000Z", systolic: 120, diastolic: 80, pulse: 60 }),
      entry({ date: "2026-06-02T00:00:00.000Z", systolic: 130, diastolic: 84, pulse: null }),
    ]);
    expect(avg).toEqual({ systolic: 125, diastolic: 82, pulse: 60, count: 2 });
  });
});

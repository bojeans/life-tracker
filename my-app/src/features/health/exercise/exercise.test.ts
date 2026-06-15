import { describe, it, expect } from "vitest";
import {
  caloriesBurned,
  classifyCardio,
  metForIntensity,
  metFor,
} from "./exercise-calories";
import { parseExerciseCsv, externalIdFor } from "./csv";
import { dailyBurn, summarizeExercise } from "./analytics";
import type { ExerciseEntryDTO } from "./types";

describe("caloriesBurned (METs)", () => {
  it("computes MET × weight × hours", () => {
    // Running 9.8 MET, 80kg, 30 min → 9.8 * 80 * 0.5 = 392
    expect(caloriesBurned(9.8, 80, 30)).toBe(392);
  });

  it("looks up a MET value by activity name", () => {
    expect(metFor("Running (10 km/h)")).toBe(9.8);
    expect(metFor("Nope")).toBeUndefined();
  });
});

describe("classifyCardio (pace → MET)", () => {
  it("labels a brisk walk", () => {
    // 6 km in 60 min = 6 km/h
    expect(classifyCardio(6, 60)).toMatchObject({ met: 4.3, speedKmh: 6 });
  });

  it("labels a run from a faster pace", () => {
    // 5 km in 30 min = 10 km/h
    const est = classifyCardio(5, 30);
    expect(est).toMatchObject({ met: 9.8, speedKmh: 10 });
    expect(est?.activity).toBe("Run (10 km/h)");
  });

  it("returns null without both distance and duration", () => {
    expect(classifyCardio(0, 30)).toBeNull();
    expect(classifyCardio(5, 0)).toBeNull();
  });
});

describe("metForIntensity", () => {
  it("maps strength intensity to a MET", () => {
    expect(metForIntensity("light")).toBe(3.5);
    expect(metForIntensity("moderate")).toBe(5.0);
    expect(metForIntensity("vigorous")).toBe(6.0);
  });
});

describe("parseExerciseCsv", () => {
  it("parses date/activity/calories with aliases and optional fields", () => {
    const csv = [
      "date,workout,duration,kcal,steps",
      "2026-06-01,Running,40,420,0",
    ].join("\n");
    const { valid, errors } = parseExerciseCsv(csv);

    expect(errors).toHaveLength(0);
    expect(valid[0]).toMatchObject({
      activity: "Running",
      durationMin: 40,
      caloriesBurned: 420,
    });
    expect(valid[0].date.toISOString()).toBe("2026-06-01T00:00:00.000Z");
  });

  it("flags rows missing the activity", () => {
    const { valid, errors } = parseExerciseCsv(
      ["date,activity,calories", "2026-06-01,,300"].join("\n"),
    );
    expect(valid).toHaveLength(0);
    expect(errors[0].row).toBe(2);
  });

  it("imports a blank-header date column and auto-fills cardio rows", () => {
    // No activity/calories — just distance + duration under a headerless date.
    const csv = [
      ",distance,duration",
      "01/06/2026,5,30", // 10 km/h run
    ].join("\n");

    const { valid, errors } = parseExerciseCsv(csv, { weightKg: 80 });

    expect(errors).toHaveLength(0);
    expect(valid[0]).toMatchObject({
      activity: "Run (10 km/h)",
      distanceKm: 5,
      durationMin: 30,
      // 9.8 MET × 80kg × 0.5h = 392
      caloriesBurned: 392,
    });
    expect(valid[0].date.toISOString()).toBe("2026-06-01T00:00:00.000Z");
  });

  it("estimates calories for a strength row from a known activity MET", () => {
    const csv = [
      "date,activity,duration",
      "2026-06-01,Strength training,40", // MET 5.0
    ].join("\n");

    const { valid } = parseExerciseCsv(csv, { weightKg: 80 });
    // 5.0 × 80 × (40/60) = 266.67 → 267
    expect(valid[0].caloriesBurned).toBe(267);
  });

  it("produces a stable externalId for dedup", () => {
    const csv = ["date,activity,calories", "2026-06-01,Run,400"].join("\n");
    const a = parseExerciseCsv(csv).valid[0];
    const b = parseExerciseCsv(csv).valid[0];
    expect(externalIdFor(a)).toBe(externalIdFor(b));
  });
});

function ex(overrides: Partial<ExerciseEntryDTO> = {}): ExerciseEntryDTO {
  return {
    id: Math.random().toString(36).slice(2),
    activity: "Run",
    date: "2026-06-01T00:00:00.000Z",
    durationMin: 30,
    met: null,
    caloriesBurned: 300,
    steps: null,
    distanceKm: null,
    note: null,
    source: "MANUAL",
    ...overrides,
  };
}

describe("dailyBurn / summarizeExercise", () => {
  it("sums burn + steps per day, oldest first", () => {
    const points = dailyBurn([
      ex({ date: "2026-06-02T00:00:00.000Z", caloriesBurned: 200, steps: 8000 }),
      ex({ date: "2026-06-01T00:00:00.000Z", caloriesBurned: 300 }),
      ex({ date: "2026-06-01T00:00:00.000Z", caloriesBurned: 150, steps: 5000 }),
    ]);

    expect(points.map((p) => p.date)).toEqual(["2026-06-01", "2026-06-02"]);
    expect(points[0].calories).toBe(450);
    expect(points[0].steps).toBe(5000);
  });

  it("summarises totals and per-day average", () => {
    const s = summarizeExercise([
      ex({ date: "2026-06-01T00:00:00.000Z", caloriesBurned: 300 }),
      ex({ date: "2026-06-01T00:00:00.000Z", caloriesBurned: 200 }),
      ex({ date: "2026-06-02T00:00:00.000Z", caloriesBurned: 500 }),
    ]);
    expect(s.totalCalories).toBe(1000);
    expect(s.sessionCount).toBe(3);
    expect(s.dayCount).toBe(2);
    expect(s.avgCaloriesPerDay).toBe(500);
  });
});

import { describe, it, expect } from "vitest";
import { weightTrend, weightChange } from "./analytics";
import { parseWeightCsv, externalIdFor } from "./csv";
import type { WeightEntryDTO } from "./types";

function w(date: string, weightKg: number): WeightEntryDTO {
  return {
    id: Math.random().toString(36).slice(2),
    date: `${date}T00:00:00.000Z`,
    weightKg,
    note: null,
    source: "MANUAL",
  };
}

describe("weightTrend", () => {
  it("sorts oldest first", () => {
    const t = weightTrend([w("2026-06-08", 81), w("2026-06-01", 83)]);
    expect(t.map((p) => p.date)).toEqual(["2026-06-01", "2026-06-08"]);
    expect(t[0].weightKg).toBe(83);
  });
});

describe("weightChange", () => {
  it("computes net change and weekly rate over the span", () => {
    const c = weightChange([w("2026-06-01", 83), w("2026-06-08", 81.6)])!;
    expect(c.days).toBe(7);
    expect(c.netChangeKg).toBe(-1.4);
    expect(c.perWeekKg).toBe(-1.4);
  });

  it("returns null with fewer than two measurements", () => {
    expect(weightChange([w("2026-06-01", 83)])).toBeNull();
    expect(weightChange([])).toBeNull();
  });
});

describe("parseWeightCsv", () => {
  it("parses date + weight with aliases and dedups identical rows", () => {
    const csv = ["date,weight (kg),note", "01/06/2026,83.2,morning"].join("\n");
    const { valid, errors } = parseWeightCsv(csv);

    expect(errors).toHaveLength(0);
    expect(valid[0]).toMatchObject({ weightKg: 83.2, note: "morning" });
    expect(valid[0].date.toISOString()).toBe("2026-06-01T00:00:00.000Z");
    expect(externalIdFor(valid[0])).toBe(externalIdFor(parseWeightCsv(csv).valid[0]));
  });

  it("flags rows with an invalid or missing weight", () => {
    const { valid, errors } = parseWeightCsv(
      ["date,weight", "2026-06-01,"].join("\n"),
    );
    expect(valid).toHaveLength(0);
    expect(errors[0].row).toBe(2);
  });
});

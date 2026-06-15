import { describe, it, expect } from "vitest";
import { parseDietCsv, externalIdFor } from "./csv";

describe("parseDietCsv", () => {
  it("parses a per-item row with macros and meal", () => {
    const csv = [
      "date,name,meal,calories,protein,carbs,fat,quantity",
      "2026-06-01,Greek yoghurt,breakfast,120,10,6,4,170",
    ].join("\n");

    const { valid, errors } = parseDietCsv(csv);

    expect(errors).toHaveLength(0);
    expect(valid).toHaveLength(1);
    expect(valid[0]).toMatchObject({
      name: "Greek yoghurt",
      mealType: "BREAKFAST",
      isDailyTotal: false,
      quantityG: 170,
      calories: 120,
      protein: 10,
      carbs: 6,
      fat: 4,
    });
    expect(valid[0].date.toISOString()).toBe("2026-06-01T00:00:00.000Z");
  });

  it("treats a row with no name as a daily total", () => {
    const csv = ["date,calories,protein,carbs,fat", "2026-06-02,2100,150,200,70"].join(
      "\n",
    );

    const { valid } = parseDietCsv(csv);

    expect(valid[0]).toMatchObject({
      name: "Daily total",
      isDailyTotal: true,
      calories: 2100,
    });
    expect(valid[0].mealType).toBeUndefined();
  });

  it("accepts header aliases and DD/MM/YYYY dates, blank macros => 0", () => {
    const csv = ["day,food,kcal,protein", "01/06/2026,Banana,105,1.3"].join("\n");

    const { valid } = parseDietCsv(csv);

    expect(valid[0]).toMatchObject({ name: "Banana", calories: 105, carbs: 0, fat: 0 });
    expect(valid[0].date.toISOString()).toBe("2026-06-01T00:00:00.000Z");
  });

  it("imports the day-breakdown export: blank date header + singular macros", () => {
    // Matches the real "2026 - day breakdown" file: an un-named date column and
    // protein/fat/carb/calorie in that order.
    const csv = [
      ",protein,fat,carb,calorie",
      "31/05/2026,197.8,120.95,140.5,2435",
      "01/06/2026,70.6,78.4,61.7,1281",
    ].join("\n");

    const { valid, errors } = parseDietCsv(csv);

    expect(errors).toHaveLength(0);
    expect(valid).toHaveLength(2);
    expect(valid[0]).toMatchObject({
      name: "Daily total",
      isDailyTotal: true,
      protein: 197.8,
      fat: 120.95,
      carbs: 140.5,
      calories: 2435,
    });
    expect(valid[0].date.toISOString()).toBe("2026-05-31T00:00:00.000Z");
  });

  it("reports invalid dates with their row number", () => {
    const csv = ["date,calories", "not-a-date,500"].join("\n");

    const { valid, errors } = parseDietCsv(csv);

    expect(valid).toHaveLength(0);
    expect(errors[0]).toMatchObject({ row: 2 });
  });
});

describe("externalIdFor", () => {
  it("is stable for identical rows (enables dedup on re-import)", () => {
    const csv = ["date,name,calories,protein,carbs,fat", "2026-06-01,Egg,78,6,0.6,5"].join(
      "\n",
    );
    const a = parseDietCsv(csv).valid[0];
    const b = parseDietCsv(csv).valid[0];

    expect(externalIdFor(a)).toBe(externalIdFor(b));
  });

  it("differs when macros differ (a corrected value is a new row)", () => {
    const base = parseDietCsv(
      ["date,name,calories,protein,carbs,fat", "2026-06-01,Egg,78,6,0.6,5"].join("\n"),
    ).valid[0];
    const corrected = parseDietCsv(
      ["date,name,calories,protein,carbs,fat", "2026-06-01,Egg,90,6,0.6,5"].join("\n"),
    ).valid[0];

    expect(externalIdFor(base)).not.toBe(externalIdFor(corrected));
  });
});

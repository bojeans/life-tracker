import { describe, it, expect } from "vitest";
import { buildUtcDate, parseFlexibleDate, formatMonthLabel } from "./dates";

describe("buildUtcDate", () => {
  it("builds a UTC-midnight date", () => {
    const d = buildUtcDate(2026, 6, 1);
    expect(d?.toISOString()).toBe("2026-06-01T00:00:00.000Z");
  });

  it("rejects impossible dates", () => {
    expect(buildUtcDate(2026, 2, 30)).toBeNull();
    expect(buildUtcDate(2026, 13, 1)).toBeNull();
  });
});

describe("parseFlexibleDate", () => {
  it("parses DD/MM/YYYY at UTC midnight", () => {
    expect(parseFlexibleDate("01/06/2026")?.toISOString()).toBe(
      "2026-06-01T00:00:00.000Z",
    );
    // Day-first: 02/01 is 2 Jan, not 1 Feb.
    expect(parseFlexibleDate("02/01/2026")?.toISOString()).toBe(
      "2026-01-02T00:00:00.000Z",
    );
  });

  it("parses ISO YYYY-MM-DD at UTC midnight", () => {
    expect(parseFlexibleDate("2026-06-01")?.toISOString()).toBe(
      "2026-06-01T00:00:00.000Z",
    );
  });

  it("returns null for unrecognised or invalid input", () => {
    expect(parseFlexibleDate("nope")).toBeNull();
    expect(parseFlexibleDate("32/01/2026")).toBeNull();
  });
});

describe("formatMonthLabel", () => {
  it("formats a YYYY-MM key with month name and year", () => {
    // ICU may render "short" as "Jun" or "June" depending on the runtime.
    expect(formatMonthLabel("2026-06")).toMatch(/^June? 2026$/);
  });
});

import { describe, it, expect } from "vitest";
import {
  buildMediaWhere,
  isEmptyMediaFilter,
  EMPTY_MEDIA_FILTER,
} from "./media-filters";

describe("isEmptyMediaFilter", () => {
  it("is true for the empty filter and false once any field is set", () => {
    expect(isEmptyMediaFilter(EMPTY_MEDIA_FILTER)).toBe(true);
    expect(isEmptyMediaFilter({ album: "Japan" })).toBe(false);
    expect(isEmptyMediaFilter({ tag: "beach" })).toBe(false);
    expect(isEmptyMediaFilter({ from: "2026-01-01" })).toBe(false);
  });
});

describe("buildMediaWhere", () => {
  it("returns an empty object for no filter", () => {
    expect(buildMediaWhere({})).toEqual({});
  });

  it("matches album exactly and tags by membership", () => {
    expect(buildMediaWhere({ album: "Japan", tag: "temple" })).toEqual({
      album: "Japan",
      tags: { has: "temple" },
    });
  });

  it("builds an inclusive UTC date range on takenAt", () => {
    const where = buildMediaWhere({ from: "2026-03-01", to: "2026-03-31" });
    const takenAt = where.takenAt as { gte: Date; lte: Date };
    expect(takenAt.gte.toISOString()).toBe("2026-03-01T00:00:00.000Z");
    expect(takenAt.lte.toISOString()).toBe("2026-03-31T23:59:59.999Z");
  });

  it("supports an open-ended (from only) range", () => {
    const where = buildMediaWhere({ from: "2026-03-01" });
    const takenAt = where.takenAt as { gte?: Date; lte?: Date };
    expect(takenAt.gte?.toISOString()).toBe("2026-03-01T00:00:00.000Z");
    expect(takenAt.lte).toBeUndefined();
  });
});

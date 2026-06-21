import { describe, it, expect } from "vitest";
import { encodeCursor, decodeCursor, cursorWhere } from "./media-cursor";

describe("cursor encode/decode", () => {
  it("round-trips a cursor with a takenAt", () => {
    const c = { takenAt: "2026-03-15T00:00:00.000Z", id: "abc123" };
    expect(decodeCursor(encodeCursor(c))).toEqual(c);
  });

  it("round-trips a cursor with no takenAt", () => {
    const c = { takenAt: null, id: "abc123" };
    expect(decodeCursor(encodeCursor(c))).toEqual(c);
  });

  it("returns null for malformed input", () => {
    expect(decodeCursor("not-base64!!")).toBeNull();
    // Decodes but has no id segment.
    expect(decodeCursor(Buffer.from("only").toString("base64url"))).toBeNull();
  });
});

describe("cursorWhere", () => {
  it("selects rows after the cursor under (takenAt desc, id desc)", () => {
    const where = cursorWhere({
      takenAt: "2026-03-15T00:00:00.000Z",
      id: "m5",
    }) as { OR: Array<Record<string, unknown>> };

    expect(where.OR).toHaveLength(2);
    const [older, sameDay] = where.OR;
    expect((older.takenAt as { lt: Date }).lt.toISOString()).toBe(
      "2026-03-15T00:00:00.000Z",
    );
    expect(sameDay.id).toEqual({ lt: "m5" });
  });

  it("pages by id alone when the cursor has no takenAt", () => {
    expect(cursorWhere({ takenAt: null, id: "m9" })).toEqual({
      takenAt: null,
      id: { lt: "m9" },
    });
  });
});

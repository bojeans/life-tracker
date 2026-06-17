import { describe, it, expect } from "vitest";
import { parseBalancesCsv } from "./networth-csv";

describe("parseBalancesCsv", () => {
  it("parses the wide account-by-date layout", () => {
    const csv = [
      "Date,kiwibank,Sharesies Investments,Student Loan",
      "31/01/2026,2127.39,8669.57,28468.4",
      "28/02/2026,2146.59,12460.6,28008.04",
    ].join("\n");

    const { columns, rows, errors } = parseBalancesCsv(csv);

    expect(errors).toEqual([]);
    expect(columns).toEqual([
      "kiwibank",
      "Sharesies Investments",
      "Student Loan",
    ]);
    expect(rows).toHaveLength(2);
    expect(rows[0].date.toISOString().slice(0, 10)).toBe("2026-01-31");
    expect(rows[0].cells).toEqual([
      { column: "kiwibank", balance: 2127.39 },
      { column: "Sharesies Investments", balance: 8669.57 },
      { column: "Student Loan", balance: 28468.4 },
    ]);
  });

  it("treats a blank cell as not-measured (skipped) but keeps an explicit 0", () => {
    const csv = [
      "Date,kiwibank,Sharesies Savings",
      "31/01/2026,2127.39,0",
      "28/02/2026,,17012.7",
    ].join("\n");

    const { rows } = parseBalancesCsv(csv);

    // Row 1: 0 is a real recorded balance and is kept.
    expect(rows[0].cells).toEqual([
      { column: "kiwibank", balance: 2127.39 },
      { column: "Sharesies Savings", balance: 0 },
    ]);
    // Row 2: blank kiwibank cell is skipped, not recorded as 0.
    expect(rows[1].cells).toEqual([
      { column: "Sharesies Savings", balance: 17012.7 },
    ]);
  });

  it("drops fully-empty rows (e.g. future months) without error", () => {
    const csv = [
      "Date,kiwibank",
      "31/01/2026,2127.39",
      "28/02/2026,",
      "31/03/2026,",
    ].join("\n");

    const { rows, errors } = parseBalancesCsv(csv);

    expect(errors).toEqual([]);
    expect(rows).toHaveLength(1);
  });

  it("strips currency symbols and thousands separators", () => {
    const csv = ["Date,kiwibank", "31/01/2026,\"$2,127.39\""].join("\n");

    const { rows } = parseBalancesCsv(csv);

    expect(rows[0].cells[0].balance).toBe(2127.39);
  });

  it("accepts a negative balance (e.g. an overdrawn account)", () => {
    const csv = ["Date,Everyday", "31/01/2026,-150.5"].join("\n");

    const { rows } = parseBalancesCsv(csv);

    expect(rows[0].cells[0].balance).toBe(-150.5);
  });

  it("reports invalid dates and amounts with their row number", () => {
    const csv = [
      "Date,kiwibank",
      "not-a-date,100",
      "28/02/2026,abc",
    ].join("\n");

    const { rows, errors } = parseBalancesCsv(csv);

    expect(rows).toHaveLength(0);
    expect(errors).toEqual([
      { row: 2, message: 'Invalid date "not-a-date"' },
      { row: 3, message: 'Invalid balance "abc" in "kiwibank"' },
    ]);
  });

  it("returns empty results for a header-only or empty file", () => {
    expect(parseBalancesCsv("Date,kiwibank").rows).toEqual([]);
    expect(parseBalancesCsv("").rows).toEqual([]);
  });
});

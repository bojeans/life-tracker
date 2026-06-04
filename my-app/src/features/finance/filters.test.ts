import { describe, it, expect } from "vitest";
import {
  filterTransactions,
  availableCategories,
  presetRange,
  EMPTY_FILTER,
  type TransactionFilter,
} from "./filters";
import type { TransactionDTO } from "./types";

function txn(overrides: Partial<TransactionDTO> = {}): TransactionDTO {
  return {
    id: Math.random().toString(36).slice(2),
    type: "EXPENSE",
    amount: 10,
    currency: "AUD",
    category: "Groceries",
    description: null,
    date: "2026-06-15T00:00:00.000Z",
    source: "MANUAL",
    ...overrides,
  };
}

const data: TransactionDTO[] = [
  txn({ category: "Groceries", description: "Woolworths", date: "2026-06-02T00:00:00.000Z" }),
  txn({ category: "Coffee", description: "Flat white", date: "2026-05-20T00:00:00.000Z" }),
  txn({ category: "Salary", type: "INCOME", description: null, date: "2026-04-01T00:00:00.000Z" }),
  txn({ category: "Coffee", description: "Beans", date: "2026-03-10T00:00:00.000Z" }),
];

describe("filterTransactions", () => {
  it("returns everything for the empty filter", () => {
    expect(filterTransactions(data, EMPTY_FILTER)).toHaveLength(4);
    expect(filterTransactions(data, {})).toHaveLength(4);
  });

  it("filters by type", () => {
    expect(filterTransactions(data, { type: "INCOME" })).toHaveLength(1);
    expect(filterTransactions(data, { type: "EXPENSE" })).toHaveLength(3);
    expect(filterTransactions(data, { type: "ALL" })).toHaveLength(4);
  });

  it("filters by category set (empty array = all)", () => {
    expect(filterTransactions(data, { categories: ["Coffee"] })).toHaveLength(2);
    expect(
      filterTransactions(data, { categories: ["Coffee", "Salary"] }),
    ).toHaveLength(3);
    expect(filterTransactions(data, { categories: [] })).toHaveLength(4);
  });

  it("searches category and description, case-insensitively", () => {
    expect(filterTransactions(data, { search: "coffee" })).toHaveLength(2);
    expect(filterTransactions(data, { search: "WOOLWORTHS" })).toHaveLength(1);
    expect(filterTransactions(data, { search: "  beans " })).toHaveLength(1);
    expect(filterTransactions(data, { search: "nope" })).toHaveLength(0);
  });

  it("filters by inclusive from/to date range", () => {
    expect(
      filterTransactions(data, { from: "2026-05-01", to: "2026-06-30" }),
    ).toHaveLength(2); // June groceries + May coffee
    expect(filterTransactions(data, { from: "2026-06-02", to: "2026-06-02" })).toHaveLength(1);
    expect(filterTransactions(data, { to: "2026-03-31" })).toHaveLength(1); // only March
  });

  it("combines criteria with AND", () => {
    const filter: TransactionFilter = {
      type: "EXPENSE",
      categories: ["Coffee"],
      from: "2026-05-01",
    };
    expect(filterTransactions(data, filter)).toHaveLength(1); // May coffee only
  });
});

describe("availableCategories", () => {
  it("returns distinct categories sorted alphabetically", () => {
    expect(availableCategories(data)).toEqual(["Coffee", "Groceries", "Salary"]);
  });
});

describe("presetRange", () => {
  const ref = new Date("2026-06-15T12:00:00.000Z");

  it("returns an empty window for 'all'", () => {
    expect(presetRange("all", ref)).toEqual({});
  });

  it("spans the current calendar month", () => {
    expect(presetRange("this-month", ref)).toEqual({
      from: "2026-06-01",
      to: "2026-06-30",
    });
  });

  it("spans three calendar months ending this month", () => {
    expect(presetRange("last-3-months", ref)).toEqual({
      from: "2026-04-01",
      to: "2026-06-30",
    });
  });

  it("spans the calendar year", () => {
    expect(presetRange("this-year", ref)).toEqual({
      from: "2026-01-01",
      to: "2026-12-31",
    });
  });

  it("handles a year boundary when going back three months", () => {
    expect(presetRange("last-3-months", new Date("2026-01-20T00:00:00.000Z"))).toEqual({
      from: "2025-11-01",
      to: "2026-01-31",
    });
  });
});

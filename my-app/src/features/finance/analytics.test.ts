import { describe, it, expect } from "vitest";
import { monthlyTotals, availableMonths } from "./analytics";
import type { TransactionDTO } from "./types";

function txn(date: string, type: "INCOME" | "EXPENSE", amount: number): TransactionDTO {
  return {
    id: `${date}-${amount}`,
    type,
    amount,
    currency: "AUD",
    category: "Misc",
    description: null,
    date: `${date}T00:00:00.000Z`,
    source: "MANUAL",
  };
}

describe("monthlyTotals", () => {
  it("returns an empty array for no transactions", () => {
    expect(monthlyTotals([])).toEqual([]);
  });

  it("buckets by month and computes income/expense/net", () => {
    const result = monthlyTotals([
      txn("2026-05-10", "INCOME", 5000),
      txn("2026-05-12", "EXPENSE", 1200),
      txn("2026-05-20", "EXPENSE", 300),
    ]);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      month: "2026-05",
      income: 5000,
      expense: 1500,
      net: 3500,
    });
  });

  it("sorts months oldest-first regardless of input order", () => {
    const result = monthlyTotals([
      txn("2026-06-01", "EXPENSE", 100),
      txn("2026-04-01", "INCOME", 200),
      txn("2026-05-01", "EXPENSE", 50),
    ]);

    expect(result.map((r) => r.month)).toEqual([
      "2026-04",
      "2026-05",
      "2026-06",
    ]);
  });
});

describe("availableMonths", () => {
  it("returns distinct months newest-first", () => {
    const result = availableMonths([
      txn("2026-04-01", "INCOME", 200),
      txn("2026-06-15", "EXPENSE", 100),
      txn("2026-06-02", "EXPENSE", 50),
      txn("2026-05-01", "EXPENSE", 50),
    ]);

    expect(result.map((m) => m.value)).toEqual([
      "2026-06",
      "2026-05",
      "2026-04",
    ]);
  });

  it("returns an empty array for no transactions", () => {
    expect(availableMonths([])).toEqual([]);
  });
});

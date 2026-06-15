import { describe, it, expect } from "vitest";
import { summarizeTransactions } from "./summary";
import type { TransactionDTO } from "./types";

function txn(partial: Partial<TransactionDTO>): TransactionDTO {
  return {
    id: Math.random().toString(),
    type: "EXPENSE",
    amount: 0,
    currency: "AUD",
    category: "Misc",
    description: null,
    date: "2026-06-01T00:00:00.000Z",
    source: "MANUAL",
    ...partial,
  };
}

describe("summarizeTransactions", () => {
  it("returns zeros for an empty list", () => {
    expect(summarizeTransactions([])).toEqual({
      totalIncome: 0,
      totalExpense: 0,
      totalTransfers: 0,
      net: 0,
      count: 0,
      byCategory: [],
    });
  });

  it("excludes transfers from income, expense, net and categories", () => {
    const result = summarizeTransactions([
      txn({ type: "INCOME", amount: 5000, category: "Salary" }),
      txn({ type: "EXPENSE", amount: 200, category: "Rent" }),
      txn({ type: "TRANSFER", amount: 600, category: "To Sharesies" }),
    ]);

    expect(result.totalIncome).toBe(5000);
    expect(result.totalExpense).toBe(200);
    expect(result.totalTransfers).toBe(600);
    expect(result.net).toBe(4800); // transfer not counted
    expect(result.byCategory).toEqual([{ category: "Rent", total: 200 }]);
  });

  it("totals income and expense and computes net", () => {
    const result = summarizeTransactions([
      txn({ type: "INCOME", amount: 1000, category: "Salary" }),
      txn({ type: "EXPENSE", amount: 200, category: "Rent" }),
      txn({ type: "EXPENSE", amount: 50.5, category: "Food" }),
    ]);

    expect(result.totalIncome).toBe(1000);
    expect(result.totalExpense).toBe(250.5);
    expect(result.net).toBe(749.5);
    expect(result.count).toBe(3);
  });

  it("groups expenses by category, largest first, ignoring income", () => {
    const result = summarizeTransactions([
      txn({ type: "INCOME", amount: 5000, category: "Salary" }),
      txn({ type: "EXPENSE", amount: 30, category: "Food" }),
      txn({ type: "EXPENSE", amount: 70, category: "Food" }),
      txn({ type: "EXPENSE", amount: 200, category: "Rent" }),
    ]);

    expect(result.byCategory).toEqual([
      { category: "Rent", total: 200 },
      { category: "Food", total: 100 },
    ]);
  });

  it("avoids floating-point drift in totals", () => {
    const result = summarizeTransactions([
      txn({ type: "EXPENSE", amount: 0.1, category: "A" }),
      txn({ type: "EXPENSE", amount: 0.2, category: "A" }),
    ]);
    expect(result.totalExpense).toBe(0.3);
    expect(result.byCategory[0].total).toBe(0.3);
  });
});

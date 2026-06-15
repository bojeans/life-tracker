import { describe, expect, it } from "vitest";
import { incomeMetrics } from "./income-metrics";
import type { TransactionDTO } from "./types";

function txn(p: Partial<TransactionDTO>): TransactionDTO {
  return {
    id: Math.random().toString(),
    type: "EXPENSE",
    amount: 0,
    currency: "NZD",
    category: "Misc",
    description: null,
    date: "2026-06-01T00:00:00.000Z",
    source: "MANUAL",
    ...p,
  };
}

describe("incomeMetrics", () => {
  it("returns null without income", () => {
    expect(incomeMetrics([txn({ type: "EXPENSE", amount: 100 })])).toBeNull();
  });

  it("splits gross into tax, take-home, spending and savings", () => {
    const m = incomeMetrics([
      txn({ type: "INCOME", amount: 6800, category: "Salary" }),
      txn({ type: "EXPENSE", amount: 1496, category: "Tax" }),
      txn({ type: "EXPENSE", amount: 408, category: "Student loan" }),
      txn({ type: "EXPENSE", amount: 2000, category: "Groceries" }),
      txn({ type: "TRANSFER", amount: 204, category: "KiwiSaver" }),
    ])!;

    expect(m.grossIncome).toBe(6800);
    expect(m.deductions).toBe(1904); // tax + student loan
    expect(m.takeHome).toBe(4896); // 6800 − 1904
    expect(m.spending).toBe(2000); // groceries only (KiwiSaver is a transfer)
    expect(m.transfers).toBe(204);
    expect(m.saved).toBe(2896); // take-home − spending
    expect(m.effectiveTaxRate).toBe(0.28); // 1904 / 6800
    expect(m.savingsRate).toBe(0.59); // 2896 / 4896
  });

  it("treats KiwiSaver as saved, not spent", () => {
    const withKiwi = incomeMetrics([
      txn({ type: "INCOME", amount: 1000, category: "Salary" }),
      txn({ type: "TRANSFER", amount: 100, category: "KiwiSaver" }),
    ])!;
    // No spending → fully saved regardless of the transfer.
    expect(withKiwi.spending).toBe(0);
    expect(withKiwi.savingsRate).toBe(1);
  });
});

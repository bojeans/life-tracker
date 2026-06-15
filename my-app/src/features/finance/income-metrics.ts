import type { TransactionDTO } from "./types";

// Expense categories that are mandatory deductions, not discretionary spending.
// Used to split gross income into tax/deductions vs take-home, and to keep them
// out of the "spending" that the savings rate is measured against. KiwiSaver is
// deliberately NOT here — it's a TRANSFER to your own wealth, not a deduction.
const DEDUCTION_CATEGORIES = new Set([
  "tax",
  "paye",
  "paye tax",
  "income tax",
  "secondary tax",
  "student loan",
  "acc",
  "acc levy",
]);

export const isDeductionCategory = (category: string): boolean =>
  DEDUCTION_CATEGORIES.has(category.trim().toLowerCase());

export type IncomeMetrics = {
  grossIncome: number;
  deductions: number; // tax, student loan, etc.
  takeHome: number; // gross − deductions
  spending: number; // discretionary/living expenses (non-deduction)
  transfers: number; // moved to own wealth (e.g. KiwiSaver, → Sharesies)
  saved: number; // take-home not spent (sits in bank + transferred to wealth)
  effectiveTaxRate: number; // deductions / gross (0..1)
  savingsRate: number; // saved / take-home (0..1)
};

const round2 = (n: number) => Math.round(n * 100) / 100;

// Income/tax/savings breakdown from a set of transactions. Null when there's no
// income to measure against. Works on whatever set it's given, so it respects
// the dashboard's date/currency filters.
export function incomeMetrics(
  transactions: TransactionDTO[],
): IncomeMetrics | null {
  let grossIncome = 0;
  let deductions = 0;
  let spending = 0;
  let transfers = 0;

  for (const t of transactions) {
    if (t.type === "INCOME") grossIncome += t.amount;
    else if (t.type === "TRANSFER") transfers += t.amount;
    else if (isDeductionCategory(t.category)) deductions += t.amount;
    else spending += t.amount;
  }

  if (grossIncome <= 0) return null;

  const takeHome = grossIncome - deductions;
  // Transfers to wealth come out of take-home but are still savings (just
  // relocated), so "saved" = take-home not spent already includes them.
  const saved = takeHome - spending;

  return {
    grossIncome: round2(grossIncome),
    deductions: round2(deductions),
    takeHome: round2(takeHome),
    spending: round2(spending),
    transfers: round2(transfers),
    saved: round2(saved),
    effectiveTaxRate: round2(deductions / grossIncome),
    savingsRate: takeHome !== 0 ? round2(saved / takeHome) : 0,
  };
}

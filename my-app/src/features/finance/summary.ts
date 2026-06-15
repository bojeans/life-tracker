import type { TransactionDTO } from "./types";

export type CategoryTotal = { category: string; total: number };

export type FinanceSummary = {
  totalIncome: number;
  totalExpense: number;
  // Total moved between own accounts (TRANSFER). Excluded from income/expense
  // and net — it's not spending or earning, just relocating money.
  totalTransfers: number;
  net: number;
  count: number;
  // Expense totals per category, largest first.
  byCategory: CategoryTotal[];
};

const round2 = (n: number) => Math.round(n * 100) / 100;

export function summarizeTransactions(
  transactions: TransactionDTO[],
): FinanceSummary {
  let totalIncome = 0;
  let totalExpense = 0;
  let totalTransfers = 0;
  const categoryMap = new Map<string, number>();

  for (const t of transactions) {
    if (t.type === "INCOME") {
      totalIncome += t.amount;
    } else if (t.type === "TRANSFER") {
      totalTransfers += t.amount;
    } else {
      totalExpense += t.amount;
      categoryMap.set(t.category, (categoryMap.get(t.category) ?? 0) + t.amount);
    }
  }

  const byCategory = [...categoryMap.entries()]
    .map(([category, total]) => ({ category, total: round2(total) }))
    .sort((a, b) => b.total - a.total);

  return {
    totalIncome: round2(totalIncome),
    totalExpense: round2(totalExpense),
    totalTransfers: round2(totalTransfers),
    net: round2(totalIncome - totalExpense),
    count: transactions.length,
    byCategory,
  };
}

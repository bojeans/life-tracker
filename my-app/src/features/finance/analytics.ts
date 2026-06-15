import type { TransactionDTO } from "./types";
import { formatMonthLabel } from "@/features/shared/dates";

export type MonthlyPoint = {
  month: string; // "YYYY-MM"
  label: string; // "Jun 2026"
  income: number;
  expense: number;
  net: number;
};

const round2 = (n: number) => Math.round(n * 100) / 100;

// Aggregates transactions into per-month income/expense/net, oldest month first.
export function monthlyTotals(transactions: TransactionDTO[]): MonthlyPoint[] {
  const map = new Map<string, { income: number; expense: number }>();

  for (const t of transactions) {
    const month = t.date.slice(0, 7); // ISO date -> "YYYY-MM"
    const entry = map.get(month) ?? { income: 0, expense: 0 };
    // TRANSFERs are own-account moves — excluded from the income/expense bars.
    if (t.type === "INCOME") entry.income += t.amount;
    else if (t.type === "EXPENSE") entry.expense += t.amount;
    map.set(month, entry);
  }

  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, v]) => ({
      month,
      label: formatMonthLabel(month),
      income: round2(v.income),
      expense: round2(v.expense),
      net: round2(v.income - v.expense),
    }));
}

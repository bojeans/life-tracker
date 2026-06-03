import type { TransactionDTO } from "./types";

export type MonthlyPoint = {
  month: string; // "YYYY-MM"
  label: string; // "Jun 2026"
  income: number;
  expense: number;
  net: number;
};

const round2 = (n: number) => Math.round(n * 100) / 100;

function formatMonthLabel(month: string): string {
  const [year, m] = month.split("-").map(Number);
  return new Date(year, m - 1, 1).toLocaleDateString("en-AU", {
    month: "short",
    year: "numeric",
  });
}

// Distinct months present in the data, newest first, for filter controls.
export function availableMonths(
  transactions: TransactionDTO[],
): { value: string; label: string }[] {
  const months = new Set<string>();
  for (const t of transactions) months.add(t.date.slice(0, 7));
  return [...months]
    .sort((a, b) => b.localeCompare(a))
    .map((m) => ({ value: m, label: formatMonthLabel(m) }));
}

// Aggregates transactions into per-month income/expense/net, oldest month first.
export function monthlyTotals(transactions: TransactionDTO[]): MonthlyPoint[] {
  const map = new Map<string, { income: number; expense: number }>();

  for (const t of transactions) {
    const month = t.date.slice(0, 7); // ISO date -> "YYYY-MM"
    const entry = map.get(month) ?? { income: 0, expense: 0 };
    if (t.type === "INCOME") entry.income += t.amount;
    else entry.expense += t.amount;
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

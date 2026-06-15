"use client";

import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { monthlyTotals } from "./analytics";
import { categoryTotals } from "./summary";
import { BASE_CURRENCY, formatMoney } from "./currency";
import type { TransactionDTO } from "./types";

const CATEGORY_COLORS = [
  "#0ea5e9",
  "#f43f5e",
  "#22c55e",
  "#a855f7",
  "#f59e0b",
  "#14b8a6",
  "#64748b",
];

type ChartType = "ALL" | "INCOME" | "EXPENSE" | "TRANSFER";

const PIE_TITLE: Record<Exclude<ChartType, "ALL">, string> = {
  INCOME: "Income by category",
  EXPENSE: "Spending by category",
  TRANSFER: "Transfers by category",
};
const PIE_EMPTY: Record<Exclude<ChartType, "ALL">, string> = {
  INCOME: "No income in this period.",
  EXPENSE: "No expenses in this period.",
  TRANSFER: "No transfers in this period.",
};

// One chart, chosen by the active type filter: the monthly income-vs-expense
// bars for "All", or a by-category pie for a single type. (Showing both at once
// got noisy once "other" entries fan out into many categories.)
export function FinanceCharts({
  transactions,
  currency = BASE_CURRENCY,
  type = "ALL",
}: {
  transactions: TransactionDTO[];
  currency?: string;
  type?: ChartType;
}) {
  const money = (n: number) => formatMoney(n, currency, { whole: true });
  const monthly = useMemo(() => monthlyTotals(transactions), [transactions]);
  const pieData = useMemo(
    () => (type === "ALL" ? [] : categoryTotals(transactions, type)),
    [transactions, type],
  );

  if (type === "ALL") {
    return (
      <ChartCard title="Income vs expenses by month">
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={monthly} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
            <XAxis dataKey="label" fontSize={12} tickLine={false} />
            <YAxis
              fontSize={12}
              tickLine={false}
              axisLine={false}
              width={48}
              tickFormatter={(v) => money(Number(v))}
            />
            <Tooltip formatter={(v) => money(Number(v))} />
            <Bar dataKey="income" name="Income" fill="#22c55e" radius={[4, 4, 0, 0]} />
            <Bar dataKey="expense" name="Expenses" fill="#ef4444" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    );
  }

  return (
    <ChartCard title={PIE_TITLE[type]}>
      {pieData.length === 0 ? (
        <div className="text-muted-foreground flex h-[280px] items-center justify-center text-sm">
          {PIE_EMPTY[type]}
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie
              data={pieData}
              dataKey="total"
              nameKey="category"
              cx="50%"
              cy="50%"
              outerRadius={100}
              label={(props: { name?: string }) => props.name ?? ""}
              fontSize={12}
            >
              {pieData.map((_, i) => (
                <Cell key={i} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(v) => money(Number(v))} />
          </PieChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}

function ChartCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3 rounded-lg border p-4">
      <h2 className="font-semibold">{title}</h2>
      {children}
    </div>
  );
}

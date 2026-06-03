"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { getTransactions } from "./actions";
import { monthlyTotals } from "./analytics";
import { summarizeTransactions } from "./summary";
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

const aud = (n: number) =>
  new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  }).format(n);

export function FinanceDashboard({
  initialData,
}: {
  initialData: TransactionDTO[];
}) {
  const { data: transactions = [] } = useQuery({
    queryKey: ["transactions"],
    queryFn: () => getTransactions(),
    initialData,
  });

  const monthly = useMemo(() => monthlyTotals(transactions), [transactions]);
  const byCategory = useMemo(
    () => summarizeTransactions(transactions).byCategory,
    [transactions],
  );

  if (transactions.length === 0) {
    return null;
  }

  return (
    <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <ChartCard title="Income vs expenses by month">
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={monthly} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
            <XAxis dataKey="label" fontSize={12} tickLine={false} />
            <YAxis
              fontSize={12}
              tickLine={false}
              axisLine={false}
              width={48}
              tickFormatter={(v) => aud(Number(v))}
            />
            <Tooltip formatter={(v) => aud(Number(v))} />
            <Legend />
            <Bar dataKey="income" name="Income" fill="#22c55e" radius={[4, 4, 0, 0]} />
            <Bar dataKey="expense" name="Expenses" fill="#ef4444" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Spending by category">
        {byCategory.length === 0 ? (
          <div className="text-muted-foreground flex h-[260px] items-center justify-center text-sm">
            No expenses yet.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={byCategory}
                dataKey="total"
                nameKey="category"
                cx="50%"
                cy="50%"
                outerRadius={90}
                label={(props: { name?: string }) => props.name ?? ""}
                fontSize={12}
              >
                {byCategory.map((_, i) => (
                  <Cell key={i} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v) => aud(Number(v))} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </ChartCard>
    </section>
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

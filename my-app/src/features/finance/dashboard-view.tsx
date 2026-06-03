"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getTransactions } from "./actions";
import { availableMonths } from "./analytics";
import { summarizeTransactions } from "./summary";
import { formatCurrency } from "./format";
import { FinanceCharts } from "./finance-charts";
import type { TransactionDTO } from "./types";
import { cn } from "@/lib/utils";

export function FinanceDashboardView({
  initialData,
}: {
  initialData: TransactionDTO[];
}) {
  const { data: transactions = [] } = useQuery({
    queryKey: ["transactions"],
    queryFn: () => getTransactions(),
    initialData,
  });

  const [month, setMonth] = useState<string>("all");
  const months = useMemo(() => availableMonths(transactions), [transactions]);

  const filtered = useMemo(
    () =>
      month === "all"
        ? transactions
        : transactions.filter((t) => t.date.slice(0, 7) === month),
    [transactions, month],
  );

  const summary = useMemo(() => summarizeTransactions(filtered), [filtered]);
  const recent = filtered.slice(0, 8);

  if (transactions.length === 0) {
    return (
      <p className="text-muted-foreground rounded-lg border border-dashed p-8 text-center text-sm">
        No transactions yet. Head to{" "}
        <span className="font-medium">Manage</span> to add some or import a CSV.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {/* Month filter */}
      <div className="flex flex-wrap gap-2">
        <FilterChip active={month === "all"} onClick={() => setMonth("all")}>
          All
        </FilterChip>
        {months.map((m) => (
          <FilterChip
            key={m.value}
            active={month === m.value}
            onClick={() => setMonth(m.value)}
          >
            {m.label}
          </FilterChip>
        ))}
      </div>

      {/* Summary cards */}
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <SummaryCard label="Income" value={formatCurrency(summary.totalIncome)} accent="text-green-600" />
        <SummaryCard label="Expenses" value={formatCurrency(summary.totalExpense)} accent="text-destructive" />
        <SummaryCard
          label="Net"
          value={formatCurrency(summary.net)}
          accent={summary.net >= 0 ? "text-green-600" : "text-destructive"}
        />
      </section>

      <FinanceCharts transactions={filtered} />

      {/* Recent transactions (read-only) */}
      <section className="space-y-3">
        <h2 className="font-semibold">Recent transactions</h2>
        {recent.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No transactions in this period.
          </p>
        ) : (
          <ul className="divide-y rounded-lg border">
            {recent.map((t) => (
              <li
                key={t.id}
                className="flex items-center justify-between gap-4 p-3"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{t.category}</p>
                  <p className="text-muted-foreground text-sm">
                    {new Date(t.date).toLocaleDateString("en-AU", {
                      timeZone: "UTC",
                    })}
                    {t.description ? ` · ${t.description}` : ""}
                  </p>
                </div>
                <span
                  className={
                    t.type === "EXPENSE" ? "text-destructive" : "text-green-600"
                  }
                >
                  {t.type === "EXPENSE" ? "-" : "+"}
                  {formatCurrency(t.amount)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1 text-sm font-medium transition-colors",
        active
          ? "bg-foreground text-background border-foreground"
          : "text-muted-foreground hover:bg-muted",
      )}
    >
      {children}
    </button>
  );
}

function SummaryCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <div className="rounded-lg border p-4">
      <p className="text-muted-foreground text-sm">{label}</p>
      <p className={`mt-1 text-xl font-semibold ${accent}`}>{value}</p>
    </div>
  );
}

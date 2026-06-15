"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getTransactions } from "./actions";
import { summarizeTransactions } from "./summary";
import { FinanceCharts } from "./finance-charts";
import { TransactionFilters } from "./transaction-filters";
import {
  BASE_CURRENCY,
  SUPPORTED_CURRENCIES,
  convertTransactions,
  formatMoney,
} from "./currency";
import { getExchangeRates } from "./currency-actions";
import {
  availableCategories,
  filterTransactions,
  EMPTY_FILTER,
  type TransactionFilter,
} from "./filters";
import type { TransactionDTO } from "./types";

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

  const [filter, setFilter] = useState<TransactionFilter>(EMPTY_FILTER);
  const [viewCurrency, setViewCurrency] = useState<string>(BASE_CURRENCY);

  const { data: rates } = useQuery({
    queryKey: ["fxRates"],
    queryFn: () => getExchangeRates(),
    staleTime: 60 * 60 * 1000,
  });

  // Convert every transaction into the chosen view currency before filtering /
  // aggregating, so summary cards and charts are all in one currency.
  const converted = useMemo(
    () => convertTransactions(transactions, viewCurrency, rates),
    [transactions, viewCurrency, rates],
  );

  const categories = useMemo(
    () => availableCategories(transactions),
    [transactions],
  );

  const filtered = useMemo(
    () => filterTransactions(converted, filter),
    [converted, filter],
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <TransactionFilters
            value={filter}
            onChange={setFilter}
            categories={categories}
          />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">View in</span>
          <select
            aria-label="View currency"
            value={viewCurrency}
            onChange={(e) => setViewCurrency(e.target.value)}
            className="border-input h-8 rounded-lg border bg-transparent px-2.5 text-sm"
          >
            {SUPPORTED_CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.code}
              </option>
            ))}
          </select>
        </label>
      </div>

      {viewCurrency !== BASE_CURRENCY && (
        <p className="text-muted-foreground text-xs">
          Converted to {viewCurrency} at today&apos;s rates
          {rates?.date ? ` (${rates.date})` : ""}. Original amounts are kept on
          each entry.
        </p>
      )}

      {/* Summary cards */}
      <section
        className={
          summary.totalTransfers > 0
            ? "grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4"
            : "grid grid-cols-1 gap-3 sm:grid-cols-3"
        }
      >
        <SummaryCard label="Income" value={formatMoney(summary.totalIncome, viewCurrency)} accent="text-green-600" />
        <SummaryCard label="Expenses" value={formatMoney(summary.totalExpense, viewCurrency)} accent="text-destructive" />
        <SummaryCard
          label="Net"
          value={formatMoney(summary.net, viewCurrency)}
          accent={summary.net >= 0 ? "text-green-600" : "text-destructive"}
        />
        {summary.totalTransfers > 0 && (
          <SummaryCard
            label="Transfers"
            value={formatMoney(summary.totalTransfers, viewCurrency)}
            accent="text-muted-foreground"
          />
        )}
      </section>

      <FinanceCharts transactions={filtered} currency={viewCurrency} />

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
                    t.type === "EXPENSE"
                      ? "text-destructive"
                      : t.type === "INCOME"
                        ? "text-green-600"
                        : "text-muted-foreground"
                  }
                >
                  {t.type === "EXPENSE" ? "-" : t.type === "INCOME" ? "+" : "↔ "}
                  {formatMoney(t.amount, viewCurrency)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
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

import { notFound } from "next/navigation";
import { getSharedFinance } from "@/features/finance/shared";
import { FinanceCharts } from "@/features/finance/finance-charts";
import { summarizeTransactions } from "@/features/finance/summary";
import {
  BASE_CURRENCY,
  convertTransactions,
  formatMoney,
} from "@/features/finance/currency";
import { getExchangeRates } from "@/features/finance/currency-actions";
import { getSharedHealth } from "@/features/health/shared";
import { SharedHealthCharts } from "@/features/health/shared-health-charts";
import { CategoryBadge } from "@/features/health/blood-pressure/category-badge";
import { LaunchDemoButton } from "@/features/demo/launch-demo-button";
import { ThemeToggle } from "@/components/theme-toggle";

interface Props {
  params: Promise<{ shareToken: string }>;
}

const money = (n: number, whole = false) =>
  formatMoney(n, BASE_CURRENCY, { whole });

const kg = (n: number) => `${n > 0 ? "+" : ""}${n} kg`;

export default async function SharedPage({ params }: Props) {
  const { shareToken } = await params;
  const [finance, health, rates] = await Promise.all([
    getSharedFinance(shareToken),
    getSharedHealth(shareToken),
    getExchangeRates(),
  ]);

  if (!finance) notFound();

  const { ownerName, isDemo } = finance;
  // Normalise any mixed currencies to the base for a consistent public view.
  const all = convertTransactions(finance.all, BASE_CURRENCY, rates);
  const summary = summarizeTransactions(all);
  const recent = all.slice(0, 8);

  return (
    <main className="mx-auto w-full max-w-3xl space-y-10 p-4 sm:p-8">
      <header className="space-y-1">
        <div className="flex items-start justify-between gap-2">
          <span className="bg-muted text-muted-foreground rounded-full px-2.5 py-0.5 text-xs font-medium">
            Read-only · Shared view
          </span>
          <ThemeToggle />
        </div>
        <h1 className="text-2xl font-bold sm:text-3xl">
          {ownerName ?? "Portfolio"} — Overview
        </h1>
        <p className="text-muted-foreground text-sm">
          A read-only snapshot of finances and health.
        </p>
      </header>

      {isDemo && <LaunchDemoButton shareToken={shareToken} />}

      {/* ── Finance ──────────────────────────────────────────────── */}
      <section className="space-y-6">
        <h2 className="text-lg font-semibold">Finance</h2>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <SummaryCard label="Income" value={money(summary.totalIncome)} accent="text-green-600" />
          <SummaryCard label="Expenses" value={money(summary.totalExpense)} accent="text-destructive" />
          <SummaryCard
            label="Net"
            value={money(summary.net)}
            accent={summary.net >= 0 ? "text-green-600" : "text-destructive"}
          />
        </div>

        {all.length > 0 && (
          <FinanceCharts transactions={all} currency={BASE_CURRENCY} />
        )}

        <div className="space-y-3">
          <h3 className="font-semibold">Recent transactions</h3>
          <ul className="divide-y rounded-lg border">
            {recent.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-4 p-3">
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
                  {money(t.amount, true)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── Health ───────────────────────────────────────────────── */}
      {health?.hasData && (
        <section className="space-y-6">
          <h2 className="text-lg font-semibold">Health</h2>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {health.latestWeightKg != null && (
              <SummaryCard
                label="Latest weight"
                value={`${health.latestWeightKg} kg`}
                accent=""
              />
            )}
            {health.weightChange && (
              <SummaryCard
                label={`Change (${health.weightChange.days}d)`}
                value={kg(health.weightChange.netChangeKg)}
                accent={
                  health.weightChange.netChangeKg <= 0
                    ? "text-green-600"
                    : "text-destructive"
                }
              />
            )}
            {health.latestBloodPressure && (
              <SummaryCard
                label="Latest BP"
                value={`${health.latestBloodPressure.systolic}/${health.latestBloodPressure.diastolic}`}
                accent=""
              />
            )}
            {health.baseline != null ? (
              <>
                <SummaryCard
                  label="Avg intake / day"
                  value={`${health.balanceSummary.avgIntake} kcal`}
                  accent=""
                />
                <SummaryCard
                  label={`Predicted Δ (${health.balanceSummary.dayCount}d)`}
                  value={kg(health.balanceSummary.predictedWeightChangeKg)}
                  accent={
                    health.balanceSummary.predictedWeightChangeKg <= 0
                      ? "text-green-600"
                      : "text-destructive"
                  }
                />
              </>
            ) : (
              <SummaryCard
                label="Workouts"
                value={`${health.exercise.sessionCount}`}
                accent=""
              />
            )}
          </div>

          {health.bloodPressureCategory && (
            <div className="flex flex-wrap items-center gap-3 rounded-lg border p-3">
              <CategoryBadge category={health.bloodPressureCategory} />
              <p className="text-muted-foreground text-sm">
                {health.bloodPressureCategory.advice}
              </p>
            </div>
          )}

          <SharedHealthCharts
            weightTrend={health.weightTrend}
            bloodPressureTrend={health.bloodPressureTrend}
            balance={health.balance}
          />
        </section>
      )}
    </main>
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

import { notFound } from "next/navigation";
import { getSharedFinance } from "@/features/finance/shared";

interface Props {
  params: Promise<{ shareToken: string }>;
}

const aud = (n: number) =>
  new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  }).format(n);

const audCents = (n: number) =>
  new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(
    n,
  );

export default async function SharedPage({ params }: Props) {
  const { shareToken } = await params;
  const data = await getSharedFinance(shareToken);

  if (!data) notFound();

  const { ownerName, summary, recent } = data;
  const topCategory = summary.byCategory[0]?.total ?? 0;

  return (
    <main className="mx-auto w-full max-w-3xl space-y-6 p-4 sm:p-8">
      <header className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="bg-muted text-muted-foreground rounded-full px-2.5 py-0.5 text-xs font-medium">
            Read-only · Shared view
          </span>
        </div>
        <h1 className="text-2xl font-bold sm:text-3xl">
          {ownerName ?? "Finance"} — Finance overview
        </h1>
        <p className="text-muted-foreground text-sm">
          A snapshot of recent income and spending.
        </p>
      </header>

      {/* Summary cards */}
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <SummaryCard label="Income" value={audCents(summary.totalIncome)} accent="text-green-600" />
        <SummaryCard label="Expenses" value={audCents(summary.totalExpense)} accent="text-destructive" />
        <SummaryCard
          label="Net"
          value={audCents(summary.net)}
          accent={summary.net >= 0 ? "text-green-600" : "text-destructive"}
        />
      </section>

      {/* Spending by category */}
      {summary.byCategory.length > 0 && (
        <section className="space-y-3 rounded-lg border p-4">
          <h2 className="font-semibold">Spending by category</h2>
          <ul className="space-y-2">
            {summary.byCategory.map((c) => (
              <li key={c.category} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>{c.category}</span>
                  <span className="text-muted-foreground">{audCents(c.total)}</span>
                </div>
                <div className="bg-muted h-2 w-full overflow-hidden rounded-full">
                  <div
                    className="bg-foreground h-full rounded-full"
                    style={{
                      width: `${topCategory ? (c.total / topCategory) * 100 : 0}%`,
                    }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Recent transactions */}
      <section className="space-y-3">
        <h2 className="font-semibold">Recent transactions</h2>
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
                {aud(t.amount)}
              </span>
            </li>
          ))}
        </ul>
      </section>
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

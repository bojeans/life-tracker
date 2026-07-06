// Shared presentational primitives for the health dashboards so every section
// (Overview, Diet, Exercise, Weight, ...) renders stat rows and chart cards the
// same way. Keep purely presentational — no data fetching here.

export function StatCard({
  label,
  value,
  unit,
  accent,
}: {
  label: string;
  value: string;
  unit?: string;
  accent?: string;
}) {
  return (
    <div className="rounded-lg border p-4">
      <p className="text-muted-foreground text-sm">{label}</p>
      <p className={`mt-1 text-xl font-semibold ${accent ?? ""}`}>
        {value}
        {unit ? (
          <span className="text-muted-foreground ml-1 text-sm font-normal">
            {unit}
          </span>
        ) : null}
      </p>
    </div>
  );
}

export function ChartCard({
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

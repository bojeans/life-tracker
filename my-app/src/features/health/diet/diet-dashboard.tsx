"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
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
import { getDietEntries } from "./actions";
import { dailyMacros } from "./analytics";
import { summarizeDiet } from "./summary";
import type { DietEntryDTO } from "./types";

const MACRO_COLORS = { protein: "#0ea5e9", carbs: "#f59e0b", fat: "#f43f5e" };

export function DietDashboardView({
  initialData,
}: {
  initialData: DietEntryDTO[];
}) {
  const { data: entries = [] } = useQuery({
    queryKey: ["dietEntries"],
    queryFn: () => getDietEntries(),
    initialData,
  });

  const summary = useMemo(() => summarizeDiet(entries), [entries]);
  const daily = useMemo(() => dailyMacros(entries), [entries]);
  const macroSplit = useMemo(
    () => [
      { name: "Protein", value: summary.totalProtein, key: "protein" as const },
      { name: "Carbs", value: summary.totalCarbs, key: "carbs" as const },
      { name: "Fat", value: summary.totalFat, key: "fat" as const },
    ],
    [summary],
  );

  if (entries.length === 0) {
    return (
      <p className="text-muted-foreground rounded-lg border border-dashed p-8 text-center text-sm">
        No diet entries yet. Head to <span className="font-medium">Manage</span>{" "}
        to add some or import a CSV.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Avg calories / day" value={`${summary.avgCaloriesPerDay}`} />
        <StatCard label="Protein (total)" value={`${summary.totalProtein} g`} />
        <StatCard label="Carbs (total)" value={`${summary.totalCarbs} g`} />
        <StatCard label="Fat (total)" value={`${summary.totalFat} g`} />
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard title="Calories per day">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={daily} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
              <XAxis dataKey="label" fontSize={12} tickLine={false} />
              <YAxis fontSize={12} tickLine={false} axisLine={false} width={44} />
              <Tooltip formatter={(v) => `${Number(v)} kcal`} />
              <Bar dataKey="calories" name="Calories" fill="#22c55e" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Macro split (grams)">
          {summary.totalProtein + summary.totalCarbs + summary.totalFat === 0 ? (
            <div className="text-muted-foreground flex h-[260px] items-center justify-center text-sm">
              No macros logged yet.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={macroSplit}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  label={(props: { name?: string }) => props.name ?? ""}
                  fontSize={12}
                >
                  {macroSplit.map((m) => (
                    <Cell key={m.key} fill={MACRO_COLORS[m.key]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => `${Number(v)} g`} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </section>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border p-4">
      <p className="text-muted-foreground text-sm">{label}</p>
      <p className="mt-1 text-xl font-semibold">{value}</p>
    </div>
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

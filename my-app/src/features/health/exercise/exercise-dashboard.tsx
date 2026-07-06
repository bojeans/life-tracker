"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { getExerciseEntries } from "./actions";
import { dailyBurn, summarizeExercise } from "./analytics";
import { StatCard } from "../dashboard-ui";
import type { ExerciseEntryDTO } from "./types";

export function ExerciseDashboardView({
  initialData,
}: {
  initialData: ExerciseEntryDTO[];
}) {
  const { data: entries = [] } = useQuery({
    queryKey: ["exerciseEntries"],
    queryFn: () => getExerciseEntries(),
    initialData,
  });

  const summary = useMemo(() => summarizeExercise(entries), [entries]);
  const daily = useMemo(() => dailyBurn(entries), [entries]);

  if (entries.length === 0) {
    return (
      <p className="text-muted-foreground rounded-lg border border-dashed p-8 text-center text-sm">
        No exercise yet. Head to <span className="font-medium">Manage</span> to
        add some or import a CSV.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard label="Avg exercise burn / day" value={`${summary.avgCaloriesPerDay} kcal`} />
        <StatCard label="Sessions" value={`${summary.sessionCount}`} />
        <StatCard label="Days logged" value={`${summary.dayCount}`} />
      </section>

      <div className="space-y-3 rounded-lg border p-4">
        <h2 className="font-semibold">Exercise calories burned per day</h2>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={daily} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
            <XAxis dataKey="label" fontSize={12} tickLine={false} />
            <YAxis fontSize={12} tickLine={false} axisLine={false} width={44} />
            <Tooltip formatter={(v) => `${Number(v)} kcal`} />
            <Bar dataKey="calories" name="Calories" fill="#f59e0b" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

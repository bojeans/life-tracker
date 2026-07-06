"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { getWeightEntries } from "./actions";
import { weightTrend, weightChange } from "./analytics";
import { StatCard } from "../dashboard-ui";
import type { WeightEntryDTO } from "./types";

export function WeightDashboardView({
  initialData,
}: {
  initialData: WeightEntryDTO[];
}) {
  const { data: entries = [] } = useQuery({
    queryKey: ["weightEntries"],
    queryFn: () => getWeightEntries(),
    initialData,
  });

  const trend = useMemo(() => weightTrend(entries), [entries]);
  const change = useMemo(() => weightChange(entries), [entries]);

  if (entries.length === 0) {
    return (
      <p className="text-muted-foreground rounded-lg border border-dashed p-8 text-center text-sm">
        No weight entries yet. Head to{" "}
        <span className="font-medium">Manage</span> to add some or import a CSV.
      </p>
    );
  }

  const latest = trend[trend.length - 1];

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Latest" value={`${latest.weightKg} kg`} />
        {change ? (
          <>
            <StatCard
              label={`Change (${change.days}d)`}
              value={`${change.netChangeKg > 0 ? "+" : ""}${change.netChangeKg} kg`}
              accent={change.netChangeKg <= 0 ? "text-green-600" : "text-destructive"}
            />
            <StatCard
              label="Avg / week"
              value={`${change.perWeekKg > 0 ? "+" : ""}${change.perWeekKg} kg`}
              accent={change.perWeekKg <= 0 ? "text-green-600" : "text-destructive"}
            />
            <StatCard label="Start" value={`${change.startKg} kg`} />
          </>
        ) : (
          <StatCard label="Trend" value="Log 2+ to compare" />
        )}
      </section>

      <div className="space-y-3 rounded-lg border p-4">
        <h2 className="font-semibold">Weight trend</h2>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={trend} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
            <XAxis dataKey="label" fontSize={12} tickLine={false} />
            <YAxis
              fontSize={12}
              tickLine={false}
              axisLine={false}
              width={44}
              domain={["dataMin - 1", "dataMax + 1"]}
              tickFormatter={(v) => `${Number(v)}`}
            />
            <Tooltip formatter={(v) => `${Number(v)} kg`} />
            <Line
              type="monotone"
              dataKey="weightKg"
              name="Weight"
              stroke="#0ea5e9"
              strokeWidth={2}
              dot={{ r: 3 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

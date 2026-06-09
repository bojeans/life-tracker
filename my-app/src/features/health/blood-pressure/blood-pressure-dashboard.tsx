"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { getBloodPressureEntries } from "./actions";
import {
  bloodPressureAverages,
  bloodPressureTrend,
  classifyBloodPressure,
} from "./analytics";
import { CategoryBadge } from "./category-badge";
import type { BloodPressureEntryDTO } from "./types";

export function BloodPressureDashboardView({
  initialData,
}: {
  initialData: BloodPressureEntryDTO[];
}) {
  const { data: entries = [] } = useQuery({
    queryKey: ["bloodPressureEntries"],
    queryFn: () => getBloodPressureEntries(),
    initialData,
  });

  const trend = useMemo(() => bloodPressureTrend(entries), [entries]);
  const averages = useMemo(() => bloodPressureAverages(entries), [entries]);

  if (entries.length === 0) {
    return (
      <p className="text-muted-foreground rounded-lg border border-dashed p-8 text-center text-sm">
        No readings yet. Head to{" "}
        <span className="font-medium">Manage</span> to add your first one.
      </p>
    );
  }

  // entries come back date-desc, so [0] is the most recent reading.
  const latest = entries[0];
  const latestCategory = classifyBloodPressure(
    latest.systolic,
    latest.diastolic,
  );

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          label="Latest"
          value={`${latest.systolic}/${latest.diastolic}`}
          unit="mmHg"
        />
        <StatCard
          label="Latest pulse"
          value={latest.pulse != null ? `${latest.pulse}` : "—"}
          unit={latest.pulse != null ? "bpm" : undefined}
        />
        {averages && (
          <>
            <StatCard
              label={`Avg (${averages.count})`}
              value={`${averages.systolic}/${averages.diastolic}`}
              unit="mmHg"
            />
            <StatCard
              label="Avg pulse"
              value={averages.pulse != null ? `${averages.pulse}` : "—"}
              unit={averages.pulse != null ? "bpm" : undefined}
            />
          </>
        )}
      </section>

      <div className="flex flex-wrap items-center gap-3 rounded-lg border p-4">
        <CategoryBadge category={latestCategory} />
        <p className="text-muted-foreground text-sm">
          {latestCategory.advice}
        </p>
      </div>

      <div className="space-y-3 rounded-lg border p-4">
        <h2 className="font-semibold">Blood pressure trend</h2>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart
            data={trend}
            margin={{ top: 8, right: 8, left: 8, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
            <XAxis dataKey="label" fontSize={12} tickLine={false} />
            <YAxis
              fontSize={12}
              tickLine={false}
              axisLine={false}
              width={36}
              domain={["dataMin - 10", "dataMax + 10"]}
            />
            <Tooltip formatter={(v) => `${Number(v)} mmHg`} />
            <Legend />
            {/* AHA reference lines: 120 (top of normal systolic) and 80
                (top of normal diastolic) for at-a-glance context. */}
            <ReferenceLine y={120} stroke="#f59e0b" strokeDasharray="4 4" opacity={0.5} />
            <ReferenceLine y={80} stroke="#f59e0b" strokeDasharray="4 4" opacity={0.5} />
            <Line
              type="monotone"
              dataKey="systolic"
              name="Systolic"
              stroke="#ef4444"
              strokeWidth={2}
              dot={{ r: 3 }}
            />
            <Line
              type="monotone"
              dataKey="diastolic"
              name="Diastolic"
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

function StatCard({
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

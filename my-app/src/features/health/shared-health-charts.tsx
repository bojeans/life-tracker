"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { WeightPoint } from "./weight/analytics";
import type { BalanceDay } from "./energy-balance";

// Read-only, prop-driven charts for the public shared view (no data fetching).
export function SharedHealthCharts({
  weightTrend,
  balance,
}: {
  weightTrend: WeightPoint[];
  balance: BalanceDay[];
}) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {weightTrend.length > 0 && (
        <ChartCard title="Weight trend">
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={weightTrend} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
              <XAxis dataKey="label" fontSize={12} tickLine={false} />
              <YAxis
                fontSize={12}
                tickLine={false}
                axisLine={false}
                width={40}
                domain={["dataMin - 1", "dataMax + 1"]}
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
        </ChartCard>
      )}

      {balance.length > 0 && (
        <ChartCard title="Intake vs. burn per day">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={balance} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
              <XAxis dataKey="label" fontSize={12} tickLine={false} />
              <YAxis fontSize={12} tickLine={false} axisLine={false} width={44} />
              <Tooltip formatter={(v) => `${Number(v)} kcal`} />
              <Legend />
              <Bar dataKey="intake" name="Intake" fill="#22c55e" radius={[4, 4, 0, 0]} />
              <Bar dataKey="out" name="Burned (total)" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      )}
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
      <h3 className="font-semibold">{title}</h3>
      {children}
    </div>
  );
}

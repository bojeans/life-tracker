"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { BASE_CURRENCY, formatMoney } from "./currency";
import type { NetWorthPoint } from "./networth-analytics";

// Read-only, prop-driven net-worth line for the public shared view (no data
// fetching, no range/series controls — just the net-worth total over time).
export function SharedNetWorthChart({ points }: { points: NetWorthPoint[] }) {
  const money = (n: number) => formatMoney(n, BASE_CURRENCY, { whole: true });
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={points} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
        <XAxis dataKey="label" fontSize={12} tickLine={false} />
        <YAxis
          fontSize={12}
          tickLine={false}
          axisLine={false}
          width={64}
          tickFormatter={(v) => money(Number(v))}
        />
        <Tooltip formatter={(v) => money(Number(v))} />
        <Line
          type="monotone"
          dataKey="total"
          name="Net worth"
          stroke="#0ea5e9"
          strokeWidth={2}
          dot={{ r: 3 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

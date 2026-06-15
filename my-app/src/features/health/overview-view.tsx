"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { baselineTdee } from "./energy";
import { dailyEnergyBalance, summarizeBalance } from "./energy-balance";
import { weightChange } from "./weight/analytics";
import { classifyBloodPressure } from "./blood-pressure/analytics";
import { CategoryBadge } from "./blood-pressure/category-badge";
import type { DietEntryDTO } from "./diet/types";
import type { ExerciseEntryDTO } from "./exercise/types";
import type { WeightEntryDTO } from "./weight/types";
import type { BloodPressureEntryDTO } from "./blood-pressure/types";
import type { ProfileDTO } from "./profile/types";

export function OverviewView({
  diet,
  exercise,
  weights,
  bloodPressure,
  profile,
}: {
  diet: DietEntryDTO[];
  exercise: ExerciseEntryDTO[];
  weights: WeightEntryDTO[];
  bloodPressure: BloodPressureEntryDTO[];
  profile: ProfileDTO | null;
}) {
  const latestWeightKg = weights[0]?.weightKg ?? null;
  // entries are date-desc, so [0] is the most recent reading.
  const latestBp = bloodPressure[0] ?? null;

  const baseline = useMemo(
    () =>
      profile && latestWeightKg ? baselineTdee(profile, latestWeightKg) : null,
    [profile, latestWeightKg],
  );

  const balance = useMemo(
    () => (baseline != null ? dailyEnergyBalance(diet, exercise, baseline) : []),
    [diet, exercise, baseline],
  );
  const summary = useMemo(() => summarizeBalance(balance), [balance]);
  const actual = useMemo(() => weightChange(weights), [weights]);

  if (!profile) {
    return (
      <Prompt
        title="Set up your profile"
        body="Add your height, age, sex and activity level so we can estimate your daily calorie burn."
        href="/health/profile"
        cta="Go to Profile"
      />
    );
  }
  if (latestWeightKg == null) {
    return (
      <Prompt
        title="Log your weight"
        body="Your current weight is needed to estimate calorie burn (BMR) and track progress."
        href="/health/weight/manage"
        cta="Add a weight"
      />
    );
  }

  const net = summary.avgNet;

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Baseline burn / day" value={`${baseline} kcal`} />
        <StatCard label="Avg intake / day" value={`${summary.avgIntake} kcal`} />
        <StatCard
          label="Avg net / day"
          value={`${net > 0 ? "+" : ""}${net} kcal`}
          accent={net <= 0 ? "text-green-600" : "text-destructive"}
        />
        <StatCard
          label={`Predicted Δ (${summary.dayCount}d)`}
          value={`${summary.predictedWeightChangeKg > 0 ? "+" : ""}${summary.predictedWeightChangeKg} kg`}
          accent={
            summary.predictedWeightChangeKg <= 0
              ? "text-green-600"
              : "text-destructive"
          }
        />
      </section>

      {latestBp && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border p-3 text-sm">
          <span className="font-medium">
            Latest blood pressure {latestBp.systolic}/{latestBp.diastolic}
            <span className="text-muted-foreground font-normal"> mmHg</span>
          </span>
          <CategoryBadge
            category={classifyBloodPressure(latestBp.systolic, latestBp.diastolic)}
          />
        </div>
      )}

      {actual && (
        <p className="text-muted-foreground rounded-lg border p-3 text-sm">
          Over your logged food, the energy balance predicts a{" "}
          <strong>
            {summary.predictedWeightChangeKg > 0 ? "+" : ""}
            {summary.predictedWeightChangeKg} kg
          </strong>{" "}
          change. Your weight log shows an actual{" "}
          <strong>
            {actual.netChangeKg > 0 ? "+" : ""}
            {actual.netChangeKg} kg
          </strong>{" "}
          over {actual.days} days. (Estimates — real results vary with water,
          logging gaps and metabolism.)
        </p>
      )}

      {balance.length === 0 ? (
        <p className="text-muted-foreground rounded-lg border border-dashed p-8 text-center text-sm">
          Log some food in <span className="font-medium">Diet</span> to see your
          daily energy balance.
        </p>
      ) : (
        <div className="space-y-3 rounded-lg border p-4">
          <h2 className="font-semibold">Intake vs. burn per day</h2>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={balance} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
              <XAxis dataKey="label" fontSize={12} tickLine={false} />
              <YAxis fontSize={12} tickLine={false} axisLine={false} width={48} />
              <Tooltip formatter={(v) => `${Number(v)} kcal`} />
              <Legend />
              <Bar dataKey="intake" name="Intake" fill="#22c55e" radius={[4, 4, 0, 0]} />
              <Bar dataKey="out" name="Burned (total)" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div className="rounded-lg border p-4">
      <p className="text-muted-foreground text-sm">{label}</p>
      <p className={`mt-1 text-xl font-semibold ${accent ?? ""}`}>{value}</p>
    </div>
  );
}

function Prompt({
  title,
  body,
  href,
  cta,
}: {
  title: string;
  body: string;
  href: string;
  cta: string;
}) {
  return (
    <div className="space-y-3 rounded-lg border border-dashed p-8 text-center">
      <h2 className="font-semibold">{title}</h2>
      <p className="text-muted-foreground mx-auto max-w-md text-sm">{body}</p>
      <Link
        href={href}
        className="bg-foreground text-background inline-block rounded-md px-4 py-2 text-sm font-medium"
      >
        {cta}
      </Link>
    </div>
  );
}

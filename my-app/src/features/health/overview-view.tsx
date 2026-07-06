"use client";

import { useMemo } from "react";
import Link from "next/link";
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
import { ChevronRight, Dumbbell, HeartPulse, Scale, Utensils } from "lucide-react";
import { baselineTdee } from "./energy";
import { dailyEnergyBalance, summarizeBalance } from "./energy-balance";
import { dailyMacros } from "./diet/analytics";
import { summarizeDiet } from "./diet/summary";
import { dailyBurn, summarizeExercise } from "./exercise/analytics";
import { weightTrend, weightChange } from "./weight/analytics";
import { bloodPressureTrend, classifyBloodPressure } from "./blood-pressure/analytics";
import { CategoryBadge } from "./blood-pressure/category-badge";
import { StatCard } from "./dashboard-ui";
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

  // Per-section summaries + sparkline series for the drill-down cards.
  const dietSummary = useMemo(() => summarizeDiet(diet), [diet]);
  const dietSpark = useMemo(() => dailyMacros(diet), [diet]);
  const exSummary = useMemo(() => summarizeExercise(exercise), [exercise]);
  const exSpark = useMemo(() => dailyBurn(exercise), [exercise]);
  const weightSpark = useMemo(() => weightTrend(weights), [weights]);
  const bpSpark = useMemo(() => bloodPressureTrend(bloodPressure), [bloodPressure]);

  const net = summary.avgNet;

  return (
    <div className="space-y-8">
      {/* Energy balance — the synthesized "how am I doing" view. Falls back to
          an inline setup prompt so the section grid below still renders. */}
      <section className="space-y-4">
        {baseline == null ? (
          <SetupPrompt profileMissing={!profile} />
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatCard label="Baseline burn / day" value={`${baseline}`} unit="kcal" />
              <StatCard label="Avg intake / day" value={`${summary.avgIntake}`} unit="kcal" />
              <StatCard
                label="Avg net / day"
                value={`${net > 0 ? "+" : ""}${net}`}
                unit="kcal"
                accent={net <= 0 ? "text-green-600" : "text-destructive"}
              />
              <StatCard
                label={`Predicted Δ (${summary.dayCount}d)`}
                value={`${summary.predictedWeightChangeKg > 0 ? "+" : ""}${summary.predictedWeightChangeKg}`}
                unit="kg"
                accent={
                  summary.predictedWeightChangeKg <= 0
                    ? "text-green-600"
                    : "text-destructive"
                }
              />
            </div>

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
                over {actual.days} days. (Estimates — real results vary with
                water, logging gaps and metabolism.)
              </p>
            )}

            {balance.length === 0 ? (
              <p className="text-muted-foreground rounded-lg border border-dashed p-8 text-center text-sm">
                Log some food in <span className="font-medium">Diet</span> to see
                your daily energy balance.
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
                    <Bar dataKey="out" name="Total burn" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </>
        )}
      </section>

      {/* Drill-down cards — each links into the full section so the metrics
          aren't buried behind the tab bar. */}
      <section className="space-y-3">
        <h2 className="text-muted-foreground text-sm font-medium">Sections</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <SectionCard
            href="/health/diet"
            icon={Utensils}
            title="Diet"
            value={diet.length ? `${dietSummary.avgCaloriesPerDay}` : "—"}
            sub={diet.length ? "kcal / day avg" : "No entries yet"}
            spark={<Sparkline kind="bar" data={dietSpark} dataKey="calories" color="#22c55e" />}
          />
          <SectionCard
            href="/health/exercise"
            icon={Dumbbell}
            title="Exercise"
            value={exercise.length ? `${exSummary.avgCaloriesPerDay}` : "—"}
            sub={
              exercise.length
                ? `kcal / day · ${exSummary.sessionCount} sessions`
                : "No sessions yet"
            }
            spark={<Sparkline kind="bar" data={exSpark} dataKey="calories" color="#f59e0b" />}
          />
          <SectionCard
            href="/health/weight"
            icon={Scale}
            title="Weight"
            value={latestWeightKg != null ? `${latestWeightKg}` : "—"}
            unit={latestWeightKg != null ? "kg" : undefined}
            sub={
              actual
                ? `${actual.netChangeKg > 0 ? "+" : ""}${actual.netChangeKg} kg over ${actual.days}d`
                : latestWeightKg != null
                  ? "Log 2+ to see a trend"
                  : "No entries yet"
            }
            spark={<Sparkline kind="line" data={weightSpark} dataKey="weightKg" color="#0ea5e9" />}
          />
          <SectionCard
            href="/health/blood-pressure"
            icon={HeartPulse}
            title="Blood pressure"
            value={latestBp ? `${latestBp.systolic}/${latestBp.diastolic}` : "—"}
            unit={latestBp ? "mmHg" : undefined}
            badge={
              latestBp ? (
                <CategoryBadge
                  category={classifyBloodPressure(latestBp.systolic, latestBp.diastolic)}
                />
              ) : undefined
            }
            sub={latestBp ? undefined : "No readings yet"}
            spark={<Sparkline kind="line" data={bpSpark} dataKey="systolic" color="#ef4444" />}
          />
        </div>
      </section>
    </div>
  );
}

function SectionCard({
  href,
  icon: Icon,
  title,
  value,
  unit,
  sub,
  badge,
  spark,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  value: string;
  unit?: string;
  sub?: string;
  badge?: React.ReactNode;
  spark: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="group hover:bg-muted/40 flex flex-col gap-3 rounded-lg border p-4 transition-colors"
    >
      <div className="flex items-center justify-between">
        <div className="text-muted-foreground flex items-center gap-2">
          <Icon className="size-4" />
          <span className="text-sm font-medium">{title}</span>
        </div>
        <ChevronRight className="text-muted-foreground size-4 transition-transform group-hover:translate-x-0.5" />
      </div>
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span className="text-xl font-semibold">
          {value}
          {unit ? (
            <span className="text-muted-foreground ml-1 text-sm font-normal">
              {unit}
            </span>
          ) : null}
        </span>
        {sub ? <span className="text-muted-foreground text-sm">{sub}</span> : null}
        {badge}
      </div>
      {spark}
    </Link>
  );
}

// Compact, axis-less trend line/bar for the section cards.
function Sparkline({
  kind,
  data,
  dataKey,
  color,
}: {
  kind: "line" | "bar";
  data: Array<Record<string, unknown>>;
  dataKey: string;
  color: string;
}) {
  if (data.length === 0) {
    return <div className="h-10" />;
  }
  return (
    <ResponsiveContainer width="100%" height={40}>
      {kind === "line" ? (
        <LineChart data={data} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
          <YAxis hide domain={["dataMin", "dataMax"]} />
          <Line
            type="monotone"
            dataKey={dataKey}
            stroke={color}
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      ) : (
        <BarChart data={data} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
          <Bar dataKey={dataKey} fill={color} radius={[2, 2, 0, 0]} isAnimationActive={false} />
        </BarChart>
      )}
    </ResponsiveContainer>
  );
}

function SetupPrompt({ profileMissing }: { profileMissing: boolean }) {
  const { title, body, href, cta } = profileMissing
    ? {
        title: "Set up your profile",
        body: "Add your height, age, sex and activity level so we can estimate your daily calorie burn.",
        href: "/health/profile",
        cta: "Go to Profile",
      }
    : {
        title: "Log your weight",
        body: "Your current weight is needed to estimate calorie burn (BMR) and track progress.",
        href: "/health/weight/manage",
        cta: "Add a weight",
      };

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

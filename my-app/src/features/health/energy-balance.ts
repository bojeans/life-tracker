import type { DietEntryDTO } from "./diet/types";
import type { ExerciseEntryDTO } from "./exercise/types";
import { KCAL_PER_KG } from "./energy";

export type BalanceDay = {
  date: string; // "YYYY-MM-DD"
  label: string; // "1 Jun"
  intake: number; // calories in
  burned: number; // logged exercise calories
  baseline: number; // BMR × activity (non-exercise)
  out: number; // baseline + burned
  net: number; // intake − out (negative = deficit)
};

export type BalanceSummary = {
  dayCount: number;
  avgIntake: number;
  avgOut: number;
  avgNet: number;
  cumulativeNet: number;
  predictedWeightChangeKg: number; // cumulativeNet / KCAL_PER_KG
};

function formatDayLabel(day: string): string {
  return new Date(`${day}T00:00:00.000Z`).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

function sumByDay<T>(items: T[], day: (t: T) => string, value: (t: T) => number) {
  const map = new Map<string, number>();
  for (const it of items) map.set(day(it), (map.get(day(it)) ?? 0) + value(it));
  return map;
}

// Energy balance per day, computed over the days you logged food (intake drives
// the calculation). out = baseline + that day's logged exercise; net = in − out.
// `baseline` is the BMR×activity figure (same each day; uses current weight).
export function dailyEnergyBalance(
  diet: DietEntryDTO[],
  exercise: ExerciseEntryDTO[],
  baseline: number,
): BalanceDay[] {
  const intakeByDay = sumByDay(
    diet,
    (e) => e.date.slice(0, 10),
    (e) => e.calories,
  );
  const burnByDay = sumByDay(
    exercise,
    (e) => e.date.slice(0, 10),
    (e) => e.caloriesBurned,
  );

  return [...intakeByDay.keys()]
    .sort((a, b) => a.localeCompare(b))
    .map((day) => {
      const intake = Math.round(intakeByDay.get(day) ?? 0);
      const burned = Math.round(burnByDay.get(day) ?? 0);
      const out = baseline + burned;
      return {
        date: day,
        label: formatDayLabel(day),
        intake,
        burned,
        baseline,
        out,
        net: intake - out,
      };
    });
}

export function summarizeBalance(days: BalanceDay[]): BalanceSummary {
  const dayCount = days.length;
  if (dayCount === 0) {
    return {
      dayCount: 0,
      avgIntake: 0,
      avgOut: 0,
      avgNet: 0,
      cumulativeNet: 0,
      predictedWeightChangeKg: 0,
    };
  }

  const totalIntake = days.reduce((s, d) => s + d.intake, 0);
  const totalOut = days.reduce((s, d) => s + d.out, 0);
  const cumulativeNet = days.reduce((s, d) => s + d.net, 0);

  return {
    dayCount,
    avgIntake: Math.round(totalIntake / dayCount),
    avgOut: Math.round(totalOut / dayCount),
    avgNet: Math.round(cumulativeNet / dayCount),
    cumulativeNet,
    predictedWeightChangeKg: Math.round((cumulativeNet / KCAL_PER_KG) * 100) / 100,
  };
}

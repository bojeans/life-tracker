import type { ExerciseEntryDTO } from "./types";

export type DailyBurnPoint = {
  date: string; // "YYYY-MM-DD"
  label: string; // "1 Jun"
  calories: number;
  steps: number;
};

export type ExerciseSummary = {
  totalCalories: number;
  totalSteps: number;
  sessionCount: number;
  dayCount: number;
  avgCaloriesPerDay: number;
};

function formatDayLabel(day: string): string {
  return new Date(`${day}T00:00:00.000Z`).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

// Per-day calories burned + steps, oldest day first, for the dashboard chart.
export function dailyBurn(entries: ExerciseEntryDTO[]): DailyBurnPoint[] {
  const map = new Map<string, { calories: number; steps: number }>();

  for (const e of entries) {
    const day = e.date.slice(0, 10);
    const entry = map.get(day) ?? { calories: 0, steps: 0 };
    entry.calories += e.caloriesBurned;
    entry.steps += e.steps ?? 0;
    map.set(day, entry);
  }

  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, v]) => ({
      date: day,
      label: formatDayLabel(day),
      calories: Math.round(v.calories),
      steps: v.steps,
    }));
}

export function summarizeExercise(entries: ExerciseEntryDTO[]): ExerciseSummary {
  const days = new Set<string>();
  let totalCalories = 0;
  let totalSteps = 0;

  for (const e of entries) {
    days.add(e.date.slice(0, 10));
    totalCalories += e.caloriesBurned;
    totalSteps += e.steps ?? 0;
  }

  const dayCount = days.size;

  return {
    totalCalories: Math.round(totalCalories),
    totalSteps,
    sessionCount: entries.length,
    dayCount,
    avgCaloriesPerDay: dayCount ? Math.round(totalCalories / dayCount) : 0,
  };
}

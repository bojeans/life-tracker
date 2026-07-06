import type { DietEntryDTO } from "./types";

export type DietSummary = {
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  entryCount: number;
  dayCount: number;
  avgCaloriesPerDay: number;
  avgProteinPerDay: number;
  avgCarbsPerDay: number;
  avgFatPerDay: number;
};

const round1 = (n: number) => Math.round(n * 10) / 10;

// Aggregates diet entries into totals + a per-day calorie average. Distinct
// days are counted from the date prefix so the average reflects logged days.
export function summarizeDiet(entries: DietEntryDTO[]): DietSummary {
  const days = new Set<string>();
  let totalCalories = 0;
  let totalProtein = 0;
  let totalCarbs = 0;
  let totalFat = 0;

  for (const e of entries) {
    days.add(e.date.slice(0, 10));
    totalCalories += e.calories;
    totalProtein += e.protein;
    totalCarbs += e.carbs;
    totalFat += e.fat;
  }

  const dayCount = days.size;

  return {
    totalCalories: round1(totalCalories),
    totalProtein: round1(totalProtein),
    totalCarbs: round1(totalCarbs),
    totalFat: round1(totalFat),
    entryCount: entries.length,
    dayCount,
    avgCaloriesPerDay: dayCount ? round1(totalCalories / dayCount) : 0,
    avgProteinPerDay: dayCount ? round1(totalProtein / dayCount) : 0,
    avgCarbsPerDay: dayCount ? round1(totalCarbs / dayCount) : 0,
    avgFatPerDay: dayCount ? round1(totalFat / dayCount) : 0,
  };
}

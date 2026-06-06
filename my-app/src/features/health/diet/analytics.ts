import type { DietEntryDTO } from "./types";

export type DailyMacroPoint = {
  date: string; // "YYYY-MM-DD"
  label: string; // "1 Jun"
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

const round1 = (n: number) => Math.round(n * 10) / 10;

function formatDayLabel(day: string): string {
  // day is "YYYY-MM-DD"; render at UTC so the calendar day doesn't shift.
  return new Date(`${day}T00:00:00.000Z`).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

// Per-day macro/calorie totals, oldest day first, for the dashboard charts.
export function dailyMacros(entries: DietEntryDTO[]): DailyMacroPoint[] {
  const map = new Map<
    string,
    { calories: number; protein: number; carbs: number; fat: number }
  >();

  for (const e of entries) {
    const day = e.date.slice(0, 10);
    const entry = map.get(day) ?? { calories: 0, protein: 0, carbs: 0, fat: 0 };
    entry.calories += e.calories;
    entry.protein += e.protein;
    entry.carbs += e.carbs;
    entry.fat += e.fat;
    map.set(day, entry);
  }

  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, v]) => ({
      date: day,
      label: formatDayLabel(day),
      calories: round1(v.calories),
      protein: round1(v.protein),
      carbs: round1(v.carbs),
      fat: round1(v.fat),
    }));
}

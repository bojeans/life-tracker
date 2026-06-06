import type { WeightEntryDTO } from "./types";

export type WeightPoint = {
  date: string; // "YYYY-MM-DD"
  label: string; // "1 Jun"
  weightKg: number;
};

export type WeightChange = {
  startKg: number;
  endKg: number;
  netChangeKg: number; // end - start (negative = loss)
  perWeekKg: number; // average rate over the logged span
  days: number;
};

const round2 = (n: number) => Math.round(n * 100) / 100;

function formatDayLabel(day: string): string {
  return new Date(`${day}T00:00:00.000Z`).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

// Sorted oldest-first weight points for the trend line.
export function weightTrend(entries: WeightEntryDTO[]): WeightPoint[] {
  return [...entries]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((e) => ({
      date: e.date.slice(0, 10),
      label: formatDayLabel(e.date.slice(0, 10)),
      weightKg: e.weightKg,
    }));
}

// Net change + average weekly rate across the logged span. Null if fewer than
// two measurements (no span to measure).
export function weightChange(entries: WeightEntryDTO[]): WeightChange | null {
  const points = weightTrend(entries);
  if (points.length < 2) return null;

  const first = points[0];
  const last = points[points.length - 1];
  const days = Math.max(
    1,
    Math.round(
      (Date.parse(`${last.date}T00:00:00Z`) -
        Date.parse(`${first.date}T00:00:00Z`)) /
        86_400_000,
    ),
  );
  const netChangeKg = round2(last.weightKg - first.weightKg);

  return {
    startKg: first.weightKg,
    endKg: last.weightKg,
    netChangeKg,
    perWeekKg: round2((netChangeKg / days) * 7),
    days,
  };
}

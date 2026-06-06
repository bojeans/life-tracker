import type { ExerciseEntryDTO } from "./types";

export type ExerciseEntryRow = {
  id: string;
  activity: string;
  date: Date;
  durationMin: unknown;
  met: unknown;
  caloriesBurned: unknown;
  steps: number | null;
  distanceKm: unknown;
  note: string | null;
  source: string;
};

const numOrNull = (v: unknown) => (v == null ? null : Number(v));

export function toExerciseEntryDTO(row: ExerciseEntryRow): ExerciseEntryDTO {
  return {
    id: row.id,
    activity: row.activity,
    date: row.date.toISOString(),
    durationMin: numOrNull(row.durationMin),
    met: numOrNull(row.met),
    caloriesBurned: Number(row.caloriesBurned),
    steps: row.steps,
    distanceKm: numOrNull(row.distanceKm),
    note: row.note,
    source: row.source,
  };
}

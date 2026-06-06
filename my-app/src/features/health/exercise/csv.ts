import Papa from "papaparse";
import { exerciseEntrySchema, type ExerciseEntryInput } from "./exercise-schema";
import { parseFlexibleDate } from "@/features/shared/dates";

export type ExerciseCsvParseResult = {
  valid: ExerciseEntryInput[];
  errors: { row: number; message: string }[];
};

const HEADER_ALIASES: Record<string, string> = {
  date: "date",
  day: "date",
  activity: "activity",
  exercise: "activity",
  workout: "activity",
  type: "activity",
  duration: "duration",
  minutes: "duration",
  mins: "duration",
  "duration (min)": "duration",
  calories: "calories",
  kcal: "calories",
  energy: "calories",
  "calories burned": "calories",
  met: "met",
  steps: "steps",
  distance: "distance",
  km: "distance",
  "distance (km)": "distance",
  note: "note",
  notes: "note",
};

const normalizeHeader = (h: string) => {
  const key = h.trim().toLowerCase();
  return HEADER_ALIASES[key] ?? key;
};

type RawRow = Record<string, string | undefined>;

const cleanNum = (raw: string | undefined) =>
  (raw ?? "").replace(/[,\s]/g, "");

/**
 * Parses an exercise CSV. Columns (case-insensitive, aliases supported):
 *   - date     (required)
 *   - activity (required)
 *   - calories (required; burned)
 *   - duration, met, steps, distance, note (optional)
 */
export function parseExerciseCsv(csvText: string): ExerciseCsvParseResult {
  const parsed = Papa.parse<RawRow>(csvText, {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: normalizeHeader,
  });

  const valid: ExerciseEntryInput[] = [];
  const errors: { row: number; message: string }[] = [];

  parsed.data.forEach((raw, i) => {
    const rowNumber = i + 2;

    const dateRaw = (raw.date ?? "").trim();
    const date = parseFlexibleDate(dateRaw);
    if (!date) {
      errors.push({ row: rowNumber, message: `Invalid date "${dateRaw}"` });
      return;
    }

    const candidate = {
      activity: (raw.activity ?? "").trim(),
      date,
      durationMin: cleanNum(raw.duration) || undefined,
      met: cleanNum(raw.met) || undefined,
      caloriesBurned: cleanNum(raw.calories) || 0,
      steps: cleanNum(raw.steps) || undefined,
      distanceKm: cleanNum(raw.distance) || undefined,
      note: (raw.note ?? "").trim() || undefined,
    };

    const result = exerciseEntrySchema.safeParse(candidate);
    if (result.success) {
      valid.push(result.data);
    } else {
      errors.push({
        row: rowNumber,
        message: result.error.issues.map((iss) => iss.message).join("; "),
      });
    }
  });

  return { valid, errors };
}

// Deterministic key for dedup on re-import (paired with @@unique).
export function externalIdFor(e: ExerciseEntryInput): string {
  return JSON.stringify([
    e.date instanceof Date ? e.date.toISOString() : e.date,
    e.activity,
    e.caloriesBurned,
    e.durationMin ?? "",
  ]);
}

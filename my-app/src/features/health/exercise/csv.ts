import Papa from "papaparse";
import { exerciseEntrySchema, type ExerciseEntryInput } from "./exercise-schema";
import { parseFlexibleDate } from "@/features/shared/dates";
import { caloriesBurned, classifyCardio, metFor } from "./exercise-calories";

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
  min: "duration",
  time: "duration",
  "duration (min)": "duration",
  calories: "calories",
  calorie: "calories",
  cals: "calories",
  cal: "calories",
  kcal: "calories",
  energy: "calories",
  "calories burned": "calories",
  met: "met",
  steps: "steps",
  distance: "distance",
  km: "distance",
  kms: "distance",
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
 *   - date     (required; if no column is named "date", the FIRST column is
 *               used — so a date column with a blank header still works)
 *   - activity (optional; auto-labelled from pace for cardio rows)
 *   - calories (optional; auto-estimated when blank, see below)
 *   - duration, met, steps, distance, note (optional)
 *
 * When `calories` is blank we estimate it from MET × bodyweight × duration:
 * cardio rows (distance + duration) derive their MET from pace; otherwise a MET
 * column or a known activity name is used. Needs `weightKg` — without it, a
 * blank calories cell stays 0.
 */
export function parseExerciseCsv(
  csvText: string,
  opts: { weightKg?: number | null } = {},
): ExerciseCsvParseResult {
  const weightKg = opts.weightKg ?? null;
  const parsed = Papa.parse<RawRow>(csvText, {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: normalizeHeader,
  });

  // Prefer an explicit "date" column; otherwise treat the first column as the
  // date (handles a blank/un-named date header), matching the diet/finance CSVs.
  const fields = parsed.meta.fields ?? [];
  const dateKey = fields.includes("date") ? "date" : (fields[0] ?? "date");

  const valid: ExerciseEntryInput[] = [];
  const errors: { row: number; message: string }[] = [];

  parsed.data.forEach((raw, i) => {
    const rowNumber = i + 2;

    const dateRaw = (raw[dateKey] ?? "").trim();
    const date = parseFlexibleDate(dateRaw);
    if (!date) {
      errors.push({ row: rowNumber, message: `Invalid date "${dateRaw}"` });
      return;
    }

    const durationMin = cleanNum(raw.duration);
    const distanceKm = cleanNum(raw.distance);
    const dur = Number(durationMin);
    const dist = Number(distanceKm);

    // Cardio rows with distance + duration get a pace-derived label + MET, which
    // also lets us fill in a missing activity name and calories.
    const cardio = dist > 0 && dur > 0 ? classifyCardio(dist, dur) : null;
    const activity = (raw.activity ?? "").trim() || cardio?.activity || "";
    const met = cleanNum(raw.met) || (cardio ? String(cardio.met) : "");

    let calories = cleanNum(raw.calories);
    if (!calories) {
      const metNum = Number(met) || metFor(activity) || 0;
      if (metNum && weightKg && dur > 0) {
        calories = String(caloriesBurned(metNum, weightKg, dur));
      }
    }

    const candidate = {
      activity,
      date,
      durationMin: durationMin || undefined,
      met: met || undefined,
      caloriesBurned: calories || 0,
      steps: cleanNum(raw.steps) || undefined,
      distanceKm: distanceKm || undefined,
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

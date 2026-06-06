import Papa from "papaparse";
import { weightEntrySchema, type WeightEntryInput } from "./weight-schema";
import { parseFlexibleDate } from "@/features/shared/dates";

export type WeightCsvParseResult = {
  valid: WeightEntryInput[];
  errors: { row: number; message: string }[];
};

const HEADER_ALIASES: Record<string, string> = {
  date: "date",
  day: "date",
  weight: "weight",
  weightkg: "weight",
  "weight (kg)": "weight",
  kg: "weight",
  note: "note",
  notes: "note",
};

const normalizeHeader = (h: string) => {
  const key = h.trim().toLowerCase();
  return HEADER_ALIASES[key] ?? key;
};

type RawRow = Record<string, string | undefined>;

/**
 * Parses a bodyweight CSV. Columns (case-insensitive, aliases supported):
 *   - date   (required)
 *   - weight (required; kg)
 *   - note   (optional)
 */
export function parseWeightCsv(csvText: string): WeightCsvParseResult {
  const parsed = Papa.parse<RawRow>(csvText, {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: normalizeHeader,
  });

  const valid: WeightEntryInput[] = [];
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
      date,
      weightKg: (raw.weight ?? "").replace(/[,\s]/g, ""),
      note: (raw.note ?? "").trim() || undefined,
    };

    const result = weightEntrySchema.safeParse(candidate);
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
export function externalIdFor(e: WeightEntryInput): string {
  return JSON.stringify([
    e.date instanceof Date ? e.date.toISOString() : e.date,
    e.weightKg,
  ]);
}

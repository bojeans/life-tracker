import Papa from "papaparse";
import { dietEntrySchema, MEAL_TYPES, type DietEntryInput } from "./diet-schema";
import { parseFlexibleDate } from "@/features/shared/dates";

export type DietCsvParseResult = {
  valid: DietEntryInput[];
  errors: { row: number; message: string }[];
};

// Map common/aliased column headers to our canonical field names.
const HEADER_ALIASES: Record<string, string> = {
  date: "date",
  day: "date",
  name: "name",
  food: "name",
  item: "name",
  meal: "meal",
  mealtype: "meal",
  "meal type": "meal",
  calories: "calories",
  kcal: "calories",
  energy: "calories",
  cals: "calories",
  protein: "protein",
  carbs: "carbs",
  carbohydrate: "carbs",
  carbohydrates: "carbs",
  fat: "fat",
  fats: "fat",
  quantity: "quantity",
  grams: "quantity",
  qty: "quantity",
  "quantity (g)": "quantity",
};

const normalizeHeader = (h: string) => {
  const key = h.trim().toLowerCase();
  return HEADER_ALIASES[key] ?? key;
};

const MEAL_ALIASES: Record<string, (typeof MEAL_TYPES)[number]> = {
  breakfast: "BREAKFAST",
  lunch: "LUNCH",
  dinner: "DINNER",
  snack: "SNACK",
};

type RawRow = Record<string, string | undefined>;

// Parses a macro cell that may contain commas/whitespace. Blank => 0.
function num(raw: string | undefined): number {
  const cleaned = (raw ?? "").replace(/[,\s]/g, "");
  return cleaned === "" ? 0 : Number(cleaned);
}

/**
 * Parses a diet CSV (e.g. a Google Sheets export). Expected columns
 * (case-insensitive, aliases supported):
 *   - date     (required)
 *   - calories, protein, carbs, fat (numbers; blank treated as 0)
 *   - name     (optional; rows WITHOUT a name become a "Daily total" row)
 *   - meal     (optional: breakfast/lunch/dinner/snack)
 *   - quantity (optional; grams)
 * A row with no `name` is stored as a daily-total row (isDailyTotal=true).
 */
export function parseDietCsv(csvText: string): DietCsvParseResult {
  const parsed = Papa.parse<RawRow>(csvText, {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: normalizeHeader,
  });

  const valid: DietEntryInput[] = [];
  const errors: { row: number; message: string }[] = [];

  parsed.data.forEach((raw, i) => {
    // +2: one for the header line, one for 1-based numbering.
    const rowNumber = i + 2;

    const dateRaw = (raw.date ?? "").trim();
    const date = parseFlexibleDate(dateRaw);
    if (!date) {
      errors.push({ row: rowNumber, message: `Invalid date "${dateRaw}"` });
      return;
    }

    const name = (raw.name ?? "").trim();
    const isDailyTotal = name === "";
    const mealRaw = (raw.meal ?? "").trim().toLowerCase();

    const candidate = {
      name: name || "Daily total",
      date,
      mealType: MEAL_ALIASES[mealRaw],
      isDailyTotal,
      quantityG: (raw.quantity ?? "").trim() || undefined,
      calories: num(raw.calories),
      protein: num(raw.protein),
      carbs: num(raw.carbs),
      fat: num(raw.fat),
    };

    const result = dietEntrySchema.safeParse(candidate);
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

// Deterministic key for a parsed entry, used as `externalId` so the same CSV
// row isn't imported twice (paired with @@unique on [userId, source, externalId]).
export function externalIdFor(e: DietEntryInput): string {
  return JSON.stringify([
    e.date instanceof Date ? e.date.toISOString() : e.date,
    e.name,
    e.calories,
    e.protein,
    e.carbs,
    e.fat,
    e.mealType ?? "",
  ]);
}

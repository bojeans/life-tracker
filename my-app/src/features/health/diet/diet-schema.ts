import { z } from "zod";

export const MEAL_TYPES = ["BREAKFAST", "LUNCH", "DINNER", "SNACK"] as const;

const macro = z.coerce
  .number({ error: "Must be a number" })
  .min(0, { error: "Cannot be negative" })
  .max(100_000, { error: "Value is too large" });

// Treat empty strings (from form inputs / blank CSV cells) as "not provided".
const emptyToUndefined = (v: unknown) =>
  v === "" || v === null ? undefined : v;

export const dietEntrySchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, { error: "Name is required" })
    .max(120, { error: "Name is too long" }),
  date: z.coerce.date({ error: "A valid date is required" }),
  mealType: z.preprocess(emptyToUndefined, z.enum(MEAL_TYPES).optional()),
  isDailyTotal: z.coerce.boolean().default(false),
  quantityG: z.preprocess(
    emptyToUndefined,
    z.coerce.number().min(0).max(100_000).optional(),
  ),
  calories: macro,
  protein: macro,
  carbs: macro,
  fat: macro,
  barcode: z.preprocess(
    emptyToUndefined,
    z.string().trim().max(64).optional(),
  ),
});

export type DietEntryInput = z.infer<typeof dietEntrySchema>;

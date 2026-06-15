import { z } from "zod";
import { UNITS } from "./units";

const emptyToUndefined = (v: unknown) =>
  v === "" || v === null ? undefined : v;

const UNIT_VALUES = UNITS.map((u) => u.value) as [string, ...string[]];

const macro = z.coerce
  .number({ error: "Must be a number" })
  .min(0, { error: "Cannot be negative" })
  .max(100_000, { error: "Value is too large" });

const optionalNumber = z.preprocess(
  emptyToUndefined,
  z.coerce.number().min(0).max(100_000).optional(),
);

const optionalText = (max: number) =>
  z.preprocess(emptyToUndefined, z.string().trim().max(max).optional());

// A catalog item holds per-100g nutrients (macros required, micros optional).
export const foodItemSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, { error: "Name is required" })
    .max(120, { error: "Name is too long" }),
  brand: optionalText(80),
  category: optionalText(60),
  barcode: optionalText(64),
  // A serving is an amount + unit (e.g. 1 "tbsp"). The gram equivalent is
  // derived server-side; clients send amount/unit, not grams.
  servingAmount: z.preprocess(
    emptyToUndefined,
    z.coerce.number().positive().max(100_000).optional(),
  ),
  servingUnit: z.preprocess(emptyToUndefined, z.enum(UNIT_VALUES).optional()),
  calories: macro,
  protein: macro,
  carbs: macro,
  fat: macro,
  fiber: optionalNumber,
  sugar: optionalNumber,
  sodium: optionalNumber,
  satFat: optionalNumber,
});

export type FoodItemInput = z.infer<typeof foodItemSchema>;

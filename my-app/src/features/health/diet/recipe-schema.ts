import { z } from "zod";

const emptyToUndefined = (v: unknown) =>
  v === "" || v === null ? undefined : v;

const macro = z.coerce
  .number({ error: "Must be a number" })
  .min(0, { error: "Cannot be negative" })
  .max(100_000, { error: "Value is too large" });

// One ingredient: a pantry item (optional back-reference) at a gram quantity,
// carrying its per-100g macro snapshot.
export const recipeIngredientSchema = z.object({
  foodItemId: z.preprocess(
    emptyToUndefined,
    z.string().trim().max(40).optional(),
  ),
  name: z
    .string()
    .trim()
    .min(1, { error: "Name is required" })
    .max(120, { error: "Name is too long" }),
  quantityG: z.coerce
    .number({ error: "Quantity is required" })
    .positive({ error: "Quantity must be greater than 0" })
    .max(100_000, { error: "Quantity is too large" }),
  calories: macro,
  protein: macro,
  carbs: macro,
  fat: macro,
});

export const recipeSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, { error: "Name is required" })
    .max(120, { error: "Name is too long" }),
  description: z.preprocess(
    emptyToUndefined,
    z.string().trim().max(500).optional(),
  ),
  servings: z.coerce
    .number({ error: "Servings is required" })
    .int({ error: "Servings must be a whole number" })
    .min(1, { error: "Must make at least 1 serving" })
    .max(100, { error: "Too many servings" }),
  ingredients: z
    .array(recipeIngredientSchema)
    .min(1, { error: "Add at least one ingredient" }),
});

export type RecipeInput = z.infer<typeof recipeSchema>;

// Logging a recipe to the diet: which day, meal, and how many servings.
export const logRecipeSchema = z.object({
  date: z.coerce.date({ error: "A valid date is required" }),
  mealType: z.preprocess(
    emptyToUndefined,
    z.enum(["BREAKFAST", "LUNCH", "DINNER", "SNACK"]).optional(),
  ),
  servings: z.coerce
    .number({ error: "Servings is required" })
    .positive({ error: "Must log at least part of a serving" })
    .max(100, { error: "Too many servings" }),
});

export type LogRecipeInput = z.infer<typeof logRecipeSchema>;

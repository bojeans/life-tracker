"use server";

import { revalidatePath } from "next/cache";
import { resolveActorUserId } from "@/lib/actor";
import { db } from "@/lib/db";
import { recipeSchema, logRecipeSchema } from "./recipe-schema";
import type { RecipeDTO } from "./recipe-types";
import { toRecipeDTO } from "./recipe-serialize";
import { recipeMacrosForServings, recipeGramsForServings } from "./recipe-analytics";
import type { DietEntryDTO } from "./types";
import { toDietEntryDTO } from "./serialize";

// Owner (signed-in) or a gated demo visitor — see @/lib/actor.
async function requireUserId(): Promise<string> {
  return resolveActorUserId();
}

const include = { ingredients: { orderBy: { sortOrder: "asc" as const } } };

export async function getRecipes(): Promise<RecipeDTO[]> {
  const userId = await requireUserId();
  const rows = await db.recipe.findMany({
    where: { userId },
    orderBy: { name: "asc" },
    include,
  });
  return rows.map(toRecipeDTO);
}

export async function createRecipe(input: unknown): Promise<RecipeDTO> {
  const userId = await requireUserId();
  const data = recipeSchema.parse(input);

  const recipe = await db.recipe.create({
    data: {
      userId,
      name: data.name,
      description: data.description ?? null,
      servings: data.servings,
      ingredients: {
        create: data.ingredients.map((ing, i) => ({
          foodItemId: ing.foodItemId ?? null,
          name: ing.name,
          quantityG: ing.quantityG,
          calories: ing.calories,
          protein: ing.protein,
          carbs: ing.carbs,
          fat: ing.fat,
          sortOrder: i,
        })),
      },
    },
    include,
  });

  revalidatePath("/health/diet/recipes");
  return toRecipeDTO(recipe);
}

export async function updateRecipe(
  id: string,
  input: unknown,
): Promise<RecipeDTO> {
  const userId = await requireUserId();
  const data = recipeSchema.parse(input);

  // Ownership check before mutating (nested writes can't be scoped by userId).
  const existing = await db.recipe.findFirst({
    where: { id, userId },
    select: { id: true },
  });
  if (!existing) throw new Error("Recipe not found");

  // Ingredients are a small set with no history to preserve, so replace them
  // wholesale rather than diffing — simpler and the macros are snapshots anyway.
  const recipe = await db.recipe.update({
    where: { id },
    data: {
      name: data.name,
      description: data.description ?? null,
      servings: data.servings,
      ingredients: {
        deleteMany: {},
        create: data.ingredients.map((ing, i) => ({
          foodItemId: ing.foodItemId ?? null,
          name: ing.name,
          quantityG: ing.quantityG,
          calories: ing.calories,
          protein: ing.protein,
          carbs: ing.carbs,
          fat: ing.fat,
          sortOrder: i,
        })),
      },
    },
    include,
  });

  revalidatePath("/health/diet/recipes");
  return toRecipeDTO(recipe);
}

export async function deleteRecipe(id: string): Promise<void> {
  const userId = await requireUserId();
  // Ingredients cascade via the FK relation.
  await db.recipe.deleteMany({ where: { id, userId } });
  revalidatePath("/health/diet/recipes");
}

// Logs a recipe to the diet as a single DietEntry: macros = the recipe total
// scaled to the servings logged. Reads the stored recipe so the totals can't be
// tampered with client-side.
export async function logRecipe(
  recipeId: string,
  input: unknown,
): Promise<DietEntryDTO> {
  const userId = await requireUserId();
  const data = logRecipeSchema.parse(input);

  const row = await db.recipe.findFirst({
    where: { id: recipeId, userId },
    include,
  });
  if (!row) throw new Error("Recipe not found");

  const recipe = toRecipeDTO(row);
  const macros = recipeMacrosForServings(recipe, data.servings);
  const grams = recipeGramsForServings(recipe, data.servings);

  const entry = await db.dietEntry.create({
    data: {
      userId,
      name: recipe.name,
      date: data.date,
      mealType: data.mealType ?? null,
      quantityG: grams,
      calories: macros.calories,
      protein: macros.protein,
      carbs: macros.carbs,
      fat: macros.fat,
    },
  });

  revalidatePath("/health/diet");
  return toDietEntryDTO(entry);
}

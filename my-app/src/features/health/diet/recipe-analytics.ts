import { scaleMacros } from "./openfoodfacts";
import type { RecipeDTO, RecipeIngredientDTO } from "./recipe-types";

export type Macros = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

const round1 = (n: number) => Math.round(n * 10) / 10;

// Macros contributed by one ingredient: its per-100g values scaled to grams.
export function ingredientMacros(ing: RecipeIngredientDTO): Macros {
  return scaleMacros(
    {
      calories: ing.calories,
      protein: ing.protein,
      carbs: ing.carbs,
      fat: ing.fat,
    },
    ing.quantityG,
  );
}

// Total macros for the whole recipe (all servings combined).
export function recipeTotals(ingredients: RecipeIngredientDTO[]): Macros {
  return ingredients.reduce<Macros>(
    (acc, ing) => {
      const m = ingredientMacros(ing);
      return {
        calories: acc.calories + m.calories,
        protein: acc.protein + m.protein,
        carbs: acc.carbs + m.carbs,
        fat: acc.fat + m.fat,
      };
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );
}

// Macros for `servingsLogged` servings of the recipe (defaults to one serving).
// servings is clamped to ≥1 to avoid divide-by-zero on malformed data.
export function recipeMacrosForServings(
  recipe: RecipeDTO,
  servingsLogged = 1,
): Macros {
  const total = recipeTotals(recipe.ingredients);
  const perServing = Math.max(1, recipe.servings);
  const factor = servingsLogged / perServing;
  return {
    calories: round1(total.calories * factor),
    protein: round1(total.protein * factor),
    carbs: round1(total.carbs * factor),
    fat: round1(total.fat * factor),
  };
}

// Total grams the recipe makes, and the grams in `servingsLogged` servings.
export function recipeGramsForServings(
  recipe: RecipeDTO,
  servingsLogged = 1,
): number {
  const totalG = recipe.ingredients.reduce((sum, i) => sum + i.quantityG, 0);
  const perServing = Math.max(1, recipe.servings);
  return round1((totalG / perServing) * servingsLogged);
}

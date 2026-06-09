import { describe, expect, it } from "vitest";
import {
  ingredientMacros,
  recipeGramsForServings,
  recipeMacrosForServings,
  recipeTotals,
} from "./recipe-analytics";
import type { RecipeDTO, RecipeIngredientDTO } from "./recipe-types";

function ing(
  over: Partial<RecipeIngredientDTO> & { name: string; quantityG: number },
): RecipeIngredientDTO {
  return {
    id: over.name,
    foodItemId: null,
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    ...over,
  };
}

// Chicken: 165 kcal / 31g protein per 100g. Onion: 40 kcal / 9g carbs per 100g.
const recipe: RecipeDTO = {
  id: "r1",
  name: "Chicken bowl",
  description: null,
  servings: 2,
  ingredients: [
    ing({ name: "Chicken breast", quantityG: 200, calories: 165, protein: 31 }),
    ing({ name: "Onion", quantityG: 50, calories: 40, carbs: 9 }),
  ],
};

describe("ingredientMacros", () => {
  it("scales per-100g to the gram quantity", () => {
    expect(ingredientMacros(recipe.ingredients[0])).toEqual({
      calories: 330,
      protein: 62,
      carbs: 0,
      fat: 0,
    });
  });
});

describe("recipeTotals", () => {
  it("sums all ingredients", () => {
    expect(recipeTotals(recipe.ingredients)).toEqual({
      calories: 350, // 330 + 20
      protein: 62,
      carbs: 4.5, // 9 * 0.5
      fat: 0,
    });
  });
});

describe("recipeMacrosForServings", () => {
  it("returns per-serving macros by default (total ÷ servings)", () => {
    expect(recipeMacrosForServings(recipe)).toEqual({
      calories: 175,
      protein: 31,
      carbs: 2.3, // round1(4.5 / 2)
      fat: 0,
    });
  });

  it("scales to the number of servings logged", () => {
    expect(recipeMacrosForServings(recipe, 2)).toEqual({
      calories: 350,
      protein: 62,
      carbs: 4.5,
      fat: 0,
    });
  });

  it("guards against a zero servings recipe (no divide-by-zero)", () => {
    const bad = { ...recipe, servings: 0 };
    expect(recipeMacrosForServings(bad).calories).toBe(350); // treated as 1
  });
});

describe("recipeGramsForServings", () => {
  it("splits total grams across servings", () => {
    expect(recipeGramsForServings(recipe)).toBe(125); // 250g / 2
    expect(recipeGramsForServings(recipe, 2)).toBe(250);
  });
});

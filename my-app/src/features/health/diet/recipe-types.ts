// Plain, serializable recipe shapes (Prisma Decimal → number). Ingredient
// macros are per-100g; quantityG is the amount used in the recipe.
export type RecipeIngredientDTO = {
  id: string;
  foodItemId: string | null;
  name: string;
  quantityG: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

export type RecipeDTO = {
  id: string;
  name: string;
  description: string | null;
  servings: number;
  ingredients: RecipeIngredientDTO[];
};

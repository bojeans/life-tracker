import type { RecipeDTO, RecipeIngredientDTO } from "./recipe-types";

type IngredientRow = {
  id: string;
  foodItemId: string | null;
  name: string;
  quantityG: unknown;
  calories: unknown;
  protein: unknown;
  carbs: unknown;
  fat: unknown;
};

export type RecipeRow = {
  id: string;
  name: string;
  description: string | null;
  servings: number;
  ingredients: IngredientRow[];
};

function toIngredientDTO(row: IngredientRow): RecipeIngredientDTO {
  return {
    id: row.id,
    foodItemId: row.foodItemId,
    name: row.name,
    quantityG: Number(row.quantityG),
    calories: Number(row.calories),
    protein: Number(row.protein),
    carbs: Number(row.carbs),
    fat: Number(row.fat),
  };
}

// Maps a Prisma recipe (with ingredients) to a serializable DTO.
export function toRecipeDTO(row: RecipeRow): RecipeDTO {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    servings: row.servings,
    ingredients: row.ingredients.map(toIngredientDTO),
  };
}

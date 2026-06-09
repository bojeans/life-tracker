"use client";

import { RecipeBuilder } from "./recipe-builder";
import { RecipeList } from "./recipe-list";
import type { RecipeDTO } from "./recipe-types";

export function RecipesView({ initialRecipes }: { initialRecipes: RecipeDTO[] }) {
  return (
    <div className="space-y-6">
      <RecipeBuilder />
      <RecipeList initialData={initialRecipes} />
    </div>
  );
}

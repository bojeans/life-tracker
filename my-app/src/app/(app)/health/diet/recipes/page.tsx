import { getRecipes } from "@/features/health/diet/recipe-actions";
import { RecipesView } from "@/features/health/diet/recipes-view";

export default async function RecipesPage() {
  const recipes = await getRecipes();

  return <RecipesView initialRecipes={recipes} />;
}

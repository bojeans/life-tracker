"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";
import { recipeSchema } from "./recipe-schema";
import { createRecipe, updateRecipe } from "./recipe-actions";
import { CatalogPicker, type CatalogPick } from "./catalog-picker";
import {
  recipeTotals,
  recipeMacrosForServings,
} from "./recipe-analytics";
import type { RecipeDTO, RecipeIngredientDTO } from "./recipe-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Builder ingredients are RecipeIngredientDTO-shaped (id is a local key), so the
// analytics helpers work directly on them for the live preview.
type BuilderIngredient = RecipeIngredientDTO;

let keySeq = 0;
const nextKey = () => `tmp-${keySeq++}`;

function fromPick(p: CatalogPick): BuilderIngredient {
  return {
    id: nextKey(),
    foodItemId: p.foodItemId,
    name: p.name,
    quantityG: p.grams,
    calories: p.per100g.calories,
    protein: p.per100g.protein,
    carbs: p.per100g.carbs,
    fat: p.per100g.fat,
  };
}

export function RecipeBuilder({
  recipe,
  onSuccess,
}: {
  recipe?: RecipeDTO;
  onSuccess?: () => void;
}) {
  const queryClient = useQueryClient();
  const isEdit = Boolean(recipe);

  const [name, setName] = useState(recipe?.name ?? "");
  const [description, setDescription] = useState(recipe?.description ?? "");
  const [servings, setServings] = useState(String(recipe?.servings ?? 1));
  const [ingredients, setIngredients] = useState<BuilderIngredient[]>(
    recipe?.ingredients ?? [],
  );
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setName("");
    setDescription("");
    setServings("1");
    setIngredients([]);
    setError(null);
  }

  const mutation = useMutation({
    mutationFn: async () => {
      const parsed = recipeSchema.safeParse({
        name,
        description,
        servings,
        ingredients,
      });
      if (!parsed.success) {
        throw new Error(parsed.error.issues[0]?.message ?? "Check the form");
      }
      if (recipe) {
        await updateRecipe(recipe.id, parsed.data);
      } else {
        await createRecipe(parsed.data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recipes"] });
      if (isEdit) onSuccess?.();
      else reset();
    },
    onError: (e: Error) => setError(e.message),
  });

  const total = recipeTotals(ingredients);
  const servingsNum = Math.max(1, Number(servings) || 1);
  const perServing = recipeMacrosForServings(
    { id: "", name: "", description: null, servings: servingsNum, ingredients },
    1,
  );

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        mutation.mutate();
      }}
      className="space-y-4 rounded-lg border p-4"
      aria-label={isEdit ? "Edit recipe" : "New recipe"}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="recipe-name">Recipe name</Label>
          <Input
            id="recipe-name"
            placeholder="e.g. Green smoothie"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="recipe-servings">Servings</Label>
          <Input
            id="recipe-servings"
            type="number"
            min="1"
            step="1"
            value={servings}
            onChange={(e) => setServings(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="recipe-desc">Notes (optional)</Label>
        <Input
          id="recipe-desc"
          placeholder="e.g. blend with ice"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      <div className="space-y-2 rounded-lg border border-dashed p-3">
        <p className="text-sm font-medium">Add an ingredient from your pantry</p>
        <CatalogPicker onPick={(p) => setIngredients((xs) => [...xs, fromPick(p)])} />
      </div>

      {ingredients.length > 0 && (
        <ul className="divide-y rounded-md border">
          {ingredients.map((ing) => (
            <li key={ing.id} className="flex items-center justify-between gap-3 p-2 text-sm">
              <span className="min-w-0 truncate">
                {ing.name}
                <span className="text-muted-foreground"> · {ing.quantityG} g</span>
              </span>
              <button
                type="button"
                aria-label={`Remove ${ing.name}`}
                onClick={() =>
                  setIngredients((xs) => xs.filter((x) => x.id !== ing.id))
                }
                className="text-muted-foreground hover:text-destructive shrink-0"
              >
                <X className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {ingredients.length > 0 && (
        <div className="text-muted-foreground grid grid-cols-2 gap-2 rounded-md bg-muted/40 p-3 text-sm sm:grid-cols-4">
          <Stat label="Total kcal" value={total.calories} />
          <Stat label="Per serving" value={`${perServing.calories} kcal`} />
          <Stat label="Protein / serv" value={`${perServing.protein} g`} />
          <Stat label="Carbs·Fat / serv" value={`${perServing.carbs}·${perServing.fat} g`} />
        </div>
      )}

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending
            ? "Saving…"
            : isEdit
              ? "Save changes"
              : "Save recipe"}
        </Button>
        {error && <p className="text-destructive text-sm">{error}</p>}
      </div>
    </form>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <p className="text-xs">{label}</p>
      <p className="text-foreground font-medium">{value}</p>
    </div>
  );
}

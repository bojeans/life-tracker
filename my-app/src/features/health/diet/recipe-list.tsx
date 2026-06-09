"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getRecipes, deleteRecipe } from "./recipe-actions";
import { recipeMacrosForServings } from "./recipe-analytics";
import { RecipeBuilder } from "./recipe-builder";
import { LogRecipeDialog } from "./log-recipe-dialog";
import type { RecipeDTO } from "./recipe-types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";

export function RecipeList({ initialData }: { initialData: RecipeDTO[] }) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<RecipeDTO | null>(null);
  const [logging, setLogging] = useState<RecipeDTO | null>(null);
  const [confirming, setConfirming] = useState<RecipeDTO | null>(null);

  const { data: recipes = [] } = useQuery({
    queryKey: ["recipes"],
    queryFn: () => getRecipes(),
    initialData,
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteRecipe(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["recipes"] });
      const previous = queryClient.getQueryData<RecipeDTO[]>(["recipes"]);
      queryClient.setQueryData<RecipeDTO[]>(["recipes"], (old) =>
        (old ?? []).filter((r) => r.id !== id),
      );
      return { previous };
    },
    onError: (_e, _id, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(["recipes"], ctx.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["recipes"] }),
  });

  function confirmDelete() {
    if (!confirming) return;
    remove.mutate(confirming.id);
    setConfirming(null);
  }

  if (recipes.length === 0) {
    return (
      <p className="text-muted-foreground py-8 text-center text-sm">
        No recipes yet. Build one above from your pantry items.
      </p>
    );
  }

  return (
    <>
      <ul className="space-y-3">
        {recipes.map((r) => {
          const perServing = recipeMacrosForServings(r, 1);
          return (
            <li key={r.id} className="rounded-lg border p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-medium">{r.name}</p>
                  <p className="text-muted-foreground text-sm">
                    {r.servings} serving{r.servings === 1 ? "" : "s"} ·{" "}
                    {r.ingredients.length} ingredient
                    {r.ingredients.length === 1 ? "" : "s"} ·{" "}
                    {perServing.calories} kcal/serving
                  </p>
                  {r.description && (
                    <p className="text-muted-foreground mt-1 text-sm">
                      {r.description}
                    </p>
                  )}
                  <p className="text-muted-foreground mt-1 truncate text-xs">
                    {r.ingredients.map((i) => `${i.name} (${i.quantityG}g)`).join(", ")}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1 sm:flex-row sm:items-center">
                  <Button size="sm" onClick={() => setLogging(r)}>
                    Log
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setEditing(r)}>
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setConfirming(r)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <LogRecipeDialog
        recipe={logging}
        open={logging !== null}
        onOpenChange={(open) => {
          if (!open) setLogging(null);
        }}
      />

      <Dialog
        open={editing !== null}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogTitle>Edit recipe</DialogTitle>
          {editing && (
            <RecipeBuilder recipe={editing} onSuccess={() => setEditing(null)} />
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={confirming !== null}
        onOpenChange={(open) => {
          if (!open) setConfirming(null);
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogTitle>Delete recipe?</DialogTitle>
          <DialogDescription>
            {confirming
              ? `This permanently deletes "${confirming.name}". Diet entries already logged from it are kept.`
              : ""}
          </DialogDescription>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirming(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

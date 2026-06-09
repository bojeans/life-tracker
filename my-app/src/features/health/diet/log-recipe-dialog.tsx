"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { logRecipeSchema } from "./recipe-schema";
import { logRecipe } from "./recipe-actions";
import { recipeMacrosForServings } from "./recipe-analytics";
import { MEAL_TYPES } from "./diet-schema";
import type { RecipeDTO } from "./recipe-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";

const today = () => new Date().toISOString().slice(0, 10);

export function LogRecipeDialog({
  recipe,
  open,
  onOpenChange,
}: {
  recipe: RecipeDTO | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [date, setDate] = useState(today());
  const [mealType, setMealType] = useState("");
  const [servings, setServings] = useState("1");
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!recipe) return;
      const parsed = logRecipeSchema.safeParse({ date, mealType, servings });
      if (!parsed.success) {
        throw new Error(parsed.error.issues[0]?.message ?? "Check the form");
      }
      await logRecipe(recipe.id, parsed.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dietEntries"] });
      onOpenChange(false);
      setServings("1");
      setMealType("");
    },
    onError: (e: Error) => setError(e.message),
  });

  const preview = recipe
    ? recipeMacrosForServings(recipe, Math.max(0, Number(servings) || 0))
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogTitle>Log {recipe?.name ?? "recipe"} to diet</DialogTitle>
        <DialogDescription>
          Adds a single diet entry with the recipe&apos;s macros for the servings
          you log.
        </DialogDescription>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            mutation.mutate();
          }}
          className="space-y-4"
        >
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="log-date">Date</Label>
              <Input
                id="log-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="log-servings">Servings</Label>
              <Input
                id="log-servings"
                type="number"
                min="0"
                step="0.25"
                value={servings}
                onChange={(e) => setServings(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="log-meal">Meal</Label>
            <select
              id="log-meal"
              value={mealType}
              onChange={(e) => setMealType(e.target.value)}
              className="border-input flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs"
            >
              <option value="">—</option>
              {MEAL_TYPES.map((m) => (
                <option key={m} value={m}>
                  {m[0] + m.slice(1).toLowerCase()}
                </option>
              ))}
            </select>
          </div>

          {preview && (
            <p className="text-muted-foreground rounded-md bg-muted/40 p-3 text-sm">
              Logs <span className="text-foreground font-medium">{preview.calories} kcal</span>
              {" · "}P {preview.protein} / C {preview.carbs} / F {preview.fat} g
            </p>
          )}

          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? "Logging…" : "Log to diet"}
          </Button>
          {error && <p className="text-destructive text-sm">{error}</p>}
        </form>
      </DialogContent>
    </Dialog>
  );
}

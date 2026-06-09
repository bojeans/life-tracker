"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getFoodItems } from "./food-item-actions";
import { scaleMacros } from "./openfoodfacts";
import type { FoodItemDTO } from "./food-item-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type CatalogPick = {
  foodItemId: string;
  name: string;
  barcode: string | null;
  grams: number;
  // Macros scaled to `grams`.
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  // Unscaled per-100g macros, for consumers (e.g. recipes) that store a
  // snapshot and rescale later.
  per100g: { calories: number; protein: number; carbs: number; fat: number };
};

function scaledPick(item: FoodItemDTO, grams: number): CatalogPick {
  const per100g = {
    calories: item.calories,
    protein: item.protein,
    carbs: item.carbs,
    fat: item.fat,
  };
  const m = scaleMacros(per100g, grams);
  return {
    foodItemId: item.id,
    name: item.name,
    barcode: item.barcode,
    grams,
    ...m,
    per100g,
  };
}

// Picks an item from the LOCAL food catalog and scales it to a gram quantity,
// so logging is fast and offline once the pantry is populated.
export function CatalogPicker({ onPick }: { onPick: (p: CatalogPick) => void }) {
  const { data: items = [] } = useQuery({
    queryKey: ["foodItems"],
    queryFn: () => getFoodItems(),
  });

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [selected, setSelected] = useState<FoodItemDTO | null>(null);
  const [grams, setGrams] = useState(100);

  const categories = useMemo(
    () =>
      [...new Set(items.map((i) => i.category).filter(Boolean))].sort() as string[],
    [items],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((i) => {
      if (category !== "all" && i.category !== category) return false;
      if (!q) return true;
      return (
        i.name.toLowerCase().includes(q) ||
        (i.brand?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [items, search, category]);

  function choose(item: FoodItemDTO) {
    setSelected(item);
    setGrams(item.servingSizeG ?? 100);
  }

  function add() {
    if (!selected) return;
    onPick(scaledPick(selected, grams));
    setSelected(null);
    setSearch("");
  }

  if (items.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        Your food catalog is empty. Add items in the{" "}
        <span className="font-medium">Pantry</span> tab (scan a barcode, search
        Open Food Facts, or enter manually), then pick them here.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <Input
          type="search"
          aria-label="Search catalog"
          placeholder="Search your foods…"
          className="flex-1"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setSelected(null);
          }}
        />
        {categories.length > 0 && (
          <select
            aria-label="Filter by category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="border-input h-8 rounded-lg border bg-transparent px-2.5 text-sm"
          >
            <option value="all">All categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        )}
      </div>

      {!selected && filtered.length > 0 && (
        <ul className="max-h-48 divide-y overflow-y-auto rounded-md border">
          {filtered.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => choose(item)}
                className="hover:bg-muted flex w-full items-center justify-between gap-3 p-2 text-left text-sm"
              >
                <span className="min-w-0 truncate">
                  {item.name}
                  {item.brand && (
                    <span className="text-muted-foreground"> · {item.brand}</span>
                  )}
                </span>
                <span className="text-muted-foreground shrink-0">
                  {item.calories} kcal/100g
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {selected && (
        <div className="bg-muted/40 flex flex-wrap items-end gap-3 rounded-md border p-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{selected.name}</p>
            <p className="text-muted-foreground text-xs">
              {scaledPick(selected, grams).calories} kcal · P{" "}
              {scaledPick(selected, grams).protein} / C{" "}
              {scaledPick(selected, grams).carbs} / F{" "}
              {scaledPick(selected, grams).fat}
            </p>
          </div>
          <div className="space-y-1">
            <label className="text-muted-foreground text-xs" htmlFor="catalog-grams">
              Grams
            </label>
            <Input
              id="catalog-grams"
              type="number"
              min="0"
              step="1"
              className="w-24"
              value={grams}
              onChange={(e) => setGrams(Number(e.target.value) || 0)}
            />
          </div>
          <Button type="button" size="sm" onClick={add}>
            Use this
          </Button>
        </div>
      )}
    </div>
  );
}

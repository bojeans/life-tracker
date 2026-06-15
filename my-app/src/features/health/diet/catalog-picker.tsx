"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getFoodItems } from "./food-item-actions";
import { scaleMacros } from "./openfoodfacts";
import { UNITS, DEFAULT_UNIT, isUnit, toGrams, type Unit } from "./units";
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
  const [amount, setAmount] = useState(100);
  const [unit, setUnit] = useState<Unit>(DEFAULT_UNIT);

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
    // Default to the item's recorded serving (e.g. 1 tbsp); otherwise grams.
    if (item.servingAmount != null && item.servingUnit && isUnit(item.servingUnit)) {
      setAmount(item.servingAmount);
      setUnit(item.servingUnit);
    } else {
      setAmount(item.servingSizeG ?? 100);
      setUnit(DEFAULT_UNIT);
    }
  }

  const grams = toGrams(amount, unit);
  const preview = selected ? scaledPick(selected, grams) : null;

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

      {selected && preview && (
        <div className="bg-muted/40 flex flex-wrap items-end gap-3 rounded-md border p-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{selected.name}</p>
            <p className="text-muted-foreground text-xs">
              {preview.calories} kcal · P {preview.protein} / C {preview.carbs} /
              F {preview.fat}
              {unit !== "g" && <> · {grams} g</>}
            </p>
          </div>
          <div className="space-y-1">
            <label className="text-muted-foreground text-xs" htmlFor="catalog-amount">
              Amount
            </label>
            <div className="flex gap-1">
              <Input
                id="catalog-amount"
                type="number"
                min="0"
                step="any"
                className="w-20"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value) || 0)}
              />
              <select
                aria-label="Unit"
                value={unit}
                onChange={(e) => setUnit(e.target.value as Unit)}
                className="border-input h-9 rounded-md border bg-transparent px-2 text-sm shadow-xs"
              >
                {UNITS.map((u) => (
                  <option key={u.value} value={u.value}>
                    {u.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <Button type="button" size="sm" onClick={add}>
            Use this
          </Button>
        </div>
      )}
    </div>
  );
}

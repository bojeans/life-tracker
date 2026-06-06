"use client";

import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { searchFoods } from "./actions";
import { scaleMacros, type FoodHit } from "./openfoodfacts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type PickedFood = {
  name: string;
  barcode: string;
  grams: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

// Builds a PickedFood (scaled to grams) from a hit — shared by search & scanner.
export function pickedFromHit(hit: FoodHit, grams: number): PickedFood {
  const m = scaleMacros(hit.per100g, grams);
  return { name: hit.name, barcode: hit.barcode, grams, ...m };
}

export function FoodSearch({ onPick }: { onPick: (f: PickedFood) => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FoodHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<FoodHit | null>(null);
  const [grams, setGrams] = useState(100);

  useEffect(() => {
    const q = query.trim();
    let cancelled = false;
    // All state updates happen inside the debounce timer (never synchronously
    // in the effect body) so a keystroke doesn't trigger a cascading render.
    const timer = setTimeout(async () => {
      if (q.length < 2) {
        if (!cancelled) setResults([]);
        return;
      }
      setLoading(true);
      const hits = await searchFoods(q);
      if (!cancelled) {
        setResults(hits);
        setLoading(false);
      }
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  function add() {
    if (!selected) return;
    onPick(pickedFromHit(selected, grams));
    setSelected(null);
    setResults([]);
    setQuery("");
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
        <Input
          type="search"
          aria-label="Search Open Food Facts"
          placeholder="Search foods (Open Food Facts)…"
          className="pl-8"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setSelected(null);
          }}
        />
      </div>

      {loading && <p className="text-muted-foreground text-sm">Searching…</p>}

      {!selected && results.length > 0 && (
        <ul className="max-h-48 divide-y overflow-y-auto rounded-md border">
          {results.map((hit, i) => (
            <li key={`${hit.barcode || hit.name}-${i}`}>
              <button
                type="button"
                onClick={() => setSelected(hit)}
                className="hover:bg-muted flex w-full items-center justify-between gap-3 p-2 text-left text-sm"
              >
                <span className="min-w-0 truncate">{hit.name}</span>
                <span className="text-muted-foreground shrink-0">
                  {hit.per100g.calories} kcal/100g
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
              {pickedFromHit(selected, grams).calories} kcal · P{" "}
              {pickedFromHit(selected, grams).protein} / C{" "}
              {pickedFromHit(selected, grams).carbs} / F{" "}
              {pickedFromHit(selected, grams).fat}
            </p>
          </div>
          <div className="space-y-1">
            <label className="text-muted-foreground text-xs" htmlFor="off-grams">
              Grams
            </label>
            <Input
              id="off-grams"
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

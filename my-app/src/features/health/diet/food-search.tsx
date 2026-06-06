"use client";

import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { searchFoods } from "./actions";
import type { FoodHit } from "./openfoodfacts";
import { Input } from "@/components/ui/input";

// Open Food Facts text search. Emits the raw per-100g hit; the caller decides
// what to do with it (the Pantry saves it to the catalog).
export function FoodSearch({
  onSelect,
}: {
  onSelect: (hit: FoodHit) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FoodHit[]>([]);
  const [loading, setLoading] = useState(false);

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
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {loading && <p className="text-muted-foreground text-sm">Searching…</p>}

      {results.length > 0 && (
        <ul className="max-h-56 divide-y overflow-y-auto rounded-md border">
          {results.map((hit, i) => (
            <li key={`${hit.barcode || hit.name}-${i}`}>
              <button
                type="button"
                onClick={() => {
                  onSelect(hit);
                  setQuery("");
                  setResults([]);
                }}
                className="hover:bg-muted flex w-full items-center justify-between gap-3 p-2 text-left text-sm"
              >
                <span className="min-w-0 truncate">
                  {hit.name}
                  {hit.brand && (
                    <span className="text-muted-foreground"> · {hit.brand}</span>
                  )}
                </span>
                <span className="text-muted-foreground shrink-0">
                  {hit.per100g.calories} kcal/100g
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

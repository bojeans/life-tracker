"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getFoodItems, deleteFoodItem } from "./food-item-actions";
import { FoodItemForm } from "./food-item-form";
import { formatServing } from "./units";
import type { FoodItemDTO } from "./food-item-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";

export function FoodItemList({ initialData }: { initialData: FoodItemDTO[] }) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<FoodItemDTO | null>(null);
  const [confirming, setConfirming] = useState<FoodItemDTO | null>(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");

  const { data: items = [] } = useQuery({
    queryKey: ["foodItems"],
    queryFn: () => getFoodItems(),
    initialData,
  });

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
        (i.brand?.toLowerCase().includes(q) ?? false) ||
        (i.category?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [items, search, category]);

  const remove = useMutation({
    mutationFn: (id: string) => deleteFoodItem(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["foodItems"] });
      const previous = queryClient.getQueryData<FoodItemDTO[]>(["foodItems"]);
      queryClient.setQueryData<FoodItemDTO[]>(["foodItems"], (old) =>
        (old ?? []).filter((i) => i.id !== id),
      );
      return { previous };
    },
    onError: (_err, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["foodItems"], context.previous);
      }
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["foodItems"] }),
  });

  function confirmDelete() {
    if (!confirming) return;
    remove.mutate(confirming.id);
    setConfirming(null);
  }

  if (items.length === 0) {
    return (
      <p className="text-muted-foreground py-8 text-center text-sm">
        Your pantry is empty. Scan, search, or add a food above.
      </p>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Input
            type="search"
            placeholder="Search your pantry…"
            aria-label="Search pantry"
            className="flex-1"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {categories.length > 0 && (
            <select
              aria-label="Filter by category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="border-input h-9 rounded-md border bg-transparent px-2.5 text-sm shadow-xs"
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
        <p className="text-muted-foreground text-sm">
          {filtered.length} of {items.length} item(s)
        </p>
        {filtered.length === 0 ? (
          <p className="text-muted-foreground rounded-lg border border-dashed py-8 text-center text-sm">
            No items match your search.
          </p>
        ) : (
          <ul className="divide-y rounded-lg border">
            {filtered.map((i) => (
              <li
                key={i.id}
                className="flex items-center justify-between gap-4 p-3"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">
                    {i.name}
                    {i.brand && (
                      <span className="text-muted-foreground font-normal">
                        {" "}
                        · {i.brand}
                      </span>
                    )}
                  </p>
                  <p className="text-muted-foreground text-sm">
                    {i.calories} kcal/100g · P {i.protein} / C {i.carbs} / F{" "}
                    {i.fat}
                    {i.category ? ` · ${i.category}` : ""}
                    {(() => {
                      const serving = formatServing(
                        i.servingAmount,
                        i.servingUnit,
                        i.servingSizeG,
                      );
                      return serving ? ` · serving ${serving}` : "";
                    })()}
                  </p>
                </div>
                <div className="flex items-center gap-1 sm:gap-3">
                  <Button variant="ghost" size="sm" onClick={() => setEditing(i)}>
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setConfirming(i)}
                  >
                    Delete
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Dialog
        open={editing !== null}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogTitle>Edit food item</DialogTitle>
          {editing && (
            <FoodItemForm item={editing} onSuccess={() => setEditing(null)} />
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
          <DialogTitle>Delete from pantry?</DialogTitle>
          <DialogDescription>
            {confirming
              ? `This removes "${confirming.name}" from your catalog. Past diet entries logged from it are kept.`
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

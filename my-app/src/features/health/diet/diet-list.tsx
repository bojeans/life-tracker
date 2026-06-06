"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getDietEntries, deleteDietEntry } from "./actions";
import { DietEntryForm } from "./diet-entry-form";
import type { DietEntryDTO } from "./types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";

function mealLabel(m: DietEntryDTO["mealType"]) {
  return m ? m[0] + m.slice(1).toLowerCase() : null;
}

export function DietList({ initialData }: { initialData: DietEntryDTO[] }) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<DietEntryDTO | null>(null);
  const [confirming, setConfirming] = useState<DietEntryDTO | null>(null);
  const [search, setSearch] = useState("");

  const { data: entries = [] } = useQuery({
    queryKey: ["dietEntries"],
    queryFn: () => getDietEntries(),
    initialData,
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        (mealLabel(e.mealType)?.toLowerCase().includes(q) ?? false),
    );
  }, [entries, search]);

  const remove = useMutation({
    mutationFn: (id: string) => deleteDietEntry(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["dietEntries"] });
      const previous = queryClient.getQueryData<DietEntryDTO[]>(["dietEntries"]);
      queryClient.setQueryData<DietEntryDTO[]>(["dietEntries"], (old) =>
        (old ?? []).filter((e) => e.id !== id),
      );
      return { previous };
    },
    onError: (_err, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["dietEntries"], context.previous);
      }
    },
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: ["dietEntries"] }),
  });

  function confirmDelete() {
    if (!confirming) return;
    remove.mutate(confirming.id);
    setConfirming(null);
  }

  if (entries.length === 0) {
    return (
      <p className="text-muted-foreground py-8 text-center text-sm">
        No diet entries yet. Add your first one above.
      </p>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <Input
          type="search"
          placeholder="Search food or meal…"
          aria-label="Search diet entries"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <p className="text-muted-foreground text-sm">
          Showing {filtered.length} of {entries.length}
        </p>
        {filtered.length === 0 ? (
          <p className="text-muted-foreground rounded-lg border border-dashed py-8 text-center text-sm">
            No entries match your search.
          </p>
        ) : (
          <ul className="divide-y rounded-lg border">
            {filtered.map((e) => (
              <li
                key={e.id}
                className="flex items-center justify-between gap-4 p-3"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">
                    {e.name}
                    {e.isDailyTotal && (
                      <span className="text-muted-foreground ml-2 text-xs font-normal">
                        daily total
                      </span>
                    )}
                  </p>
                  <p className="text-muted-foreground text-sm">
                    {new Date(e.date).toLocaleDateString("en-AU", {
                      timeZone: "UTC",
                    })}
                    {mealLabel(e.mealType) ? ` · ${mealLabel(e.mealType)}` : ""}
                    {` · P ${e.protein} / C ${e.carbs} / F ${e.fat}`}
                  </p>
                </div>
                <div className="flex items-center gap-1 sm:gap-3">
                  <span className="font-medium whitespace-nowrap">
                    {e.calories} kcal
                  </span>
                  <Button variant="ghost" size="sm" onClick={() => setEditing(e)}>
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setConfirming(e)}
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
          <DialogTitle>Edit diet entry</DialogTitle>
          {editing && (
            <DietEntryForm entry={editing} onSuccess={() => setEditing(null)} />
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
          <DialogTitle>Delete entry?</DialogTitle>
          <DialogDescription>
            {confirming
              ? `This permanently deletes "${confirming.name}" (${confirming.calories} kcal). This can't be undone.`
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

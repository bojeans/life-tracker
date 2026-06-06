"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getExerciseEntries, deleteExerciseEntry } from "./actions";
import { ExerciseForm } from "./exercise-form";
import type { ExerciseEntryDTO } from "./types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";

export function ExerciseList({
  initialData,
  latestWeightKg,
}: {
  initialData: ExerciseEntryDTO[];
  latestWeightKg: number | null;
}) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<ExerciseEntryDTO | null>(null);
  const [confirming, setConfirming] = useState<ExerciseEntryDTO | null>(null);
  const [search, setSearch] = useState("");

  const { data: entries = [] } = useQuery({
    queryKey: ["exerciseEntries"],
    queryFn: () => getExerciseEntries(),
    initialData,
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter(
      (e) =>
        e.activity.toLowerCase().includes(q) ||
        (e.note?.toLowerCase().includes(q) ?? false),
    );
  }, [entries, search]);

  const remove = useMutation({
    mutationFn: (id: string) => deleteExerciseEntry(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["exerciseEntries"] });
      const previous = queryClient.getQueryData<ExerciseEntryDTO[]>([
        "exerciseEntries",
      ]);
      queryClient.setQueryData<ExerciseEntryDTO[]>(["exerciseEntries"], (old) =>
        (old ?? []).filter((e) => e.id !== id),
      );
      return { previous };
    },
    onError: (_err, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["exerciseEntries"], context.previous);
      }
    },
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: ["exerciseEntries"] }),
  });

  function confirmDelete() {
    if (!confirming) return;
    remove.mutate(confirming.id);
    setConfirming(null);
  }

  if (entries.length === 0) {
    return (
      <p className="text-muted-foreground py-8 text-center text-sm">
        No exercise entries yet. Add your first one above.
      </p>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <Input
          type="search"
          placeholder="Search activity or note…"
          aria-label="Search exercise entries"
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
                  <p className="truncate font-medium">{e.activity}</p>
                  <p className="text-muted-foreground text-sm">
                    {new Date(e.date).toLocaleDateString("en-AU", {
                      timeZone: "UTC",
                    })}
                    {e.durationMin ? ` · ${e.durationMin} min` : ""}
                    {e.steps ? ` · ${e.steps} steps` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-1 sm:gap-3">
                  <span className="font-medium whitespace-nowrap">
                    {e.caloriesBurned} kcal
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
          <DialogTitle>Edit exercise entry</DialogTitle>
          {editing && (
            <ExerciseForm
              entry={editing}
              latestWeightKg={latestWeightKg}
              onSuccess={() => setEditing(null)}
            />
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
              ? `This permanently deletes "${confirming.activity}" (${confirming.caloriesBurned} kcal). This can't be undone.`
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

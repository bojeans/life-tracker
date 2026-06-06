"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getWeightEntries, deleteWeightEntry } from "./actions";
import { WeightForm } from "./weight-form";
import type { WeightEntryDTO } from "./types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";

export function WeightList({ initialData }: { initialData: WeightEntryDTO[] }) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<WeightEntryDTO | null>(null);
  const [confirming, setConfirming] = useState<WeightEntryDTO | null>(null);

  const { data: entries = [] } = useQuery({
    queryKey: ["weightEntries"],
    queryFn: () => getWeightEntries(),
    initialData,
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteWeightEntry(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["weightEntries"] });
      const previous = queryClient.getQueryData<WeightEntryDTO[]>([
        "weightEntries",
      ]);
      queryClient.setQueryData<WeightEntryDTO[]>(["weightEntries"], (old) =>
        (old ?? []).filter((e) => e.id !== id),
      );
      return { previous };
    },
    onError: (_err, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["weightEntries"], context.previous);
      }
    },
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: ["weightEntries"] }),
  });

  function confirmDelete() {
    if (!confirming) return;
    remove.mutate(confirming.id);
    setConfirming(null);
  }

  if (entries.length === 0) {
    return (
      <p className="text-muted-foreground py-8 text-center text-sm">
        No weight entries yet. Add your first one above.
      </p>
    );
  }

  return (
    <>
      <ul className="divide-y rounded-lg border">
        {entries.map((e) => (
          <li key={e.id} className="flex items-center justify-between gap-4 p-3">
            <div className="min-w-0">
              <p className="font-medium">{e.weightKg} kg</p>
              <p className="text-muted-foreground text-sm">
                {new Date(e.date).toLocaleDateString("en-AU", {
                  timeZone: "UTC",
                })}
                {e.note ? ` · ${e.note}` : ""}
              </p>
            </div>
            <div className="flex items-center gap-1 sm:gap-3">
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

      <Dialog
        open={editing !== null}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogTitle>Edit weight entry</DialogTitle>
          {editing && (
            <WeightForm entry={editing} onSuccess={() => setEditing(null)} />
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
              ? `This permanently deletes the ${confirming.weightKg} kg entry. This can't be undone.`
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

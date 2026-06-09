"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getBloodPressureEntries,
  deleteBloodPressureEntry,
} from "./actions";
import { classifyBloodPressure } from "./analytics";
import { BloodPressureForm } from "./blood-pressure-form";
import { CategoryBadge } from "./category-badge";
import type { BloodPressureEntryDTO } from "./types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";

export function BloodPressureList({
  initialData,
}: {
  initialData: BloodPressureEntryDTO[];
}) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<BloodPressureEntryDTO | null>(null);
  const [confirming, setConfirming] = useState<BloodPressureEntryDTO | null>(
    null,
  );

  const { data: entries = [] } = useQuery({
    queryKey: ["bloodPressureEntries"],
    queryFn: () => getBloodPressureEntries(),
    initialData,
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteBloodPressureEntry(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["bloodPressureEntries"] });
      const previous = queryClient.getQueryData<BloodPressureEntryDTO[]>([
        "bloodPressureEntries",
      ]);
      queryClient.setQueryData<BloodPressureEntryDTO[]>(
        ["bloodPressureEntries"],
        (old) => (old ?? []).filter((e) => e.id !== id),
      );
      return { previous };
    },
    onError: (_err, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["bloodPressureEntries"], context.previous);
      }
    },
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: ["bloodPressureEntries"] }),
  });

  function confirmDelete() {
    if (!confirming) return;
    remove.mutate(confirming.id);
    setConfirming(null);
  }

  if (entries.length === 0) {
    return (
      <p className="text-muted-foreground py-8 text-center text-sm">
        No readings yet. Add your first one above.
      </p>
    );
  }

  return (
    <>
      <ul className="divide-y rounded-lg border">
        {entries.map((e) => {
          const category = classifyBloodPressure(e.systolic, e.diastolic);
          return (
            <li
              key={e.id}
              className="flex items-center justify-between gap-4 p-3"
            >
              <div className="min-w-0">
                <p className="flex items-center gap-2 font-medium">
                  <span>
                    {e.systolic}/{e.diastolic}
                    <span className="text-muted-foreground text-sm font-normal">
                      {" "}
                      mmHg
                    </span>
                  </span>
                  <CategoryBadge category={category} />
                </p>
                <p className="text-muted-foreground text-sm">
                  {new Date(e.date).toLocaleDateString("en-AU", {
                    timeZone: "UTC",
                  })}
                  {e.pulse != null ? ` · ${e.pulse} bpm` : ""}
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
          );
        })}
      </ul>

      <Dialog
        open={editing !== null}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogTitle>Edit reading</DialogTitle>
          {editing && (
            <BloodPressureForm
              entry={editing}
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
          <DialogTitle>Delete reading?</DialogTitle>
          <DialogDescription>
            {confirming
              ? `This permanently deletes the ${confirming.systolic}/${confirming.diastolic} reading. This can't be undone.`
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

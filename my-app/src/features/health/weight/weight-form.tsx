"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { weightEntrySchema } from "./weight-schema";
import { createWeightEntry, updateWeightEntry } from "./actions";
import type { WeightEntryDTO } from "./types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type FormInput = z.input<typeof weightEntrySchema>;
type FormOutput = z.output<typeof weightEntrySchema>;

const today = () => new Date().toISOString().slice(0, 10);

function blankDefaults(): FormInput {
  return {
    date: today(),
    weightKg: "" as unknown as FormInput["weightKg"],
    note: "",
  };
}

function defaultsFrom(e: WeightEntryDTO): FormInput {
  return {
    date: e.date.slice(0, 10),
    weightKg: e.weightKg as unknown as FormInput["weightKg"],
    note: e.note ?? "",
  };
}

export function WeightForm({
  entry,
  onSuccess,
}: {
  entry?: WeightEntryDTO;
  onSuccess?: () => void;
}) {
  const queryClient = useQueryClient();
  const isEdit = Boolean(entry);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(weightEntrySchema),
    defaultValues: entry ? defaultsFrom(entry) : blankDefaults(),
  });

  const mutation = useMutation({
    mutationFn: async (values: FormOutput) => {
      if (entry) {
        await updateWeightEntry(entry.id, values);
      } else {
        await createWeightEntry(values);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["weightEntries"] });
      if (isEdit) {
        onSuccess?.();
      } else {
        reset(blankDefaults());
      }
    },
  });

  return (
    <form
      onSubmit={handleSubmit((values) => mutation.mutate(values))}
      className="space-y-4 rounded-lg border p-4"
      aria-label={isEdit ? "Edit weight entry" : "Add weight entry"}
    >
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="date">Date</Label>
          <Input id="date" type="date" {...register("date")} />
          {errors.date && (
            <p className="text-destructive text-sm">{errors.date.message}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="weightKg">Weight (kg)</Label>
          <Input
            id="weightKg"
            type="number"
            step="0.1"
            placeholder="0.0"
            {...register("weightKg")}
          />
          {errors.weightKg && (
            <p className="text-destructive text-sm">{errors.weightKg.message}</p>
          )}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="note">Note (optional)</Label>
        <Input id="note" placeholder="e.g. post-workout" {...register("note")} />
      </div>

      <Button type="submit" disabled={mutation.isPending}>
        {mutation.isPending ? "Saving…" : isEdit ? "Save changes" : "Add weight"}
      </Button>
      {mutation.isError && (
        <p className="text-destructive text-sm">
          Something went wrong. Please try again.
        </p>
      )}
    </form>
  );
}

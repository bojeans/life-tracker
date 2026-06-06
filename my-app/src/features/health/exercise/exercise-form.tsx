"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { exerciseEntrySchema } from "./exercise-schema";
import { createExerciseEntry, updateExerciseEntry } from "./actions";
import { MET_ACTIVITIES, metFor, caloriesBurned } from "./exercise-calories";
import type { ExerciseEntryDTO } from "./types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type FormInput = z.input<typeof exerciseEntrySchema>;
type FormOutput = z.output<typeof exerciseEntrySchema>;

const today = () => new Date().toISOString().slice(0, 10);
const blankNum = "" as unknown as number;

function blankDefaults(): FormInput {
  return {
    activity: "",
    date: today(),
    durationMin: blankNum,
    met: blankNum,
    caloriesBurned: blankNum,
    steps: blankNum,
    distanceKm: blankNum,
    note: "",
  };
}

function defaultsFrom(e: ExerciseEntryDTO): FormInput {
  const n = (v: number | null) => (v ?? "") as unknown as number;
  return {
    activity: e.activity,
    date: e.date.slice(0, 10),
    durationMin: n(e.durationMin),
    met: n(e.met),
    caloriesBurned: e.caloriesBurned as unknown as number,
    steps: n(e.steps),
    distanceKm: n(e.distanceKm),
    note: e.note ?? "",
  };
}

export function ExerciseForm({
  entry,
  latestWeightKg,
  onSuccess,
}: {
  entry?: ExerciseEntryDTO;
  latestWeightKg: number | null;
  onSuccess?: () => void;
}) {
  const queryClient = useQueryClient();
  const isEdit = Boolean(entry);

  const {
    register,
    handleSubmit,
    reset,
    getValues,
    setValue,
    formState: { errors },
  } = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(exerciseEntrySchema),
    defaultValues: entry ? defaultsFrom(entry) : blankDefaults(),
  });

  // Recompute calories from MET × bodyweight × duration whenever the activity
  // (with a known MET) or duration changes. Always editable afterwards.
  function recompute() {
    const { activity, durationMin } = getValues();
    const met = metFor(String(activity));
    const dur = Number(durationMin);
    if (met && latestWeightKg && dur > 0) {
      setValue("met", met as unknown as number);
      setValue(
        "caloriesBurned",
        caloriesBurned(met, latestWeightKg, dur) as unknown as number,
        { shouldValidate: true },
      );
    }
  }

  const mutation = useMutation({
    mutationFn: async (values: FormOutput) => {
      if (entry) {
        await updateExerciseEntry(entry.id, values);
      } else {
        await createExerciseEntry(values);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exerciseEntries"] });
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
      aria-label={isEdit ? "Edit exercise entry" : "Add exercise entry"}
    >
      <input type="hidden" {...register("met")} />

      <div className="space-y-1.5">
        <Label htmlFor="activity">Activity</Label>
        <Input
          id="activity"
          list="met-activities"
          placeholder="e.g. Running (10 km/h)"
          {...register("activity", { onChange: recompute })}
        />
        <datalist id="met-activities">
          {MET_ACTIVITIES.map((a) => (
            <option key={a.name} value={a.name} />
          ))}
        </datalist>
        {errors.activity && (
          <p className="text-destructive text-sm">{errors.activity.message}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="space-y-1.5">
          <Label htmlFor="date">Date</Label>
          <Input id="date" type="date" {...register("date")} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="durationMin">Duration (min)</Label>
          <Input
            id="durationMin"
            type="number"
            step="1"
            {...register("durationMin", { onChange: recompute })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="caloriesBurned">Calories</Label>
          <Input id="caloriesBurned" type="number" step="1" {...register("caloriesBurned")} />
          {errors.caloriesBurned && (
            <p className="text-destructive text-sm">{errors.caloriesBurned.message}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="steps">Steps</Label>
          <Input id="steps" type="number" step="1" {...register("steps")} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="distanceKm">Distance (km)</Label>
          <Input id="distanceKm" type="number" step="0.01" {...register("distanceKm")} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="note">Note</Label>
          <Input id="note" {...register("note")} />
        </div>
      </div>

      {!latestWeightKg && (
        <p className="text-muted-foreground text-sm">
          Log a weight entry to auto-calculate calories from the activity — for
          now enter calories manually.
        </p>
      )}

      <Button type="submit" disabled={mutation.isPending}>
        {mutation.isPending ? "Saving…" : isEdit ? "Save changes" : "Add exercise"}
      </Button>
      {mutation.isError && (
        <p className="text-destructive text-sm">
          Something went wrong. Please try again.
        </p>
      )}
    </form>
  );
}

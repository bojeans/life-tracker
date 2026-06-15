"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { exerciseEntrySchema } from "./exercise-schema";
import { createExerciseEntry, updateExerciseEntry } from "./actions";
import {
  caloriesBurned,
  classifyCardio,
  metForIntensity,
  STRENGTH_INTENSITIES,
  type StrengthIntensity,
} from "./exercise-calories";
import type { ExerciseEntryDTO } from "./types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type FormInput = z.input<typeof exerciseEntrySchema>;
type FormOutput = z.output<typeof exerciseEntrySchema>;

type Mode = "cardio" | "strength";

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

  // Infer the mode for an existing entry: a recorded distance means cardio.
  const [mode, setMode] = useState<Mode>(
    entry && entry.distanceKm == null ? "strength" : "cardio",
  );
  const [intensity, setIntensity] = useState<StrengthIntensity>("moderate");

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

  // Derive activity, MET and calories from the current inputs. Cardio reads the
  // pace from distance+duration; strength uses the intensity MET. Calories
  // stays editable afterwards.
  function recompute(nextMode: Mode = mode, nextIntensity = intensity) {
    const { distanceKm, durationMin } = getValues();
    const dur = Number(durationMin);

    if (nextMode === "cardio") {
      const est = classifyCardio(Number(distanceKm), dur);
      setValue("activity", est?.activity ?? "Cardio", { shouldValidate: true });
      if (est) {
        setValue("met", est.met as unknown as number);
        if (latestWeightKg) {
          setValue(
            "caloriesBurned",
            caloriesBurned(est.met, latestWeightKg, dur) as unknown as number,
            { shouldValidate: true },
          );
        }
      }
    } else {
      const met = metForIntensity(nextIntensity);
      setValue("activity", "Strength training", { shouldValidate: true });
      setValue("met", met as unknown as number);
      if (latestWeightKg && dur > 0) {
        setValue(
          "caloriesBurned",
          caloriesBurned(met, latestWeightKg, dur) as unknown as number,
          { shouldValidate: true },
        );
      }
    }
  }

  function switchMode(next: Mode) {
    if (next === mode) return;
    // Distance only applies to cardio — clear it when moving to strength so a
    // stale value doesn't flip the inferred mode on a later edit.
    if (next === "strength") setValue("distanceKm", blankNum);
    setMode(next);
    recompute(next);
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
        recompute(mode);
      }
    },
  });

  return (
    <form
      onSubmit={handleSubmit((values) => mutation.mutate(values))}
      className="space-y-4 rounded-lg border p-4"
      aria-label={isEdit ? "Edit exercise entry" : "Add exercise entry"}
    >
      {/* Activity + MET are derived, not entered. */}
      <input type="hidden" {...register("activity")} />
      <input type="hidden" {...register("met")} />

      <div className="bg-muted inline-flex rounded-lg p-1" role="tablist">
        {(["cardio", "strength"] as const).map((m) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={mode === m}
            onClick={() => switchMode(m)}
            className={cn(
              "rounded-md px-4 py-1.5 text-sm font-medium capitalize transition-colors",
              mode === m
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {m}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="space-y-1.5">
          <Label htmlFor="date">Date</Label>
          <Input id="date" type="date" {...register("date")} />
        </div>

        {mode === "cardio" && (
          <div className="space-y-1.5">
            <Label htmlFor="distanceKm">Distance (km)</Label>
            <Input
              id="distanceKm"
              type="number"
              step="0.01"
              placeholder="e.g. 5"
              {...register("distanceKm", { onChange: () => recompute() })}
            />
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="durationMin">Duration (min)</Label>
          <Input
            id="durationMin"
            type="number"
            step="1"
            placeholder="e.g. 30"
            {...register("durationMin", { onChange: () => recompute() })}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="caloriesBurned">Calories</Label>
          <Input
            id="caloriesBurned"
            type="number"
            step="1"
            {...register("caloriesBurned")}
          />
          {errors.caloriesBurned && (
            <p className="text-destructive text-sm">
              {errors.caloriesBurned.message}
            </p>
          )}
        </div>
      </div>

      {mode === "strength" && (
        <div className="space-y-1.5">
          <Label>Intensity</Label>
          <div className="bg-muted inline-flex rounded-lg p-1">
            {STRENGTH_INTENSITIES.map((opt) => (
              <button
                key={opt.value}
                type="button"
                aria-pressed={intensity === opt.value}
                onClick={() => {
                  setIntensity(opt.value);
                  recompute("strength", opt.value);
                }}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  intensity === opt.value
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {mode === "cardio" && (
        <div className="space-y-1.5">
          <Label htmlFor="steps">Steps (optional)</Label>
          <Input id="steps" type="number" step="1" {...register("steps")} />
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="note">Note (optional)</Label>
        <Input id="note" {...register("note")} />
      </div>

      {!latestWeightKg && (
        <p className="text-muted-foreground text-sm">
          Log a weight entry to auto-calculate calories — for now enter calories
          manually.
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

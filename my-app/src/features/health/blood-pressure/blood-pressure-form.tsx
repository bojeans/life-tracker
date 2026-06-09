"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { bloodPressureEntrySchema } from "./blood-pressure-schema";
import {
  createBloodPressureEntry,
  updateBloodPressureEntry,
} from "./actions";
import type { BloodPressureEntryDTO } from "./types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type FormInput = z.input<typeof bloodPressureEntrySchema>;
type FormOutput = z.output<typeof bloodPressureEntrySchema>;

const today = () => new Date().toISOString().slice(0, 10);
const numField = <K extends keyof FormInput>(v: string) =>
  v as unknown as FormInput[K];

function blankDefaults(): FormInput {
  return {
    date: today(),
    systolic: numField<"systolic">(""),
    diastolic: numField<"diastolic">(""),
    pulse: numField<"pulse">(""),
    note: "",
  };
}

function defaultsFrom(e: BloodPressureEntryDTO): FormInput {
  return {
    date: e.date.slice(0, 10),
    systolic: e.systolic as unknown as FormInput["systolic"],
    diastolic: e.diastolic as unknown as FormInput["diastolic"],
    pulse: (e.pulse ?? "") as unknown as FormInput["pulse"],
    note: e.note ?? "",
  };
}

export function BloodPressureForm({
  entry,
  onSuccess,
}: {
  entry?: BloodPressureEntryDTO;
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
    resolver: zodResolver(bloodPressureEntrySchema),
    defaultValues: entry ? defaultsFrom(entry) : blankDefaults(),
  });

  const mutation = useMutation({
    mutationFn: async (values: FormOutput) => {
      if (entry) {
        await updateBloodPressureEntry(entry.id, values);
      } else {
        await createBloodPressureEntry(values);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bloodPressureEntries"] });
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
      aria-label={
        isEdit ? "Edit blood pressure entry" : "Add blood pressure entry"
      }
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
          <Label htmlFor="pulse">Pulse (bpm, optional)</Label>
          <Input
            id="pulse"
            type="number"
            inputMode="numeric"
            placeholder="e.g. 65"
            {...register("pulse")}
          />
          {errors.pulse && (
            <p className="text-destructive text-sm">{errors.pulse.message}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="systolic">Systolic (top)</Label>
          <Input
            id="systolic"
            type="number"
            inputMode="numeric"
            placeholder="e.g. 120"
            {...register("systolic")}
          />
          {errors.systolic && (
            <p className="text-destructive text-sm">{errors.systolic.message}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="diastolic">Diastolic (bottom)</Label>
          <Input
            id="diastolic"
            type="number"
            inputMode="numeric"
            placeholder="e.g. 80"
            {...register("diastolic")}
          />
          {errors.diastolic && (
            <p className="text-destructive text-sm">
              {errors.diastolic.message}
            </p>
          )}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="note">Note (optional)</Label>
        <Input
          id="note"
          placeholder="e.g. resting, left arm"
          {...register("note")}
        />
      </div>

      <Button type="submit" disabled={mutation.isPending}>
        {mutation.isPending
          ? "Saving…"
          : isEdit
            ? "Save changes"
            : "Add reading"}
      </Button>
      {mutation.isError && (
        <p className="text-destructive text-sm">
          Something went wrong. Please try again.
        </p>
      )}
    </form>
  );
}

"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import {
  profileSchema,
  SEXES,
  ACTIVITY_LEVELS,
} from "./profile-schema";
import { upsertProfile } from "./actions";
import type { ProfileDTO } from "./types";
import { ACTIVITY_LABELS, SEX_LABELS } from "../energy";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type FormInput = z.input<typeof profileSchema>;
type FormOutput = z.output<typeof profileSchema>;

function defaultsFrom(p: ProfileDTO | null): FormInput {
  return {
    heightCm: (p?.heightCm ?? "") as unknown as FormInput["heightCm"],
    birthYear: (p?.birthYear ?? "") as unknown as FormInput["birthYear"],
    sex: (p?.sex ?? "") as unknown as FormInput["sex"],
    activityLevel: p?.activityLevel ?? "LIGHT",
    bodyFatPct: (p?.bodyFatPct ?? "") as unknown as FormInput["bodyFatPct"],
  };
}

const selectClass =
  "border-input flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs";

export function ProfileForm({ profile }: { profile: ProfileDTO | null }) {
  const queryClient = useQueryClient();
  const [saved, setSaved] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(profileSchema),
    defaultValues: defaultsFrom(profile),
  });

  const mutation = useMutation({
    mutationFn: (values: FormOutput) => upsertProfile(values),
    onSuccess: () => {
      setSaved(true);
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
  });

  return (
    <form
      onSubmit={handleSubmit((values) => {
        setSaved(false);
        mutation.mutate(values);
      })}
      className="max-w-md space-y-4 rounded-lg border p-4"
      aria-label="Profile"
    >
      <p className="text-muted-foreground text-sm">
        Used to estimate your daily calorie burn (BMR/TDEE) for the energy
        balance. Logged workouts are added on top, so set activity to your
        day-to-day level excluding exercise.
      </p>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="heightCm">Height (cm)</Label>
          <Input id="heightCm" type="number" step="0.1" {...register("heightCm")} />
          {errors.heightCm && (
            <p className="text-destructive text-sm">{errors.heightCm.message}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="birthYear">Birth year</Label>
          <Input id="birthYear" type="number" {...register("birthYear")} />
          {errors.birthYear && (
            <p className="text-destructive text-sm">{errors.birthYear.message}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="sex">Sex</Label>
          <select id="sex" {...register("sex")} className={selectClass}>
            <option value="">—</option>
            {SEXES.map((s) => (
              <option key={s} value={s}>
                {SEX_LABELS[s]}
              </option>
            ))}
          </select>
          {errors.sex && (
            <p className="text-destructive text-sm">{errors.sex.message}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="bodyFatPct">Body fat % (optional)</Label>
          <Input id="bodyFatPct" type="number" step="0.1" {...register("bodyFatPct")} />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="activityLevel">Baseline activity</Label>
        <select
          id="activityLevel"
          {...register("activityLevel")}
          className={selectClass}
        >
          {ACTIVITY_LEVELS.map((a) => (
            <option key={a} value={a}>
              {ACTIVITY_LABELS[a]}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? "Saving…" : "Save profile"}
        </Button>
        {saved && !mutation.isPending && (
          <span className="text-sm text-green-600">Saved</span>
        )}
      </div>
      {mutation.isError && (
        <p className="text-destructive text-sm">
          Something went wrong. Please try again.
        </p>
      )}
    </form>
  );
}

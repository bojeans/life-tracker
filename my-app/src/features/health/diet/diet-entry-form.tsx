"use client";

import { useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { dietEntrySchema, MEAL_TYPES } from "./diet-schema";
import { createDietEntry, updateDietEntry, lookupBarcode } from "./actions";
import type { DietEntryDTO } from "./types";
import { FoodSearch, pickedFromHit, type PickedFood } from "./food-search";
import { BarcodeScanner } from "./barcode-scanner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type FormInput = z.input<typeof dietEntrySchema>;
type FormOutput = z.output<typeof dietEntrySchema>;

const today = () => new Date().toISOString().slice(0, 10);

function blankDefaults(): FormInput {
  return {
    name: "",
    date: today(),
    mealType: "" as unknown as FormInput["mealType"],
    isDailyTotal: false,
    quantityG: "" as unknown as FormInput["quantityG"],
    calories: "" as unknown as FormInput["calories"],
    protein: "" as unknown as FormInput["protein"],
    carbs: "" as unknown as FormInput["carbs"],
    fat: "" as unknown as FormInput["fat"],
    barcode: "",
  };
}

function defaultsFrom(e: DietEntryDTO): FormInput {
  return {
    name: e.name,
    date: e.date.slice(0, 10),
    mealType: (e.mealType ?? "") as unknown as FormInput["mealType"],
    isDailyTotal: e.isDailyTotal,
    quantityG: (e.quantityG ?? "") as unknown as FormInput["quantityG"],
    calories: e.calories as unknown as FormInput["calories"],
    protein: e.protein as unknown as FormInput["protein"],
    carbs: e.carbs as unknown as FormInput["carbs"],
    fat: e.fat as unknown as FormInput["fat"],
    barcode: e.barcode ?? "",
  };
}

export function DietEntryForm({
  entry,
  onSuccess,
}: {
  entry?: DietEntryDTO;
  onSuccess?: () => void;
}) {
  const queryClient = useQueryClient();
  const isEdit = Boolean(entry);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(dietEntrySchema),
    defaultValues: entry ? defaultsFrom(entry) : blankDefaults(),
  });

  // Prefill the form from a food search or barcode scan (macros already scaled).
  // Memoised so the barcode scanner's camera isn't restarted on every render.
  const applyPicked = useCallback(
    (f: PickedFood) => {
      const set = (k: keyof FormInput, v: unknown) =>
        setValue(k, v as FormInput[typeof k], { shouldValidate: true });
      set("name", f.name);
      set("barcode", f.barcode);
      set("quantityG", f.grams);
      set("calories", f.calories);
      set("protein", f.protein);
      set("carbs", f.carbs);
      set("fat", f.fat);
    },
    [setValue],
  );

  // A scanned barcode → look up macros; fall back to just recording the code.
  const handleScan = useCallback(
    async (code: string) => {
      const hit = await lookupBarcode(code);
      if (hit) {
        applyPicked(pickedFromHit(hit, 100));
      } else {
        setValue("barcode", code, { shouldValidate: true });
      }
    },
    [applyPicked, setValue],
  );

  const mutation = useMutation({
    mutationFn: async (values: FormOutput) => {
      if (entry) {
        await updateDietEntry(entry.id, values);
      } else {
        await createDietEntry(values);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dietEntries"] });
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
      aria-label={isEdit ? "Edit diet entry" : "Add diet entry"}
    >
      <input type="hidden" {...register("barcode")} />

      {!isEdit && (
        <div className="space-y-2 rounded-lg border border-dashed p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium">Quick add</p>
            <BarcodeScanner onDetected={handleScan} />
          </div>
          <FoodSearch onPick={applyPicked} />
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="name">Food</Label>
        <Input id="name" placeholder="e.g. Greek yoghurt" {...register("name")} />
        {errors.name && (
          <p className="text-destructive text-sm">{errors.name.message}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="date">Date</Label>
          <Input id="date" type="date" {...register("date")} />
          {errors.date && (
            <p className="text-destructive text-sm">{errors.date.message}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="mealType">Meal</Label>
          <select
            id="mealType"
            {...register("mealType")}
            className="border-input flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs"
          >
            <option value="">—</option>
            {MEAL_TYPES.map((m) => (
              <option key={m} value={m}>
                {m[0] + m.slice(1).toLowerCase()}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <MacroField id="calories" label="Calories" register={register} error={errors.calories?.message} />
        <MacroField id="protein" label="Protein (g)" register={register} error={errors.protein?.message} />
        <MacroField id="carbs" label="Carbs (g)" register={register} error={errors.carbs?.message} />
        <MacroField id="fat" label="Fat (g)" register={register} error={errors.fat?.message} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="quantityG">Quantity (g, optional)</Label>
          <Input id="quantityG" type="number" step="0.1" placeholder="e.g. 170" {...register("quantityG")} />
        </div>
        <label className="flex items-end gap-2 pb-2 text-sm">
          <input type="checkbox" {...register("isDailyTotal")} className="size-4" />
          <span>This is a whole-day total</span>
        </label>
      </div>

      <Button type="submit" disabled={mutation.isPending}>
        {mutation.isPending ? "Saving…" : isEdit ? "Save changes" : "Add entry"}
      </Button>
      {mutation.isError && (
        <p className="text-destructive text-sm">
          Something went wrong. Please try again.
        </p>
      )}
    </form>
  );
}

function MacroField({
  id,
  label,
  register,
  error,
}: {
  id: "calories" | "protein" | "carbs" | "fat";
  label: string;
  register: ReturnType<typeof useForm<FormInput, unknown, FormOutput>>["register"];
  error?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} type="number" step="0.1" placeholder="0" {...register(id)} />
      {error && <p className="text-destructive text-sm">{error}</p>}
    </div>
  );
}

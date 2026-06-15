"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { foodItemSchema } from "./food-item-schema";
import { createFoodItem, updateFoodItem, getFoodItems } from "./food-item-actions";
import type { FoodItemDTO, FoodItemPrefill } from "./food-item-types";
import { UNITS, DEFAULT_UNIT } from "./units";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type FormInput = z.input<typeof foodItemSchema>;
type FormOutput = z.output<typeof foodItemSchema>;

function blank(prefill?: FoodItemPrefill): FormInput {
  const v = (n?: number) => (n ?? "") as unknown as number;
  return {
    name: prefill?.name ?? "",
    brand: prefill?.brand ?? "",
    category: prefill?.category ?? "",
    barcode: prefill?.barcode ?? "",
    servingAmount: "",
    servingUnit: DEFAULT_UNIT,
    calories: v(prefill?.calories),
    protein: v(prefill?.protein),
    carbs: v(prefill?.carbs),
    fat: v(prefill?.fat),
    fiber: v(prefill?.fiber),
    sugar: v(prefill?.sugar),
    sodium: v(prefill?.sodium),
    satFat: v(prefill?.satFat),
  } as unknown as FormInput;
}

function defaultsFrom(item: FoodItemDTO): FormInput {
  const s = (v: number | null) => (v ?? "") as unknown as number;
  return {
    name: item.name,
    brand: item.brand ?? "",
    category: item.category ?? "",
    barcode: item.barcode ?? "",
    servingAmount: s(item.servingAmount),
    servingUnit: (item.servingUnit ?? DEFAULT_UNIT) as FormInput["servingUnit"],
    calories: item.calories as unknown as number,
    protein: item.protein as unknown as number,
    carbs: item.carbs as unknown as number,
    fat: item.fat as unknown as number,
    fiber: s(item.fiber),
    sugar: s(item.sugar),
    sodium: s(item.sodium),
    satFat: s(item.satFat),
  } as unknown as FormInput;
}

export function FoodItemForm({
  item,
  prefill,
  onSuccess,
}: {
  item?: FoodItemDTO;
  prefill?: FoodItemPrefill;
  onSuccess?: () => void;
}) {
  const queryClient = useQueryClient();
  const isEdit = Boolean(item);
  const [dupError, setDupError] = useState<string | null>(null);

  // Cached pantry list — used to catch a duplicate name+brand before submitting
  // (the server enforces it too, as a backstop against races).
  const { data: items = [] } = useQuery({
    queryKey: ["foodItems"],
    queryFn: () => getFoodItems(),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(foodItemSchema),
    defaultValues: item ? defaultsFrom(item) : blank(prefill),
  });

  const mutation = useMutation({
    mutationFn: async (values: FormOutput) => {
      if (item) {
        await updateFoodItem(item.id, values);
      } else {
        await createFoodItem(values);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["foodItems"] });
      if (isEdit) {
        onSuccess?.();
      } else {
        reset(blank());
      }
    },
  });

  function onSubmit(values: FormOutput) {
    const name = values.name.trim().toLowerCase();
    const brand = (values.brand ?? "").trim().toLowerCase();
    const clash = items.find(
      (i) =>
        i.id !== item?.id &&
        i.name.trim().toLowerCase() === name &&
        (i.brand ?? "").trim().toLowerCase() === brand,
    );
    if (clash) {
      setDupError(
        `"${values.name}"${values.brand ? ` (${values.brand})` : ""} is already in your pantry.`,
      );
      return;
    }
    setDupError(null);
    mutation.mutate(values);
  }

  const errorMessage =
    dupError ?? (mutation.error instanceof Error ? mutation.error.message : null);

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-4 rounded-lg border p-4"
      aria-label={isEdit ? "Edit food item" : "Add food item"}
    >
      <p className="text-muted-foreground text-sm">
        Nutrients are <strong>per 100g</strong>.
      </p>

      {!isEdit && prefill && (
        <p className="rounded-md border border-dashed p-2 text-sm">
          {prefill.name ? (
            <>
              Open Food Facts didn&apos;t have full nutrition for{" "}
              <strong>{prefill.name}</strong>.
            </>
          ) : prefill.barcode ? (
            <>
              Barcode <code>{prefill.barcode}</code> wasn&apos;t in Open Food
              Facts.
            </>
          ) : null}{" "}
          Add the missing values once and it&apos;ll be saved to your pantry —
          future scans will find it instantly.
        </p>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="fi-name">Name</Label>
        <Input id="fi-name" placeholder="e.g. Chicken breast" {...register("name")} />
        {errors.name && (
          <p className="text-destructive text-sm">{errors.name.message}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field id="fi-brand" label="Brand" reg={register("brand")} />
        <Field id="fi-category" label="Category" reg={register("category")} placeholder="e.g. Meat" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field id="fi-barcode" label="Barcode" reg={register("barcode")} />
        <div className="space-y-1.5">
          <Label htmlFor="fi-serving-amount">Serving size</Label>
          <div className="flex gap-2">
            <Input
              id="fi-serving-amount"
              type="number"
              step="any"
              min="0"
              placeholder="e.g. 1"
              className="flex-1"
              {...register("servingAmount")}
            />
            <select
              aria-label="Serving unit"
              {...register("servingUnit")}
              className="border-input h-9 rounded-md border bg-transparent px-2 text-sm shadow-xs"
            >
              {UNITS.map((u) => (
                <option key={u.value} value={u.value}>
                  {u.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Field id="fi-calories" label="Calories" type="number" reg={register("calories")} error={errors.calories?.message} />
        <Field id="fi-protein" label="Protein (g)" type="number" reg={register("protein")} error={errors.protein?.message} />
        <Field id="fi-carbs" label="Carbs (g)" type="number" reg={register("carbs")} error={errors.carbs?.message} />
        <Field id="fi-fat" label="Fat (g)" type="number" reg={register("fat")} error={errors.fat?.message} />
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Field id="fi-fiber" label="Fiber (g)" type="number" reg={register("fiber")} />
        <Field id="fi-sugar" label="Sugar (g)" type="number" reg={register("sugar")} />
        <Field id="fi-sodium" label="Sodium (g)" type="number" reg={register("sodium")} />
        <Field id="fi-satfat" label="Sat. fat (g)" type="number" reg={register("satFat")} />
      </div>

      <Button type="submit" disabled={mutation.isPending}>
        {mutation.isPending ? "Saving…" : isEdit ? "Save changes" : "Add to pantry"}
      </Button>
      {errorMessage && (
        <p className="text-destructive text-sm">{errorMessage}</p>
      )}
    </form>
  );
}

function Field({
  id,
  label,
  reg,
  type = "text",
  placeholder,
  error,
}: {
  id: string;
  label: string;
  reg: ReturnType<ReturnType<typeof useForm<FormInput, unknown, FormOutput>>["register"]>;
  type?: string;
  placeholder?: string;
  error?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type={type}
        step={type === "number" ? "any" : undefined}
        placeholder={placeholder}
        {...reg}
      />
      {error && <p className="text-destructive text-sm">{error}</p>}
    </div>
  );
}

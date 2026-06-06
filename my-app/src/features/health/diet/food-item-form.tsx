"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { foodItemSchema } from "./food-item-schema";
import { createFoodItem, updateFoodItem } from "./food-item-actions";
import type { FoodItemDTO } from "./food-item-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type FormInput = z.input<typeof foodItemSchema>;
type FormOutput = z.output<typeof foodItemSchema>;

const blank = (): FormInput =>
  ({
    name: "",
    brand: "",
    category: "",
    barcode: "",
    servingSizeG: "",
    calories: "",
    protein: "",
    carbs: "",
    fat: "",
    fiber: "",
    sugar: "",
    sodium: "",
    satFat: "",
  }) as unknown as FormInput;

function defaultsFrom(item: FoodItemDTO): FormInput {
  const s = (v: number | null) => (v ?? "") as unknown as number;
  return {
    name: item.name,
    brand: item.brand ?? "",
    category: item.category ?? "",
    barcode: item.barcode ?? "",
    servingSizeG: s(item.servingSizeG),
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
  onSuccess,
}: {
  item?: FoodItemDTO;
  onSuccess?: () => void;
}) {
  const queryClient = useQueryClient();
  const isEdit = Boolean(item);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(foodItemSchema),
    defaultValues: item ? defaultsFrom(item) : blank(),
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

  return (
    <form
      onSubmit={handleSubmit((values) => mutation.mutate(values))}
      className="space-y-4 rounded-lg border p-4"
      aria-label={isEdit ? "Edit food item" : "Add food item"}
    >
      <p className="text-muted-foreground text-sm">
        Nutrients are <strong>per 100g</strong>.
      </p>

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
        <Field id="fi-serving" label="Serving size (g)" type="number" reg={register("servingSizeG")} />
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
      {mutation.isError && (
        <p className="text-destructive text-sm">
          Something went wrong. Please try again.
        </p>
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
        step={type === "number" ? "0.1" : undefined}
        placeholder={placeholder}
        {...reg}
      />
      {error && <p className="text-destructive text-sm">{error}</p>}
    </div>
  );
}

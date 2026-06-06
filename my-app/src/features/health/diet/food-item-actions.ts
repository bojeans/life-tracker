"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { foodItemSchema } from "./food-item-schema";
import type { FoodItemDTO } from "./food-item-types";
import { toFoodItemDTO, foodItemFieldsFromHit } from "./food-item-serialize";
import type { FoodHit } from "./openfoodfacts";

async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }
  return session.user.id;
}

export async function createFoodItem(input: unknown): Promise<FoodItemDTO> {
  const userId = await requireUserId();
  const data = foodItemSchema.parse(input);

  const item = await db.foodItem.create({
    data: {
      userId,
      name: data.name,
      brand: data.brand ?? null,
      category: data.category ?? null,
      barcode: data.barcode ?? null,
      servingSizeG: data.servingSizeG ?? null,
      calories: data.calories,
      protein: data.protein,
      carbs: data.carbs,
      fat: data.fat,
      fiber: data.fiber ?? null,
      sugar: data.sugar ?? null,
      sodium: data.sodium ?? null,
      satFat: data.satFat ?? null,
    },
  });

  revalidatePath("/health/diet/pantry");
  return toFoodItemDTO(item);
}

export async function getFoodItems(): Promise<FoodItemDTO[]> {
  const userId = await requireUserId();

  const rows = await db.foodItem.findMany({
    where: { userId },
    orderBy: { name: "asc" },
  });

  return rows.map(toFoodItemDTO);
}

// Saves an Open Food Facts hit into the catalog. Deduped by barcode: re-saving
// the same scanned product updates the existing item rather than duplicating.
export async function saveFoodFromHit(
  hit: FoodHit,
  category?: string,
): Promise<FoodItemDTO> {
  const userId = await requireUserId();
  const fields = foodItemFieldsFromHit(hit);
  const base = {
    ...fields,
    category: category?.trim() || null,
    source: "OPEN_FOOD_FACTS" as const,
    externalId: fields.barcode ? `off:${fields.barcode}` : null,
  };

  const item = fields.barcode
    ? await db.foodItem.upsert({
        where: { userId_barcode: { userId, barcode: fields.barcode } },
        create: { userId, ...base },
        update: base,
      })
    : await db.foodItem.create({ data: { userId, ...base } });

  revalidatePath("/health/diet/pantry");
  return toFoodItemDTO(item);
}

export async function updateFoodItem(
  id: string,
  input: unknown,
): Promise<void> {
  const userId = await requireUserId();
  const data = foodItemSchema.parse(input);

  const result = await db.foodItem.updateMany({
    where: { id, userId },
    data: {
      name: data.name,
      brand: data.brand ?? null,
      category: data.category ?? null,
      barcode: data.barcode ?? null,
      servingSizeG: data.servingSizeG ?? null,
      calories: data.calories,
      protein: data.protein,
      carbs: data.carbs,
      fat: data.fat,
      fiber: data.fiber ?? null,
      sugar: data.sugar ?? null,
      sodium: data.sodium ?? null,
      satFat: data.satFat ?? null,
    },
  });

  if (result.count === 0) {
    throw new Error("Food item not found");
  }

  revalidatePath("/health/diet/pantry");
}

export async function deleteFoodItem(id: string) {
  const userId = await requireUserId();

  // Scope to owner. The DietEntry.foodItem relation is SetNull, so historical
  // entries survive (with their macro snapshot) when a catalog item is removed.
  await db.foodItem.deleteMany({ where: { id, userId } });

  revalidatePath("/health/diet/pantry");
}

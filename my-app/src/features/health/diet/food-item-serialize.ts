import type { FoodItemDTO, FoodItemPrefill } from "./food-item-types";
import type { FoodHit } from "./openfoodfacts";

export type FoodItemRow = {
  id: string;
  name: string;
  brand: string | null;
  category: string | null;
  barcode: string | null;
  servingSizeG: unknown;
  calories: unknown;
  protein: unknown;
  carbs: unknown;
  fat: unknown;
  fiber: unknown;
  sugar: unknown;
  sodium: unknown;
  satFat: unknown;
  source: string;
};

const numOrNull = (v: unknown) => (v == null ? null : Number(v));

export function toFoodItemDTO(row: FoodItemRow): FoodItemDTO {
  return {
    id: row.id,
    name: row.name,
    brand: row.brand,
    category: row.category,
    barcode: row.barcode,
    servingSizeG: numOrNull(row.servingSizeG),
    calories: Number(row.calories),
    protein: Number(row.protein),
    carbs: Number(row.carbs),
    fat: Number(row.fat),
    fiber: numOrNull(row.fiber),
    sugar: numOrNull(row.sugar),
    sodium: numOrNull(row.sodium),
    satFat: numOrNull(row.satFat),
    source: row.source,
  };
}

// Pure mapping of an Open Food Facts hit (per-100g) to FoodItem column values.
// Used when saving a scanned/searched product into the catalog.
export function foodItemFieldsFromHit(hit: FoodHit) {
  return {
    name: hit.name,
    brand: hit.brand ?? null,
    barcode: hit.barcode || null,
    calories: hit.per100g.calories,
    protein: hit.per100g.protein,
    carbs: hit.per100g.carbs,
    fat: hit.per100g.fat,
    fiber: hit.micros.fiber ?? null,
    sugar: hit.micros.sugar ?? null,
    sodium: hit.micros.sodium ?? null,
    satFat: hit.micros.satFat ?? null,
  };
}

// Seeds the manual add form from an OFF hit (carrying over whatever it had:
// name/brand/barcode and any partial nutrition). Zero macros are omitted so the
// fields render blank, prompting the user to fill them in.
export function prefillFromHit(hit: FoodHit): FoodItemPrefill {
  const pos = (n: number | undefined) => (n && n > 0 ? n : undefined);
  return {
    name: hit.name,
    brand: hit.brand,
    barcode: hit.barcode || undefined,
    calories: pos(hit.per100g.calories),
    protein: pos(hit.per100g.protein),
    carbs: pos(hit.per100g.carbs),
    fat: pos(hit.per100g.fat),
    fiber: pos(hit.micros.fiber),
    sugar: pos(hit.micros.sugar),
    sodium: pos(hit.micros.sodium),
    satFat: pos(hit.micros.satFat),
  };
}

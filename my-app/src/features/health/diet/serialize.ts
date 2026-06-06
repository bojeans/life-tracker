import type { DietEntryDTO } from "./types";

// Shape of a Prisma DietEntry row (Decimals are objects at runtime).
export type DietEntryRow = {
  id: string;
  name: string;
  date: Date;
  mealType: string | null;
  isDailyTotal: boolean;
  quantityG: unknown;
  calories: unknown;
  protein: unknown;
  carbs: unknown;
  fat: unknown;
  barcode: string | null;
  foodItemId: string | null;
  source: string;
};

// Maps a Prisma row to a serializable DTO (Decimal -> number, Date -> ISO).
export function toDietEntryDTO(row: DietEntryRow): DietEntryDTO {
  return {
    id: row.id,
    name: row.name,
    date: row.date.toISOString(),
    mealType: (row.mealType as DietEntryDTO["mealType"]) ?? null,
    isDailyTotal: row.isDailyTotal,
    quantityG: row.quantityG == null ? null : Number(row.quantityG),
    calories: Number(row.calories),
    protein: Number(row.protein),
    carbs: Number(row.carbs),
    fat: Number(row.fat),
    barcode: row.barcode,
    foodItemId: row.foodItemId,
    source: row.source,
  };
}

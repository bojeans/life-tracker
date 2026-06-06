// Plain, serializable catalog item (Prisma Decimal -> number). All nutrients
// are per 100g; micros are nullable.
export type FoodItemDTO = {
  id: string;
  name: string;
  brand: string | null;
  category: string | null;
  barcode: string | null;
  servingSizeG: number | null;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number | null;
  sugar: number | null;
  sodium: number | null;
  satFat: number | null;
  source: string;
};

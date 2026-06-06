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

// Partial values used to seed the manual add form (from an unmatched barcode,
// or an OFF hit that lacked nutrition).
export type FoodItemPrefill = {
  name?: string;
  brand?: string;
  category?: string;
  barcode?: string;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  fiber?: number;
  sugar?: number;
  sodium?: number;
  satFat?: number;
};

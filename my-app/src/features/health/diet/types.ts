import type { MEAL_TYPES } from "./diet-schema";

// Plain, fully-serializable shape sent to client components (Prisma Decimal →
// number, Date → ISO string). Mirrors the finance TransactionDTO pattern.
export type DietEntryDTO = {
  id: string;
  name: string;
  date: string; // ISO 8601
  mealType: (typeof MEAL_TYPES)[number] | null;
  isDailyTotal: boolean;
  quantityG: number | null;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  barcode: string | null;
  foodItemId: string | null;
  source: string;
};

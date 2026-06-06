// Open Food Facts client helpers. The fetchers live in actions.ts (server side);
// everything here is pure and unit-tested so the mapping logic is verified
// without network access.

export type Per100g = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

export type FoodHit = {
  name: string;
  barcode: string;
  per100g: Per100g;
};

const BASE = "https://world.openfoodfacts.org";
const FIELDS = "code,product_name,nutriments";

export function searchUrl(query: string): string {
  const params = new URLSearchParams({
    search_terms: query,
    json: "1",
    page_size: "20",
    fields: FIELDS,
  });
  return `${BASE}/cgi/search.pl?${params.toString()}`;
}

export function productUrl(barcode: string): string {
  const params = new URLSearchParams({ fields: FIELDS });
  return `${BASE}/api/v2/product/${encodeURIComponent(barcode)}.json?${params.toString()}`;
}

type OffNutriments = Record<string, unknown>;
type OffProduct = {
  code?: string;
  product_name?: string;
  nutriments?: OffNutriments;
};

const numOrZero = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

// Maps a raw Open Food Facts product to a FoodHit, or null if it has no name
// (OFF data is crowd-sourced and frequently incomplete).
export function toFoodHit(product: OffProduct): FoodHit | null {
  const name = (product.product_name ?? "").trim();
  if (!name) return null;
  const n = product.nutriments ?? {};
  return {
    name,
    barcode: (product.code ?? "").trim(),
    per100g: {
      calories: numOrZero(n["energy-kcal_100g"]),
      protein: numOrZero(n["proteins_100g"]),
      carbs: numOrZero(n["carbohydrates_100g"]),
      fat: numOrZero(n["fat_100g"]),
    },
  };
}

// Scales per-100g macros to an arbitrary gram quantity, rounded to 1dp.
export function scaleMacros(per100g: Per100g, grams: number): Per100g {
  const f = grams / 100;
  const r1 = (x: number) => Math.round(x * f * 10) / 10;
  return {
    calories: r1(per100g.calories),
    protein: r1(per100g.protein),
    carbs: r1(per100g.carbs),
    fat: r1(per100g.fat),
  };
}

export function parseSearchResults(json: unknown): FoodHit[] {
  const products = (json as { products?: unknown })?.products;
  if (!Array.isArray(products)) return [];
  return products
    .map((p) => toFoodHit(p as OffProduct))
    .filter((h): h is FoodHit => h !== null);
}

export function parseProductResult(json: unknown): FoodHit | null {
  const data = json as { status?: number; product?: OffProduct };
  if (!data || data.status === 0 || !data.product) return null;
  return toFoodHit(data.product);
}

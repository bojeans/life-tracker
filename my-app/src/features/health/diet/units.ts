// Measurement units for pantry serving sizes and logged quantities. Macros are
// always stored per 100 g, so every unit resolves to grams for the math. Mass
// units are exact; volume units assume a density of ~1 g/ml — accurate for
// water-like foods (smoothies, milk, juice), ~10% off for oils, which is well
// within the app's loose-accuracy goal.

export type Unit = "mg" | "g" | "kg" | "oz" | "ml" | "tsp" | "tbsp" | "cup";

export type UnitDef = {
  value: Unit;
  label: string;
  gramsPerUnit: number;
  kind: "mass" | "volume";
};

export const UNITS: UnitDef[] = [
  { value: "g", label: "g", gramsPerUnit: 1, kind: "mass" },
  { value: "mg", label: "mg", gramsPerUnit: 0.001, kind: "mass" },
  { value: "kg", label: "kg", gramsPerUnit: 1000, kind: "mass" },
  { value: "oz", label: "oz", gramsPerUnit: 28.3495, kind: "mass" },
  { value: "ml", label: "ml", gramsPerUnit: 1, kind: "volume" },
  { value: "tsp", label: "tsp", gramsPerUnit: 5, kind: "volume" },
  { value: "tbsp", label: "tbsp", gramsPerUnit: 15, kind: "volume" },
  { value: "cup", label: "cup", gramsPerUnit: 240, kind: "volume" },
];

export const DEFAULT_UNIT: Unit = "g";

const BY_UNIT = new Map(UNITS.map((u) => [u.value, u]));

export const isUnit = (v: string): v is Unit => BY_UNIT.has(v as Unit);

export const gramsPerUnit = (unit: Unit): number =>
  BY_UNIT.get(unit)?.gramsPerUnit ?? 1;

// Convert an amount in `unit` to grams (rounded to 2 dp — the column scale).
export function toGrams(amount: number, unit: Unit): number {
  return Math.round(amount * gramsPerUnit(unit) * 100) / 100;
}

// Human label for a serving, e.g. "1 tbsp (15 g)". Falls back to grams-only
// when no unit was recorded (older items, or OFF imports).
export function formatServing(
  amount: number | null,
  unit: string | null,
  grams: number | null,
): string | null {
  if (amount != null && unit && isUnit(unit) && unit !== "g") {
    const g = grams ?? toGrams(amount, unit);
    return `${amount} ${unit} (${g} g)`;
  }
  if (grams != null) return `${grams} g`;
  if (amount != null) return `${amount} g`;
  return null;
}

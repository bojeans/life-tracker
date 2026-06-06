"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { dietEntrySchema } from "./diet-schema";
import type { DietEntryDTO } from "./types";
import { toDietEntryDTO } from "./serialize";
import { parseDietCsv, externalIdFor } from "./csv";
import {
  searchUrl,
  productUrl,
  parseSearchResults,
  parseProductResult,
  type FoodHit,
} from "./openfoodfacts";

// Open Food Facts asks API clients to identify themselves via User-Agent.
const OFF_HEADERS = {
  "User-Agent": "LifeTracker/1.0 (life-tracker portfolio app)",
};

export type DietCsvImportResult = {
  imported: number;
  skipped: number;
  errors: { row: number; message: string }[];
};

async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }
  return session.user.id;
}

export async function createDietEntry(input: unknown): Promise<DietEntryDTO> {
  const userId = await requireUserId();
  const data = dietEntrySchema.parse(input);

  const entry = await db.dietEntry.create({
    data: {
      userId,
      name: data.name,
      date: data.date,
      mealType: data.mealType ?? null,
      isDailyTotal: data.isDailyTotal,
      quantityG: data.quantityG ?? null,
      calories: data.calories,
      protein: data.protein,
      carbs: data.carbs,
      fat: data.fat,
      barcode: data.barcode ?? null,
    },
  });

  revalidatePath("/health/diet");
  return toDietEntryDTO(entry);
}

export async function getDietEntries(): Promise<DietEntryDTO[]> {
  const userId = await requireUserId();

  const rows = await db.dietEntry.findMany({
    where: { userId },
    orderBy: { date: "desc" },
  });

  return rows.map(toDietEntryDTO);
}

export async function importDietCsv(
  csvText: string,
): Promise<DietCsvImportResult> {
  const userId = await requireUserId();
  const { valid, errors } = parseDietCsv(csvText);

  let imported = 0;
  if (valid.length > 0) {
    // skipDuplicates relies on @@unique([userId, source, externalId]) so the
    // same CSV row isn't imported twice across re-uploads.
    const result = await db.dietEntry.createMany({
      data: valid.map((e) => ({
        userId,
        name: e.name,
        date: e.date,
        mealType: e.mealType ?? null,
        isDailyTotal: e.isDailyTotal,
        quantityG: e.quantityG ?? null,
        calories: e.calories,
        protein: e.protein,
        carbs: e.carbs,
        fat: e.fat,
        source: "CSV" as const,
        externalId: externalIdFor(e),
      })),
      skipDuplicates: true,
    });
    imported = result.count;
  }

  revalidatePath("/health/diet");
  return { imported, skipped: valid.length - imported, errors };
}

export async function updateDietEntry(
  id: string,
  input: unknown,
): Promise<void> {
  const userId = await requireUserId();
  const data = dietEntrySchema.parse(input);

  // updateMany scopes the where clause to the owner so a user can't edit
  // another user's row. source/externalId are intentionally left unchanged.
  const result = await db.dietEntry.updateMany({
    where: { id, userId },
    data: {
      name: data.name,
      date: data.date,
      mealType: data.mealType ?? null,
      isDailyTotal: data.isDailyTotal,
      quantityG: data.quantityG ?? null,
      calories: data.calories,
      protein: data.protein,
      carbs: data.carbs,
      fat: data.fat,
      barcode: data.barcode ?? null,
    },
  });

  if (result.count === 0) {
    throw new Error("Diet entry not found");
  }

  revalidatePath("/health/diet");
}

export async function deleteDietEntry(id: string) {
  const userId = await requireUserId();

  // Scope the delete to the owner so one user can't delete another's row.
  await db.dietEntry.deleteMany({ where: { id, userId } });

  revalidatePath("/health/diet");
}

// ── Open Food Facts lookups (free, no key; per-100g macros) ──────────────────

// Text search for foods. Returns [] for short queries, network errors, or no
// matches so the UI can stay simple. Owner-guarded like the rest of the app.
export async function searchFoods(query: string): Promise<FoodHit[]> {
  await requireUserId();
  const q = query.trim();
  if (q.length < 2) return [];

  try {
    const res = await fetch(searchUrl(q), { headers: OFF_HEADERS });
    if (!res.ok) return [];
    return parseSearchResults(await res.json());
  } catch {
    return [];
  }
}

// Looks up a single product by barcode (from the scanner). Null if unknown.
export async function lookupBarcode(barcode: string): Promise<FoodHit | null> {
  await requireUserId();
  const code = barcode.trim();
  if (!code) return null;

  try {
    const res = await fetch(productUrl(code), { headers: OFF_HEADERS });
    if (!res.ok) return null;
    return parseProductResult(await res.json());
  } catch {
    return null;
  }
}

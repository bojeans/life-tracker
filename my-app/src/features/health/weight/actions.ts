"use server";

import { revalidatePath } from "next/cache";
import { resolveActorUserId } from "@/lib/actor";
import { db } from "@/lib/db";
import { weightEntrySchema } from "./weight-schema";
import type { WeightEntryDTO } from "./types";
import { toWeightEntryDTO } from "./serialize";
import { parseWeightCsv, externalIdFor } from "./csv";

export type WeightCsvImportResult = {
  imported: number;
  skipped: number;
  errors: { row: number; message: string }[];
};

// Owner (signed-in) or a gated demo visitor — see @/lib/actor.
async function requireUserId(): Promise<string> {
  return resolveActorUserId();
}

export async function createWeightEntry(
  input: unknown,
): Promise<WeightEntryDTO> {
  const userId = await requireUserId();
  const data = weightEntrySchema.parse(input);

  const entry = await db.weightEntry.create({
    data: {
      userId,
      date: data.date,
      weightKg: data.weightKg,
      note: data.note ?? null,
    },
  });

  revalidatePath("/health/weight");
  return toWeightEntryDTO(entry);
}

export async function getWeightEntries(): Promise<WeightEntryDTO[]> {
  const userId = await requireUserId();

  const rows = await db.weightEntry.findMany({
    where: { userId },
    orderBy: { date: "desc" },
  });

  return rows.map(toWeightEntryDTO);
}

export async function importWeightCsv(
  csvText: string,
): Promise<WeightCsvImportResult> {
  const userId = await requireUserId();
  const { valid, errors } = parseWeightCsv(csvText);

  let imported = 0;
  if (valid.length > 0) {
    const result = await db.weightEntry.createMany({
      data: valid.map((e) => ({
        userId,
        date: e.date,
        weightKg: e.weightKg,
        note: e.note ?? null,
        source: "CSV" as const,
        externalId: externalIdFor(e),
      })),
      skipDuplicates: true,
    });
    imported = result.count;
  }

  revalidatePath("/health/weight");
  return { imported, skipped: valid.length - imported, errors };
}

export async function updateWeightEntry(
  id: string,
  input: unknown,
): Promise<void> {
  const userId = await requireUserId();
  const data = weightEntrySchema.parse(input);

  const result = await db.weightEntry.updateMany({
    where: { id, userId },
    data: {
      date: data.date,
      weightKg: data.weightKg,
      note: data.note ?? null,
    },
  });

  if (result.count === 0) {
    throw new Error("Weight entry not found");
  }

  revalidatePath("/health/weight");
}

export async function deleteWeightEntry(id: string) {
  const userId = await requireUserId();

  await db.weightEntry.deleteMany({ where: { id, userId } });

  revalidatePath("/health/weight");
}

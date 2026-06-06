"use server";

import { revalidatePath } from "next/cache";
import { resolveActorUserId } from "@/lib/actor";
import { db } from "@/lib/db";
import { exerciseEntrySchema } from "./exercise-schema";
import type { ExerciseEntryDTO } from "./types";
import { toExerciseEntryDTO } from "./serialize";
import { parseExerciseCsv, externalIdFor } from "./csv";

export type ExerciseCsvImportResult = {
  imported: number;
  skipped: number;
  errors: { row: number; message: string }[];
};

// Owner (signed-in) or a gated demo visitor — see @/lib/actor.
async function requireUserId(): Promise<string> {
  return resolveActorUserId();
}

function persistFields(data: ReturnType<typeof exerciseEntrySchema.parse>) {
  return {
    activity: data.activity,
    date: data.date,
    durationMin: data.durationMin ?? null,
    met: data.met ?? null,
    caloriesBurned: data.caloriesBurned,
    steps: data.steps ?? null,
    distanceKm: data.distanceKm ?? null,
    note: data.note ?? null,
  };
}

export async function createExerciseEntry(
  input: unknown,
): Promise<ExerciseEntryDTO> {
  const userId = await requireUserId();
  const data = exerciseEntrySchema.parse(input);

  const entry = await db.exerciseEntry.create({
    data: { userId, ...persistFields(data) },
  });

  revalidatePath("/health/exercise");
  revalidatePath("/health");
  return toExerciseEntryDTO(entry);
}

export async function getExerciseEntries(): Promise<ExerciseEntryDTO[]> {
  const userId = await requireUserId();

  const rows = await db.exerciseEntry.findMany({
    where: { userId },
    orderBy: { date: "desc" },
  });

  return rows.map(toExerciseEntryDTO);
}

export async function importExerciseCsv(
  csvText: string,
): Promise<ExerciseCsvImportResult> {
  const userId = await requireUserId();
  const { valid, errors } = parseExerciseCsv(csvText);

  let imported = 0;
  if (valid.length > 0) {
    const result = await db.exerciseEntry.createMany({
      data: valid.map((e) => ({
        userId,
        activity: e.activity,
        date: e.date,
        durationMin: e.durationMin ?? null,
        met: e.met ?? null,
        caloriesBurned: e.caloriesBurned,
        steps: e.steps ?? null,
        distanceKm: e.distanceKm ?? null,
        note: e.note ?? null,
        source: "CSV" as const,
        externalId: externalIdFor(e),
      })),
      skipDuplicates: true,
    });
    imported = result.count;
  }

  revalidatePath("/health/exercise");
  revalidatePath("/health");
  return { imported, skipped: valid.length - imported, errors };
}

export async function updateExerciseEntry(
  id: string,
  input: unknown,
): Promise<void> {
  const userId = await requireUserId();
  const data = exerciseEntrySchema.parse(input);

  const result = await db.exerciseEntry.updateMany({
    where: { id, userId },
    data: persistFields(data),
  });

  if (result.count === 0) {
    throw new Error("Exercise entry not found");
  }

  revalidatePath("/health/exercise");
  revalidatePath("/health");
}

export async function deleteExerciseEntry(id: string) {
  const userId = await requireUserId();

  await db.exerciseEntry.deleteMany({ where: { id, userId } });

  revalidatePath("/health/exercise");
  revalidatePath("/health");
}

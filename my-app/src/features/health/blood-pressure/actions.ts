"use server";

import { revalidatePath } from "next/cache";
import { resolveActorUserId } from "@/lib/actor";
import { db } from "@/lib/db";
import { bloodPressureEntrySchema } from "./blood-pressure-schema";
import type { BloodPressureEntryDTO } from "./types";
import { toBloodPressureEntryDTO } from "./serialize";

// Owner (signed-in) or a gated demo visitor — see @/lib/actor.
async function requireUserId(): Promise<string> {
  return resolveActorUserId();
}

export async function createBloodPressureEntry(
  input: unknown,
): Promise<BloodPressureEntryDTO> {
  const userId = await requireUserId();
  const data = bloodPressureEntrySchema.parse(input);

  const entry = await db.bloodPressureEntry.create({
    data: {
      userId,
      date: data.date,
      systolic: data.systolic,
      diastolic: data.diastolic,
      pulse: data.pulse ?? null,
      note: data.note ?? null,
    },
  });

  revalidatePath("/health/blood-pressure");
  return toBloodPressureEntryDTO(entry);
}

export async function getBloodPressureEntries(): Promise<
  BloodPressureEntryDTO[]
> {
  const userId = await requireUserId();

  const rows = await db.bloodPressureEntry.findMany({
    where: { userId },
    orderBy: { date: "desc" },
  });

  return rows.map(toBloodPressureEntryDTO);
}

export async function updateBloodPressureEntry(
  id: string,
  input: unknown,
): Promise<void> {
  const userId = await requireUserId();
  const data = bloodPressureEntrySchema.parse(input);

  const result = await db.bloodPressureEntry.updateMany({
    where: { id, userId },
    data: {
      date: data.date,
      systolic: data.systolic,
      diastolic: data.diastolic,
      pulse: data.pulse ?? null,
      note: data.note ?? null,
    },
  });

  if (result.count === 0) {
    throw new Error("Blood pressure entry not found");
  }

  revalidatePath("/health/blood-pressure");
}

export async function deleteBloodPressureEntry(id: string) {
  const userId = await requireUserId();

  await db.bloodPressureEntry.deleteMany({ where: { id, userId } });

  revalidatePath("/health/blood-pressure");
}

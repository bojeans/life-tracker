"use server";

import { revalidatePath } from "next/cache";
import { resolveActorUserId } from "@/lib/actor";
import { db } from "@/lib/db";
import { profileSchema } from "./profile-schema";
import type { ProfileDTO } from "./types";
import { toProfileDTO } from "./serialize";

// Owner (signed-in) or a gated demo visitor — see @/lib/actor.
async function requireUserId(): Promise<string> {
  return resolveActorUserId();
}

export async function getProfile(): Promise<ProfileDTO | null> {
  const userId = await requireUserId();
  const row = await db.profile.findUnique({ where: { userId } });
  return row ? toProfileDTO(row) : null;
}

export async function upsertProfile(input: unknown): Promise<ProfileDTO> {
  const userId = await requireUserId();
  const data = profileSchema.parse(input);

  const values = {
    heightCm: data.heightCm,
    birthYear: data.birthYear,
    sex: data.sex,
    activityLevel: data.activityLevel,
    bodyFatPct: data.bodyFatPct ?? null,
  };

  const row = await db.profile.upsert({
    where: { userId },
    create: { userId, ...values },
    update: values,
  });

  revalidatePath("/health");
  revalidatePath("/health/profile");
  return toProfileDTO(row);
}

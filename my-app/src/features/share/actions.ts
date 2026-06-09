"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// The signed-in owner's share token, minting one if the row somehow lacks it.
// Gated to a real session (not a demo actor) — sharing is an owner action.
export async function getMyShareToken(): Promise<string> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { shareToken: true },
  });
  if (user?.shareToken) return user.shareToken;

  const shareToken = randomUUID();
  await db.user.update({ where: { id: userId }, data: { shareToken } });
  return shareToken;
}

// Rotates the share token, invalidating any link already handed out. This is
// the revoke path: old URLs 404 immediately, the new one takes over.
export async function regenerateShareToken(): Promise<string> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) throw new Error("Unauthorized");

  const shareToken = randomUUID();
  await db.user.update({ where: { id: userId }, data: { shareToken } });

  revalidatePath("/share");
  return shareToken;
}

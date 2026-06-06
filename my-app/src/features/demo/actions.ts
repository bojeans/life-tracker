"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { DEMO_COOKIE } from "@/lib/demo-cookie";
import { resolveActorUserId, isDemoActor } from "@/lib/actor";
import { seedDemoData } from "@/lib/demo-data";

// Start acting as a demo account: verify the token belongs to an isDemo user,
// set the demo cookie, and drop into the real app.
export async function enterDemoMode(shareToken: string) {
  const user = await db.user.findUnique({
    where: { shareToken },
    select: { id: true, isDemo: true },
  });
  if (!user?.isDemo) throw new Error("Not a demo account");

  (await cookies()).set(DEMO_COOKIE, user.id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 1 week
  });

  redirect("/finance");
}

export async function exitDemoMode() {
  const store = await cookies();
  const id = store.get(DEMO_COOKIE)?.value;
  let token: string | null = null;
  if (id) {
    const u = await db.user.findUnique({
      where: { id },
      select: { shareToken: true },
    });
    token = u?.shareToken ?? null;
  }
  store.delete(DEMO_COOKIE);
  redirect(token ? `/shared/${token}` : "/auth/signin");
}

// Restore the demo account's data to the canned dataset. Demo actor only, and
// only ever touches the demo account.
export async function resetDemoData() {
  if (!(await isDemoActor())) throw new Error("Not in demo mode");
  const userId = await resolveActorUserId();
  await seedDemoData(db, userId);
  revalidatePath("/finance");
  revalidatePath("/health");
}

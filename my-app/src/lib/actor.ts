import { cookies } from "next/headers";
import { auth } from "./auth";
import { db } from "./db";
import { DEMO_COOKIE } from "./demo-cookie";

// The DEMO_COOKIE names the demo user a logged-out visitor is acting as. Only
// honored when that user is flagged `isDemo`, so it can never grant access to a
// real account (even if a visitor forges it).
export { DEMO_COOKIE };

async function demoCookieUserId(): Promise<string | null> {
  const id = (await cookies()).get(DEMO_COOKIE)?.value;
  if (!id) return null;
  const user = await db.user.findUnique({
    where: { id },
    select: { id: true, isDemo: true },
  });
  return user?.isDemo ? user.id : null;
}

// The user whose data an action/read should operate on: the signed-in owner
// if present, otherwise a valid demo user. Throws if neither.
export async function resolveActorUserId(): Promise<string> {
  const session = await auth();
  if (session?.user?.id) return session.user.id;

  const demoId = await demoCookieUserId();
  if (demoId) return demoId;

  throw new Error("Unauthorized");
}

// True when the current actor is a demo visitor (not a signed-in owner). Used to
// show the demo banner / editing affordances.
export async function isDemoActor(): Promise<boolean> {
  const session = await auth();
  if (session?.user?.id) return false;
  return (await demoCookieUserId()) !== null;
}

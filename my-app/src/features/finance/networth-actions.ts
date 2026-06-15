"use server";

import { revalidatePath } from "next/cache";
import { resolveActorUserId } from "@/lib/actor";
import { db } from "@/lib/db";
import { accountSchema, balanceEntrySchema } from "./networth-schema";
import type { AccountDTO, BalanceSnapshotDTO } from "./networth-types";
import { toAccountDTO, toBalanceSnapshotDTO } from "./networth-serialize";

async function requireUserId(): Promise<string> {
  return resolveActorUserId();
}

export async function getNetWorthData(): Promise<{
  accounts: AccountDTO[];
  snapshots: BalanceSnapshotDTO[];
}> {
  const userId = await requireUserId();
  const [accounts, snapshots] = await Promise.all([
    db.wealthAccount.findMany({ where: { userId }, orderBy: { name: "asc" } }),
    db.balanceSnapshot.findMany({ where: { userId }, orderBy: { date: "asc" } }),
  ]);
  return {
    accounts: accounts.map(toAccountDTO),
    snapshots: snapshots.map(toBalanceSnapshotDTO),
  };
}

export async function createAccount(input: unknown): Promise<AccountDTO> {
  const userId = await requireUserId();
  const data = accountSchema.parse(input);
  const account = await db.wealthAccount.create({
    data: {
      userId,
      name: data.name,
      institution: data.institution ?? null,
      assetClass: data.assetClass,
      currency: data.currency,
    },
  });
  revalidatePath("/finance/networth");
  return toAccountDTO(account);
}

export async function updateAccount(
  id: string,
  input: unknown,
): Promise<void> {
  const userId = await requireUserId();
  const data = accountSchema.parse(input);
  const result = await db.wealthAccount.updateMany({
    where: { id, userId },
    data: {
      name: data.name,
      institution: data.institution ?? null,
      assetClass: data.assetClass,
      currency: data.currency,
    },
  });
  if (result.count === 0) throw new Error("Account not found");
  revalidatePath("/finance/networth");
}

export async function deleteAccount(id: string): Promise<void> {
  const userId = await requireUserId();
  // Snapshots cascade via the FK relation.
  await db.wealthAccount.deleteMany({ where: { id, userId } });
  revalidatePath("/finance/networth");
}

// Upserts a balance per account for one date — re-recording a date overwrites
// rather than duplicating (the [accountId, date] unique).
export async function recordBalances(input: unknown): Promise<void> {
  const userId = await requireUserId();
  const data = balanceEntrySchema.parse(input);

  const owned = await db.wealthAccount.findMany({
    where: { id: { in: data.balances.map((b) => b.accountId) }, userId },
    select: { id: true },
  });
  const ownedIds = new Set(owned.map((a) => a.id));

  await db.$transaction(
    data.balances
      .filter((b) => ownedIds.has(b.accountId))
      .map((b) =>
        db.balanceSnapshot.upsert({
          where: {
            accountId_date: { accountId: b.accountId, date: data.date },
          },
          create: {
            userId,
            accountId: b.accountId,
            date: data.date,
            balance: b.balance,
          },
          update: { balance: b.balance },
        }),
      ),
  );

  revalidatePath("/finance/networth");
}

// Removes one account's snapshot for a date (e.g. a mistaken entry).
export async function deleteSnapshot(id: string): Promise<void> {
  const userId = await requireUserId();
  await db.balanceSnapshot.deleteMany({ where: { id, userId } });
  revalidatePath("/finance/networth");
}

export type { BalanceSnapshotDTO };

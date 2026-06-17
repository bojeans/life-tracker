"use server";

import { revalidatePath } from "next/cache";
import { resolveActorUserId } from "@/lib/actor";
import { db } from "@/lib/db";
import { accountSchema, balanceEntrySchema } from "./networth-schema";
import type { AccountDTO, BalanceSnapshotDTO } from "./networth-types";
import { toAccountDTO, toBalanceSnapshotDTO } from "./networth-serialize";
import { parseBalancesCsv } from "./networth-csv";

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
      kind: data.kind,
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
      kind: data.kind,
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

export type BalancesCsvImportResult = {
  // Number of (account, date) balances written (created or overwritten).
  imported: number;
  // Header columns that carried a value but matched no account — the user
  // needs to create that account (with the right kind/asset class/currency)
  // or fix the header to match an existing name.
  unmatchedColumns: string[];
  errors: { row: number; message: string }[];
};

// Imports a wide net-worth CSV (date down the side, one column per account).
// Columns are matched to the user's existing accounts by name (case-insensitive)
// rather than auto-created, so account metadata — especially LIABILITY kind and
// non-base currency — is set deliberately and never guessed. Each cell upserts a
// BalanceSnapshot, so re-uploading a corrected sheet overwrites in place.
export async function importBalancesCsv(
  csvText: string,
): Promise<BalancesCsvImportResult> {
  const userId = await requireUserId();
  const { rows, errors } = parseBalancesCsv(csvText);

  const accounts = await db.wealthAccount.findMany({
    where: { userId },
    select: { id: true, name: true },
  });
  const idByName = new Map(
    accounts.map((a) => [a.name.trim().toLowerCase(), a.id]),
  );

  // Only report an unmatched column once we've actually seen a value in it, so
  // empty placeholder columns (e.g. an account not set up yet) stay quiet.
  const unmatched = new Set<string>();
  const upserts: { accountId: string; date: Date; balance: number }[] = [];
  for (const row of rows) {
    for (const cell of row.cells) {
      const accountId = idByName.get(cell.column.trim().toLowerCase());
      if (!accountId) {
        unmatched.add(cell.column);
        continue;
      }
      upserts.push({ accountId, date: row.date, balance: cell.balance });
    }
  }

  if (upserts.length > 0) {
    await db.$transaction(
      upserts.map((u) =>
        db.balanceSnapshot.upsert({
          where: { accountId_date: { accountId: u.accountId, date: u.date } },
          create: {
            userId,
            accountId: u.accountId,
            date: u.date,
            balance: u.balance,
          },
          update: { balance: u.balance },
        }),
      ),
    );
  }

  revalidatePath("/finance/networth");
  return { imported: upserts.length, unmatchedColumns: [...unmatched], errors };
}

// Removes one account's snapshot for a date (e.g. a mistaken entry).
export async function deleteSnapshot(id: string): Promise<void> {
  const userId = await requireUserId();
  await db.balanceSnapshot.deleteMany({ where: { id, userId } });
  revalidatePath("/finance/networth");
}

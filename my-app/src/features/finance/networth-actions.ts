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
// non-base currency — is set deliberately and never guessed.
//
// A whole sheet is written as ONE createMany plus a handful of updates rather
// than an upsert-per-cell inside a transaction: a per-cell batched transaction
// blew Prisma's 5s transaction timeout on the pooled (Neon) connection once the
// sheet had enough cells. The writes are idempotent (keyed on [accountId, date]),
// so they intentionally run outside a transaction — a re-run completes any that
// a timed-out function left unwritten.
const snapshotKey = (accountId: string, date: Date) =>
  `${accountId}|${date.toISOString()}`;

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
  // Dedupe to one balance per (account, date) — last value wins — so a sheet
  // with a repeated account column can't produce conflicting writes for a key.
  const unmatched = new Set<string>();
  const byKey = new Map<
    string,
    { accountId: string; date: Date; balance: number }
  >();
  for (const row of rows) {
    for (const cell of row.cells) {
      const accountId = idByName.get(cell.column.trim().toLowerCase());
      if (!accountId) {
        unmatched.add(cell.column);
        continue;
      }
      byKey.set(snapshotKey(accountId, row.date), {
        accountId,
        date: row.date,
        balance: cell.balance,
      });
    }
  }
  const writes = [...byKey.values()];

  let imported = 0;
  if (writes.length > 0) {
    const accountIds = [...new Set(writes.map((w) => w.accountId))];
    // One read: existing balances for these accounts, to split new rows from
    // changed rows (and skip unchanged ones on a re-import).
    const existing = await db.balanceSnapshot.findMany({
      where: { userId, accountId: { in: accountIds } },
      select: { accountId: true, date: true, balance: true },
    });
    const existingBalance = new Map(
      existing.map((e) => [snapshotKey(e.accountId, e.date), Number(e.balance)]),
    );

    const toCreate = writes.filter(
      (w) => !existingBalance.has(snapshotKey(w.accountId, w.date)),
    );
    const toUpdate = writes.filter((w) => {
      const prev = existingBalance.get(snapshotKey(w.accountId, w.date));
      return prev !== undefined && prev !== w.balance;
    });

    if (toCreate.length > 0) {
      await db.balanceSnapshot.createMany({
        data: toCreate.map((w) => ({
          userId,
          accountId: w.accountId,
          date: w.date,
          balance: w.balance,
        })),
        skipDuplicates: true,
      });
    }
    for (const w of toUpdate) {
      await db.balanceSnapshot.update({
        where: { accountId_date: { accountId: w.accountId, date: w.date } },
        data: { balance: w.balance },
      });
    }
    imported = toCreate.length + toUpdate.length;
  }

  revalidatePath("/finance/networth");
  return { imported, unmatchedColumns: [...unmatched], errors };
}

// Removes one account's snapshot for a date (e.g. a mistaken entry).
export async function deleteSnapshot(id: string): Promise<void> {
  const userId = await requireUserId();
  await db.balanceSnapshot.deleteMany({ where: { id, userId } });
  revalidatePath("/finance/networth");
}

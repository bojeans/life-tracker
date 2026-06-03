"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { transactionSchema } from "./transaction-schema";
import type { TransactionDTO } from "./types";
import { toTransactionDTO } from "./serialize";
import { parseAnyTransactionsCsv, externalIdFor } from "./csv";

export type CsvImportResult = {
  imported: number;
  skipped: number;
  errors: { row: number; message: string }[];
};

async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }
  return session.user.id;
}

export async function createTransaction(input: unknown): Promise<TransactionDTO> {
  const userId = await requireUserId();
  const data = transactionSchema.parse(input);

  const transaction = await db.transaction.create({
    data: { ...data, userId },
  });

  revalidatePath("/finance");
  return toTransactionDTO(transaction);
}

export async function getTransactions(): Promise<TransactionDTO[]> {
  const userId = await requireUserId();

  const rows = await db.transaction.findMany({
    where: { userId },
    orderBy: { date: "desc" },
  });

  return rows.map(toTransactionDTO);
}

export async function importTransactionsCsv(
  csvText: string,
): Promise<CsvImportResult> {
  const userId = await requireUserId();
  const { valid, errors } = parseAnyTransactionsCsv(csvText);

  let imported = 0;
  if (valid.length > 0) {
    // skipDuplicates relies on @@unique([userId, source, externalId]) so the
    // same CSV row isn't imported twice across re-uploads.
    const result = await db.transaction.createMany({
      data: valid.map((t) => ({
        userId,
        type: t.type,
        amount: t.amount,
        currency: t.currency,
        category: t.category,
        description: t.description ?? null,
        date: t.date,
        source: "CSV" as const,
        externalId: externalIdFor(t),
      })),
      skipDuplicates: true,
    });
    imported = result.count;
  }

  revalidatePath("/finance");
  return { imported, skipped: valid.length - imported, errors };
}

export async function updateTransaction(
  id: string,
  input: unknown,
): Promise<void> {
  const userId = await requireUserId();
  const data = transactionSchema.parse(input);

  // updateMany scopes the where clause to the owner so a user can't edit
  // another user's row. source/externalId are intentionally left unchanged.
  const result = await db.transaction.updateMany({
    where: { id, userId },
    data: {
      type: data.type,
      amount: data.amount,
      currency: data.currency,
      category: data.category,
      description: data.description ?? null,
      date: data.date,
    },
  });

  if (result.count === 0) {
    throw new Error("Transaction not found");
  }

  revalidatePath("/finance");
}

export async function deleteTransaction(id: string) {
  const userId = await requireUserId();

  // Scope the delete to the owner so one user can't delete another's row.
  await db.transaction.deleteMany({ where: { id, userId } });

  revalidatePath("/finance");
}

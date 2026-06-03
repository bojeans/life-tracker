"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { transactionSchema } from "./transaction-schema";
import type { TransactionDTO } from "./types";

async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }
  return session.user.id;
}

// Maps a Prisma row to a serializable DTO (Decimal -> number, Date -> ISO).
type TransactionRow = {
  id: string;
  type: TransactionDTO["type"];
  amount: unknown;
  currency: string;
  category: string;
  description: string | null;
  date: Date;
  source: string;
};

function toDTO(row: TransactionRow): TransactionDTO {
  return {
    id: row.id,
    type: row.type,
    amount: Number(row.amount),
    currency: row.currency,
    category: row.category,
    description: row.description,
    date: row.date.toISOString(),
    source: row.source,
  };
}

export async function createTransaction(input: unknown) {
  const userId = await requireUserId();
  const data = transactionSchema.parse(input);

  const transaction = await db.transaction.create({
    data: { ...data, userId },
  });

  revalidatePath("/finance");
  return transaction;
}

export async function getTransactions(): Promise<TransactionDTO[]> {
  const userId = await requireUserId();

  const rows = await db.transaction.findMany({
    where: { userId },
    orderBy: { date: "desc" },
  });

  return rows.map(toDTO);
}

export async function deleteTransaction(id: string) {
  const userId = await requireUserId();

  // Scope the delete to the owner so one user can't delete another's row.
  await db.transaction.deleteMany({ where: { id, userId } });

  revalidatePath("/finance");
}

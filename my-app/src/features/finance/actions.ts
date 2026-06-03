"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { transactionSchema } from "./transaction-schema";
import type { TransactionDTO } from "./types";
import { toTransactionDTO } from "./serialize";

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

export async function deleteTransaction(id: string) {
  const userId = await requireUserId();

  // Scope the delete to the owner so one user can't delete another's row.
  await db.transaction.deleteMany({ where: { id, userId } });

  revalidatePath("/finance");
}

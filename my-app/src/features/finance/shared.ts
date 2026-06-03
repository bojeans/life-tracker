import { db } from "@/lib/db";
import { toTransactionDTO } from "./serialize";
import { summarizeTransactions, type FinanceSummary } from "./summary";
import type { TransactionDTO } from "./types";

export type SharedFinance = {
  ownerName: string | null;
  summary: FinanceSummary;
  recent: TransactionDTO[];
};

// Public, read-only lookup by share token. No auth — anyone with the token
// can view this user's finance summary. Returns null if the token is unknown.
export async function getSharedFinance(
  shareToken: string,
): Promise<SharedFinance | null> {
  const user = await db.user.findUnique({
    where: { shareToken },
    select: {
      name: true,
      transactions: { orderBy: { date: "desc" } },
    },
  });

  if (!user) return null;

  const transactions = user.transactions.map(toTransactionDTO);

  return {
    ownerName: user.name,
    summary: summarizeTransactions(transactions),
    recent: transactions.slice(0, 8),
  };
}

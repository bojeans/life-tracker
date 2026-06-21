import { db } from "@/lib/db";
import { toTransactionDTO } from "./serialize";
import { summarizeTransactions, type FinanceSummary } from "./summary";
import { toAccountDTO, toBalanceSnapshotDTO } from "./networth-serialize";
import type { AccountDTO, BalanceSnapshotDTO } from "./networth-types";
import type { TransactionDTO } from "./types";

export type SharedFinance = {
  ownerName: string | null;
  // Whether this is a public sandbox account (enables the "Launch demo" CTA).
  isDemo: boolean;
  summary: FinanceSummary;
  recent: TransactionDTO[];
  // Full transaction set so the read-only view can render the same charts
  // (monthly income/expense, spending by category) as the owner dashboard.
  all: TransactionDTO[];
  // Net-worth accounts + balance snapshots so the read-only view can show the
  // same net-worth total, asset split and over-time line as the owner.
  netWorth: { accounts: AccountDTO[]; snapshots: BalanceSnapshotDTO[] };
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
      isDemo: true,
      transactions: { orderBy: { date: "desc" } },
      wealthAccounts: { orderBy: { name: "asc" } },
      balanceSnapshots: { orderBy: { date: "asc" } },
    },
  });

  if (!user) return null;

  const transactions = user.transactions.map(toTransactionDTO);

  return {
    ownerName: user.name,
    isDemo: user.isDemo,
    summary: summarizeTransactions(transactions),
    recent: transactions.slice(0, 8),
    all: transactions,
    netWorth: {
      accounts: (user.wealthAccounts ?? []).map(toAccountDTO),
      snapshots: (user.balanceSnapshots ?? []).map(toBalanceSnapshotDTO),
    },
  };
}

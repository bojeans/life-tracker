import { convert, type Rates } from "./currency";
import { formatMonthLabel } from "@/features/shared/dates";
import type { AccountDTO, BalanceSnapshotDTO } from "./networth-types";

const round2 = (n: number) => Math.round(n * 100) / 100;

// Convert to base; a missing/absent rate falls back to the raw amount (best
// effort, mirrors currency.convert) so the page still renders before FX loads.
function toBase(
  amount: number,
  from: string,
  base: string,
  rates: Rates | null,
): number {
  if (!rates) return amount;
  return convert(amount, from, base, rates);
}

export type AccountBalance = {
  account: AccountDTO;
  balance: number; // latest, in the account's own currency
  baseBalance: number; // converted to base
  date: string | null; // ISO date of the latest snapshot, or null if none
};

// Latest snapshot per account, converted to the base currency. Accounts with no
// snapshot yet show a zero balance so they still appear in the list.
export function latestBalances(
  accounts: AccountDTO[],
  snapshots: BalanceSnapshotDTO[],
  base: string,
  rates: Rates | null,
): AccountBalance[] {
  const latest = new Map<string, BalanceSnapshotDTO>();
  for (const s of snapshots) {
    const cur = latest.get(s.accountId);
    if (!cur || s.date > cur.date) latest.set(s.accountId, s);
  }
  return accounts.map((account) => {
    const snap = latest.get(account.id) ?? null;
    const balance = snap?.balance ?? 0;
    return {
      account,
      balance,
      baseBalance: round2(toBase(balance, account.currency, base, rates)),
      date: snap?.date ?? null,
    };
  });
}

const isLiability = (b: AccountBalance) => b.account.kind === "LIABILITY";
// Signed contribution to net worth: assets add, liabilities subtract.
const signed = (b: AccountBalance) =>
  isLiability(b) ? -b.baseBalance : b.baseBalance;

// Net worth = total assets − total liabilities (base currency).
export function netWorthTotal(balances: AccountBalance[]): number {
  return round2(balances.reduce((sum, b) => sum + signed(b), 0));
}

export function totalAssets(balances: AccountBalance[]): number {
  return round2(
    balances.filter((b) => !isLiability(b)).reduce((s, b) => s + b.baseBalance, 0),
  );
}

export function totalLiabilities(balances: AccountBalance[]): number {
  return round2(
    balances.filter(isLiability).reduce((s, b) => s + b.baseBalance, 0),
  );
}

export type CompositionSlice = { assetClass: string; total: number };

// Asset composition by class (base currency), largest first, zero classes
// dropped. Liabilities are excluded — they're shown as a separate total.
export function compositionByClass(
  balances: AccountBalance[],
): CompositionSlice[] {
  const map = new Map<string, number>();
  for (const b of balances) {
    if (isLiability(b)) continue;
    map.set(
      b.account.assetClass,
      (map.get(b.account.assetClass) ?? 0) + b.baseBalance,
    );
  }
  return [...map.entries()]
    .map(([assetClass, total]) => ({ assetClass, total: round2(total) }))
    .filter((s) => s.total !== 0)
    .sort((a, b) => b.total - a.total);
}

export type NetWorthPoint = { date: string; label: string; total: number };

// Net worth over time: for each date that has any snapshot, sum each account's
// most recent balance on or before that date (carry-forward), converted to
// base. This gives a sensible line even though accounts are recorded at
// different cadences.
export function netWorthOverTime(
  accounts: AccountDTO[],
  snapshots: BalanceSnapshotDTO[],
  base: string,
  rates: Rates | null,
): NetWorthPoint[] {
  const currency = new Map(accounts.map((a) => [a.id, a.currency]));
  const liability = new Map(accounts.map((a) => [a.id, a.kind === "LIABILITY"]));
  const byAccount = new Map<string, BalanceSnapshotDTO[]>();
  for (const s of snapshots) {
    const list = byAccount.get(s.accountId) ?? [];
    list.push(s);
    byAccount.set(s.accountId, list);
  }
  for (const list of byAccount.values()) {
    list.sort((a, b) => a.date.localeCompare(b.date));
  }

  const dates = [...new Set(snapshots.map((s) => s.date.slice(0, 10)))].sort();

  return dates.map((day) => {
    let total = 0;
    for (const [accountId, list] of byAccount) {
      let latest: BalanceSnapshotDTO | null = null;
      for (const s of list) {
        if (s.date.slice(0, 10) <= day) latest = s;
        else break;
      }
      if (latest) {
        const value = toBase(
          latest.balance,
          currency.get(accountId) ?? base,
          base,
          rates,
        );
        total += liability.get(accountId) ? -value : value;
      }
    }
    return {
      date: day,
      label: formatMonthLabel(day.slice(0, 7)),
      total: round2(total),
    };
  });
}

import { convert, type Rates } from "./currency";
import { formatMonthLabel } from "@/features/shared/dates";
import type { AccountDTO, BalanceSnapshotDTO } from "./networth-types";

const round2 = (n: number) => Math.round(n * 100) / 100;

const toYmd = (d: Date) => d.toISOString().slice(0, 10);

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
// snapshot yet show a zero balance so they still appear in the list. Snapshots
// dated after `asOf` (today by default) are ignored — a future-dated balance
// (e.g. a spreadsheet that fills not-yet-recorded months with 0) is not your
// current balance.
export function latestBalances(
  accounts: AccountDTO[],
  snapshots: BalanceSnapshotDTO[],
  base: string,
  rates: Rates | null,
  asOf: Date = new Date(),
): AccountBalance[] {
  const cutoff = toYmd(asOf);
  const latest = new Map<string, BalanceSnapshotDTO>();
  for (const s of snapshots) {
    if (s.date.slice(0, 10) > cutoff) continue; // ignore future-dated snapshots
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
  asOf: Date = new Date(),
): NetWorthPoint[] {
  const cutoff = toYmd(asOf);
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

  const dates = [...new Set(snapshots.map((s) => s.date.slice(0, 10)))]
    .filter((d) => d <= cutoff) // drop future-dated points
    .sort();

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

// Time windows for the net-worth-over-time chart. "ALL" keeps everything;
// the rest are relative to `asOf` (today). YTD is from Jan 1 of the current year.
export type TimeRange = "3M" | "6M" | "1Y" | "YTD" | "ALL";

export const TIME_RANGES: { value: TimeRange; label: string }[] = [
  { value: "3M", label: "3M" },
  { value: "6M", label: "6M" },
  { value: "1Y", label: "1Y" },
  { value: "YTD", label: "YTD" },
  { value: "ALL", label: "All" },
];

// Inclusive lower-bound date (YYYY-MM-DD) for a range, or null for no bound.
function rangeCutoff(range: TimeRange, asOf: Date): string | null {
  if (range === "ALL") return null;
  if (range === "YTD") return `${asOf.getUTCFullYear()}-01-01`;
  const months = range === "3M" ? 3 : range === "6M" ? 6 : 12;
  const start = new Date(
    Date.UTC(asOf.getUTCFullYear(), asOf.getUTCMonth() - months, asOf.getUTCDate()),
  );
  return toYmd(start);
}

// Narrows an over-time series to the chosen window. Points are already sorted
// and capped at today by netWorthOverTime, so this only trims the lower bound.
export function filterByRange(
  points: NetWorthPoint[],
  range: TimeRange,
  asOf: Date = new Date(),
): NetWorthPoint[] {
  const cutoff = rangeCutoff(range, asOf);
  return cutoff ? points.filter((p) => p.date >= cutoff) : points;
}

// Sentinel selection for the net-worth total line (vs a single account id).
export const NET_WORTH_OPTION = "NET";

// Series for the chart's selection: either the net-worth total ("NET") or one
// account's own recorded balances over time, converted to base. A single
// account is shown as its actual balance — a liability stays positive here
// (its real owed amount) rather than being subtracted as in the net total.
export function selectionSeries(
  accounts: AccountDTO[],
  snapshots: BalanceSnapshotDTO[],
  base: string,
  rates: Rates | null,
  selection: string,
  asOf: Date = new Date(),
): NetWorthPoint[] {
  if (selection === NET_WORTH_OPTION) {
    return netWorthOverTime(accounts, snapshots, base, rates, asOf);
  }
  const account = accounts.find((a) => a.id === selection);
  if (!account) return [];
  const cutoff = toYmd(asOf);
  return snapshots
    .filter((s) => s.accountId === selection && s.date.slice(0, 10) <= cutoff)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((s) => ({
      date: s.date.slice(0, 10),
      label: formatMonthLabel(s.date.slice(0, 7)),
      total: round2(toBase(s.balance, account.currency, base, rates)),
    }));
}

import { describe, expect, it } from "vitest";
import {
  latestBalances,
  netWorthTotal,
  compositionByClass,
  netWorthOverTime,
} from "./networth-analytics";
import type { AccountDTO, BalanceSnapshotDTO } from "./networth-types";
import type { Rates } from "./currency";

const accounts: AccountDTO[] = [
  { id: "kb", name: "Kiwibank", institution: null, assetClass: "CASH", currency: "NZD" },
  { id: "ss", name: "Sharesies", institution: null, assetClass: "SHARES", currency: "NZD" },
  { id: "cba", name: "CBA", institution: null, assetClass: "CASH", currency: "AUD" },
];

function snap(accountId: string, date: string, balance: number): BalanceSnapshotDTO {
  return { id: `${accountId}-${date}`, accountId, date: `${date}T00:00:00.000Z`, balance };
}

// 1 NZD = 0.9 AUD (so AUD → NZD divides by 0.9).
const rates: Rates = { base: "NZD", rates: { AUD: 0.9 } };

describe("latestBalances", () => {
  it("takes the most recent snapshot per account and converts to base", () => {
    const balances = latestBalances(
      accounts,
      [
        snap("kb", "2026-05-01", 1000),
        snap("kb", "2026-06-01", 1200), // newer wins
        snap("cba", "2026-06-01", 900), // 900 AUD → 1000 NZD
      ],
      "NZD",
      rates,
    );

    const kb = balances.find((b) => b.account.id === "kb")!;
    expect(kb.balance).toBe(1200);
    const cba = balances.find((b) => b.account.id === "cba")!;
    expect(cba.baseBalance).toBe(1000);
    // No snapshot yet → zero, still listed.
    expect(balances.find((b) => b.account.id === "ss")!.baseBalance).toBe(0);
  });
});

describe("netWorthTotal + compositionByClass", () => {
  it("sums to base and groups by asset class", () => {
    const balances = latestBalances(
      accounts,
      [snap("kb", "2026-06-01", 1200), snap("ss", "2026-06-01", 5000), snap("cba", "2026-06-01", 900)],
      "NZD",
      rates,
    );
    expect(netWorthTotal(balances)).toBe(7200); // 1200 + 5000 + 1000
    expect(compositionByClass(balances)).toEqual([
      { assetClass: "SHARES", total: 5000 },
      { assetClass: "CASH", total: 2200 }, // 1200 + 1000
    ]);
  });
});

describe("netWorthOverTime", () => {
  it("carries each account's last balance forward across dates", () => {
    const points = netWorthOverTime(
      accounts,
      [
        snap("kb", "2026-05-01", 1000),
        snap("ss", "2026-06-01", 5000), // kb carried forward at 1000
      ],
      "NZD",
      rates,
    );
    expect(points.map((p) => p.total)).toEqual([1000, 6000]);
  });
});

import { describe, expect, it } from "vitest";
import {
  latestBalances,
  netWorthTotal,
  totalAssets,
  totalLiabilities,
  compositionByClass,
  netWorthOverTime,
  filterByRange,
  selectionSeries,
  NET_WORTH_OPTION,
  type NetWorthPoint,
} from "./networth-analytics";
import type { AccountDTO, BalanceSnapshotDTO } from "./networth-types";
import type { Rates } from "./currency";

const accounts: AccountDTO[] = [
  { id: "kb", name: "Kiwibank", institution: null, kind: "ASSET", assetClass: "CASH", currency: "NZD" },
  { id: "ss", name: "Sharesies", institution: null, kind: "ASSET", assetClass: "SHARES", currency: "NZD" },
  { id: "cba", name: "CBA", institution: null, kind: "ASSET", assetClass: "CASH", currency: "AUD" },
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

describe("latestBalances ignores future-dated snapshots", () => {
  it("does not let a future 0 (e.g. a spreadsheet projection) override the latest real balance", () => {
    const balances = latestBalances(
      accounts,
      [
        snap("cba", "2026-05-31", 3710), // last real balance
        snap("cba", "2026-12-31", 0), // future month filled with 0 by a formula
      ],
      "NZD",
      rates,
      new Date("2026-06-17T00:00:00.000Z"),
    );
    const cba = balances.find((b) => b.account.id === "cba")!;
    expect(cba.balance).toBe(3710);
    expect(cba.date).toBe("2026-05-31T00:00:00.000Z");
  });
});

describe("netWorthOverTime ignores future-dated snapshots", () => {
  it("ends the series at the last date on or before asOf", () => {
    const points = netWorthOverTime(
      accounts,
      [
        snap("kb", "2026-05-01", 1000),
        snap("kb", "2026-12-31", 0), // future projection
      ],
      "NZD",
      rates,
      new Date("2026-06-17T00:00:00.000Z"),
    );
    expect(points.map((p) => p.date)).toEqual(["2026-05-01"]);
    expect(points.map((p) => p.total)).toEqual([1000]);
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
      // shares of total assets (7200): 5000/7200, 2200/7200
      { assetClass: "SHARES", total: 5000, share: 69.44 },
      { assetClass: "CASH", total: 2200, share: 30.56 }, // 1200 + 1000
    ]);
  });
});

describe("liabilities", () => {
  const withLoan: AccountDTO[] = [
    ...accounts,
    { id: "loan", name: "Student loan", institution: null, kind: "LIABILITY", assetClass: "CASH", currency: "NZD" },
  ];

  it("subtracts liabilities from net worth but not from assets/composition", () => {
    const balances = latestBalances(
      withLoan,
      [
        snap("kb", "2026-06-01", 1200),
        snap("ss", "2026-06-01", 5000),
        snap("loan", "2026-06-01", 9000), // owed
      ],
      "NZD",
      rates,
    );

    expect(totalAssets(balances)).toBe(6200);
    expect(totalLiabilities(balances)).toBe(9000);
    expect(netWorthTotal(balances)).toBe(-2800); // 6200 − 9000
    // Composition is assets only — the loan is not a slice.
    expect(compositionByClass(balances).some((s) => s.total === 9000)).toBe(false);
  });

  it("asset-class shares are measured against total assets, not net worth, so they sum to 100 even with a liability", () => {
    const balances = latestBalances(
      withLoan,
      [
        snap("kb", "2026-06-01", 1200), // CASH
        snap("ss", "2026-06-01", 5000), // SHARES
        snap("cba", "2026-06-01", 900), // CASH, 900 AUD → 1000 NZD
        snap("loan", "2026-06-01", 9000), // LIABILITY — must not shrink the denominator
      ],
      "NZD",
      rates,
    );
    const comp = compositionByClass(balances);
    // assets = 5000 shares + 2200 cash = 7200; the 9000 loan is excluded.
    expect(comp.find((s) => s.assetClass === "SHARES")!.share).toBeCloseTo(69.44, 1);
    expect(comp.find((s) => s.assetClass === "CASH")!.share).toBeCloseTo(30.56, 1);
    expect(comp.reduce((sum, s) => sum + s.share, 0)).toBeCloseTo(100, 1);
  });

  it("subtracts the liability across the over-time series", () => {
    const points = netWorthOverTime(
      withLoan,
      [snap("kb", "2026-05-01", 10000), snap("loan", "2026-06-01", 9000)],
      "NZD",
      rates,
    );
    expect(points.map((p) => p.total)).toEqual([10000, 1000]); // 10000, then −9000
  });
});

describe("filterByRange", () => {
  const point = (date: string): NetWorthPoint => ({ date, label: date, total: 0 });
  const asOf = new Date("2026-06-17T00:00:00.000Z");
  const points = [
    point("2025-01-31"), // > 1Y ago
    point("2025-08-31"), // within 1Y, outside 6M
    point("2025-12-31"), // within 6M, before this year
    point("2026-01-31"), // this year, outside 3M
    point("2026-04-30"), // within 3M
    point("2026-06-15"),
  ];

  it("keeps everything for ALL", () => {
    expect(filterByRange(points, "ALL", asOf)).toHaveLength(6);
  });

  it("3M keeps only the last three months", () => {
    expect(filterByRange(points, "3M", asOf).map((p) => p.date)).toEqual([
      "2026-04-30",
      "2026-06-15",
    ]);
  });

  it("6M keeps the last six months", () => {
    expect(filterByRange(points, "6M", asOf).map((p) => p.date)).toEqual([
      "2025-12-31",
      "2026-01-31",
      "2026-04-30",
      "2026-06-15",
    ]);
  });

  it("YTD keeps points from Jan 1 of the current year", () => {
    expect(filterByRange(points, "YTD", asOf).map((p) => p.date)).toEqual([
      "2026-01-31",
      "2026-04-30",
      "2026-06-15",
    ]);
  });

  it("1Y keeps the trailing twelve months", () => {
    expect(filterByRange(points, "1Y", asOf).map((p) => p.date)).toEqual([
      "2025-08-31",
      "2025-12-31",
      "2026-01-31",
      "2026-04-30",
      "2026-06-15",
    ]);
  });
});

describe("selectionSeries", () => {
  const asOf = new Date("2026-06-17T00:00:00.000Z");
  const snaps = [
    snap("kb", "2026-05-01", 1000),
    snap("kb", "2026-06-01", 1200),
    snap("cba", "2026-06-01", 900), // 900 AUD → 1000 NZD
    snap("cba", "2026-12-31", 0), // future projection, ignored
  ];

  it("returns the net-worth total for NET", () => {
    expect(
      selectionSeries(accounts, snaps, "NZD", rates, NET_WORTH_OPTION, asOf),
    ).toEqual(netWorthOverTime(accounts, snaps, "NZD", rates, asOf));
  });

  it("returns one account's own balances, converted to base, for an account id", () => {
    const series = selectionSeries(accounts, snaps, "NZD", rates, "cba", asOf);
    // The future 0 is dropped; the AUD balance is converted to NZD.
    expect(series.map((p) => p.date)).toEqual(["2026-06-01"]);
    expect(series[0].total).toBe(1000);
  });

  it("returns an empty series for an unknown selection", () => {
    expect(selectionSeries(accounts, snaps, "NZD", rates, "nope", asOf)).toEqual(
      [],
    );
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

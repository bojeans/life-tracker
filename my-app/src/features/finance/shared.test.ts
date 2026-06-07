import { describe, it, expect, vi, beforeEach } from "vitest";

// Mocks must be declared before importing the module under test.
const findUnique = vi.fn();

vi.mock("@/lib/db", () => ({
  db: {
    user: {
      findUnique: (...args: unknown[]) => findUnique(...args),
    },
  },
}));

import { getSharedFinance } from "./shared";

function row(overrides: Record<string, unknown> = {}) {
  return {
    id: "txn-1",
    type: "EXPENSE",
    amount: 42.5,
    currency: "AUD",
    category: "Groceries",
    description: null,
    date: new Date("2026-06-01T00:00:00.000Z"),
    source: "MANUAL",
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getSharedFinance", () => {
  it("returns null for an unknown share token", async () => {
    findUnique.mockResolvedValue(null);

    const result = await getSharedFinance("nope");

    expect(result).toBeNull();
  });

  it("returns the owner name, summary, recent, and the full transaction set", async () => {
    const rows = Array.from({ length: 10 }, (_, i) =>
      row({ id: `txn-${i}`, date: new Date(`2026-06-0${(i % 9) + 1}T00:00:00.000Z`) }),
    );
    findUnique.mockResolvedValue({ name: "Alex Demo", transactions: rows });

    const result = await getSharedFinance("example-user");

    expect(result).not.toBeNull();
    expect(result!.ownerName).toBe("Alex Demo");
    // recent is capped for the list...
    expect(result!.recent).toHaveLength(8);
    // ...but `all` carries every transaction so the charts can aggregate.
    expect(result!.all).toHaveLength(10);
    expect(result!.summary.totalExpense).toBeGreaterThan(0);
  });

  it("serializes Decimal/Date rows into plain DTOs", async () => {
    findUnique.mockResolvedValue({ name: "Alex Demo", transactions: [row()] });

    const result = await getSharedFinance("example-user");

    const [txn] = result!.all;
    expect(typeof txn.amount).toBe("number");
    expect(typeof txn.date).toBe("string"); // ISO string, not a Date
    expect(txn.date).toBe("2026-06-01T00:00:00.000Z");
  });
});

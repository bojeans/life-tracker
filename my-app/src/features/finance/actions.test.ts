import { describe, it, expect, vi, beforeEach } from "vitest";

// Mocks must be declared before importing the module under test.
const resolveActorUserId = vi.fn();
const create = vi.fn();
const createMany = vi.fn();
const findMany = vi.fn();
const updateMany = vi.fn();
const deleteMany = vi.fn();

vi.mock("@/lib/actor", () => ({
  resolveActorUserId: () => resolveActorUserId(),
}));
vi.mock("@/lib/db", () => ({
  db: {
    transaction: {
      create: (...args: unknown[]) => create(...args),
      createMany: (...args: unknown[]) => createMany(...args),
      findMany: (...args: unknown[]) => findMany(...args),
      updateMany: (...args: unknown[]) => updateMany(...args),
      deleteMany: (...args: unknown[]) => deleteMany(...args),
    },
  },
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import {
  createTransaction,
  getTransactions,
  deleteTransaction,
  updateTransaction,
  importTransactionsCsv,
} from "./actions";

const validInput = {
  type: "EXPENSE",
  amount: 42.5,
  category: "Groceries",
  date: "2026-06-01",
};

beforeEach(() => {
  vi.clearAllMocks();
  resolveActorUserId.mockResolvedValue("user-1");
});

describe("createTransaction", () => {
  it("validates input and persists it scoped to the current user", async () => {
    create.mockResolvedValue({
      id: "txn-1",
      type: "EXPENSE",
      amount: 42.5,
      currency: "AUD",
      category: "Groceries",
      description: null,
      date: new Date("2026-06-01T00:00:00.000Z"),
      source: "MANUAL",
    });

    const result = await createTransaction(validInput);

    expect(create).toHaveBeenCalledOnce();
    const arg = create.mock.calls[0][0];
    expect(arg.data.userId).toBe("user-1");
    expect(arg.data.amount).toBe(42.5);
    expect(arg.data.currency).toBe("AUD");

    // Returns a serializable DTO (number amount, ISO date) — no Decimal/Date objects
    expect(result.amount).toBe(42.5);
    expect(typeof result.amount).toBe("number");
    expect(result.date).toBe("2026-06-01T00:00:00.000Z");
  });

  it("throws on invalid input without touching the db", async () => {
    await expect(
      createTransaction({ ...validInput, amount: -5 }),
    ).rejects.toThrow();
    expect(create).not.toHaveBeenCalled();
  });

  it("throws Unauthorized when there is no session", async () => {
    resolveActorUserId.mockRejectedValue(new Error("Unauthorized"));
    await expect(createTransaction(validInput)).rejects.toThrow("Unauthorized");
    expect(create).not.toHaveBeenCalled();
  });
});

describe("getTransactions", () => {
  it("returns the current user's transactions newest-first as serializable DTOs", async () => {
    findMany.mockResolvedValue([
      {
        id: "txn-1",
        type: "EXPENSE",
        amount: 42.5, // stands in for a Prisma Decimal
        currency: "AUD",
        category: "Groceries",
        description: null,
        date: new Date("2026-06-01T00:00:00.000Z"),
        source: "MANUAL",
      },
    ]);

    const result = await getTransactions();

    expect(findMany).toHaveBeenCalledWith({
      where: { userId: "user-1" },
      orderBy: { date: "desc" },
    });
    expect(result).toEqual([
      {
        id: "txn-1",
        type: "EXPENSE",
        amount: 42.5,
        currency: "AUD",
        category: "Groceries",
        description: null,
        date: "2026-06-01T00:00:00.000Z",
        source: "MANUAL",
      },
    ]);
    // amount must be a plain number, not a Decimal/object
    expect(typeof result[0].amount).toBe("number");
  });
});

describe("importTransactionsCsv", () => {
  const csv = [
    "date,type,amount,category",
    "2026-06-01,EXPENSE,42.50,Groceries",
    "2026-06-02,INCOME,5000,Salary",
    "2026-06-03,EXPENSE,not-a-number,Food",
  ].join("\n");

  it("persists valid rows as CSV-sourced and reports skipped + errors", async () => {
    // 2 valid rows; pretend 1 was a duplicate that got skipped.
    createMany.mockResolvedValue({ count: 1 });

    const result = await importTransactionsCsv(csv);

    expect(createMany).toHaveBeenCalledOnce();
    const arg = createMany.mock.calls[0][0];
    expect(arg.skipDuplicates).toBe(true);
    expect(arg.data).toHaveLength(2);
    expect(arg.data[0]).toMatchObject({ userId: "user-1", source: "CSV" });
    expect(arg.data[0].externalId).toEqual(expect.any(String));

    expect(result.imported).toBe(1);
    expect(result.skipped).toBe(1); // 2 valid - 1 inserted
    expect(result.errors).toHaveLength(1); // the bad amount row
    expect(result.errors[0].row).toBe(4);
  });

  it("does not call the db when there are no valid rows", async () => {
    const result = await importTransactionsCsv("date,amount\n,oops");
    expect(createMany).not.toHaveBeenCalled();
    expect(result.imported).toBe(0);
  });

  it("requires authentication", async () => {
    resolveActorUserId.mockRejectedValue(new Error("Unauthorized"));
    await expect(importTransactionsCsv(csv)).rejects.toThrow("Unauthorized");
  });
});

describe("updateTransaction", () => {
  it("validates and updates only rows owned by the current user", async () => {
    updateMany.mockResolvedValue({ count: 1 });

    await updateTransaction("txn-1", validInput);

    expect(updateMany).toHaveBeenCalledOnce();
    const arg = updateMany.mock.calls[0][0];
    expect(arg.where).toEqual({ id: "txn-1", userId: "user-1" });
    expect(arg.data).toMatchObject({ amount: 42.5, category: "Groceries" });
  });

  it("throws when no owned row matched", async () => {
    updateMany.mockResolvedValue({ count: 0 });
    await expect(updateTransaction("txn-x", validInput)).rejects.toThrow(
      "Transaction not found",
    );
  });

  it("throws on invalid input without touching the db", async () => {
    await expect(
      updateTransaction("txn-1", { ...validInput, amount: -5 }),
    ).rejects.toThrow();
    expect(updateMany).not.toHaveBeenCalled();
  });

  it("requires authentication", async () => {
    resolveActorUserId.mockRejectedValue(new Error("Unauthorized"));
    await expect(updateTransaction("txn-1", validInput)).rejects.toThrow(
      "Unauthorized",
    );
  });
});

describe("deleteTransaction", () => {
  it("deletes only rows owned by the current user", async () => {
    deleteMany.mockResolvedValue({ count: 1 });

    await deleteTransaction("txn-1");

    expect(deleteMany).toHaveBeenCalledWith({
      where: { id: "txn-1", userId: "user-1" },
    });
  });
});

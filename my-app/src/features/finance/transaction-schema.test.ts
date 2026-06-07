import { describe, it, expect } from "vitest";
import { transactionSchema } from "./transaction-schema";

const valid = {
  type: "EXPENSE",
  amount: 42.5,
  category: "Groceries",
  description: "Weekly shop",
  date: "2026-06-01",
};

describe("transactionSchema", () => {
  it("parses a valid expense and defaults currency to NZD", () => {
    const result = transactionSchema.parse(valid);
    expect(result.amount).toBe(42.5);
    expect(result.type).toBe("EXPENSE");
    expect(result.currency).toBe("NZD");
    expect(result.date).toBeInstanceOf(Date);
  });

  it("coerces a numeric string amount (form input)", () => {
    const result = transactionSchema.parse({ ...valid, amount: "19.99" });
    expect(result.amount).toBe(19.99);
  });

  it("rejects a non-positive amount", () => {
    const result = transactionSchema.safeParse({ ...valid, amount: 0 });
    expect(result.success).toBe(false);
  });

  it("rejects an empty category", () => {
    const result = transactionSchema.safeParse({ ...valid, category: "  " });
    expect(result.success).toBe(false);
  });

  it("rejects an unknown type", () => {
    const result = transactionSchema.safeParse({ ...valid, type: "REFUND" });
    expect(result.success).toBe(false);
  });

  it("allows omitting the optional description", () => {
    const { description: _omit, ...rest } = valid;
    expect(transactionSchema.safeParse(rest).success).toBe(true);
  });
});

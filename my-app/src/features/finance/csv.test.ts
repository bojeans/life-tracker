import { describe, it, expect } from "vitest";
import { parseTransactionsCsv, externalIdFor } from "./csv";

describe("parseTransactionsCsv", () => {
  it("parses well-formed rows with an explicit type column", () => {
    const csv = [
      "date,type,amount,category,description",
      "2026-06-01,EXPENSE,42.50,Groceries,Weekly shop",
      "2026-06-02,INCOME,5000,Salary,",
    ].join("\n");

    const { valid, errors } = parseTransactionsCsv(csv);

    expect(errors).toHaveLength(0);
    expect(valid).toHaveLength(2);
    expect(valid[0]).toMatchObject({
      type: "EXPENSE",
      amount: 42.5,
      category: "Groceries",
      description: "Weekly shop",
      currency: "AUD",
    });
    expect(valid[1].description).toBeUndefined();
  });

  it("infers type from the amount sign when no type column is present", () => {
    const csv = ["date,amount,category", "2026-06-01,-30,Food", "2026-06-02,1000,Pay"].join(
      "\n",
    );

    const { valid } = parseTransactionsCsv(csv);

    expect(valid[0]).toMatchObject({ type: "EXPENSE", amount: 30 });
    expect(valid[1]).toMatchObject({ type: "INCOME", amount: 1000 });
  });

  it("supports aliased headers and defaults missing category", () => {
    const csv = ["Transaction Date,Value,Memo", "2026-06-01,-12.5,Coffee"].join("\n");

    const { valid } = parseTransactionsCsv(csv);

    expect(valid[0]).toMatchObject({
      type: "EXPENSE",
      amount: 12.5,
      category: "Uncategorized",
      description: "Coffee",
    });
  });

  it("collects row-level errors without dropping valid rows", () => {
    const csv = [
      "date,amount,category",
      "2026-06-01,not-a-number,Food",
      "2026-06-02,20,Food",
    ].join("\n");

    const { valid, errors } = parseTransactionsCsv(csv);

    expect(valid).toHaveLength(1);
    expect(errors).toHaveLength(1);
    expect(errors[0].row).toBe(2);
  });

  it("handles quoted fields containing commas", () => {
    const csv = ['date,amount,description', '2026-06-01,-50,"Dinner, drinks"'].join(
      "\n",
    );

    const { valid } = parseTransactionsCsv(csv);

    expect(valid[0].description).toBe("Dinner, drinks");
  });
});

describe("externalIdFor", () => {
  it("is stable for identical rows and differs for different rows", () => {
    const a = {
      type: "EXPENSE" as const,
      amount: 42.5,
      category: "Groceries",
      description: "Shop",
      date: new Date("2026-06-01T00:00:00.000Z"),
      currency: "AUD",
    };
    const b = { ...a, amount: 43 };

    expect(externalIdFor(a)).toBe(externalIdFor({ ...a }));
    expect(externalIdFor(a)).not.toBe(externalIdFor(b));
  });
});

import { describe, it, expect } from "vitest";
import {
  parseTransactionsCsv,
  parseWideTransactionsCsv,
  parseAnyTransactionsCsv,
  externalIdFor,
} from "./csv";

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

describe("parseWideTransactionsCsv", () => {
  // Mirrors the user's Google Sheet layout.
  const wide = [
    ",rent+bills,groceries,takeaways,snapper,gym,spotify,car insurance,petrol,coffee,alcohol,other,other desc,salary",
    "01/01/2026,,272.22,17.4,,,19.34,,,,,,,",
    "02/01/2026,,,,,,,70,,,,,,",
    "10/01/2026,,263.15,,,,,,,,,113.38,chemist warehouse,",
    "12/01/2026,550,,,,,,,,,,,,",
    "15/02/2026,,,53.85,,11.99,,,,,,,,1891.52",
  ].join("\n");

  it("emits one transaction per filled category cell", () => {
    const { valid, errors } = parseWideTransactionsCsv(wide);
    expect(errors).toHaveLength(0);
    // 3 + 1 + 2 + 1 + 3 = 10
    expect(valid).toHaveLength(10);
  });

  it("classifies salary as income and everything else as expense", () => {
    const { valid } = parseWideTransactionsCsv(wide);
    const salary = valid.find((t) => t.category === "salary");
    expect(salary).toMatchObject({ type: "INCOME", amount: 1891.52 });
    expect(valid.filter((t) => t.type === "EXPENSE").length).toBe(9);
  });

  it("parses DD/MM/YYYY dates correctly (15/02 is February)", () => {
    const { valid } = parseWideTransactionsCsv(wide);
    const feb = valid.find((t) => t.category === "gym")!;
    expect(feb.date instanceof Date).toBe(true);
    expect((feb.date as Date).getMonth()).toBe(1); // February
    expect((feb.date as Date).getDate()).toBe(15);
  });

  it("attaches a paired '<x> desc' column as the description", () => {
    const { valid } = parseWideTransactionsCsv(wide);
    const other = valid.find((t) => t.category === "other")!;
    expect(other.description).toBe("chemist warehouse");
    expect(other.amount).toBe(113.38);
  });

  it("strips thousands separators from amounts", () => {
    const csv = [",salary", '01/01/2026,"1,891.52"'].join("\n");
    const { valid } = parseWideTransactionsCsv(csv);
    expect(valid[0]).toMatchObject({ type: "INCOME", amount: 1891.52 });
  });

  it("reports an invalid date without dropping other rows", () => {
    const csv = [",groceries", "31/31/2026,10", "02/01/2026,20"].join("\n");
    const { valid, errors } = parseWideTransactionsCsv(csv);
    expect(valid).toHaveLength(1);
    expect(errors[0].row).toBe(2);
  });
});

describe("parseAnyTransactionsCsv", () => {
  it("routes an amount-column header to the long parser", () => {
    const csv = ["date,amount,category", "2026-06-01,-30,Food"].join("\n");
    expect(parseAnyTransactionsCsv(csv).valid).toHaveLength(1);
  });

  it("routes a matrix header to the wide parser", () => {
    const csv = [",groceries,salary", "01/01/2026,272.22,1891.52"].join("\n");
    const { valid } = parseAnyTransactionsCsv(csv);
    expect(valid).toHaveLength(2);
    expect(valid.find((t) => t.category === "salary")?.type).toBe("INCOME");
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

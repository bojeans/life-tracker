import { describe, it, expect } from "vitest";
import {
  convert,
  convertTransactions,
  formatMoney,
  parseFrankfurterRates,
  type Rates,
} from "./currency";

const rates: Rates = { base: "NZD", rates: { USD: 0.6, AUD: 0.9 }, date: "2026-06-06" };

describe("convert", () => {
  it("converts from the base to another currency", () => {
    expect(convert(100, "NZD", "USD", rates)).toBe(60);
  });

  it("converts back to the base", () => {
    expect(convert(60, "USD", "NZD", rates)).toBe(100);
  });

  it("converts cross-currency via the base", () => {
    // 100 USD -> NZD (100/0.6=166.67) -> AUD (*0.9=150)
    expect(convert(100, "USD", "AUD", rates)).toBeCloseTo(150, 5);
  });

  it("is identity for same currency", () => {
    expect(convert(42, "NZD", "NZD", rates)).toBe(42);
    expect(convert(42, "USD", "USD", rates)).toBe(42);
  });

  it("returns the amount unchanged when a rate is missing", () => {
    expect(convert(100, "XYZ", "USD", rates)).toBe(100);
  });
});

describe("convertTransactions", () => {
  it("maps a mixed-currency list into one currency", () => {
    const out = convertTransactions(
      [
        { amount: 100, currency: "NZD" },
        { amount: 100, currency: "USD" },
      ],
      "NZD",
      rates,
    );
    expect(out[0].amount).toBe(100);
    expect(out[1].amount).toBeCloseTo(166.67, 1); // 100 USD in NZD
    expect(out.every((t) => t.currency === "NZD")).toBe(true);
  });

  it("returns the input unchanged when rates are unavailable", () => {
    const input = [{ amount: 5, currency: "USD" }];
    expect(convertTransactions(input, "NZD", null)).toBe(input);
  });
});

describe("formatMoney", () => {
  it("formats with the given currency, optionally whole", () => {
    expect(formatMoney(1234.5, "NZD")).toContain("1,234.50");
    expect(formatMoney(1000, "USD", { whole: true })).toMatch(/1,000(?!\.)/);
  });
});

describe("parseFrankfurterRates", () => {
  it("parses a Frankfurter payload", () => {
    const r = parseFrankfurterRates({ base: "NZD", date: "2026-06-06", rates: { USD: 0.6 } });
    expect(r).toEqual({ base: "NZD", date: "2026-06-06", rates: { USD: 0.6 } });
  });

  it("defaults sensibly on a malformed payload", () => {
    expect(parseFrankfurterRates({})).toEqual({ base: "NZD", rates: {}, date: undefined });
  });
});

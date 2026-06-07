// Base/home currency for the app. Amounts are stored per-transaction in their
// own currency; this is the default for new entries and the reference the
// public view and conversions use.
export const BASE_CURRENCY = "NZD";

// Currencies offered in selectors. All are supported by the Frankfurter (ECB)
// FX source used in currency-actions.ts.
export const SUPPORTED_CURRENCIES = [
  { code: "NZD", label: "NZD — New Zealand Dollar" },
  { code: "AUD", label: "AUD — Australian Dollar" },
  { code: "USD", label: "USD — US Dollar" },
  { code: "EUR", label: "EUR — Euro" },
  { code: "GBP", label: "GBP — British Pound" },
  { code: "JPY", label: "JPY — Japanese Yen" },
  { code: "CAD", label: "CAD — Canadian Dollar" },
  { code: "SGD", label: "SGD — Singapore Dollar" },
  { code: "CHF", label: "CHF — Swiss Franc" },
  { code: "CNY", label: "CNY — Chinese Yuan" },
] as const;

// Exchange rates expressed as units of each currency per 1 unit of `base`
// (the Frankfurter shape). The base itself is implicitly 1.
export type Rates = { base: string; rates: Record<string, number>; date?: string };

export function formatMoney(
  amount: number,
  currency: string = BASE_CURRENCY,
  opts?: { whole?: boolean },
): string {
  return new Intl.NumberFormat("en-NZ", {
    style: "currency",
    currency,
    maximumFractionDigits: opts?.whole ? 0 : 2,
  }).format(amount);
}

// Converts an amount between currencies via the base. Best-effort: if a needed
// rate is missing (or from===to), the amount is returned unchanged.
export function convert(
  amount: number,
  from: string,
  to: string,
  rates: Rates,
): number {
  if (from === to) return amount;
  const rateOf = (c: string) => (c === rates.base ? 1 : rates.rates[c]);
  const rf = rateOf(from);
  const rt = rateOf(to);
  if (!rf || !rt) return amount;
  return (amount / rf) * rt;
}

// Maps a list of {amount, currency} records into a single target currency.
// Returns the input unchanged when rates aren't available yet.
export function convertTransactions<T extends { amount: number; currency: string }>(
  txns: T[],
  to: string,
  rates: Rates | null | undefined,
): T[] {
  if (!rates) return txns;
  return txns.map((t) => ({
    ...t,
    amount: convert(t.amount, t.currency, to, rates),
    currency: to,
  }));
}

// Parses a Frankfurter `/latest` response into our Rates shape.
export function parseFrankfurterRates(json: unknown): Rates {
  const j = json as { base?: string; rates?: Record<string, number>; date?: string };
  return {
    base: j?.base ?? BASE_CURRENCY,
    rates: j?.rates ?? {},
    date: j?.date,
  };
}

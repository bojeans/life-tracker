"use server";

import {
  BASE_CURRENCY,
  SUPPORTED_CURRENCIES,
  parseFrankfurterRates,
  type Rates,
} from "./currency";

const SYMBOLS = SUPPORTED_CURRENCIES.map((c) => c.code)
  .filter((c) => c !== BASE_CURRENCY)
  .join(",");

// Latest FX rates (base = NZD) from Frankfurter — free, no API key, ECB data.
// Cached for an hour. Returns empty rates on failure so the UI falls back to
// showing original amounts rather than erroring.
export async function getExchangeRates(): Promise<Rates> {
  try {
    const res = await fetch(
      `https://api.frankfurter.dev/v1/latest?base=${BASE_CURRENCY}&symbols=${SYMBOLS}`,
      { next: { revalidate: 3600 } },
    );
    if (!res.ok) return { base: BASE_CURRENCY, rates: {} };
    return parseFrankfurterRates(await res.json());
  } catch {
    return { base: BASE_CURRENCY, rates: {} };
  }
}

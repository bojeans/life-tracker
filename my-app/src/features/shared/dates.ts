// Shared, timezone-safe date helpers used by the finance and health features.
// Dates are constructed at UTC midnight so the calendar day is preserved
// regardless of the server's timezone — a local-midnight Date would shift the
// day when stored/serialized as UTC (e.g. 01/01 in UTC+11 became Dec 31).

// Builds a UTC-midnight Date, or null if the y/m/d don't form a real calendar
// date (m is 1-based). Guards against JS Date roll-over (e.g. Feb 30).
export function buildUtcDate(y: number, m: number, d: number): Date | null {
  const date = new Date(Date.UTC(y, m - 1, d));
  const valid =
    date.getUTCFullYear() === y &&
    date.getUTCMonth() === m - 1 &&
    date.getUTCDate() === d;
  return valid ? date : null;
}

// Accepts DD/MM/YYYY (or D/M/YYYY) and ISO YYYY-MM-DD. Returns null if invalid.
export function parseFlexibleDate(raw: string): Date | null {
  const match = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/); // DD/MM/YYYY
  if (match) {
    const [, d, m, y] = match.map(Number);
    return buildUtcDate(y, m, d);
  }
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/); // YYYY-MM-DD
  if (iso) {
    const [, y, m, d] = iso.map(Number);
    return buildUtcDate(y, m, d);
  }
  return null;
}

// Formats a "YYYY-MM" month key as e.g. "Jun 2026".
export function formatMonthLabel(month: string): string {
  const [year, m] = month.split("-").map(Number);
  return new Date(year, m - 1, 1).toLocaleDateString("en-AU", {
    month: "short",
    year: "numeric",
  });
}

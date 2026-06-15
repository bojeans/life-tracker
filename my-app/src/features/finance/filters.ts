import type { TransactionDTO } from "./types";

// A single, serializable criteria object. Kept deliberately plain so a future
// natural-language search can have an LLM emit one of these directly as JSON.
export type TransactionFilter = {
  search?: string; // matches category + description, case-insensitive
  categories?: string[]; // empty / undefined = all categories
  type?: "ALL" | "INCOME" | "EXPENSE" | "TRANSFER";
  from?: string; // "YYYY-MM-DD", inclusive
  to?: string; // "YYYY-MM-DD", inclusive
};

export const EMPTY_FILTER: TransactionFilter = { type: "ALL" };

// Pure: returns the subset of transactions matching every supplied criterion.
// Date comparisons use the "YYYY-MM-DD" prefix as a string — ISO dates sort
// lexicographically, which keeps this timezone-safe (dates are stored at UTC
// midnight) without any Date math.
export function filterTransactions(
  transactions: TransactionDTO[],
  filter: TransactionFilter,
): TransactionDTO[] {
  const search = filter.search?.trim().toLowerCase();
  const categories =
    filter.categories && filter.categories.length > 0
      ? new Set(filter.categories)
      : null;

  return transactions.filter((t) => {
    if (filter.type && filter.type !== "ALL" && t.type !== filter.type) {
      return false;
    }
    if (categories && !categories.has(t.category)) return false;
    if (search) {
      const haystack = `${t.category} ${t.description ?? ""}`.toLowerCase();
      if (!haystack.includes(search)) return false;
    }
    const day = t.date.slice(0, 10);
    if (filter.from && day < filter.from) return false;
    if (filter.to && day > filter.to) return false;
    return true;
  });
}

// Distinct categories present in the data, alphabetically, for filter controls.
export function availableCategories(transactions: TransactionDTO[]): string[] {
  return [...new Set(transactions.map((t) => t.category))].sort((a, b) =>
    a.localeCompare(b),
  );
}

export type DatePreset = "all" | "this-month" | "last-3-months" | "this-year";

export const DATE_PRESETS: { value: DatePreset; label: string }[] = [
  { value: "all", label: "All" },
  { value: "this-month", label: "This month" },
  { value: "last-3-months", label: "Last 3 months" },
  { value: "this-year", label: "This year" },
];

// Resolves a preset to an inclusive calendar window of "YYYY-MM-DD" strings.
// Computed from the reference date's UTC parts so it matches how dates are
// stored/displayed. Windows are whole calendar periods (not month-to-date).
export function presetRange(
  preset: DatePreset,
  ref: Date = new Date(),
): { from?: string; to?: string } {
  const y = ref.getUTCFullYear();
  const m = ref.getUTCMonth(); // 0-based
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const monthEnd = iso(new Date(Date.UTC(y, m + 1, 0)));

  switch (preset) {
    case "this-month":
      return { from: iso(new Date(Date.UTC(y, m, 1))), to: monthEnd };
    case "last-3-months":
      return { from: iso(new Date(Date.UTC(y, m - 2, 1))), to: monthEnd };
    case "this-year":
      return {
        from: iso(new Date(Date.UTC(y, 0, 1))),
        to: iso(new Date(Date.UTC(y, 11, 31))),
      };
    case "all":
    default:
      return {};
  }
}

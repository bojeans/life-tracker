import Papa from "papaparse";
import { transactionSchema, type TransactionInput } from "./transaction-schema";

export type CsvParseResult = {
  valid: TransactionInput[];
  errors: { row: number; message: string }[];
};

// Map common/aliased column headers to our canonical field names.
const HEADER_ALIASES: Record<string, string> = {
  date: "date",
  "transaction date": "date",
  amount: "amount",
  value: "amount",
  type: "type",
  category: "category",
  "category name": "category",
  description: "description",
  note: "description",
  notes: "description",
  memo: "description",
  details: "description",
};

const normalizeHeader = (h: string) => {
  const key = h.trim().toLowerCase();
  return HEADER_ALIASES[key] ?? key;
};

type RawRow = Record<string, string | undefined>;

/**
 * Parses CSV text (e.g. a Google Sheets export) into validated transaction
 * inputs. Expected columns (case-insensitive, aliases supported):
 *   - date        (required)
 *   - amount      (required; may be negative)
 *   - type        (optional: "income" | "expense"; inferred from amount sign if absent)
 *   - category    (optional; defaults to "Uncategorized")
 *   - description (optional)
 * Invalid rows are collected in `errors` with their source row number; valid
 * rows are returned parsed and ready to persist.
 */
export function parseTransactionsCsv(csvText: string): CsvParseResult {
  const parsed = Papa.parse<RawRow>(csvText, {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: normalizeHeader,
  });

  const valid: TransactionInput[] = [];
  const errors: { row: number; message: string }[] = [];

  parsed.data.forEach((raw, i) => {
    // +2: one for the header line, one for 1-based numbering.
    const rowNumber = i + 2;

    const amountRaw = (raw.amount ?? "").trim();
    const amountNum = Number(amountRaw);
    if (amountRaw === "" || Number.isNaN(amountNum)) {
      errors.push({ row: rowNumber, message: "Missing or invalid amount" });
      return;
    }

    const typeRaw = (raw.type ?? "").trim().toUpperCase();
    const type =
      typeRaw === "INCOME" || typeRaw === "EXPENSE"
        ? typeRaw
        : amountNum < 0
          ? "EXPENSE"
          : "INCOME";

    const candidate = {
      type,
      amount: Math.abs(amountNum),
      category: (raw.category ?? "").trim() || "Uncategorized",
      description: (raw.description ?? "").trim() || undefined,
      date: (raw.date ?? "").trim(),
      currency: "AUD",
    };

    const result = transactionSchema.safeParse(candidate);
    if (result.success) {
      valid.push(result.data);
    } else {
      const message = result.error.issues
        .map((iss) => iss.message)
        .join("; ");
      errors.push({ row: rowNumber, message });
    }
  });

  return { valid, errors };
}

// Deterministic key for a parsed transaction, used as `externalId` so the same
// CSV row isn't imported twice (paired with the @@unique on [userId, source, externalId]).
export function externalIdFor(t: TransactionInput): string {
  return JSON.stringify([
    t.date instanceof Date ? t.date.toISOString() : t.date,
    t.type,
    t.amount,
    t.category,
    t.description ?? "",
  ]);
}

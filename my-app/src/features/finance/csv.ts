import Papa from "papaparse";
import { transactionSchema, type TransactionInput } from "./transaction-schema";
import { BASE_CURRENCY } from "./currency";
import { parseFlexibleDate } from "@/features/shared/dates";

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

// Column header names treated as income in the wide/matrix layout (everything
// else is an expense). Adjust here if the spreadsheet adds new income columns.
const INCOME_CATEGORIES = new Set([
  "salary",
  "gross salary",
  "wage",
  "wages",
  "income",
  "other income",
  "misc income",
  "dividend",
  "dividends",
  "interest",
  "bonus",
  "refund",
  "rebate",
  "reimbursement",
  "inheritance",
  "inheritence", // common misspelling, accepted so the column still classifies
]);

const isIncomeCategory = (name: string) =>
  INCOME_CATEGORIES.has(name.trim().toLowerCase());

// Columns that are deliberately NOT imported as their own transactions. "net
// salary" is take-home pay, which the income model derives as gross −
// deductions (see income-metrics.ts); importing it as well would double-count
// pay. Add other derived/duplicate columns here.
const IGNORED_COLUMNS = new Set([
  "net salary",
  "take home",
  "take-home",
  "take home pay",
]);

const isIgnoredColumn = (name: string) =>
  IGNORED_COLUMNS.has(name.trim().toLowerCase());

// Column names treated as own-account TRANSFERs (excluded from income/expense).
// KiwiSaver/super are contributions to your own wealth, not spending.
const TRANSFER_CATEGORIES = new Set([
  "super",
  "superannuation",
  "transfer",
  "to sharesies",
  "to savings",
  "to investments",
]);

// A column is an own-account transfer if it's a known transfer category, OR its
// name describes a move between accounts ("kiwibank transfer to sharesies",
// "sharesies transfer to kiwibank", "wise transfer to kiwibank", …), OR it's a
// KiwiSaver/super contribution (own wealth, not spending). Substring matching
// keeps this robust as new account pairs are added to the sheet without having
// to enumerate every "<account> transfer to <account>" combination.
const isTransferCategory = (name: string) => {
  const key = name.trim().toLowerCase();
  if (TRANSFER_CATEGORIES.has(key)) return true;
  if (key.includes("transfer")) return true;
  if (key.includes("kiwisaver") || key.includes("kiwi saver")) return true;
  return false;
};

const columnType = (name: string): "INCOME" | "EXPENSE" | "TRANSFER" => {
  if (isIncomeCategory(name)) return "INCOME";
  if (isTransferCategory(name)) return "TRANSFER";
  return "EXPENSE";
};

// Parses a number that may contain currency symbols, thousands separators, or
// surrounding whitespace. Returns NaN if it isn't numeric.
function parseAmount(raw: string): number {
  const cleaned = raw.replace(/[$,\s]/g, "");
  return cleaned === "" ? NaN : Number(cleaned);
}

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
      typeRaw === "INCOME" || typeRaw === "EXPENSE" || typeRaw === "TRANSFER"
        ? typeRaw
        : amountNum < 0
          ? "EXPENSE"
          : "INCOME";

    const category = (raw.category ?? "").trim() || "Uncategorized";
    // Skip derived/duplicate columns (e.g. "net salary") so take-home pay isn't
    // imported alongside gross income and double-counted, mirroring the wide
    // parser. The row is silently dropped, not flagged as an error.
    if (isIgnoredColumn(category)) return;

    const candidate = {
      type,
      amount: Math.abs(amountNum),
      category,
      description: (raw.description ?? "").trim() || undefined,
      date: (raw.date ?? "").trim(),
      currency: BASE_CURRENCY,
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

/**
 * Parses a wide/matrix CSV: column A is the date, each remaining column header
 * is a category, and cells hold the amount for that category on that date. Most
 * cells are blank. A column named "<x> desc" (or "<x> description") supplies a
 * per-row LABEL that replaces the category for that entry (e.g. an "other" cell
 * with "other desc" = "chemist warehouse" is categorised as "chemist warehouse"
 * on the dashboards, not lumped under "other"). Income vs expense is decided by
 * column name (see INCOME_CATEGORIES).
 */
export function parseWideTransactionsCsv(csvText: string): CsvParseResult {
  const parsed = Papa.parse<string[]>(csvText, {
    header: false,
    skipEmptyLines: "greedy",
  });

  const valid: TransactionInput[] = [];
  const errors: { row: number; message: string }[] = [];

  const rows = parsed.data;
  if (rows.length < 2) return { valid, errors };

  const header = rows[0].map((h) => (h ?? "").trim());

  // Build column metadata. Column 0 is the date. Description columns are paired
  // to their base category and excluded from the amount columns.
  const descColumnFor = new Map<string, number>(); // category(lowercased) -> col index
  const amountColumns: {
    index: number;
    category: string;
    type: "INCOME" | "EXPENSE" | "TRANSFER";
  }[] = [];

  for (let i = 1; i < header.length; i++) {
    const name = header[i];
    if (!name) continue;

    const descMatch = name.match(/^(.*?)\s+(?:desc|description)$/i);
    if (descMatch) {
      descColumnFor.set(descMatch[1].trim().toLowerCase(), i);
      continue;
    }

    if (isIgnoredColumn(name)) continue; // derived column (e.g. net salary)

    amountColumns.push({
      index: i,
      category: name,
      type: columnType(name),
    });
  }

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const rowNumber = r + 1; // 1-based, header is row 1
    const dateRaw = (row[0] ?? "").trim();
    if (dateRaw === "") continue; // skip rows with no date

    const date = parseFlexibleDate(dateRaw);
    if (!date) {
      errors.push({ row: rowNumber, message: `Invalid date "${dateRaw}"` });
      continue;
    }

    for (const col of amountColumns) {
      const cell = (row[col.index] ?? "").trim();
      if (cell === "") continue; // no transaction for this category that day

      const amount = parseAmount(cell);
      if (Number.isNaN(amount)) {
        errors.push({
          row: rowNumber,
          message: `Invalid amount "${cell}" in "${col.category}"`,
        });
        continue;
      }

      // A paired "<x> desc" cell becomes the category label for this row, so a
      // generic "other" bucket reads as its real description on the dashboards.
      const descIndex = descColumnFor.get(col.category.toLowerCase());
      const descValue =
        descIndex !== undefined ? (row[descIndex] ?? "").trim() : "";
      const category = descValue || col.category;

      const result = transactionSchema.safeParse({
        type: col.type,
        amount: Math.abs(amount),
        category,
        date,
        currency: BASE_CURRENCY,
      });

      if (result.success) {
        valid.push(result.data);
      } else {
        errors.push({
          row: rowNumber,
          message: `${col.category}: ${result.error.issues
            .map((iss) => iss.message)
            .join("; ")}`,
        });
      }
    }
  }

  return { valid, errors };
}

// Detects the CSV layout from its header row and parses accordingly. A header
// containing an "amount"/"value" column is treated as the long format; anything
// else is treated as the wide/matrix format.
export function parseAnyTransactionsCsv(csvText: string): CsvParseResult {
  const firstLine = csvText.split(/\r?\n/, 1)[0] ?? "";
  const headers = firstLine.split(",").map((h) => h.trim().toLowerCase());
  const isLong = headers.includes("amount") || headers.includes("value");
  return isLong
    ? parseTransactionsCsv(csvText)
    : parseWideTransactionsCsv(csvText);
}

// Deterministic key for a parsed transaction, used as `externalId` so the same
// CSV row isn't imported twice (paired with the @@unique on [userId, source, externalId]).
// Note: `type` is intentionally excluded so that re-importing after changing how a
// column is classified (income vs expense) still dedupes against the original row.
export function externalIdFor(t: TransactionInput): string {
  return JSON.stringify([
    t.date instanceof Date ? t.date.toISOString() : t.date,
    t.category,
    t.amount,
    t.description ?? "",
  ]);
}

import Papa from "papaparse";
import { parseFlexibleDate } from "@/features/shared/dates";

// One account's balance on a given date, as read from a CSV cell. `column` is
// the raw header text (an account name); the action resolves it to an account.
export type BalanceCsvCell = { column: string; balance: number };

export type BalanceCsvRow = {
  row: number; // 1-based source row number, for error reporting
  date: Date;
  cells: BalanceCsvCell[];
};

export type BalancesCsvParseResult = {
  // Account-name headers in source order (column 0, the date, excluded).
  columns: string[];
  rows: BalanceCsvRow[];
  errors: { row: number; message: string }[];
};

// Parses a balance figure that may carry a currency symbol, thousands
// separators, or whitespace. Returns NaN if it isn't numeric. A liability is
// entered as a positive amount owed (net-worth math subtracts it by account
// kind), but a negative is still accepted for a genuinely overdrawn asset.
function parseBalanceAmount(raw: string): number {
  const cleaned = raw.replace(/[$,\s]/g, "");
  return cleaned === "" ? NaN : Number(cleaned);
}

/**
 * Parses a wide net-worth CSV: column A is the date, each remaining column
 * header is an account name, and cells hold that account's balance (a level,
 * not a flow) on that date. A blank cell means "not measured" and is skipped so
 * it never overwrites an existing snapshot — whereas an explicit `0` is a real
 * recorded balance and is kept. Account metadata (kind / asset class /
 * currency) lives on the WealthAccount, not the CSV, so columns are matched to
 * existing accounts by name in the import action.
 */
export function parseBalancesCsv(csvText: string): BalancesCsvParseResult {
  const parsed = Papa.parse<string[]>(csvText, {
    header: false,
    skipEmptyLines: "greedy",
  });

  const errors: { row: number; message: string }[] = [];
  const rows = parsed.data;
  if (rows.length < 2) return { columns: [], rows: [], errors };

  const header = rows[0].map((h) => (h ?? "").trim());
  const columns = header.slice(1).filter((h) => h !== "");

  const outRows: BalanceCsvRow[] = [];
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

    const cells: BalanceCsvCell[] = [];
    for (let c = 1; c < header.length; c++) {
      const name = header[c];
      if (!name) continue; // unnamed column

      const cell = (row[c] ?? "").trim();
      if (cell === "") continue; // not measured this date — leave any snapshot intact

      const balance = parseBalanceAmount(cell);
      if (Number.isNaN(balance)) {
        errors.push({
          row: rowNumber,
          message: `Invalid balance "${cell}" in "${name}"`,
        });
        continue;
      }
      cells.push({ column: name, balance });
    }

    if (cells.length > 0) outRows.push({ row: rowNumber, date, cells });
  }

  return { columns, rows: outRows, errors };
}

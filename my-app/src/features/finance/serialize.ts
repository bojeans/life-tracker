import type { TransactionDTO } from "./types";

// Shape of a Prisma Transaction row (amount is a Decimal at runtime).
export type TransactionRow = {
  id: string;
  type: TransactionDTO["type"];
  amount: unknown;
  currency: string;
  category: string;
  description: string | null;
  date: Date;
  source: string;
};

// Maps a Prisma row to a serializable DTO (Decimal -> number, Date -> ISO).
export function toTransactionDTO(row: TransactionRow): TransactionDTO {
  return {
    id: row.id,
    type: row.type,
    amount: Number(row.amount),
    currency: row.currency,
    category: row.category,
    description: row.description,
    date: row.date.toISOString(),
    source: row.source,
  };
}

import type { TRANSACTION_TYPES } from "./transaction-schema";

// Plain, fully-serializable shape sent to client components.
// Prisma's Decimal/Date don't cross the server→client boundary cleanly,
// so the server maps rows to this DTO first.
export type TransactionDTO = {
  id: string;
  type: (typeof TRANSACTION_TYPES)[number];
  amount: number;
  currency: string;
  category: string;
  description: string | null;
  date: string; // ISO 8601
  source: string;
};

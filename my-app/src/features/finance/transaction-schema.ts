import { z } from "zod";

export const TRANSACTION_TYPES = ["INCOME", "EXPENSE"] as const;

export const transactionSchema = z.object({
  type: z.enum(TRANSACTION_TYPES),
  // Coerce so it works with both form strings and JSON numbers.
  amount: z.coerce
    .number({ error: "Amount is required" })
    .positive({ error: "Amount must be greater than 0" })
    .max(1_000_000_000, { error: "Amount is too large" }),
  category: z
    .string()
    .trim()
    .min(1, { error: "Category is required" })
    .max(50, { error: "Category is too long" }),
  description: z
    .string()
    .trim()
    .max(200, { error: "Description is too long" })
    .optional(),
  date: z.coerce.date({ error: "A valid date is required" }),
  currency: z.string().trim().length(3).default("AUD"),
});

export type TransactionInput = z.infer<typeof transactionSchema>;

import { z } from "zod";
import { SUPPORTED_CURRENCIES, BASE_CURRENCY } from "./currency";

export const ASSET_CLASSES = ["CASH", "SHARES", "CRYPTO", "SUPER"] as const;
export type AssetClass = (typeof ASSET_CLASSES)[number];

export const ASSET_CLASS_LABELS: Record<AssetClass, string> = {
  CASH: "Cash",
  SHARES: "Shares",
  CRYPTO: "Crypto",
  SUPER: "Super / KiwiSaver",
};

export const ACCOUNT_KINDS = ["ASSET", "LIABILITY"] as const;
export type AccountKind = (typeof ACCOUNT_KINDS)[number];

const emptyToUndefined = (v: unknown) =>
  v === "" || v === null ? undefined : v;

const CURRENCY_CODES = SUPPORTED_CURRENCIES.map((c) => c.code) as [
  string,
  ...string[],
];

export const accountSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, { error: "Name is required" })
    .max(60, { error: "Name is too long" }),
  institution: z.preprocess(
    emptyToUndefined,
    z.string().trim().max(60).optional(),
  ),
  kind: z.enum(ACCOUNT_KINDS).default("ASSET"),
  assetClass: z.enum(ASSET_CLASSES, { error: "Pick an asset class" }),
  currency: z.enum(CURRENCY_CODES).default(BASE_CURRENCY),
});

export type AccountInput = z.infer<typeof accountSchema>;

// Recording balances for a date: one (optional) figure per account. Negative is
// allowed so a liability account (loan/credit) can be tracked too.
export const balanceEntrySchema = z.object({
  date: z.coerce.date({ error: "A valid date is required" }),
  balances: z
    .array(
      z.object({
        accountId: z.string().min(1),
        balance: z.coerce
          .number({ error: "Balance must be a number" })
          .min(-1_000_000_000_000)
          .max(1_000_000_000_000),
      }),
    )
    .min(1, { error: "Enter at least one balance" }),
});

export type BalanceEntryInput = z.infer<typeof balanceEntrySchema>;

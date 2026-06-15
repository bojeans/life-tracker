"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { balanceEntrySchema } from "./networth-schema";
import { recordBalances } from "./networth-actions";
import type { AccountDTO } from "./networth-types";
import { convert, formatMoney, type Rates } from "./currency";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const today = () => new Date().toISOString().slice(0, 10);

export function BalanceEntry({
  accounts,
  latest,
  base,
  rates,
}: {
  accounts: AccountDTO[];
  // Latest known balance per account (own currency), to prefill the inputs.
  latest: Record<string, number>;
  base: string;
  rates: Rates | null;
}) {
  const queryClient = useQueryClient();
  const [date, setDate] = useState(today());
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      accounts.map((a) => [a.id, latest[a.id] != null ? String(latest[a.id]) : ""]),
    ),
  );
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async () => {
      const balances = accounts
        .filter((a) => values[a.id]?.trim() !== "" && values[a.id] != null)
        .map((a) => ({ accountId: a.id, balance: values[a.id] }));
      const parsed = balanceEntrySchema.safeParse({ date, balances });
      if (!parsed.success) {
        throw new Error(parsed.error.issues[0]?.message ?? "Check the figures");
      }
      await recordBalances(parsed.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["netWorth"] });
    },
    onError: (e: Error) => setError(e.message),
  });

  // Live "≈ $Y NZD" for an account held in another currency, so you see the
  // base-currency value as you type. Null for base-currency accounts, empty
  // input, or before FX rates have loaded.
  function baseHint(account: AccountDTO): string | null {
    if (account.currency === base || !rates) return null;
    const raw = values[account.id];
    const n = Number(raw);
    if (!raw?.trim() || !Number.isFinite(n)) return null;
    return `≈ ${formatMoney(convert(n, account.currency, base, rates), base)}`;
  }

  if (accounts.length === 0) return null;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        mutation.mutate();
      }}
      className="space-y-4 rounded-lg border p-4"
      aria-label="Record balances"
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-semibold">Record balances</h2>
          <p className="text-muted-foreground text-sm">
            Enter each account&apos;s balance as of a date. Re-recording a date
            updates it.
          </p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="balance-date">As of</Label>
          <Input
            id="balance-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-auto"
          />
        </div>
      </div>

      <ul className="divide-y rounded-md border">
        {accounts.map((a) => (
          <li key={a.id} className="flex items-center gap-3 p-2">
            <span className="min-w-0 flex-1 truncate text-sm">
              {a.name}
              <span className="text-muted-foreground"> · {a.currency}</span>
            </span>
            <div className="flex flex-col items-end">
              <Input
                type="number"
                step="any"
                inputMode="decimal"
                aria-label={`${a.name} balance`}
                placeholder="0.00"
                className="w-32"
                value={values[a.id] ?? ""}
                onChange={(e) =>
                  setValues((v) => ({ ...v, [a.id]: e.target.value }))
                }
              />
              {baseHint(a) && (
                <span className="text-muted-foreground mt-0.5 text-xs">
                  {baseHint(a)}
                </span>
              )}
            </div>
          </li>
        ))}
      </ul>

      <Button type="submit" disabled={mutation.isPending}>
        {mutation.isPending ? "Saving…" : "Save balances"}
      </Button>
      {error && <p className="text-destructive text-sm">{error}</p>}
      {mutation.isSuccess && !error && (
        <p className="text-muted-foreground text-sm">Balances saved.</p>
      )}
    </form>
  );
}

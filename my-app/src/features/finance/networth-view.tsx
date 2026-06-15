"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { getNetWorthData, deleteAccount, deleteSnapshot } from "./networth-actions";
import {
  latestBalances,
  netWorthTotal,
  totalAssets,
  totalLiabilities,
  compositionByClass,
  netWorthOverTime,
} from "./networth-analytics";
import { ASSET_CLASS_LABELS, type AssetClass } from "./networth-schema";
import { BASE_CURRENCY, formatMoney, type Rates } from "./currency";
import { AccountForm } from "./account-form";
import { BalanceEntry } from "./balance-entry";
import type { AccountDTO, BalanceSnapshotDTO } from "./networth-types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";

const money = (n: number) => formatMoney(n, BASE_CURRENCY, { whole: true });
const classLabel = (c: string) =>
  ASSET_CLASS_LABELS[c as AssetClass] ?? c;

export function NetWorthView({
  initialData,
  rates,
}: {
  initialData: { accounts: AccountDTO[]; snapshots: BalanceSnapshotDTO[] };
  rates: Rates | null;
}) {
  const queryClient = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<AccountDTO | null>(null);
  const [confirming, setConfirming] = useState<AccountDTO | null>(null);

  const { data } = useQuery({
    queryKey: ["netWorth"],
    queryFn: () => getNetWorthData(),
    initialData,
  });
  const { accounts, snapshots } = data;

  const balances = useMemo(
    () => latestBalances(accounts, snapshots, BASE_CURRENCY, rates),
    [accounts, snapshots, rates],
  );
  const total = useMemo(() => netWorthTotal(balances), [balances]);
  const assets = useMemo(() => totalAssets(balances), [balances]);
  const liabilities = useMemo(() => totalLiabilities(balances), [balances]);
  const composition = useMemo(() => compositionByClass(balances), [balances]);
  const overTime = useMemo(
    () => netWorthOverTime(accounts, snapshots, BASE_CURRENCY, rates),
    [accounts, snapshots, rates],
  );
  const latestMap = useMemo(
    () => Object.fromEntries(balances.map((b) => [b.account.id, b.balance])),
    [balances],
  );

  const remove = useMutation({
    mutationFn: (id: string) => deleteAccount(id),
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: ["netWorth"] }),
  });

  const removeSnapshot = useMutation({
    mutationFn: (id: string) => deleteSnapshot(id),
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: ["netWorth"] }),
  });

  const accountById = useMemo(
    () => new Map(accounts.map((a) => [a.id, a])),
    [accounts],
  );
  // Most recent first, for the editable history list.
  const history = useMemo(
    () => [...snapshots].sort((a, b) => b.date.localeCompare(a.date)),
    [snapshots],
  );

  const hasData = snapshots.length > 0;

  return (
    <div className="space-y-6">
      {accounts.length === 0 ? (
        <p className="text-muted-foreground rounded-lg border border-dashed p-8 text-center text-sm">
          Add your accounts (Kiwibank, Sharesies, crypto.com…) below, then record
          their balances to track net worth over time.
        </p>
      ) : (
        <>
          <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-lg border p-4 sm:col-span-1">
              <p className="text-muted-foreground text-sm">Net worth</p>
              <p className="mt-1 text-2xl font-semibold">{money(total)}</p>
              {liabilities > 0 && (
                <p className="text-muted-foreground mt-1 text-xs">
                  {money(assets)} assets − {money(liabilities)} owed
                </p>
              )}
              {rates == null && (
                <p className="text-muted-foreground mt-1 text-xs">
                  Mixed currencies shown unconverted until rates load.
                </p>
              )}
            </div>
            <div className="rounded-lg border p-4 sm:col-span-2">
              <p className="text-muted-foreground mb-2 text-sm">
                By asset class
              </p>
              {hasData ? (
                <ul className="space-y-1.5">
                  {composition.map((s) => (
                    <li key={s.assetClass} className="text-sm">
                      <div className="flex justify-between">
                        <span>{classLabel(s.assetClass)}</span>
                        <span className="text-muted-foreground">
                          {money(s.total)} ·{" "}
                          {total > 0 ? Math.round((s.total / total) * 100) : 0}%
                        </span>
                      </div>
                      <div className="bg-muted mt-1 h-1.5 overflow-hidden rounded">
                        <div
                          className="bg-foreground h-full"
                          style={{
                            width: `${total > 0 ? (s.total / total) * 100 : 0}%`,
                          }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground text-sm">
                  Record balances below to see your split.
                </p>
              )}
            </div>
          </section>

          {overTime.length > 1 && (
            <div className="space-y-3 rounded-lg border p-4">
              <h2 className="font-semibold">Net worth over time</h2>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={overTime} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                  <XAxis dataKey="label" fontSize={12} tickLine={false} />
                  <YAxis
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    width={64}
                    tickFormatter={(v) => money(Number(v))}
                  />
                  <Tooltip formatter={(v) => money(Number(v))} />
                  <Line
                    type="monotone"
                    dataKey="total"
                    name="Net worth"
                    stroke="#0ea5e9"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          <BalanceEntry
            accounts={accounts}
            latest={latestMap}
            base={BASE_CURRENCY}
            rates={rates}
          />
        </>
      )}

      {/* Accounts manager */}
      <section className="space-y-3 rounded-lg border p-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Accounts</h2>
          <Button size="sm" onClick={() => setAdding(true)}>
            Add account
          </Button>
        </div>
        {accounts.length > 0 && (
          <ul className="divide-y rounded-md border">
            {balances.map(({ account, balance, baseBalance, date }) => (
              <li
                key={account.id}
                className="flex items-center justify-between gap-3 p-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {account.name}
                    {account.institution && (
                      <span className="text-muted-foreground font-normal">
                        {" "}
                        · {account.institution}
                      </span>
                    )}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {account.kind === "LIABILITY"
                      ? "Liability"
                      : classLabel(account.assetClass)}{" "}
                    ·{" "}
                    {account.currency !== BASE_CURRENCY
                      ? `${formatMoney(balance, account.currency)} → ${money(baseBalance)}`
                      : money(baseBalance)}
                    {date
                      ? ` · ${new Date(date).toLocaleDateString("en-NZ", { timeZone: "UTC" })}`
                      : " · no balance yet"}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditing(account)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setConfirming(account)}
                  >
                    Delete
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {history.length > 0 && (
        <section className="space-y-3 rounded-lg border p-4">
          <h2 className="font-semibold">Balance history</h2>
          <ul className="max-h-72 divide-y overflow-y-auto rounded-md border">
            {history.map((s) => {
              const acc = accountById.get(s.accountId);
              return (
                <li
                  key={s.id}
                  className="flex items-center justify-between gap-3 p-2 text-sm"
                >
                  <span className="min-w-0 truncate">
                    <span className="text-muted-foreground">
                      {new Date(s.date).toLocaleDateString("en-NZ", {
                        timeZone: "UTC",
                      })}
                    </span>{" "}
                    · {acc?.name ?? "—"}
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="tabular-nums">
                      {formatMoney(s.balance, acc?.currency ?? BASE_CURRENCY)}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={`Delete ${acc?.name ?? ""} balance on ${s.date.slice(0, 10)}`}
                      onClick={() => removeSnapshot.mutate(s.id)}
                    >
                      Delete
                    </Button>
                  </span>
                </li>
              );
            })}
          </ul>
          <p className="text-muted-foreground text-xs">
            To correct a balance, re-record that date in the form above, or delete
            the entry here.
          </p>
        </section>
      )}

      <Dialog open={adding} onOpenChange={setAdding}>
        <DialogContent className="sm:max-w-md">
          <DialogTitle>Add account</DialogTitle>
          <AccountForm onSuccess={() => setAdding(false)} />
        </DialogContent>
      </Dialog>

      <Dialog
        open={editing !== null}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogTitle>Edit account</DialogTitle>
          {editing && (
            <AccountForm account={editing} onSuccess={() => setEditing(null)} />
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={confirming !== null}
        onOpenChange={(open) => {
          if (!open) setConfirming(null);
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogTitle>Delete account?</DialogTitle>
          <DialogDescription>
            {confirming
              ? `This deletes "${confirming.name}" and its recorded balances. This can't be undone.`
              : ""}
          </DialogDescription>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirming(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (confirming) remove.mutate(confirming.id);
                setConfirming(null);
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

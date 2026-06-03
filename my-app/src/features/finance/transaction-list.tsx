"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getTransactions, deleteTransaction } from "./actions";
import type { TransactionDTO } from "./types";
import { Button } from "@/components/ui/button";

function formatAmount(t: TransactionDTO) {
  const formatted = new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: t.currency,
  }).format(t.amount);
  return t.type === "EXPENSE" ? `-${formatted}` : `+${formatted}`;
}

export function TransactionList({
  initialData,
}: {
  initialData: TransactionDTO[];
}) {
  const queryClient = useQueryClient();

  const { data: transactions = [] } = useQuery({
    queryKey: ["transactions"],
    queryFn: () => getTransactions(),
    initialData,
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteTransaction(id),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["transactions"] }),
  });

  if (transactions.length === 0) {
    return (
      <p className="text-muted-foreground py-8 text-center text-sm">
        No transactions yet. Add your first one above.
      </p>
    );
  }

  return (
    <ul className="divide-y rounded-lg border">
      {transactions.map((t) => (
        <li key={t.id} className="flex items-center justify-between gap-4 p-3">
          <div className="min-w-0">
            <p className="truncate font-medium">{t.category}</p>
            <p className="text-muted-foreground text-sm">
              {new Date(t.date).toLocaleDateString("en-AU")}
              {t.description ? ` · ${t.description}` : ""}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span
              className={
                t.type === "EXPENSE" ? "text-destructive" : "text-green-600"
              }
            >
              {formatAmount(t)}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => remove.mutate(t.id)}
              disabled={remove.isPending}
            >
              Delete
            </Button>
          </div>
        </li>
      ))}
    </ul>
  );
}

"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { transactionSchema, TRANSACTION_TYPES } from "./transaction-schema";
import { createTransaction } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type FormInput = z.input<typeof transactionSchema>;
type FormOutput = z.output<typeof transactionSchema>;

const today = () => new Date().toISOString().slice(0, 10);

export function TransactionForm() {
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      type: "EXPENSE",
      amount: undefined,
      category: "",
      description: "",
      date: today(),
      currency: "AUD",
    },
  });

  const mutation = useMutation({
    mutationFn: (values: FormOutput) => createTransaction(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      reset({
        type: "EXPENSE",
        amount: undefined,
        category: "",
        description: "",
        date: today(),
        currency: "AUD",
      });
    },
  });

  return (
    <form
      onSubmit={handleSubmit((values) => mutation.mutate(values))}
      className="space-y-4 rounded-lg border p-4"
      aria-label="Add transaction"
    >
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="type">Type</Label>
          <select
            id="type"
            {...register("type")}
            className="border-input flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs"
          >
            {TRANSACTION_TYPES.map((t) => (
              <option key={t} value={t}>
                {t[0] + t.slice(1).toLowerCase()}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="amount">Amount</Label>
          <Input
            id="amount"
            type="number"
            step="0.01"
            placeholder="0.00"
            {...register("amount")}
          />
          {errors.amount && (
            <p className="text-destructive text-sm">{errors.amount.message}</p>
          )}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="category">Category</Label>
        <Input id="category" placeholder="e.g. Groceries" {...register("category")} />
        {errors.category && (
          <p className="text-destructive text-sm">{errors.category.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="description">Description (optional)</Label>
        <Input id="description" {...register("description")} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="date">Date</Label>
        <Input id="date" type="date" {...register("date")} />
        {errors.date && (
          <p className="text-destructive text-sm">{errors.date.message}</p>
        )}
      </div>

      <Button type="submit" disabled={mutation.isPending}>
        {mutation.isPending ? "Adding…" : "Add transaction"}
      </Button>
      {mutation.isError && (
        <p className="text-destructive text-sm">
          Something went wrong. Please try again.
        </p>
      )}
    </form>
  );
}

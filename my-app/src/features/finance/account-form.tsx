"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import {
  accountSchema,
  ASSET_CLASSES,
  ASSET_CLASS_LABELS,
} from "./networth-schema";
import { cn } from "@/lib/utils";
import { createAccount, updateAccount } from "./networth-actions";
import type { AccountDTO } from "./networth-types";
import { SUPPORTED_CURRENCIES, BASE_CURRENCY } from "./currency";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type FormInput = z.input<typeof accountSchema>;
type FormOutput = z.output<typeof accountSchema>;

function defaults(account?: AccountDTO): FormInput {
  return {
    name: account?.name ?? "",
    institution: account?.institution ?? "",
    kind: (account?.kind ?? "ASSET") as FormInput["kind"],
    assetClass: (account?.assetClass ?? "CASH") as FormInput["assetClass"],
    currency: (account?.currency ?? BASE_CURRENCY) as FormInput["currency"],
  };
}

export function AccountForm({
  account,
  onSuccess,
}: {
  account?: AccountDTO;
  onSuccess?: () => void;
}) {
  const queryClient = useQueryClient();
  const isEdit = Boolean(account);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(accountSchema),
    defaultValues: defaults(account),
  });

  // Track kind locally (synced from the select's onChange) to toggle the asset
  // class field, rather than RHF's watch() which the React Compiler can't
  // memoize.
  const [kind, setKind] = useState(account?.kind ?? "ASSET");
  const isLiability = kind === "LIABILITY";

  const mutation = useMutation({
    mutationFn: async (values: FormOutput) => {
      if (account) await updateAccount(account.id, values);
      else await createAccount(values);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["netWorth"] });
      if (isEdit) onSuccess?.();
      else reset(defaults());
    },
  });

  return (
    <form
      onSubmit={handleSubmit((values) => mutation.mutate(values))}
      className="space-y-4"
      aria-label={isEdit ? "Edit account" : "Add account"}
    >
      <div className="space-y-1.5">
        <Label htmlFor="acc-name">Account name</Label>
        <Input id="acc-name" placeholder="e.g. Kiwibank" {...register("name")} />
        {errors.name && (
          <p className="text-destructive text-sm">{errors.name.message}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="acc-institution">Institution (optional)</Label>
          <Input
            id="acc-institution"
            placeholder="e.g. Sharesies"
            {...register("institution")}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="acc-kind">Type</Label>
          <select
            id="acc-kind"
            {...register("kind", { onChange: (e) => setKind(e.target.value) })}
            className="border-input flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs"
          >
            <option value="ASSET">Asset</option>
            <option value="LIABILITY">Liability (debt)</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Asset class is meaningless for a liability — kept mounted (so a
            value still submits) but hidden when the account is a debt. */}
        <div className={cn("space-y-1.5", isLiability && "hidden")}>
          <Label htmlFor="acc-class">Asset class</Label>
          <select
            id="acc-class"
            {...register("assetClass")}
            className="border-input flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs"
          >
            {ASSET_CLASSES.map((c) => (
              <option key={c} value={c}>
                {ASSET_CLASS_LABELS[c]}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="acc-currency">Currency</Label>
          <select
            id="acc-currency"
            {...register("currency")}
            className="border-input flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs"
          >
            {SUPPORTED_CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.code}
              </option>
            ))}
          </select>
        </div>
      </div>

      <Button type="submit" disabled={mutation.isPending}>
        {mutation.isPending ? "Saving…" : isEdit ? "Save changes" : "Add account"}
      </Button>
      {mutation.isError && (
        <p className="text-destructive text-sm">
          Something went wrong. Please try again.
        </p>
      )}
    </form>
  );
}

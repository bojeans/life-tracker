"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  DATE_PRESETS,
  presetRange,
  type DatePreset,
  type TransactionFilter,
} from "./filters";

const TYPE_OPTIONS: {
  value: "ALL" | "INCOME" | "EXPENSE" | "TRANSFER";
  label: string;
}[] = [
  { value: "ALL", label: "All" },
  { value: "INCOME", label: "Income" },
  { value: "EXPENSE", label: "Expenses" },
  { value: "TRANSFER", label: "Transfers" },
];

export function TransactionFilters({
  value,
  onChange,
  categories,
}: {
  value: TransactionFilter;
  onChange: (next: TransactionFilter) => void;
  categories: string[];
}) {
  // Tracks which date control is active purely for chip highlighting.
  const [datePreset, setDatePreset] = useState<DatePreset | "custom">("all");

  const selectedCategory = value.categories?.[0] ?? "all";

  function applyPreset(preset: DatePreset) {
    setDatePreset(preset);
    onChange({ ...value, ...presetRange(preset) });
  }

  return (
    <div className="space-y-3 rounded-lg border p-3">
      <Input
        type="search"
        placeholder="Search category or description…"
        aria-label="Search transactions"
        value={value.search ?? ""}
        onChange={(e) => onChange({ ...value, search: e.target.value })}
      />

      <div className="flex flex-wrap items-center gap-2">
        {TYPE_OPTIONS.map((o) => (
          <FilterChip
            key={o.value}
            active={(value.type ?? "ALL") === o.value}
            onClick={() => onChange({ ...value, type: o.value })}
          >
            {o.label}
          </FilterChip>
        ))}

        <select
          aria-label="Filter by category"
          value={selectedCategory}
          onChange={(e) =>
            onChange({
              ...value,
              categories: e.target.value === "all" ? [] : [e.target.value],
            })
          }
          className="border-input ml-auto h-8 rounded-lg border bg-transparent px-2.5 text-sm"
        >
          <option value="all">All categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {DATE_PRESETS.map((p) => (
          <FilterChip
            key={p.value}
            active={datePreset === p.value}
            onClick={() => applyPreset(p.value)}
          >
            {p.label}
          </FilterChip>
        ))}
        <FilterChip
          active={datePreset === "custom"}
          onClick={() => setDatePreset("custom")}
        >
          Custom
        </FilterChip>
      </div>

      {datePreset === "custom" && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <label className="flex items-center gap-1.5">
            <span className="text-muted-foreground">From</span>
            <Input
              type="date"
              aria-label="From date"
              className="w-auto"
              value={value.from ?? ""}
              onChange={(e) =>
                onChange({ ...value, from: e.target.value || undefined })
              }
            />
          </label>
          <label className="flex items-center gap-1.5">
            <span className="text-muted-foreground">To</span>
            <Input
              type="date"
              aria-label="To date"
              className="w-auto"
              value={value.to ?? ""}
              onChange={(e) =>
                onChange({ ...value, to: e.target.value || undefined })
              }
            />
          </label>
        </div>
      )}
    </div>
  );
}

export function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1 text-sm font-medium transition-colors",
        active
          ? "bg-foreground text-background border-foreground"
          : "text-muted-foreground hover:bg-muted",
      )}
    >
      {children}
    </button>
  );
}

"use client";

import { useState } from "react";
import { PantryAdd } from "./pantry-add";
import { FoodItemForm } from "./food-item-form";
import { FoodItemList } from "./food-item-list";
import type { FoodItemDTO, FoodItemPrefill } from "./food-item-types";

export function PantryView({ initialItems }: { initialItems: FoodItemDTO[] }) {
  // A scan that needs manual completion (unmatched, or matched without
  // nutrition) — prefilled into the add form below.
  const [prefill, setPrefill] = useState<FoodItemPrefill | null>(null);

  return (
    <div className="space-y-6">
      <PantryAdd onNeedsDetails={setPrefill} />
      {/* Remount on a new prefill so the form seeds it as default values. */}
      <FoodItemForm
        key={prefill?.barcode ?? prefill?.name ?? "blank"}
        prefill={prefill ?? undefined}
      />
      <FoodItemList initialData={initialItems} />
    </div>
  );
}

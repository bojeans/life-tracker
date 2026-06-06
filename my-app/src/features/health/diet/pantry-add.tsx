"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { lookupBarcode } from "./actions";
import { saveFoodFromHit } from "./food-item-actions";
import { prefillFromHit } from "./food-item-serialize";
import { FoodSearch } from "./food-search";
import { BarcodeScanner } from "./barcode-scanner";
import { hasUsableNutrition, type FoodHit } from "./openfoodfacts";
import type { FoodItemDTO, FoodItemPrefill } from "./food-item-types";

// Builds the pantry: search or scan a product. A scan resolves against your
// LOCAL catalog first, then Open Food Facts. Anything unmatched — or matched
// but missing nutrition (very common) — is handed to the manual form,
// prefilled, so you capture it once and future scans find it instantly.
export function PantryAdd({
  onNeedsDetails,
}: {
  onNeedsDetails?: (prefill: FoodItemPrefill) => void;
}) {
  const queryClient = useQueryClient();
  const [message, setMessage] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: (hit: FoodHit) => saveFoodFromHit(hit),
    onSuccess: (item) => {
      setMessage(`Added “${item.name}” to your pantry.`);
      queryClient.invalidateQueries({ queryKey: ["foodItems"] });
    },
    onError: () => setMessage("Couldn't save that item. Please try again."),
  });

  // Saves automatically when OFF has nutrition; otherwise routes the partial
  // data to the manual form to complete.
  function handleHit(hit: FoodHit) {
    setMessage(null);
    if (hasUsableNutrition(hit)) {
      save.mutate(hit);
    } else {
      setMessage(
        `“${hit.name}” has no nutrition in Open Food Facts — add the values below.`,
      );
      onNeedsDetails?.(prefillFromHit(hit));
    }
  }

  async function handleScan(code: string) {
    setMessage(null);

    // 1. Already in your catalog? (covers items OFF doesn't have.)
    const existing = queryClient.getQueryData<FoodItemDTO[]>(["foodItems"]) ?? [];
    const local = existing.find((i) => i.barcode === code);
    if (local) {
      setMessage(`“${local.name}” is already in your pantry.`);
      return;
    }

    // 2. Try Open Food Facts.
    const hit = await lookupBarcode(code);
    if (hit) {
      handleHit(hit);
      return;
    }

    // 3. Unmatched — capture it once via the manual form below.
    setMessage(`Barcode ${code} isn't in Open Food Facts — add its details below.`);
    onNeedsDetails?.({ barcode: code });
  }

  return (
    <div className="space-y-3 rounded-lg border border-dashed p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="font-medium">Add from Open Food Facts</p>
        <BarcodeScanner onDetected={handleScan} />
      </div>
      <FoodSearch onSelect={handleHit} />
      {save.isPending && (
        <p className="text-muted-foreground text-sm">Saving…</p>
      )}
      {message && !save.isPending && <p className="text-sm">{message}</p>}
    </div>
  );
}

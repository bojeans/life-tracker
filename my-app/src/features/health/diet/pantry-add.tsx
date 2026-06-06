"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { lookupBarcode } from "./actions";
import { saveFoodFromHit } from "./food-item-actions";
import { FoodSearch } from "./food-search";
import { BarcodeScanner } from "./barcode-scanner";
import type { FoodHit } from "./openfoodfacts";

// Builds the pantry from Open Food Facts: search or scan a product, save it to
// the catalog (deduped by barcode). This is the one-time cost so future logging
// is just pick-from-catalog.
export function PantryAdd() {
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

  async function handleScan(code: string) {
    setMessage(null);
    const hit = await lookupBarcode(code);
    if (hit) {
      save.mutate(hit);
    } else {
      setMessage(`No match for barcode ${code}. Try a search or add it manually.`);
    }
  }

  return (
    <div className="space-y-3 rounded-lg border border-dashed p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="font-medium">Add from Open Food Facts</p>
        <BarcodeScanner onDetected={handleScan} />
      </div>
      <FoodSearch
        onSelect={(hit) => {
          setMessage(null);
          save.mutate(hit);
        }}
      />
      {save.isPending && (
        <p className="text-muted-foreground text-sm">Saving…</p>
      )}
      {message && !save.isPending && <p className="text-sm">{message}</p>}
    </div>
  );
}

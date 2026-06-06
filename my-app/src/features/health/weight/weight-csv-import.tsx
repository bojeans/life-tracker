"use client";

import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Upload } from "lucide-react";
import { importWeightCsv, type WeightCsvImportResult } from "./actions";
import { Button } from "@/components/ui/button";

export function WeightCsvImport() {
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [result, setResult] = useState<WeightCsvImportResult | null>(null);

  const mutation = useMutation({
    mutationFn: (text: string) => importWeightCsv(text),
    onSuccess: (res) => {
      setResult(res);
      queryClient.invalidateQueries({ queryKey: ["weightEntries"] });
    },
  });

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setResult(null);
    const text = await file.text();
    mutation.mutate(text);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="space-y-3 rounded-lg border border-dashed p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-medium">Import from CSV</p>
          <p className="text-muted-foreground text-sm">
            Columns: <code>date</code>, <code>weight</code>, and optionally{" "}
            <code>note</code>.
          </p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          onChange={onFileChange}
          className="hidden"
        />
        <Button
          type="button"
          variant="outline"
          onClick={() => inputRef.current?.click()}
          disabled={mutation.isPending}
          className="shrink-0"
        >
          <Upload className="size-4" />
          {mutation.isPending ? "Importing…" : "Choose file"}
        </Button>
      </div>

      {mutation.isError && (
        <p className="text-destructive text-sm">
          Import failed. Please check the file and try again.
        </p>
      )}

      {result && (
        <div className="text-sm">
          <p>
            Imported <strong>{result.imported}</strong>
            {result.skipped > 0 && <> · skipped {result.skipped} duplicate(s)</>}
            {result.errors.length > 0 && (
              <> · {result.errors.length} row(s) had errors</>
            )}
          </p>
          {result.errors.length > 0 && (
            <ul className="text-muted-foreground mt-1 list-inside list-disc">
              {result.errors.slice(0, 5).map((e) => (
                <li key={e.row}>
                  Row {e.row}: {e.message}
                </li>
              ))}
              {result.errors.length > 5 && (
                <li>…and {result.errors.length - 5} more</li>
              )}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

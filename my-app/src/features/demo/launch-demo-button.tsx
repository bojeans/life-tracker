"use client";

import { useTransition } from "react";
import { FlaskConical } from "lucide-react";
import { enterDemoMode } from "./actions";
import { Button } from "@/components/ui/button";

// CTA on the public shared view: drops the visitor into the real app acting as
// the demo account, with full add/edit/delete.
export function LaunchDemoButton({ shareToken }: { shareToken: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-dashed p-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="font-medium">Want to try it live?</p>
        <p className="text-muted-foreground text-sm">
          Enter the full app as this demo account and add, edit or delete data —
          changes update the dashboards in real time.
        </p>
      </div>
      <Button
        onClick={() => startTransition(() => enterDemoMode(shareToken))}
        disabled={pending}
        className="shrink-0"
      >
        <FlaskConical className="size-4" />
        {pending ? "Launching…" : "Launch interactive demo"}
      </Button>
    </div>
  );
}

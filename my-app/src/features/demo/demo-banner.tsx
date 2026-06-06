"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { FlaskConical } from "lucide-react";
import { exitDemoMode, resetDemoData } from "./actions";
import { Button } from "@/components/ui/button";

export function DemoBanner() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [pending, startTransition] = useTransition();

  function reset() {
    startTransition(async () => {
      await resetDemoData();
      // Refresh both the server components and the TanStack Query caches.
      await queryClient.invalidateQueries();
      router.refresh();
    });
  }

  function exit() {
    startTransition(async () => {
      await exitDemoMode();
    });
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200">
      <p className="flex items-center gap-2">
        <FlaskConical className="size-4 shrink-0" />
        <span>
          <strong>Demo mode</strong> — you&apos;re editing sample data in a
          shared sandbox. Changes are saved and visible to anyone with the link.
        </span>
      </p>
      <div className="flex items-center gap-2">
        <Button size="sm" variant="outline" onClick={reset} disabled={pending}>
          {pending ? "Working…" : "Reset demo data"}
        </Button>
        <Button size="sm" variant="ghost" onClick={exit} disabled={pending}>
          Exit demo
        </Button>
      </div>
    </div>
  );
}

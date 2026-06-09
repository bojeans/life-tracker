"use client";

import { useState, useSyncExternalStore, useTransition } from "react";
import { Check, Copy, Link2, RefreshCw } from "lucide-react";
import { regenerateShareToken } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// origin never changes for the life of the page, so subscribe is a no-op; this
// just reads window.location.origin on the client and "" during SSR (avoiding a
// hydration mismatch) without an effect.
const subscribeNoop = () => () => {};

export function ShareLinkCard({ initialToken }: { initialToken: string }) {
  const [token, setToken] = useState(initialToken);
  const [copied, setCopied] = useState(false);
  const [confirmingRegen, setConfirmingRegen] = useState(false);
  const [pending, startTransition] = useTransition();

  // Build the absolute URL on the client so it works on any host (localhost,
  // preview, prod) without an app-URL env var.
  const origin = useSyncExternalStore(
    subscribeNoop,
    () => window.location.origin,
    () => "",
  );
  const url = origin ? `${origin}/shared/${token}` : "";

  async function copy() {
    if (!url) return;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function regenerate() {
    startTransition(async () => {
      const next = await regenerateShareToken();
      setToken(next);
      setConfirmingRegen(false);
      setCopied(false);
    });
  }

  return (
    <div className="space-y-4 rounded-lg border p-4">
      <div className="flex items-center gap-2">
        <Link2 className="text-muted-foreground size-4" />
        <h2 className="font-semibold">Your read-only link</h2>
      </div>
      <p className="text-muted-foreground text-sm">
        Anyone with this link can view a read-only snapshot of your finances and
        health — no sign-in, and they can&apos;t edit anything. Send it to
        family you trust.
      </p>

      <div className="flex gap-2">
        <Input readOnly value={url} aria-label="Share link" />
        <Button type="button" variant="outline" onClick={copy} className="shrink-0">
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>

      <div className="border-t pt-3">
        {confirmingRegen ? (
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-muted-foreground text-sm">
              This breaks the current link for everyone you&apos;ve shared it
              with. Continue?
            </p>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={regenerate}
              disabled={pending}
            >
              {pending ? "Regenerating…" : "Yes, regenerate"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setConfirmingRegen(false)}
              disabled={pending}
            >
              Cancel
            </Button>
          </div>
        ) : (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setConfirmingRegen(true)}
          >
            <RefreshCw className="size-4" />
            Regenerate link (revoke old one)
          </Button>
        )}
      </div>
    </div>
  );
}

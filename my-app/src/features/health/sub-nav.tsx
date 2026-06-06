"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export type SubNavTab = { href: string; label: string; exact?: boolean };

// Segmented tab bar (same visual as finance-tabs), reused at both Health nav
// levels: Diet|Weight and, within each, Dashboard|Manage.
export function SubNav({ tabs }: { tabs: SubNavTab[] }) {
  const pathname = usePathname();

  return (
    <div className="bg-muted inline-flex rounded-lg p-1">
      {tabs.map((tab) => {
        const active = tab.exact
          ? pathname === tab.href
          : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "rounded-md px-4 py-1.5 text-sm font-medium transition-colors",
              active
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}

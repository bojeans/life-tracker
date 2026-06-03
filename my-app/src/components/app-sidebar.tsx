"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Wallet, HeartPulse, Plane, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/finance", label: "Finance", icon: Wallet },
  { href: "/health", label: "Health", icon: HeartPulse },
  { href: "/travel", label: "Travel", icon: Plane },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r bg-muted/30 p-4">
      <div className="px-2 py-3 text-lg font-semibold">Life Tracker</div>
      <nav className="mt-2 flex flex-1 flex-col gap-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon className="size-4" />
              {label}
            </Link>
          );
        })}
      </nav>
      <Link
        href="/auth/signout"
        className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <LogOut className="size-4" />
        Sign out
      </Link>
    </aside>
  );
}

"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import { SidebarNav } from "@/components/sidebar-nav";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      {/* Desktop sidebar */}
      <aside className="hidden w-56 shrink-0 border-r bg-muted/30 p-4 md:block">
        <SidebarNav />
      </aside>

      {/* Mobile top bar with hamburger */}
      <header className="flex items-center gap-3 border-b p-3 md:hidden">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger
            aria-label="Open menu"
            className="hover:bg-muted inline-flex size-9 items-center justify-center rounded-md transition-colors"
          >
            <Menu className="size-5" />
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-4">
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            <SidebarNav onNavigate={() => setOpen(false)} />
          </SheetContent>
        </Sheet>
        <span className="font-semibold">Life Tracker</span>
      </header>

      <main className="flex-1">{children}</main>
    </div>
  );
}

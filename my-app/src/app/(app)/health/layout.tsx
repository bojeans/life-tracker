import Link from "next/link";
import { Settings } from "lucide-react";
import { SubNav } from "@/features/health/sub-nav";

const tabs = [
  { href: "/health/diet", label: "Diet" },
  { href: "/health/exercise", label: "Exercise" },
  { href: "/health/weight", label: "Weight" },
  { href: "/health/blood-pressure", label: "Blood pressure" },
];

export default function HealthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 sm:p-8">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Link href="/health" className="text-2xl font-bold">
            Health
          </Link>
          <Link
            href="/health/profile"
            aria-label="Profile & settings"
            className="text-muted-foreground hover:bg-muted hover:text-foreground inline-flex size-9 items-center justify-center rounded-md transition-colors"
          >
            <Settings className="size-5" />
          </Link>
        </div>
        <SubNav tabs={tabs} />
      </div>
      {children}
    </div>
  );
}

import { SubNav } from "@/features/health/sub-nav";

const tabs = [
  { href: "/health", label: "Overview", exact: true },
  { href: "/health/diet", label: "Diet" },
  { href: "/health/exercise", label: "Exercise" },
  { href: "/health/weight", label: "Weight" },
  { href: "/health/blood-pressure", label: "Blood pressure" },
  { href: "/health/profile", label: "Profile" },
];

export default function HealthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 sm:p-8">
      <div className="space-y-3">
        <h1 className="text-2xl font-bold">Health</h1>
        <SubNav tabs={tabs} />
      </div>
      {children}
    </div>
  );
}

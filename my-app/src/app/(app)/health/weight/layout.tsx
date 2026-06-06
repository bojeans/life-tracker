import { SubNav } from "@/features/health/sub-nav";

const tabs = [
  { href: "/health/weight", label: "Dashboard", exact: true },
  { href: "/health/weight/manage", label: "Manage" },
];

export default function WeightLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-6">
      <SubNav tabs={tabs} />
      {children}
    </div>
  );
}

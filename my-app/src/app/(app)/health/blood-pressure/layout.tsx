import { SubNav } from "@/features/health/sub-nav";

const tabs = [
  { href: "/health/blood-pressure", label: "Dashboard", exact: true },
  { href: "/health/blood-pressure/manage", label: "Manage" },
];

export default function BloodPressureLayout({
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

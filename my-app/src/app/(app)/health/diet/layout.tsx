import { SubNav } from "@/features/health/sub-nav";

const tabs = [
  { href: "/health/diet", label: "Dashboard", exact: true },
  { href: "/health/diet/manage", label: "Manage" },
  { href: "/health/diet/pantry", label: "Pantry" },
  { href: "/health/diet/recipes", label: "Recipes" },
];

export default function DietLayout({
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

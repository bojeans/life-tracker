import { FinanceTabs } from "@/features/finance/finance-tabs";

export default function FinanceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 sm:p-8">
      <div className="space-y-3">
        <h1 className="text-2xl font-bold">Finance</h1>
        <FinanceTabs />
      </div>
      {children}
    </div>
  );
}

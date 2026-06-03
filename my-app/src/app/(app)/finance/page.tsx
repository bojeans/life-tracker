import { getTransactions } from "@/features/finance/actions";
import { TransactionForm } from "@/features/finance/transaction-form";
import { TransactionList } from "@/features/finance/transaction-list";
import { CsvImport } from "@/features/finance/csv-import";
import { FinanceDashboard } from "@/features/finance/finance-dashboard";

export default async function FinancePage() {
  const transactions = await getTransactions();

  return (
    <main className="mx-auto max-w-4xl space-y-6 p-4 sm:p-8">
      <div>
        <h1 className="text-2xl font-bold">Finance</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Track income and expenses.
        </p>
      </div>

      <FinanceDashboard initialData={transactions} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <TransactionForm />
        <CsvImport />
      </div>

      <TransactionList initialData={transactions} />
    </main>
  );
}

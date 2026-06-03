import { getTransactions } from "@/features/finance/actions";
import { TransactionForm } from "@/features/finance/transaction-form";
import { TransactionList } from "@/features/finance/transaction-list";
import { CsvImport } from "@/features/finance/csv-import";

export default async function FinanceManagePage() {
  const transactions = await getTransactions();

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <TransactionForm />
        <CsvImport />
      </div>
      <TransactionList initialData={transactions} />
    </div>
  );
}

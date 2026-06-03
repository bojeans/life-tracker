import { getTransactions } from "@/features/finance/actions";
import { TransactionForm } from "@/features/finance/transaction-form";
import { TransactionList } from "@/features/finance/transaction-list";

export default async function FinancePage() {
  const transactions = await getTransactions();

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-8">
      <div>
        <h1 className="text-2xl font-bold">Finance</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Track income and expenses.
        </p>
      </div>
      <TransactionForm />
      <TransactionList initialData={transactions} />
    </main>
  );
}

import { getTransactions } from "@/features/finance/actions";
import { FinanceDashboardView } from "@/features/finance/dashboard-view";

export default async function FinancePage() {
  const transactions = await getTransactions();

  return <FinanceDashboardView initialData={transactions} />;
}

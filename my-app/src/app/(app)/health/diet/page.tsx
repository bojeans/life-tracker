import { getDietEntries } from "@/features/health/diet/actions";
import { DietDashboardView } from "@/features/health/diet/diet-dashboard";

export default async function DietDashboardPage() {
  const entries = await getDietEntries();

  return <DietDashboardView initialData={entries} />;
}

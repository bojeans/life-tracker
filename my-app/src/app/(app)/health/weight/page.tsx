import { getWeightEntries } from "@/features/health/weight/actions";
import { WeightDashboardView } from "@/features/health/weight/weight-dashboard";

export default async function WeightDashboardPage() {
  const entries = await getWeightEntries();

  return <WeightDashboardView initialData={entries} />;
}

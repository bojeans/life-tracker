import { getBloodPressureEntries } from "@/features/health/blood-pressure/actions";
import { BloodPressureDashboardView } from "@/features/health/blood-pressure/blood-pressure-dashboard";

export default async function BloodPressureDashboardPage() {
  const entries = await getBloodPressureEntries();

  return <BloodPressureDashboardView initialData={entries} />;
}

import { getBloodPressureEntries } from "@/features/health/blood-pressure/actions";
import { BloodPressureForm } from "@/features/health/blood-pressure/blood-pressure-form";
import { BloodPressureList } from "@/features/health/blood-pressure/blood-pressure-list";

export default async function BloodPressureManagePage() {
  const entries = await getBloodPressureEntries();

  return (
    <div className="space-y-6">
      <BloodPressureForm />
      <BloodPressureList initialData={entries} />
    </div>
  );
}

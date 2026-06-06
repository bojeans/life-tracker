import { getWeightEntries } from "@/features/health/weight/actions";
import { WeightForm } from "@/features/health/weight/weight-form";
import { WeightCsvImport } from "@/features/health/weight/weight-csv-import";
import { WeightList } from "@/features/health/weight/weight-list";

export default async function WeightManagePage() {
  const entries = await getWeightEntries();

  return (
    <div className="space-y-6">
      <WeightForm />
      <WeightCsvImport />
      <WeightList initialData={entries} />
    </div>
  );
}

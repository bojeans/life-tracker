import { getDietEntries } from "@/features/health/diet/actions";
import { DietEntryForm } from "@/features/health/diet/diet-entry-form";
import { DietCsvImport } from "@/features/health/diet/diet-csv-import";
import { DietList } from "@/features/health/diet/diet-list";

export default async function DietManagePage() {
  const entries = await getDietEntries();

  return (
    <div className="space-y-6">
      <DietEntryForm />
      <DietCsvImport />
      <DietList initialData={entries} />
    </div>
  );
}

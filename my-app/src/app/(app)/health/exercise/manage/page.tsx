import { getExerciseEntries } from "@/features/health/exercise/actions";
import { getWeightEntries } from "@/features/health/weight/actions";
import { ExerciseForm } from "@/features/health/exercise/exercise-form";
import { ExerciseCsvImport } from "@/features/health/exercise/exercise-csv-import";
import { ExerciseList } from "@/features/health/exercise/exercise-list";

export default async function ExerciseManagePage() {
  const [entries, weights] = await Promise.all([
    getExerciseEntries(),
    getWeightEntries(),
  ]);
  // Latest weight (entries are date-desc) drives MET calorie auto-calculation.
  const latestWeightKg = weights[0]?.weightKg ?? null;

  return (
    <div className="space-y-6">
      <ExerciseForm latestWeightKg={latestWeightKg} />
      <ExerciseCsvImport />
      <ExerciseList initialData={entries} latestWeightKg={latestWeightKg} />
    </div>
  );
}

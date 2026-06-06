import { getExerciseEntries } from "@/features/health/exercise/actions";
import { ExerciseDashboardView } from "@/features/health/exercise/exercise-dashboard";

export default async function ExerciseDashboardPage() {
  const entries = await getExerciseEntries();

  return <ExerciseDashboardView initialData={entries} />;
}

import { getDietEntries } from "@/features/health/diet/actions";
import { getExerciseEntries } from "@/features/health/exercise/actions";
import { getWeightEntries } from "@/features/health/weight/actions";
import { getBloodPressureEntries } from "@/features/health/blood-pressure/actions";
import { getProfile } from "@/features/health/profile/actions";
import { OverviewView } from "@/features/health/overview-view";

export default async function HealthOverviewPage() {
  const [diet, exercise, weights, bloodPressure, profile] = await Promise.all([
    getDietEntries(),
    getExerciseEntries(),
    getWeightEntries(),
    getBloodPressureEntries(),
    getProfile(),
  ]);

  return (
    <OverviewView
      diet={diet}
      exercise={exercise}
      weights={weights}
      bloodPressure={bloodPressure}
      profile={profile}
    />
  );
}

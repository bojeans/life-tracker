import { db } from "@/lib/db";
import { toWeightEntryDTO } from "./weight/serialize";
import { toDietEntryDTO } from "./diet/serialize";
import { toExerciseEntryDTO } from "./exercise/serialize";
import { toProfileDTO } from "./profile/serialize";
import { toBloodPressureEntryDTO } from "./blood-pressure/serialize";
import {
  bloodPressureTrend,
  classifyBloodPressure,
  type BloodPressurePoint,
  type BloodPressureCategory,
} from "./blood-pressure/analytics";
import {
  weightTrend,
  weightChange,
  type WeightPoint,
  type WeightChange,
} from "./weight/analytics";
import { summarizeExercise, type ExerciseSummary } from "./exercise/analytics";
import { baselineTdee } from "./energy";
import {
  dailyEnergyBalance,
  summarizeBalance,
  type BalanceDay,
  type BalanceSummary,
} from "./energy-balance";

export type SharedHealth = {
  ownerName: string | null;
  hasData: boolean;
  latestWeightKg: number | null;
  weightTrend: WeightPoint[];
  weightChange: WeightChange | null;
  exercise: ExerciseSummary;
  baseline: number | null;
  balance: BalanceDay[];
  balanceSummary: BalanceSummary;
  latestBloodPressure: {
    systolic: number;
    diastolic: number;
    pulse: number | null;
  } | null;
  bloodPressureCategory: BloodPressureCategory | null;
  bloodPressureTrend: BloodPressurePoint[];
};

// Public, read-only health snapshot by share token. No auth. Returns null if the
// token is unknown. Everything is precomputed to plain values so the page can
// stay mostly server-rendered (charts get plain arrays).
export async function getSharedHealth(
  shareToken: string,
): Promise<SharedHealth | null> {
  const user = await db.user.findUnique({
    where: { shareToken },
    select: {
      name: true,
      profile: true,
      weightEntries: { orderBy: { date: "desc" } },
      dietEntries: { orderBy: { date: "desc" } },
      exerciseEntries: { orderBy: { date: "desc" } },
      bloodPressureEntries: { orderBy: { date: "desc" } },
    },
  });

  if (!user) return null;

  const weights = user.weightEntries.map(toWeightEntryDTO);
  const diet = user.dietEntries.map(toDietEntryDTO);
  const exercise = user.exerciseEntries.map(toExerciseEntryDTO);
  const bloodPressure = user.bloodPressureEntries.map(toBloodPressureEntryDTO);
  const profile = user.profile ? toProfileDTO(user.profile) : null;

  // entries are date-desc, so [0] is the most recent reading.
  const latestBp = bloodPressure[0] ?? null;

  const latestWeightKg = weights[0]?.weightKg ?? null;
  const baseline =
    profile && latestWeightKg != null
      ? baselineTdee(profile, latestWeightKg)
      : null;
  const balance =
    baseline != null ? dailyEnergyBalance(diet, exercise, baseline) : [];

  return {
    ownerName: user.name,
    hasData:
      weights.length > 0 ||
      exercise.length > 0 ||
      diet.length > 0 ||
      bloodPressure.length > 0,
    latestWeightKg,
    weightTrend: weightTrend(weights),
    weightChange: weightChange(weights),
    exercise: summarizeExercise(exercise),
    baseline,
    balance,
    balanceSummary: summarizeBalance(balance),
    latestBloodPressure: latestBp
      ? {
          systolic: latestBp.systolic,
          diastolic: latestBp.diastolic,
          pulse: latestBp.pulse,
        }
      : null,
    bloodPressureCategory: latestBp
      ? classifyBloodPressure(latestBp.systolic, latestBp.diastolic)
      : null,
    bloodPressureTrend: bloodPressureTrend(bloodPressure),
  };
}

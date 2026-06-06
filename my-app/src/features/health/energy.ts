import type { ProfileDTO } from "./profile/types";

// Multiplier applied to BMR for baseline (non-exercise) activity. Logged
// workouts are added on top, so this should reflect day-to-day movement only.
export const ACTIVITY_FACTORS: Record<ProfileDTO["activityLevel"], number> = {
  SEDENTARY: 1.2,
  LIGHT: 1.375,
  MODERATE: 1.55,
  ACTIVE: 1.725,
  VERY_ACTIVE: 1.9,
};

export const ACTIVITY_LABELS: Record<ProfileDTO["activityLevel"], string> = {
  SEDENTARY: "Sedentary (desk job, little movement)",
  LIGHT: "Lightly active",
  MODERATE: "Moderately active",
  ACTIVE: "Active",
  VERY_ACTIVE: "Very active",
};

export const SEX_LABELS: Record<ProfileDTO["sex"], string> = {
  MALE: "Male",
  FEMALE: "Female",
};

// Approximate energy in 1 kg of body mass — used to translate a calorie
// surplus/deficit into a predicted weight change.
export const KCAL_PER_KG = 7700;

export function ageFromBirthYear(birthYear: number, ref: Date = new Date()): number {
  return ref.getUTCFullYear() - birthYear;
}

// Mifflin–St Jeor BMR (kcal/day) — the current general-population standard.
export function bmrMifflinStJeor(p: {
  weightKg: number;
  heightCm: number;
  age: number;
  sex: ProfileDTO["sex"];
}): number {
  const base = 10 * p.weightKg + 6.25 * p.heightCm - 5 * p.age;
  return Math.round(base + (p.sex === "MALE" ? 5 : -161));
}

// Katch–McArdle BMR (kcal/day) — uses lean mass, more accurate when body-fat
// % is known.
export function bmrKatchMcArdle(weightKg: number, bodyFatPct: number): number {
  const lean = weightKg * (1 - bodyFatPct / 100);
  return Math.round(370 + 21.6 * lean);
}

// Best BMR for a profile at a given weight: Katch–McArdle if body-fat is known,
// otherwise Mifflin–St Jeor.
export function bmrFor(profile: ProfileDTO, weightKg: number): number {
  if (profile.bodyFatPct != null) {
    return bmrKatchMcArdle(weightKg, profile.bodyFatPct);
  }
  return bmrMifflinStJeor({
    weightKg,
    heightCm: profile.heightCm,
    age: ageFromBirthYear(profile.birthYear),
    sex: profile.sex,
  });
}

// Baseline daily burn = BMR × non-exercise activity factor. Logged workouts are
// added separately so they're not double-counted.
export function baselineTdee(profile: ProfileDTO, weightKg: number): number {
  return Math.round(bmrFor(profile, weightKg) * ACTIVITY_FACTORS[profile.activityLevel]);
}

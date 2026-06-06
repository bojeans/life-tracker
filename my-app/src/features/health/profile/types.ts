import type { SEXES, ACTIVITY_LEVELS } from "./profile-schema";

export type ProfileDTO = {
  heightCm: number;
  birthYear: number;
  sex: (typeof SEXES)[number];
  activityLevel: (typeof ACTIVITY_LEVELS)[number];
  bodyFatPct: number | null;
};

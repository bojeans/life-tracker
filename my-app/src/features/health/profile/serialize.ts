import type { ProfileDTO } from "./types";

export type ProfileRow = {
  heightCm: unknown;
  birthYear: number;
  sex: string;
  activityLevel: string;
  bodyFatPct: unknown;
};

export function toProfileDTO(row: ProfileRow): ProfileDTO {
  return {
    heightCm: Number(row.heightCm),
    birthYear: row.birthYear,
    sex: row.sex as ProfileDTO["sex"],
    activityLevel: row.activityLevel as ProfileDTO["activityLevel"],
    bodyFatPct: row.bodyFatPct == null ? null : Number(row.bodyFatPct),
  };
}

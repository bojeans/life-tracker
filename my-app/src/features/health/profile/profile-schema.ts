import { z } from "zod";

export const SEXES = ["MALE", "FEMALE"] as const;
export const ACTIVITY_LEVELS = [
  "SEDENTARY",
  "LIGHT",
  "MODERATE",
  "ACTIVE",
  "VERY_ACTIVE",
] as const;

const thisYear = new Date().getUTCFullYear();

const emptyToUndefined = (v: unknown) =>
  v === "" || v === null ? undefined : v;

export const profileSchema = z.object({
  heightCm: z.coerce
    .number({ error: "Height is required" })
    .min(50, { error: "Too short" })
    .max(260, { error: "Too tall" }),
  birthYear: z.coerce
    .number({ error: "Birth year is required" })
    .int()
    .min(1900, { error: "Invalid year" })
    .max(thisYear, { error: "Invalid year" }),
  sex: z.enum(SEXES, { error: "Select a sex" }),
  activityLevel: z.enum(ACTIVITY_LEVELS).default("LIGHT"),
  bodyFatPct: z.preprocess(
    emptyToUndefined,
    z.coerce.number().min(1).max(70).optional(),
  ),
});

export type ProfileInput = z.infer<typeof profileSchema>;

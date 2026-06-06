import { z } from "zod";

const emptyToUndefined = (v: unknown) =>
  v === "" || v === null ? undefined : v;

const optionalNumber = z.preprocess(
  emptyToUndefined,
  z.coerce.number().min(0).max(100_000).optional(),
);

export const exerciseEntrySchema = z.object({
  activity: z
    .string()
    .trim()
    .min(1, { error: "Activity is required" })
    .max(80, { error: "Activity is too long" }),
  date: z.coerce.date({ error: "A valid date is required" }),
  durationMin: optionalNumber,
  met: optionalNumber,
  caloriesBurned: z.coerce
    .number({ error: "Calories is required" })
    .min(0, { error: "Cannot be negative" })
    .max(50_000, { error: "Value is too large" }),
  steps: z.preprocess(
    emptyToUndefined,
    z.coerce.number().int().min(0).max(500_000).optional(),
  ),
  distanceKm: optionalNumber,
  note: z.preprocess(emptyToUndefined, z.string().trim().max(200).optional()),
});

export type ExerciseEntryInput = z.infer<typeof exerciseEntrySchema>;

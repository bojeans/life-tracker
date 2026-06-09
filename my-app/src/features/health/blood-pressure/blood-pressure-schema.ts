import { z } from "zod";

const emptyToUndefined = (v: unknown) =>
  v === "" || v === null ? undefined : v;

// mmHg / bpm are whole numbers. Bounds are deliberately wide — they only reject
// nonsense (typos, wrong units), not unusual-but-real readings.
const mmHg = (label: string) =>
  z.coerce
    .number({ error: `${label} is required` })
    .int({ error: `${label} must be a whole number` })
    .min(40, { error: `${label} looks too low` })
    .max(300, { error: `${label} looks too high` });

export const bloodPressureEntrySchema = z
  .object({
    date: z.coerce.date({ error: "A valid date is required" }),
    systolic: mmHg("Systolic"),
    diastolic: mmHg("Diastolic"),
    pulse: z.preprocess(
      emptyToUndefined,
      z.coerce
        .number({ error: "Pulse must be a number" })
        .int({ error: "Pulse must be a whole number" })
        .min(20, { error: "Pulse looks too low" })
        .max(300, { error: "Pulse looks too high" })
        .optional(),
    ),
    note: z.preprocess(emptyToUndefined, z.string().trim().max(200).optional()),
  })
  // Systolic (top) is the pressure during a heartbeat and is always the higher
  // of the two; a top ≤ bottom means the fields were swapped or mistyped.
  .refine((v) => v.systolic > v.diastolic, {
    error: "Systolic (top) must be higher than diastolic (bottom)",
    path: ["systolic"],
  });

export type BloodPressureEntryInput = z.infer<typeof bloodPressureEntrySchema>;

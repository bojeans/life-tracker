import { z } from "zod";

const emptyToUndefined = (v: unknown) =>
  v === "" || v === null ? undefined : v;

export const weightEntrySchema = z.object({
  date: z.coerce.date({ error: "A valid date is required" }),
  weightKg: z.coerce
    .number({ error: "Weight is required" })
    .positive({ error: "Weight must be greater than 0" })
    .max(1000, { error: "Weight is too large" }),
  note: z.preprocess(emptyToUndefined, z.string().trim().max(200).optional()),
});

export type WeightEntryInput = z.infer<typeof weightEntrySchema>;

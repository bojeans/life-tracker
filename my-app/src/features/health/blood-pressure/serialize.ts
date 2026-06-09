import type { BloodPressureEntryDTO } from "./types";

export type BloodPressureEntryRow = {
  id: string;
  date: Date;
  systolic: number;
  diastolic: number;
  pulse: number | null;
  note: string | null;
  source: string;
};

// Maps a Prisma row to a serializable DTO (Date -> ISO). systolic/diastolic/
// pulse are stored as Int, so no Decimal coercion is needed.
export function toBloodPressureEntryDTO(
  row: BloodPressureEntryRow,
): BloodPressureEntryDTO {
  return {
    id: row.id,
    date: row.date.toISOString(),
    systolic: row.systolic,
    diastolic: row.diastolic,
    pulse: row.pulse,
    note: row.note,
    source: row.source,
  };
}

import type { WeightEntryDTO } from "./types";

export type WeightEntryRow = {
  id: string;
  date: Date;
  weightKg: unknown;
  note: string | null;
  source: string;
};

// Maps a Prisma row to a serializable DTO (Decimal -> number, Date -> ISO).
export function toWeightEntryDTO(row: WeightEntryRow): WeightEntryDTO {
  return {
    id: row.id,
    date: row.date.toISOString(),
    weightKg: Number(row.weightKg),
    note: row.note,
    source: row.source,
  };
}

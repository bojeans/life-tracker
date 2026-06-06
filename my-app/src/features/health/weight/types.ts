export type WeightEntryDTO = {
  id: string;
  date: string; // ISO 8601
  weightKg: number;
  note: string | null;
  source: string;
};

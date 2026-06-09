export type BloodPressureEntryDTO = {
  id: string;
  date: string; // ISO 8601
  systolic: number;
  diastolic: number;
  pulse: number | null;
  note: string | null;
  source: string;
};

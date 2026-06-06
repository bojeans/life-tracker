export type ExerciseEntryDTO = {
  id: string;
  activity: string;
  date: string; // ISO 8601
  durationMin: number | null;
  met: number | null;
  caloriesBurned: number;
  steps: number | null;
  distanceKm: number | null;
  note: string | null;
  source: string;
};

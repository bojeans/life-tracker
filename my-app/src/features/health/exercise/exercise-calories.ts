// MET (Metabolic Equivalent of Task) values for common activities, from the
// Compendium of Physical Activities. calories ≈ MET × bodyweight(kg) × hours.

export type MetActivity = { name: string; met: number };

export const MET_ACTIVITIES: MetActivity[] = [
  { name: "Walking (moderate)", met: 3.5 },
  { name: "Walking (brisk)", met: 4.3 },
  { name: "Hiking", met: 6.0 },
  { name: "Running (8 km/h)", met: 8.3 },
  { name: "Running (10 km/h)", met: 9.8 },
  { name: "Running (12 km/h)", met: 11.5 },
  { name: "Cycling (leisure)", met: 6.8 },
  { name: "Cycling (vigorous)", met: 10.0 },
  { name: "Swimming", met: 7.0 },
  { name: "Rowing", met: 7.0 },
  { name: "Elliptical", met: 5.0 },
  { name: "Strength training", met: 5.0 },
  { name: "HIIT", met: 8.0 },
  { name: "Yoga", met: 2.5 },
  { name: "Pilates", met: 3.0 },
  { name: "Football", met: 7.0 },
  { name: "Basketball", met: 6.5 },
  { name: "Tennis", met: 7.3 },
];

export const metFor = (activity: string): number | undefined =>
  MET_ACTIVITIES.find((a) => a.name === activity)?.met;

// Estimated calories burned for a MET activity at a bodyweight and duration.
export function caloriesBurned(
  met: number,
  weightKg: number,
  durationMin: number,
): number {
  return Math.round(met * weightKg * (durationMin / 60));
}

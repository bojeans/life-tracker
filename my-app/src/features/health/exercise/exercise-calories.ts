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

// ── Cardio: derive intensity from pace ───────────────────────────────────────
// Walking/jogging/running share one continuum, so we read the MET straight off
// the speed (km/h) rather than asking for an activity. Bands follow the
// Compendium of Physical Activities.
function paceBand(speedKmh: number): { kind: string; met: number } {
  if (speedKmh < 5.5) return { kind: "Walk", met: 3.5 };
  if (speedKmh < 6.5) return { kind: "Walk", met: 4.3 }; // brisk
  if (speedKmh < 8.0) return { kind: "Jog", met: 7.0 };
  if (speedKmh < 9.7) return { kind: "Run", met: 8.3 };
  if (speedKmh < 11.3) return { kind: "Run", met: 9.8 };
  return { kind: "Run", met: 11.5 };
}

export type CardioEstimate = {
  activity: string; // e.g. "Run (9.8 km/h)"
  met: number;
  speedKmh: number;
};

// Classifies a cardio session from distance + duration into a labelled MET
// estimate. Null if either input is missing/zero (can't infer a pace).
export function classifyCardio(
  distanceKm: number,
  durationMin: number,
): CardioEstimate | null {
  if (!(distanceKm > 0) || !(durationMin > 0)) return null;
  const speedKmh = distanceKm / (durationMin / 60);
  const { kind, met } = paceBand(speedKmh);
  const rounded = Math.round(speedKmh * 10) / 10;
  return { activity: `${kind} (${rounded} km/h)`, met, speedKmh: rounded };
}

// ── Strength: intensity → MET ────────────────────────────────────────────────
export const STRENGTH_INTENSITIES = [
  { value: "light", label: "Light", met: 3.5 },
  { value: "moderate", label: "Moderate", met: 5.0 },
  { value: "vigorous", label: "Vigorous", met: 6.0 },
] as const;

export type StrengthIntensity = (typeof STRENGTH_INTENSITIES)[number]["value"];

export const metForIntensity = (intensity: StrengthIntensity): number =>
  STRENGTH_INTENSITIES.find((i) => i.value === intensity)?.met ?? 5.0;

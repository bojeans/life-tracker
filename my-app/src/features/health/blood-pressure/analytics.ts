import type { BloodPressureEntryDTO } from "./types";

export type BloodPressurePoint = {
  date: string; // "YYYY-MM-DD"
  label: string; // "1 Jun"
  systolic: number;
  diastolic: number;
  pulse: number | null;
};

// American Heart Association categories, ordered from lowest to highest risk.
// `key` drives styling; `range` is human-readable for the legend/labels.
export type BloodPressureCategoryKey =
  | "low"
  | "normal"
  | "elevated"
  | "stage1"
  | "stage2"
  | "crisis";

export type BloodPressureCategory = {
  key: BloodPressureCategoryKey;
  label: string;
  advice: string;
};

const CATEGORIES: Record<BloodPressureCategoryKey, BloodPressureCategory> = {
  low: {
    key: "low",
    label: "Low",
    advice: "Below the typical range — worth a mention if you feel faint.",
  },
  normal: {
    key: "normal",
    label: "Normal",
    advice: "Within the healthy range. Keep it up.",
  },
  elevated: {
    key: "elevated",
    label: "Elevated",
    advice: "Slightly above ideal. Lifestyle changes can keep it from rising.",
  },
  stage1: {
    key: "stage1",
    label: "Hypertension stage 1",
    advice: "Consider discussing with your doctor.",
  },
  stage2: {
    key: "stage2",
    label: "Hypertension stage 2",
    advice: "Worth raising with your doctor.",
  },
  crisis: {
    key: "crisis",
    label: "Hypertensive crisis",
    advice: "Very high — seek medical advice, especially if you feel unwell.",
  },
};

// Classify a single reading by AHA thresholds. Higher-risk bands take
// precedence, and a reading qualifies on whichever of systolic/diastolic is
// worse — so it's evaluated from the top (crisis) down.
export function classifyBloodPressure(
  systolic: number,
  diastolic: number,
): BloodPressureCategory {
  if (systolic > 180 || diastolic > 120) return CATEGORIES.crisis;
  if (systolic >= 140 || diastolic >= 90) return CATEGORIES.stage2;
  if (systolic >= 130 || diastolic >= 80) return CATEGORIES.stage1;
  if (systolic >= 120) return CATEGORIES.elevated;
  if (systolic < 90 || diastolic < 60) return CATEGORIES.low;
  return CATEGORIES.normal;
}

function formatDayLabel(day: string): string {
  return new Date(`${day}T00:00:00.000Z`).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

// Sorted oldest-first points for the trend chart.
export function bloodPressureTrend(
  entries: BloodPressureEntryDTO[],
): BloodPressurePoint[] {
  return [...entries]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((e) => ({
      date: e.date.slice(0, 10),
      label: formatDayLabel(e.date.slice(0, 10)),
      systolic: e.systolic,
      diastolic: e.diastolic,
      pulse: e.pulse,
    }));
}

export type BloodPressureAverages = {
  systolic: number; // rounded mean
  diastolic: number;
  pulse: number | null; // mean of readings that recorded a pulse
  count: number;
};

// Mean systolic/diastolic across all readings (pulse averaged only over the
// readings that have one). Null when there are no entries.
export function bloodPressureAverages(
  entries: BloodPressureEntryDTO[],
): BloodPressureAverages | null {
  if (entries.length === 0) return null;

  const sum = entries.reduce(
    (acc, e) => ({
      systolic: acc.systolic + e.systolic,
      diastolic: acc.diastolic + e.diastolic,
    }),
    { systolic: 0, diastolic: 0 },
  );

  const pulses = entries.filter((e) => e.pulse != null);
  const pulseAvg =
    pulses.length > 0
      ? Math.round(
          pulses.reduce((acc, e) => acc + (e.pulse as number), 0) /
            pulses.length,
        )
      : null;

  return {
    systolic: Math.round(sum.systolic / entries.length),
    diastolic: Math.round(sum.diastolic / entries.length),
    pulse: pulseAvg,
    count: entries.length,
  };
}

import { describe, it, expect } from "vitest";
import {
  bmrMifflinStJeor,
  bmrKatchMcArdle,
  bmrFor,
  baselineTdee,
  ageFromBirthYear,
} from "./energy";
import type { ProfileDTO } from "./profile/types";

describe("ageFromBirthYear", () => {
  it("computes age from the reference year", () => {
    expect(ageFromBirthYear(1990, new Date("2026-06-06T00:00:00Z"))).toBe(36);
  });
});

describe("bmrMifflinStJeor", () => {
  it("matches the formula for male and female", () => {
    // male: 10*80 + 6.25*180 - 5*30 + 5 = 1780
    expect(bmrMifflinStJeor({ weightKg: 80, heightCm: 180, age: 30, sex: "MALE" })).toBe(1780);
    // female: ...- 161 = 1614
    expect(bmrMifflinStJeor({ weightKg: 80, heightCm: 180, age: 30, sex: "FEMALE" })).toBe(1614);
  });
});

describe("bmrKatchMcArdle", () => {
  it("uses lean mass", () => {
    // 80kg @ 20% bf → lean 64 → 370 + 21.6*64 = 1752.4 → 1752
    expect(bmrKatchMcArdle(80, 20)).toBe(1752);
  });
});

const profile: ProfileDTO = {
  heightCm: 180,
  birthYear: 1996,
  sex: "MALE",
  activityLevel: "LIGHT",
  bodyFatPct: null,
};

describe("bmrFor / baselineTdee", () => {
  it("uses Katch–McArdle when body fat is known, else Mifflin", () => {
    expect(bmrFor({ ...profile, bodyFatPct: 20 }, 80)).toBe(1752);
    // Mifflin path uses age from birthYear — just assert it's a sane number.
    expect(bmrFor(profile, 80)).toBeGreaterThan(1500);
  });

  it("baseline = BMR × activity factor (LIGHT = 1.375)", () => {
    const bmr = bmrFor({ ...profile, bodyFatPct: 20 }, 80); // 1752
    expect(baselineTdee({ ...profile, bodyFatPct: 20 }, 80)).toBe(Math.round(bmr * 1.375));
  });
});

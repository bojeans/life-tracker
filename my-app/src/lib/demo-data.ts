import type { PrismaClient } from "@/generated/prisma/client";

// Demo dataset + loader, shared by the seed script and the in-app "Reset demo
// data" action so both stay in sync.

const daysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(12, 0, 0, 0);
  return d;
};

// UTC midnight — matches how the app stores health dates.
const daysAgoUtc = (n: number) => {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - n);
  return d;
};

const demoTransactions = [
  { type: "INCOME", amount: 5200, category: "Salary", description: "Monthly pay", daysAgo: 28 },
  { type: "INCOME", amount: 5200, category: "Salary", description: "Monthly pay", daysAgo: 0 },
  { type: "INCOME", amount: 320.5, category: "Dividends", description: "ETF distribution", daysAgo: 14 },
  { type: "EXPENSE", amount: 1850, category: "Rent", description: "Apartment", daysAgo: 27 },
  { type: "EXPENSE", amount: 1850, category: "Rent", description: "Apartment", daysAgo: 1 },
  { type: "EXPENSE", amount: 142.3, category: "Groceries", description: "Weekly shop", daysAgo: 25 },
  { type: "EXPENSE", amount: 98.75, category: "Groceries", description: "Weekly shop", daysAgo: 18 },
  { type: "EXPENSE", amount: 121.4, category: "Groceries", description: "Weekly shop", daysAgo: 4 },
  { type: "EXPENSE", amount: 64.0, category: "Transport", description: "Fuel", daysAgo: 20 },
  { type: "EXPENSE", amount: 18.5, category: "Dining", description: "Lunch", daysAgo: 12 },
  { type: "EXPENSE", amount: 56.8, category: "Dining", description: "Dinner out", daysAgo: 6 },
  { type: "EXPENSE", amount: 22.99, category: "Subscriptions", description: "Streaming", daysAgo: 10 },
  { type: "EXPENSE", amount: 240, category: "Utilities", description: "Electricity", daysAgo: 9 },
  // Own-account move (bank → Sharesies): a TRANSFER, so it's excluded from
  // income/expense and shown separately.
  { type: "TRANSFER", amount: 600, category: "To Sharesies", description: "Investing", daysAgo: 26 },
  { type: "TRANSFER", amount: 600, category: "To Sharesies", description: "Investing", daysAgo: 2 },
] as const;

const demoWeights = [
  { daysAgo: 28, weightKg: 84.2 },
  { daysAgo: 24, weightKg: 84.0 },
  { daysAgo: 21, weightKg: 83.6 },
  { daysAgo: 17, weightKg: 83.1 },
  { daysAgo: 14, weightKg: 82.7 },
  { daysAgo: 10, weightKg: 82.4 },
  { daysAgo: 7, weightKg: 82.0 },
  { daysAgo: 3, weightKg: 81.6 },
  { daysAgo: 0, weightKg: 81.4 },
];

// Readings trend down over the month (alongside the weight loss), moving from
// AHA "stage 1" → "elevated" → "normal" so the category badges show variety.
const demoBloodPressure = [
  { daysAgo: 28, systolic: 138, diastolic: 88, pulse: 72 },
  { daysAgo: 24, systolic: 135, diastolic: 86, pulse: 70 },
  { daysAgo: 21, systolic: 132, diastolic: 84, pulse: 71 },
  { daysAgo: 17, systolic: 130, diastolic: 83, pulse: 68 },
  { daysAgo: 14, systolic: 127, diastolic: 79, pulse: 67 },
  { daysAgo: 10, systolic: 124, diastolic: 78, pulse: 66 },
  { daysAgo: 7, systolic: 122, diastolic: 77, pulse: 65 },
  { daysAgo: 3, systolic: 119, diastolic: 76, pulse: 64 },
  { daysAgo: 0, systolic: 118, diastolic: 75, pulse: 63 },
];

const demoDietTotals = [
  { daysAgo: 7, calories: 2180, protein: 165, carbs: 190, fat: 70 },
  { daysAgo: 6, calories: 2240, protein: 150, carbs: 210, fat: 78 },
  { daysAgo: 5, calories: 1980, protein: 170, carbs: 150, fat: 65 },
  { daysAgo: 4, calories: 2310, protein: 158, carbs: 220, fat: 80 },
  { daysAgo: 3, calories: 2050, protein: 175, carbs: 160, fat: 68 },
  { daysAgo: 2, calories: 2120, protein: 162, carbs: 185, fat: 72 },
  { daysAgo: 1, calories: 1990, protein: 168, carbs: 158, fat: 64 },
  { daysAgo: 0, calories: 2200, protein: 160, carbs: 200, fat: 74 },
];

const demoExercise = [
  { daysAgo: 7, activity: "Running (10 km/h)", durationMin: 40, met: 9.8, caloriesBurned: 536, steps: 6200 },
  { daysAgo: 6, activity: "Strength training", durationMin: 45, met: 5.0, caloriesBurned: 308, steps: null },
  { daysAgo: 4, activity: "Cycling (leisure)", durationMin: 60, met: 6.8, caloriesBurned: 558, steps: null },
  { daysAgo: 3, activity: "Walking (brisk)", durationMin: 50, met: 4.3, caloriesBurned: 294, steps: 7100 },
  { daysAgo: 1, activity: "HIIT", durationMin: 30, met: 8.0, caloriesBurned: 328, steps: null },
  { daysAgo: 0, activity: "Strength training", durationMin: 50, met: 5.0, caloriesBurned: 342, steps: null },
];

const demoFoodItems = [
  { name: "Chicken breast", brand: null, category: "Meat", calories: 165, protein: 31, carbs: 0, fat: 3.6, fiber: null, sugar: null },
  { name: "Rolled oats", brand: null, category: "Grains", calories: 379, protein: 13, carbs: 67, fat: 7, fiber: 10, sugar: null },
  { name: "Greek yoghurt", brand: "Chobani", category: "Dairy", calories: 97, protein: 9, carbs: 4, fat: 5, fiber: null, sugar: 4 },
  { name: "Banana", brand: null, category: "Fruit", calories: 89, protein: 1.1, carbs: 23, fat: 0.3, fiber: 2.6, sugar: 12 },
  { name: "Almonds", brand: null, category: "Nuts", calories: 579, protein: 21, carbs: 22, fat: 50, fiber: 12, sugar: null },
  { name: "Brown rice (cooked)", brand: null, category: "Grains", calories: 123, protein: 2.7, carbs: 26, fat: 1, fiber: 1.8, sugar: null },
];

// Net-worth accounts with a few monthly balance snapshots (oldest → newest),
// showing wealth trending up across cash, shares, super and crypto.
const demoNetWorth = [
  { name: "Kiwibank", institution: "Kiwibank", assetClass: "CASH" as const, currency: "NZD", balances: [7800, 8200, 8600, 9000] },
  { name: "Sharesies", institution: "Sharesies", assetClass: "SHARES" as const, currency: "NZD", balances: [14000, 15200, 16100, 17400] },
  { name: "KiwiSaver", institution: "Sharesies", assetClass: "SUPER" as const, currency: "NZD", balances: [31000, 32200, 33100, 34500] },
  { name: "crypto.com", institution: "crypto.com", assetClass: "CRYPTO" as const, currency: "NZD", balances: [3200, 2900, 3600, 4100] },
  { name: "CBA", institution: "Commonwealth Bank", assetClass: "CASH" as const, currency: "AUD", balances: [2200, 2000, 2500, 2300] },
];
const SNAPSHOT_DAYS_AGO = [90, 60, 30, 0];

export const DEMO_COUNTS = {
  transactions: demoTransactions.length,
  accounts: demoNetWorth.length,
  weights: demoWeights.length,
  bloodPressure: demoBloodPressure.length,
  dietDays: demoDietTotals.length,
  workouts: demoExercise.length,
  pantry: demoFoodItems.length,
};

// Wipes and reinserts the demo user's data. Idempotent — safe to call on every
// seed and from the in-app reset button.
export async function seedDemoData(db: PrismaClient, userId: string) {
  await db.transaction.deleteMany({ where: { userId } });
  await db.wealthAccount.deleteMany({ where: { userId } }); // snapshots cascade
  await db.weightEntry.deleteMany({ where: { userId } });
  await db.bloodPressureEntry.deleteMany({ where: { userId } });
  await db.dietEntry.deleteMany({ where: { userId } });
  await db.exerciseEntry.deleteMany({ where: { userId } });
  await db.foodItem.deleteMany({ where: { userId } });

  await db.transaction.createMany({
    data: demoTransactions.map((t) => ({
      userId,
      type: t.type,
      amount: t.amount,
      currency: "NZD",
      category: t.category,
      description: t.description ?? null,
      date: daysAgo(t.daysAgo),
      source: "MANUAL" as const,
    })),
  });

  await db.profile.upsert({
    where: { userId },
    update: { heightCm: 178, birthYear: 1992, sex: "MALE", activityLevel: "LIGHT", bodyFatPct: 18 },
    create: { userId, heightCm: 178, birthYear: 1992, sex: "MALE", activityLevel: "LIGHT", bodyFatPct: 18 },
  });

  await db.weightEntry.createMany({
    data: demoWeights.map((w) => ({
      userId,
      date: daysAgoUtc(w.daysAgo),
      weightKg: w.weightKg,
      source: "MANUAL" as const,
    })),
  });

  await db.bloodPressureEntry.createMany({
    data: demoBloodPressure.map((bp) => ({
      userId,
      date: daysAgoUtc(bp.daysAgo),
      systolic: bp.systolic,
      diastolic: bp.diastolic,
      pulse: bp.pulse,
      source: "MANUAL" as const,
    })),
  });

  await db.dietEntry.createMany({
    data: demoDietTotals.map((d) => ({
      userId,
      name: "Daily total",
      date: daysAgoUtc(d.daysAgo),
      isDailyTotal: true,
      calories: d.calories,
      protein: d.protein,
      carbs: d.carbs,
      fat: d.fat,
      source: "MANUAL" as const,
    })),
  });

  await db.exerciseEntry.createMany({
    data: demoExercise.map((e) => ({
      userId,
      activity: e.activity,
      date: daysAgoUtc(e.daysAgo),
      durationMin: e.durationMin,
      met: e.met,
      caloriesBurned: e.caloriesBurned,
      steps: e.steps,
      source: "MANUAL" as const,
    })),
  });

  await db.foodItem.createMany({
    data: demoFoodItems.map((f) => ({
      userId,
      name: f.name,
      brand: f.brand,
      category: f.category,
      calories: f.calories,
      protein: f.protein,
      carbs: f.carbs,
      fat: f.fat,
      fiber: f.fiber,
      sugar: f.sugar,
      source: "MANUAL" as const,
    })),
  });

  // Accounts + their balance snapshots (nested create so each snapshot links to
  // its new account id).
  for (const acc of demoNetWorth) {
    await db.wealthAccount.create({
      data: {
        userId,
        name: acc.name,
        institution: acc.institution,
        assetClass: acc.assetClass,
        currency: acc.currency,
        snapshots: {
          create: acc.balances.map((balance, i) => ({
            userId,
            date: daysAgoUtc(SNAPSHOT_DAYS_AGO[i]),
            balance,
          })),
        },
      },
    });
  }
}

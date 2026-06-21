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

// Roughly a month, in days — used to space recurring entries across the year so
// the demo dashboards (monthly bars, savings rate, net-worth trend) have a full
// 12 months to plot rather than a single cluster.
const MONTH_DAYS = 30;

type DemoTxn = {
  type: "INCOME" | "EXPENSE" | "TRANSFER";
  amount: number;
  category: string;
  description?: string;
  daysAgo: number;
};

// A year of demo transactions: twelve months of recurring cashflow plus some
// scattered variable spend and one-off income. Pay is recorded gross, with
// PAYE/student-loan as deductions and KiwiSaver as a transfer to wealth — so the
// dashboard can show effective tax + savings rate. The own-account move to
// Sharesies is a TRANSFER (excluded from income/expense, shown separately).
function buildDemoTransactions(): DemoTxn[] {
  const txns: DemoTxn[] = [];
  for (let m = 11; m >= 0; m--) {
    const payday = m * MONTH_DAYS;
    txns.push(
      { type: "INCOME", amount: 6800, category: "Salary", description: "Gross pay", daysAgo: payday },
      { type: "EXPENSE", amount: 1300, category: "Tax", description: "PAYE", daysAgo: payday },
      { type: "EXPENSE", amount: 480, category: "Student loan", description: "Repayment", daysAgo: payday },
      { type: "TRANSFER", amount: 204, category: "KiwiSaver", description: "3% contribution", daysAgo: payday },
      { type: "EXPENSE", amount: 1850, category: "Rent", description: "Apartment", daysAgo: payday + 1 },
      { type: "TRANSFER", amount: 600, category: "To Sharesies", description: "Investing", daysAgo: payday + 3 },
      { type: "EXPENSE", amount: 22.99, category: "Subscriptions", description: "Streaming", daysAgo: payday + 6 },
    );
  }

  const extras: DemoTxn[] = [
    { type: "EXPENSE", amount: 142.3, category: "Groceries", description: "Weekly shop", daysAgo: 4 },
    { type: "EXPENSE", amount: 98.75, category: "Groceries", description: "Weekly shop", daysAgo: 18 },
    { type: "EXPENSE", amount: 121.4, category: "Groceries", description: "Weekly shop", daysAgo: 47 },
    { type: "EXPENSE", amount: 134.1, category: "Groceries", description: "Weekly shop", daysAgo: 88 },
    { type: "EXPENSE", amount: 64.0, category: "Transport", description: "Fuel", daysAgo: 20 },
    { type: "EXPENSE", amount: 72.5, category: "Transport", description: "Fuel", daysAgo: 110 },
    { type: "EXPENSE", amount: 56.8, category: "Dining", description: "Dinner out", daysAgo: 6 },
    { type: "EXPENSE", amount: 41.2, category: "Dining", description: "Lunch", daysAgo: 73 },
    { type: "EXPENSE", amount: 240, category: "Utilities", description: "Electricity", daysAgo: 9 },
    { type: "EXPENSE", amount: 215, category: "Utilities", description: "Electricity", daysAgo: 99 },
    { type: "INCOME", amount: 320.5, category: "Dividends", description: "ETF distribution", daysAgo: 30 },
    { type: "INCOME", amount: 298.4, category: "Dividends", description: "ETF distribution", daysAgo: 120 },
    { type: "INCOME", amount: 410.0, category: "Dividends", description: "ETF distribution", daysAgo: 210 },
    { type: "INCOME", amount: 1500, category: "Bonus", description: "Performance bonus", daysAgo: 150 },
  ];

  return [...txns, ...extras];
}

const demoTransactions = buildDemoTransactions();

// Monthly weigh-ins across the year, trending down then levelling off — enough
// points for a proper trend line.
const demoWeights = [
  { daysAgo: 330, weightKg: 89.5 },
  { daysAgo: 300, weightKg: 88.6 },
  { daysAgo: 270, weightKg: 87.4 },
  { daysAgo: 240, weightKg: 86.9 },
  { daysAgo: 210, weightKg: 86.0 },
  { daysAgo: 180, weightKg: 85.2 },
  { daysAgo: 150, weightKg: 84.3 },
  { daysAgo: 120, weightKg: 83.6 },
  { daysAgo: 90, weightKg: 83.0 },
  { daysAgo: 60, weightKg: 82.3 },
  { daysAgo: 30, weightKg: 81.7 },
  { daysAgo: 0, weightKg: 81.4 },
];

// Monthly readings trend down over the year (alongside the weight loss), moving
// from AHA "stage 2" → "stage 1" → "elevated" → "normal" so the category badges
// show variety.
const demoBloodPressure = [
  { daysAgo: 330, systolic: 142, diastolic: 91, pulse: 75 },
  { daysAgo: 300, systolic: 140, diastolic: 90, pulse: 74 },
  { daysAgo: 270, systolic: 138, diastolic: 88, pulse: 73 },
  { daysAgo: 240, systolic: 136, diastolic: 87, pulse: 72 },
  { daysAgo: 210, systolic: 133, diastolic: 85, pulse: 71 },
  { daysAgo: 180, systolic: 131, diastolic: 84, pulse: 70 },
  { daysAgo: 150, systolic: 129, diastolic: 82, pulse: 69 },
  { daysAgo: 120, systolic: 127, diastolic: 81, pulse: 68 },
  { daysAgo: 90, systolic: 124, diastolic: 79, pulse: 67 },
  { daysAgo: 60, systolic: 122, diastolic: 78, pulse: 66 },
  { daysAgo: 30, systolic: 120, diastolic: 77, pulse: 65 },
  { daysAgo: 0, systolic: 118, diastolic: 75, pulse: 64 },
];

// Diet and exercise are daily logs, so the demo keeps them as a recent ~2-week
// block (the energy-balance chart pairs intake vs burn day-by-day). The trend
// charts that span the full year are weight, blood pressure, finance and net
// worth above/below.
const demoDietTotals = [
  { daysAgo: 9, calories: 2180, protein: 165, carbs: 190, fat: 70 },
  { daysAgo: 8, calories: 2240, protein: 150, carbs: 210, fat: 78 },
  { daysAgo: 7, calories: 1980, protein: 170, carbs: 150, fat: 65 },
  { daysAgo: 6, calories: 2310, protein: 158, carbs: 220, fat: 80 },
  { daysAgo: 5, calories: 2050, protein: 175, carbs: 160, fat: 68 },
  { daysAgo: 4, calories: 2120, protein: 162, carbs: 185, fat: 72 },
  { daysAgo: 3, calories: 1990, protein: 168, carbs: 158, fat: 64 },
  { daysAgo: 2, calories: 2260, protein: 155, carbs: 205, fat: 76 },
  { daysAgo: 1, calories: 2040, protein: 172, carbs: 162, fat: 66 },
  { daysAgo: 0, calories: 2200, protein: 160, carbs: 200, fat: 74 },
];

const demoExercise = [
  { daysAgo: 13, activity: "Running (10 km/h)", durationMin: 38, met: 9.8, caloriesBurned: 510, steps: 5900 },
  { daysAgo: 11, activity: "Strength training", durationMin: 45, met: 5.0, caloriesBurned: 308, steps: null },
  { daysAgo: 10, activity: "Cycling (leisure)", durationMin: 55, met: 6.8, caloriesBurned: 512, steps: null },
  { daysAgo: 8, activity: "Walking (brisk)", durationMin: 50, met: 4.3, caloriesBurned: 294, steps: 7100 },
  { daysAgo: 7, activity: "Running (10 km/h)", durationMin: 40, met: 9.8, caloriesBurned: 536, steps: 6200 },
  { daysAgo: 5, activity: "HIIT", durationMin: 30, met: 8.0, caloriesBurned: 328, steps: null },
  { daysAgo: 4, activity: "Strength training", durationMin: 48, met: 5.0, caloriesBurned: 330, steps: null },
  { daysAgo: 3, activity: "Swimming (laps)", durationMin: 35, met: 7.0, caloriesBurned: 360, steps: null },
  { daysAgo: 1, activity: "Cycling (leisure)", durationMin: 60, met: 6.8, caloriesBurned: 558, steps: null },
  { daysAgo: 0, activity: "Strength training", durationMin: 50, met: 5.0, caloriesBurned: 342, steps: null },
];

const demoFoodItems = [
  { name: "Chicken breast", brand: null, category: "Meat", calories: 165, protein: 31, carbs: 0, fat: 3.6, fiber: null, sugar: null },
  { name: "Rolled oats", brand: null, category: "Grains", calories: 379, protein: 13, carbs: 67, fat: 7, fiber: 10, sugar: null },
  { name: "Greek yoghurt", brand: "Chobani", category: "Dairy", calories: 97, protein: 9, carbs: 4, fat: 5, fiber: null, sugar: 4 },
  { name: "Banana", brand: null, category: "Fruit", calories: 89, protein: 1.1, carbs: 23, fat: 0.3, fiber: 2.6, sugar: 12 },
  { name: "Almonds", brand: null, category: "Nuts", calories: 579, protein: 21, carbs: 22, fat: 50, fiber: 12, sugar: null },
  { name: "Brown rice (cooked)", brand: null, category: "Grains", calories: 123, protein: 2.7, carbs: 26, fat: 1, fiber: 1.8, sugar: null },
  { name: "Eggs", brand: null, category: "Dairy", calories: 143, protein: 13, carbs: 1.1, fat: 9.5, fiber: null, sugar: null },
  { name: "Salmon fillet", brand: null, category: "Seafood", calories: 208, protein: 20, carbs: 0, fat: 13, fiber: null, sugar: null },
  { name: "Broccoli", brand: null, category: "Vegetables", calories: 34, protein: 2.8, carbs: 7, fat: 0.4, fiber: 2.6, sugar: 1.7 },
  { name: "Olive oil", brand: null, category: "Oils", calories: 884, protein: 0, carbs: 0, fat: 100, fiber: null, sugar: null },
];

// Net-worth accounts with twelve monthly balance snapshots each (oldest →
// newest), showing wealth trending up across cash, shares, super and crypto
// while the student loan is paid down — a full year for the over-time chart.
const demoNetWorth = [
  { name: "Kiwibank", institution: "Kiwibank", kind: "ASSET" as const, assetClass: "CASH" as const, currency: "NZD", balances: [6500, 6800, 7100, 6900, 7400, 7800, 8100, 8400, 8200, 8700, 9100, 9400] },
  { name: "Sharesies", institution: "Sharesies", kind: "ASSET" as const, assetClass: "SHARES" as const, currency: "NZD", balances: [10800, 11300, 11900, 12600, 13100, 13900, 14600, 15200, 15000, 16100, 16900, 17400] },
  { name: "KiwiSaver", institution: "Sharesies", kind: "ASSET" as const, assetClass: "SUPER" as const, currency: "NZD", balances: [28800, 29400, 30000, 30700, 31300, 31900, 32500, 33100, 33700, 34300, 34900, 35500] },
  { name: "crypto.com", institution: "crypto.com", kind: "ASSET" as const, assetClass: "CRYPTO" as const, currency: "NZD", balances: [2400, 2900, 2600, 3200, 2800, 3500, 3100, 3700, 3300, 3900, 3600, 4100] },
  { name: "CBA", institution: "Commonwealth Bank", kind: "ASSET" as const, assetClass: "CASH" as const, currency: "AUD", balances: [1700, 1800, 1900, 2000, 1950, 2100, 2050, 2200, 2150, 2250, 2300, 2350] },
  // A liability — the balance owed shrinks ~$480/month as it's paid down,
  // matching the student-loan repayments in the transaction list.
  { name: "Student loan", institution: "IRD", kind: "LIABILITY" as const, assetClass: "CASH" as const, currency: "NZD", balances: [10560, 10080, 9600, 9120, 8640, 8160, 7680, 7200, 6720, 6240, 5760, 5280] },
];
const SNAPSHOT_DAYS_AGO = [330, 300, 270, 240, 210, 180, 150, 120, 90, 60, 30, 0];

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
        kind: acc.kind,
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

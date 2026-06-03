import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";

const db = new PrismaClient();

// Relative dates so the demo always looks recent.
const daysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(12, 0, 0, 0);
  return d;
};

type SeedTxn = {
  type: "INCOME" | "EXPENSE";
  amount: number;
  category: string;
  description?: string;
  daysAgo: number;
};

const demoTransactions: SeedTxn[] = [
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
];

async function main() {
  const demo = await db.user.upsert({
    where: { email: "demo@life-tracker.dev" },
    update: { name: "Alex Demo" },
    create: {
      email: "demo@life-tracker.dev",
      name: "Alex Demo",
      shareToken: "demo-recruiter-view",
    },
  });

  // Reset demo transactions so the seed is idempotent.
  await db.transaction.deleteMany({ where: { userId: demo.id } });

  await db.transaction.createMany({
    data: demoTransactions.map((t) => ({
      userId: demo.id,
      type: t.type,
      amount: t.amount,
      currency: "AUD",
      category: t.category,
      description: t.description ?? null,
      date: daysAgo(t.daysAgo),
      source: "MANUAL",
    })),
  });

  console.log(`Seeded ${demoTransactions.length} transactions for ${demo.email}`);
  console.log(`Share URL: http://localhost:3000/shared/${demo.shareToken}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());

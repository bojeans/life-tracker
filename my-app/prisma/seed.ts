import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { seedDemoData, DEMO_COUNTS } from "../src/lib/demo-data";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

async function main() {
  const demo = await db.user.upsert({
    where: { email: "demo@life-tracker.dev" },
    update: { name: "Alex Demo", shareToken: "example-user", isDemo: true },
    create: {
      email: "demo@life-tracker.dev",
      name: "Alex Demo",
      shareToken: "example-user",
      isDemo: true,
    },
  });

  await seedDemoData(db, demo.id);

  console.log(`Seeded data for ${demo.email}:`);
  console.log(`  • ${DEMO_COUNTS.transactions} transactions, ${DEMO_COUNTS.accounts} net-worth accounts`);
  console.log(`  • ${DEMO_COUNTS.weights} weight entries, ${DEMO_COUNTS.bloodPressure} BP readings, ${DEMO_COUNTS.dietDays} diet days`);
  console.log(`  • ${DEMO_COUNTS.workouts} workouts, ${DEMO_COUNTS.pantry} pantry items, 1 profile`);
  console.log(`  • ${DEMO_COUNTS.media} travel media items`);
  console.log(`Share URL: http://localhost:3000/shared/${demo.shareToken}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());

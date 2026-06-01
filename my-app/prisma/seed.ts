import { PrismaClient } from "../src/generated/prisma";

const db = new PrismaClient();

async function main() {
  // Demo user — safe to share publicly via share token
  const demo = await db.user.upsert({
    where: { email: "demo@life-tracker.dev" },
    update: {},
    create: {
      email: "demo@life-tracker.dev",
      name: "Alex Demo",
      shareToken: "demo-recruiter-view",
    },
  });

  console.log(`Seeded demo user: ${demo.email}`);
  console.log(`Share URL: http://localhost:3000/shared/${demo.shareToken}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());

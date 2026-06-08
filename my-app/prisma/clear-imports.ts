import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

// Deletes all CSV-imported transactions (source = CSV). Manual entries and
// seeded demo data are left untouched. Useful for re-importing a corrected
// spreadsheet from scratch without creating duplicates.
async function main() {
  const result = await db.transaction.deleteMany({ where: { source: "CSV" } });
  console.log(
    `Deleted ${result.count} CSV-imported transaction(s). ` +
      `Re-import your spreadsheet to recreate them with corrected dates.`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());

import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { externalIdFor } from "../src/features/finance/csv";

// One-off backfill: rows imported before the wide-CSV parser promoted an
// "<x> desc" value to the category were stored as category "other" with the
// label sitting in `description`. This rewrites them so the label IS the
// category (matching what a fresh import now produces), and recomputes the
// CSV externalId so re-importing the same sheet still dedupes.
const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
  // Show which database we're actually pointed at (host only, no secret) so a
  // wrong/empty branch is obvious before anything runs.
  let host = "unknown";
  try {
    host = new URL(process.env.DATABASE_URL ?? "").host;
  } catch {
    /* ignore */
  }
  console.log(`Connecting to: ${host}`);

  const rows = await db.transaction.findMany({
    where: {
      category: { equals: "other", mode: "insensitive" },
      description: { not: null },
    },
  });

  let promoted = 0;
  let removedDupes = 0;

  for (const r of rows) {
    const label = (r.description ?? "").trim();
    if (!label) continue;

    const externalId =
      r.source === "CSV"
        ? externalIdFor({
            type: r.type,
            amount: Number(r.amount),
            category: label,
            date: r.date,
            currency: r.currency,
          })
        : r.externalId;

    try {
      await db.transaction.update({
        where: { id: r.id },
        data: { category: label, description: null, externalId },
      });
      promoted++;
    } catch {
      // A unique (userId, source, externalId) collision means an equivalent
      // row already exists — drop this duplicate instead.
      await db.transaction.delete({ where: { id: r.id } });
      removedDupes++;
    }
  }

  console.log(
    `Promoted ${promoted} "other" rows to their description label` +
      (removedDupes ? `; removed ${removedDupes} duplicate(s).` : "."),
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());

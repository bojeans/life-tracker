# Life Tracker

A full-stack personal dashboard for tracking **finances**, **net worth**, and **health** — built as a portfolio project. Real data is private (owner-only auth); visitors get a read-only public view, or can drive the real app through an interactive demo sandbox.

**Live demo:** https://life-tracker-gamma-nine.vercel.app/shared/example-user

> The app lives in the [`my-app/`](my-app/) subdirectory. All commands below are run from there.

## Features

### Finance
- Manual transactions with income / expense / **transfer** types (own-account moves are excluded from spending).
- **Multi-currency** — each transaction stores its own currency; dashboards convert to a base currency (NZD) using live ECB rates (Frankfurter API).
- **CSV import** with two auto-detected layouts: a long `date,amount,…` format and a wide/matrix Google-Sheets layout (one column per category, `<x> desc` columns for labels). Income/expense/transfer are inferred from column names; payroll columns (gross salary, PAYE, student loan, KiwiSaver) classify correctly so the dashboard can show effective tax and savings rate.
- Filtering/search over a pure, serializable criteria object, plus monthly bar and by-category pie charts.

### Net worth
- Track wealth **accounts** (cash, shares, super/KiwiSaver, crypto) and **liabilities** across currencies.
- Record balance **snapshots** over time → net worth total, asset-class composition, and a net-worth-over-time line chart (with carry-forward for accounts recorded at different cadences).
- Bulk **balances CSV import** (wide layout: date column + one column per account).

### Health
- **Diet** (per-item or whole-day totals), **Exercise** (calories via MET tables from your latest weight), **Weight**, and a **Profile** (BMR baseline).
- **Energy balance** overview: intake vs. burn, with predicted vs. actual weight change (Mifflin–St Jeor / Katch–McArdle).
- **Food catalog / pantry** seeded from Open Food Facts search + barcode scanning, so manual entry is a one-time cost.

### Sharing & demo
- **Read-only shared view** at `/shared/[shareToken]` — finance, net worth, and health summaries with charts, no login required.
- **Interactive demo mode** — visitors can add/edit/delete as a sandboxed demo account (guarded by a `User.isDemo` flag, not auth), with a one-click reset.

## Tech stack

| Area | Choice |
|------|--------|
| Framework | Next.js 16 (App Router, Server Actions) + React 19 |
| Language | TypeScript |
| Styling | Tailwind CSS v4, shadcn/ui (on Base UI) |
| Data | PostgreSQL + Prisma 6 (`engineType = "client"` + `@prisma/adapter-pg` driver adapter) |
| Auth | NextAuth v5 (Auth.js) — GitHub OAuth, database sessions |
| Client state | TanStack Query |
| Forms / validation | React Hook Form + Zod |
| Charts | Recharts |
| Testing | Vitest (unit) + Playwright (e2e) |

## Getting started

Prerequisites: Node 20+, Docker (for local Postgres).

```bash
cd my-app

# 1. Start a local Postgres (postgres:16, db "life_tracker" on :5432)
docker compose up -d

# 2. Configure environment (see below)
cp .env.example .env   # then edit values

# 3. Apply the schema and generate the Prisma client
npm install
npm run db:migrate

# 4. Seed the public demo user (Alex Demo → /shared/example-user)
npm run db:seed

# 5. Run it
npm run dev
```

Open http://localhost:3000. The demo view is at http://localhost:3000/shared/example-user.

### Environment variables

Create `my-app/.env`:

```bash
# Local Postgres from docker-compose
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/life_tracker"

# Required by Auth.js (generate with: npx auth secret)
AUTH_SECRET="..."

# GitHub OAuth app (only needed to sign in as the owner; the demo/shared
# views work without it). Callback URL: http://localhost:3000/api/auth/callback/github
AUTH_GITHUB_ID="..."
AUTH_GITHUB_SECRET="..."

# The email of the GitHub account allowed owner access
OWNER_EMAIL="you@example.com"
```

## Scripts

Run from `my-app/`:

| Command | What it does |
|---------|--------------|
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run db:migrate` | Apply Prisma migrations (dev) |
| `npm run db:seed` | Seed/reset the demo dataset |
| `npm run db:studio` | Open Prisma Studio |
| `npm run test:run` | Run the Vitest suite once |
| `npm run test:e2e` | Run Playwright e2e tests |
| `npm run lint` | ESLint |

## Project structure

```
my-app/
├─ src/
│  ├─ app/
│  │  ├─ (app)/              # Owner-only app (finance, health) — auth-guarded
│  │  ├─ shared/[shareToken] # Public read-only shared view
│  │  └─ auth/               # Sign in / out
│  ├─ features/
│  │  ├─ finance/            # Transactions, multi-currency, CSV, net worth
│  │  ├─ health/             # diet / exercise / weight / profile
│  │  ├─ demo/               # Interactive demo sandbox
│  │  └─ shared/             # Cross-feature helpers (dates, …)
│  ├─ lib/
│  │  ├─ actor.ts            # resolveActorUserId() — owner session OR demo cookie
│  │  ├─ demo-data.ts        # Demo dataset + seeding (shared by seed + reset)
│  │  └─ db.ts               # Prisma singleton (driver-adapter client)
│  ├─ proxy.ts               # Route protection (Next.js 16 replaces middleware.ts)
│  └─ generated/prisma/      # Generated Prisma client (gitignored)
├─ prisma/
│  ├─ schema.prisma
│  └─ seed.ts
└─ docker-compose.yml        # Local Postgres
```

## Architecture notes

- **Server Actions** are the data layer; every feature action funnels through `resolveActorUserId()` so the owner session and the demo cookie share one auth chokepoint.
- **Prisma → client boundary:** `Decimal`/`Date` can't cross to client components, so rows are mapped to plain DTOs (`Decimal → number`, `Date → ISO string`) before leaving the server.
- **Pure, testable cores:** parsing, currency conversion, filtering, and analytics are pure functions with colocated `*.test.ts` files, kept separate from the React/IO layers.
- **CSV classification** lives in `src/features/finance/csv.ts` (transactions) and `networth-csv.ts` (balances); income/expense/transfer detection and derived-column handling (e.g. ignoring `net salary` to avoid double-counting gross pay) are unit-tested.

## Deployment

Deployed on **Vercel** with a **Neon** Postgres database. Key points:

- Vercel **Root Directory must be `my-app`** (the Next app is in a subdirectory).
- Prisma uses the WASM query compiler (`engineType = "client"`) + a `pg` driver adapter to avoid native-engine resolution issues on serverless.
- Migrations run against Neon's **direct** (unpooled) connection; the app uses the pooled URL.

## License

[MIT](LICENSE)

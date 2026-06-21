# Life Tracker — Next Steps

_Last updated: 2026-06-21. Finance complete (incl. Net worth); Health (Diet + Weight + Exercise + energy-balance Overview) complete; Travel not started._

## Recently shipped (since 2026-06-06)

- **Net worth** (Finance) — track wealth **accounts** (cash / shares / super / crypto) and **liabilities** across currencies, with **balance snapshots over time**. Net-worth total, total assets/liabilities, asset-class composition, and an over-time line chart (carry-forward per account, with 3M/6M/1Y/YTD/All ranges). Bulk **balances CSV import** (wide layout: date column + one column per account). Models `WealthAccount` + `BalanceSnapshot`; code in `src/features/finance/networth-*.ts(x)`; analytics are pure + unit-tested (`networth-analytics.ts`).
- **CSV classification refinements** (`csv.ts`) — transfer detection is now pattern-based (any `"<account> transfer to <account>"` or column containing `transfer` → TRANSFER), `kiwisaver contribution` → TRANSFER, `gross salary` / `inheritance` → INCOME, and the derived `net salary` column is **ignored on import** so take-home isn't double-counted against gross. All covered by tests.
- **Shared view now includes Net worth** — `/shared/[shareToken]` renders a read-only Net-worth section (total, assets, liabilities, asset-class split, over-time line) alongside Finance + Health. `getSharedFinance` returns accounts + snapshots; chart via prop-driven `shared-networth-chart.tsx`.
- **Optimistic add/edit** (Finance) — `transaction-form.tsx` now patches the `["transactions"]` cache on create (temp row, re-sorted) and edit (patch-by-id) with rollback + reconcile, matching the existing optimistic delete. Completes the "optimistic on add/edit/delete" goal; dashboards update instantly too.
- **Demo data** extended to a **full year** (~12 monthly points across finance, net worth, weight, blood pressure) so the trend charts have shape; diet/exercise stay a recent ~2-week daily block. Seed: `npm run db:seed`.
- **Root `README.md`** written (overview, features, setup, structure, deployment) + a committable `my-app/.env.example`.

## Where we are

**Finance** — owner-scoped transaction CRUD, multi-currency, CSV import (long & wide layouts, dedupe, timezone-safe, name-based income/expense/transfer classification), Dashboard/Manage split, shared `<TransactionFilters>` bar (LLM-ready `TransactionFilter`), optimistic add/edit/delete, plus the **Net worth** module above. Public shared view with charts.

**Health** — mirrors finance:
- **Diet** (`/health/diet`): tabs Dashboard | Manage | Pantry. Per-item foods or whole-day totals; CRUD, CSV w/ dedupe, search + confirm/optimistic delete, dashboard (calories/day bar + macro pie).
- **Food catalog / "pantry"** — reusable per-user `FoodItem` catalog (per-100g macros + micros). Built via Open Food Facts search + `@zxing/browser` barcode scan + manual add (deduped by barcode). Logging uses `CatalogPicker` over the *local* catalog → grams → macros autopopulate; entries store `foodItemId` + a macro snapshot.
- **Weight** (`/health/weight`): CRUD + CSV, trend line + net-change / avg-per-week.
- **Exercise** (`/health/exercise`): CRUD + CSV + dashboard; calories via **METs × bodyweight × duration** (auto-fills from latest weight; editable).
- **Profile** (`/health/profile`) + **Overview** (`/health`): combines intake + burn + BMR baseline (Mifflin–St Jeor / Katch–McArdle) into daily net calories and **predicted vs actual weight change**. Tabs: Overview | Diet | Exercise | Weight | Profile.

**Interactive demo** — `/shared/[shareToken]` has a "Launch interactive demo" button: visitors drive the real app as the `User.isDemo`-gated demo account (add/edit/delete across Finance + Health), with Exit + Reset. Built without NextAuth via a gated `demo_user` cookie + `resolveActorUserId()` chokepoint; rate-limited. It's a *shared* sandbox (everyone edits the same account; Reset restores it).

**208 tests passing, build + lint clean.**

## Manual verification worth doing
Camera/network bits aren't auto-tested: `npm run dev`, then — in **Pantry**: a barcode scan + an OFF search both save items; in **Manage**: `CatalogPicker` finds a saved item, scales by grams, autopopulates macros. For **Net worth**: add an account, record a couple of balances, import a balances CSV, and confirm the total / composition / over-time chart update. (Camera needs HTTPS or localhost; restart `npm run dev` after schema changes so Prisma picks them up.)

## Pick up next (rough priority)

1. **Travel section** — the last untouched area; nav link already stubbed (`/travel` = "Coming soon"). Architecture decided (see memory `project-travel-media-plan`): **metadata + pointers in Postgres, media bytes in Cloudflare R2, thumbnails are the trick**; the real work is a one-time ingest script, not an in-app uploader. Suggested first slice (no external deps): `MediaItem` schema + owner-scoped actions with keyset pagination + date/album/tag filters + a thumbnail gallery grid + demo seed + shared-view section; wire real R2 storage and the HDD ingest script after as credential-gated steps.

2. **LLM integration** (researched, parked — see memory `project-life-tracker`). Plan: tiny `LlmProvider` interface, **Gemini Flash** for the hosted demo + **Ollama** for real private data (Groq = fast-hosted alt). Best first features, in order:
   - **Natural-language → `TransactionFilter` JSON** — slots straight into `filterTransactions()`. Env-gated so it no-ops without an API key.
   - **Auto-categorize** messy CSV/transaction descriptions on import.
   - Monthly **insight / anomaly** summaries (a finance or intake-vs-weight correlation is a natural first one).

3. **Sharesight sync** (external dependency — start the email early). REST API (OAuth2, `client_credentials` for own account, 30-min tokens → store refresh_token). Gated behind a **paid plan + manual approval** via api@sharesight.com; dev **sandbox** on request. Schema already reserves `source = SHARESIGHT` + `externalId`.

4. **Budgets** (deferred by preference) — monthly limit per category + spend-vs-budget progress. Biggest standalone feature when wanted.

5. **CSV edit-detection** — re-importing a corrected amount upserts the existing row instead of adding a duplicate (builds on the `externalId` dedupe).

### Smaller polish / follow-ons
- **Net worth:** optimistic delete for accounts/snapshots (currently invalidate-only); a net-worth summary card on the main finance dashboard.
- **Demo:** per-visitor isolated demo accounts; periodic auto-reset.
- **Health:** auto-rescale diet-form macros when grams change after a pick; optional USDA secondary source for generic foods.

## Working agreements

- TDD: tests alongside code. Run from `my-app/`: `npm run test:run`, then `npm run build` before finishing.
- Mobile-first styling. shadcn here is **Base UI** (no `asChild` — use `render` or native elements).
- Serialize Prisma rows to DTOs (`toTransactionDTO`) before crossing server→client.

# Life Tracker — Next Steps

_Last updated: 2026-06-06. Finance complete; Health (Diet + Weight + Exercise + energy-balance Overview) built; Travel not started._

## Interactive recruiter demo (new)
The public `/shared/[shareToken]` view has a **"Launch interactive demo"** button: recruiters enter the real app as the demo account (`User.isDemo` gated) and can **add/edit/delete across all of Finance + Health**, watching dashboards update live. A demo banner offers **Exit** and **Reset demo data**. Built without NextAuth (DB sessions) via a gated `demo_user` cookie + `resolveActorUserId()` chokepoint. Note: it's a *shared* sandbox (everyone edits the same demo account; Reset restores it). Possible follow-ups: per-visitor isolated demo accounts; rate-limiting; a periodic auto-reset.

## Health — Exercise + energy balance (new)
- **Profile** (`/health/profile`) — height/age/sex/activity (+ optional body-fat %), feeds BMR/TDEE.
- **Exercise** (`/health/exercise`) — CRUD + CSV + dashboard; calories estimated via **METs × bodyweight × duration** (auto-fills from your latest weight; editable). Fitness/step APIs (Fitbit/Strava) deferred.
- **Overview** (`/health`) — combines Diet (intake) + Exercise (burn) + profile baseline (Mifflin–St Jeor / Katch–McArdle BMR × activity) into daily net calories and a **predicted vs actual weight change**. Health tabs: Overview | Diet | Exercise | Weight | Profile.
- Manual check worth doing: set Profile + a weight, log a workout (watch calories auto-calc) and a day of food, confirm the Overview shows intake-vs-burn and predicted Δweight.


## Where we are

**Finance** — solid vertical slice: owner-scoped CRUD, CSV import (long & wide layouts, dedupe, timezone-safe), Dashboard/Manage split, shared `<TransactionFilters>` bar (LLM-ready `TransactionFilter`), recruiter view `/shared/[shareToken]` with charts, confirm + optimistic delete.

**Health** (new, 2026-06-06) — Diet + Weight, mirroring finance:
- **Diet** (`/health/diet`): tabs Dashboard | Manage | Pantry. Supports both per-item foods and whole-day totals; owner-scoped CRUD, CSV import w/ dedupe, search + confirm/optimistic delete, dashboard (calories/day bar + macro-split pie).
- **Food catalog / "pantry"** — the core of the barcode/search request: a reusable per-user `FoodItem` catalog (per-100g macros + common micros). **Pantry** tab builds it (Open Food Facts search + `@zxing/browser` barcode scan + manual add; deduped by barcode). **Logging** uses `CatalogPicker` over the *local* catalog → enter grams → macros autopopulate; entries store `foodItemId` + a macro snapshot (editing a catalog item won't rewrite history).
- **Weight** (`/health/weight`): CRUD + CSV, trend line + net-change / avg-per-week stats.
- Pure mappers (`diet/openfoodfacts.ts`, `food-item-serialize.ts`) unit-tested; OFF fetchers are owner-guarded server actions. Shared date helpers in `src/features/shared/dates.ts`.

**104 tests passing, build + lint clean** (one pre-existing unrelated warning in `transaction-schema.test.ts`).

## Manual verification still worth doing
Camera/network bits weren't auto-tested: run `npm run dev` and confirm — in **Pantry**: a barcode scan + an OFF search both save items to the catalog; in **Manage**: `CatalogPicker` finds a saved item, scales by grams, and autopopulates macros; a daily-total entry and a weight entry save; a diet CSV re-import skips duplicates. (Camera needs HTTPS or localhost; restart `npm run dev` so Prisma picks up the new `FoodItem` model.)

## Pick up next (rough priority)

0. **Health polish / follow-ons**: confirm the diet CSV columns against your real spreadsheet; consider a Health overview that correlates intake vs weight (a natural first **LLM** insight); auto-rescale diet-form macros when grams change after a pick; optional USDA secondary source for generic foods; build the **Exercise** section.

1. **Optimistic add/edit** — the delete path is optimistic; the form (`transaction-form.tsx`) still just invalidates on success (good pending/error UX already). Make create/edit patch the `["transactions"]` cache optimistically (temp id for create, patch-by-id for edit) with rollback. Finishes the "optimistic on add/edit/delete" goal.

2. **LLM integration** (researched, parked — see memory `project-life-tracker.md`). Plan: tiny `LlmProvider` interface, **Gemini Flash** for the hosted demo + **Ollama** for real private data (Groq = fast-hosted alt). Best first features, in order:
   - **Natural-language → `TransactionFilter` JSON** — slots straight into the existing `filterTransactions()`. Build env-gated so it no-ops without an API key.
   - **Auto-categorize** messy CSV/transaction descriptions on import.
   - Monthly **insight / anomaly** summaries.

3. **Sharesight sync** (external dependency — start the email early). Real REST API (OAuth2, `client_credentials` for own account, 30-min tokens → store refresh_token). Gated behind a **paid plan + manual approval** via api@sharesight.com; dev **sandbox** on request. Schema already reserves `source = SHARESIGHT` + `externalId`.

4. **Budgets** (deferred by preference) — monthly limit per category + spend-vs-budget progress. Biggest standalone feature when wanted.

5. **CSV edit-detection** — re-importing a corrected amount upserts the existing row instead of adding a duplicate (builds on the `externalId` dedupe).

## Working agreements

- TDD: tests alongside code. Run from `my-app/`: `npm run test:run`, then `npm run build` before finishing.
- Mobile-first styling. shadcn here is **Base UI** (no `asChild` — use `render` or native elements).
- Serialize Prisma rows to DTOs (`toTransactionDTO`) before crossing server→client.

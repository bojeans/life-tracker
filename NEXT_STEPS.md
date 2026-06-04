# Life Tracker — Next Steps

_Last updated: 2026-06-04. Finance feature only (health/travel not started)._

## Where we are

Finance is a solid vertical slice:

- **CRUD** on transactions (create / edit-via-dialog / delete), owner-scoped + tested.
- **CSV import** — auto-detects long & wide/matrix Google-Sheets layouts, dedupes on re-import, timezone-safe (UTC midnight).
- **Dashboard / Manage split** (`/finance`, `/finance/manage`).
- **Filtering & search** — shared `<TransactionFilters>` bar on both surfaces: text search, type chips, category select, date presets (This month / Last 3 months / This year) + custom range. Driven by a pure, **LLM-ready** `TransactionFilter` object in `filters.ts`.
- **Recruiter view** (`/shared/[shareToken]`) — read-only, now with the same Recharts visuals (bar + pie).
- **Delete polish** — confirm dialog + optimistic delete with rollback.

**69 tests passing, build + lint clean** (one pre-existing unrelated lint warning in `transaction-schema.test.ts`).

## Pick up next (rough priority)

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

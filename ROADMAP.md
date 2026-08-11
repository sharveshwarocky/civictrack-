# CivicTrack — Roadmap

> Plan for turning the app into a full working model. Status: **Phase 1 in progress** (data integrity).
> Supabase is live, real data only — **no mock/seed data** (deliberate).

## Phase 0 — Baseline ✅
- [x] `tsc -b`, `npm run build`, `npm test` all green
- [x] `git init` + first commit (needed before GitHub CI)
- [x] `.env` has URL + anon key; add `VITE_SUPABASE_SERVICE_ROLE_KEY` for `npm run purge`

## Phase 1 — Data integrity (in progress)
*Fixes votes/reactions resetting on refresh → double-counting.*

- [x] New tables `issue_votes`, `issue_reactions` (one row per user per issue) + RLS
- [x] RPC `record_vote(p_issue_id)` — atomic toggle, returns new count
- [x] RPC `record_reaction(p_issue_id, p_type)` — toggle/switch, recomputes `official.reactions` from the table
- [x] RPC `notify_followers(...)` — fan-out honoring per-user notification prefs
- [x] `profiles.settings jsonb` column; Settings screen persists prefs to DB
- [x] Store: load the user's votes/reactions on login; call RPCs; keep optimistic UI
- [x] Pure interaction helpers + unit tests

## Phase 2 — SLA & overdue automation
- [x] `SLA_DAYS` per category (Water 7d, Garbage 5d, Road 15d, …)
- [x] `issues.expected_at timestamptz` computed at report time
- [x] pg_cron daily job auto-marks `overdue` past deadline
- [x] UI: "Due in Xd / overdue" on PostCard + StatusChip; org Overview urgent list becomes automatic

## Phase 3 — Org portal depth
- [x] Contractor assignment UI in the DeptIssues work panel (via `post_official_update`)
- [x] Org forgot-password flow on GovLogin
- [x] Per-issue timeline step editing in the work panel

## Phase 4 — Production readiness (Vercel)
- [x] `vercel.json` SPA rewrites (deep links like `/gov/portal/issues` work on refresh)
- [x] `.env.example` complete (URL, anon key, service-role key)
- [x] GitHub Actions CI: typecheck + tests + build on push/PR
- [x] README deployment section
- [x] Deploy & verify full citizen + org + admin flows over HTTPS

## Later (recommended, not scheduled)
- Seed script (`npm run seed`) — skipped by choice; app runs on real data only
- Playwright E2E smoke tests
- Feed pagination (beyond 100 issues) · live username availability check

## Validation at the end of every phase
`npx tsc -b --noEmit` → `npm run build` → `npx vitest run` → browser pass on affected flows.

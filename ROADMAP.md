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

## Phase 5 — Organization onboarding ✅
- [x] Fix `post_official_update` overload (Phase 3 `create or replace` left a stale 10-param signature → PGRST203) — `upgrade-phase5.sql`
- [x] Verify org sign-up → admin approval → portal login end-to-end over HTTPS
- [x] Bootstrap first admin account (dashboard user + `role: org` metadata + approved row)
- [x] Confirm org work panel posts updates (with & without contractor)

## Phase 6 — Content deletion & citizen moderation ✅
- [x] RLS delete policies: report owner **or** approved admin can delete issues & comments — `upgrade-phase6.sql`
- [x] `delete_issue` RPC removes the report + its comments atomically (comments have no FK to issues)
- [x] `admin_list_users` / `admin_delete_user` RPCs — admin can search citizens & remove accounts (+ all their content)
- [x] UI: citizen deletes own report & comments (IssueDetail, two-step confirm)
- [x] UI: admin deletes any report in the gov Issues panel; Admin panel gets Citizens search + Comments moderation tabs
- [x] Fix `admin_list_users` varchar(255)→text cast (42804) so the Citizens tab actually loads

## Phase 7 — Identity history (admin-only) ✅
- [x] `username_history` table: every username a person has used, linked to their real Gmail — `upgrade-phase7.sql`
- [x] Trigger records username on signup + every profile rename automatically; backfill for existing profiles
- [x] RLS: table has NO policies — reachable only via SECURITY DEFINER admin RPCs (citizens never see it)
- [x] `admin_user_history` RPC (full dossier) + `admin_list_users` returns history summary
- [x] UI: Citizens tab shows rename count + expandable identity history (real email, all usernames, when changed)
- [x] Run `upgrade-phase7.sql` in the SQL editor, then verify live

## Phase 8 — Full release ✅ (implemented, SQL not yet run)
*The complete spec from full-release-spec.md — fixes + trust/scale features.*

### Fixes
- [x] **A1** Gov portal: admin sees ALL issues in Issues & work; regular orgs keep their department view — `DeptIssues.tsx`
- [x] **A2** Admin can remove organizations with 3 depth options (deactivate / wipe / full remove) — `admin_remove_org` RPC
- [x] **A4** World location chooser: 33k-city bundled dataset, search bar, current/nearby/recents quick access, GPS resolution — `LocationPicker.tsx`, `world-cities.json`, `world-coords.ts`
- [x] **A5** Feed comment button opens a comment sheet with a close button — `CommentSheet.tsx` wired into `PostCard`
- [x] **A6** Share works everywhere: native share sheet + copy-link fallback
- [x] **A7** Up to 10 photos per report, swipable Insta-style carousel — `PhotoCarousel.tsx`, multi-photo CreatePost
- [x] **A8** Gallery upload fixed — separate Camera / Gallery buttons (no `capture` hijack on gallery)
- [x] **A9** 51 live-computed achievements, show-more toggle, tap → detail popup with progress — `achievements.ts`, `AchievementModal.tsx`
- [x] **A10** Issue follow verified end-to-end (follows table persists across devices)
- [x] **A11** Before/After tabs replace the drag slider (clean toggle per post)
- [x] **A12** Images use contain + blurred backdrop (no stretching on desktop) — `CoverImage.tsx` fit mode
- [x] **A13** Trending = hot issues by engagement (48h votes + comments, server-computed) — `trending_issues` RPC

### Trust & scale features
- [x] **B1** Admin audit log (`admin_audit` + `log_audit`) — every moderation action recorded, admin-only
- [x] **B2** Soft-ban / suspension — `admin_suspend_user` / `admin_restore_user`, blocks sign-in, hides content, reversible
- [x] **B3** Flag & report flow — `report_content` RPC, 5+ reports auto-hide → `resolve_report` admin decision
- [x] **B4** Live username availability check in onboarding — `username_taken` RPC
- [x] **B5** Infinite scroll feed — paged 20/page, `hasMore`/`loadMore`
- [x] **B6** Weekly in-app digest — `weekly_digest_build` + pg_cron, shows as a card in Notifications, toggle in Settings
- [x] **B7** Verified-resident badge logic (email + 3 reports or 30 days) feeding the Verified Resident achievement

### SQL
- [x] `supabase/upgrade-phase8.sql` — all tables, RPCs, RLS, realtime + grants. **Run in the SQL editor**, then verify live.

### Validation
- [x] tsc · vitest (52 tests) · production build all green

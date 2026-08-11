# Recap — README Rewrite Spec

> **Request:** "Give me a recap on everything we did till now."
> **Deliverable:** A rewritten `README.md` that serves as a long-form personal-reference dev journal for the CivicTrack app.

## 1. Context & Purpose

- **Primary purpose:** Personal reference — so the author can pick up the codebase and remember what was built, why, and how.
- **Secondary use:** Future-me orientation when resuming work (not a stakeholder report, not a handover doc).
- **Key takeaway to anchor the recap:** The full feature build-out — from a static mock-data app to a real Supabase-backed civic-issues app with a government portal.

## 2. Format Decisions (confirmed with user)

| Question | Decision |
|---|---|
| Where does it live? | `README.md` (rewrite the existing one) |
| Structure | **Topical sections** (auth, data, org portal, UI, tooling) with a short history at the top — NOT a pure chronological narrative |
| Depth | Full dev journal, long-form, near-exhaustive |
| SQL journey | **Only final state** — one-line setup, no history of the SQL errors |
| Status framing | **Everything complete & working** — schema live, admin created, all features working |
| Demo mode | Brief mention only (one line) |
| Limitations | Yes — short honest section |
| Dev-environment quirks | Yes — one brief note |

## 3. Required Sections (in order)

### 3.1 Project overview (short)
- What CivicTrack is: civic issue-reporting platform (report, track, hold departments accountable).
- Stack: React 18 + Vite 6 + TypeScript + Tailwind v4 + Supabase + Leaflet/react-leaflet + framer-motion + lucide-react + react-router 6.
- One-line status: fully live against Supabase, mock data removed.

### 3.2 Feature build-out (the anchor section)
Cover each original requirement → how it was implemented, concisely:
1. **Live achievements & "My reports"** — computed from `issues.user_id`, no more static profile.
2. **Real sidebar identity** — username instead of the old hardcoded "Sharveshwar" profile.
3. **Onboarding** — after first login: random anonymous username (unlimited rerolls, never linked to email) + home area via real GPS (manual fallback).
4. **Geolocation on login** — real GPS during onboarding; exact coords NOT persisted (privacy).
5. **Organization portal** (`/gov`) — real email + password login/register; registrations pending until admin approves; admin approval via `SECURITY DEFINER` RPC.
6. **Before → After** — citizen's uploaded photo as "before", org's completion photo as "after"; slider only when completed; "Not completed" state otherwise.
7. **Real budgets everywhere** — org-entered sanctioned/spent values, formatted ₹ consistently, no "TBD".
8. **Anonymity** — every user gets a random username at account creation, rerollable until satisfied; email never shown publicly.
9. **Home area at account creation** — acts as default feed area.
10. **Real notifications** — per-user `notifications` table, generated on org updates/budget revisions/completion, realtime push, read-state sync, deep-links to the report.
11. **No mock/duplicate data** — `mockData.ts` deleted; `npm run purge` empties demo rows.
12. **Fixed image placeholders** — no more misaligned emojis in cover placeholders; chips realigned.

### 3.3 Database design (Supabase)
- Tables: `issues`, `profiles`, `organizations`, `notifications`, `follows`, `comments` + `photos` storage bucket.
- Key columns on `issues`: `user_id`, `cover` (before), `aftercover`, `official`, `budget`/`spent`, `completionpct`, `completed_at`, `timeposted`, `created_at`.
- RLS model: public reads on content tables; writes require auth; profiles private per user; deletes locked down; notifications insertable only by approved orgs.
- RPCs: `approve_organization`, `post_official_update` (both `SECURITY DEFINER` with server-side caller checks).
- Helper functions: `is_org_admin()`, `is_approved_org()` (SECURITY DEFINER, avoid policy recursion).
- Realtime: issues, comments, notifications.
- **Setup (final state only):** run `supabase/live.sql`; create admin auth user via Dashboard (metadata `{"role":"org"}`); insert the `organizations` row; `npm run purge`.

### 3.4 Bugs found & fixed (the audit)
High-severity fixes to list:
- **`toDbRow` leaking `createdAt` (camelCase)** into PostgREST inserts — would have broken issue creation live.
- **Photo upload** previously wrote multi-MB base64 into the DB on storage failure — now aborts with a clear error.
- **Notification fan-out** could fail silently for everyone (bad UUID rows) — now UUID-filtered, carries `issue_id`.
- **Onboarding flash** on first OTP login — profile resolution now gates the route guards.
- **Frozen relative timestamps** — `relativeTime()` derived live from `created_at`/`postedAt` everywhere.
- **Optimistic writes reverting on failure** — upvotes, follows, reactions, comments.
- **Org updates apply optimistically** after the RPC so they show instantly.
- **Error translation** — raw PostgREST "schema cache" errors become actionable "run supabase/live.sql" messages; pre-flight table check + dismissible banner.

### 3.5 UI/UX changes
- Responsive auth pages: two-column split (branding panel + form) on desktop, stacked on mobile — Login, GovLogin, Onboarding, Splash.
- **Sign in / Sign up tabs** on both portals via shared `AuthTabs` component (green for citizens, blue for orgs).
- ErrorBoundary wrapping the app; heavy screens code-split (lazy loading); dead CSS/ProgressRing removed.
- Profile editor via Settings → `/onboarding?edit=1`.
- Notifications deep-link to the specific report; comment box gated behind sign-in.

### 3.6 Tests & tooling
- Vitest added; 18 unit tests across 4 files (format, username, areas, friendlyDbError).
- Commands: `npm run dev`, `npm run build`, `npm run typecheck`, `npm test`, `npm run purge`.
- `purge.ts` requires `VITE_SUPABASE_SERVICE_ROLE_KEY` (RLS locks down deletes).
- No git history (repo has no commits) — the README is the primary record.

### 3.7 Status / current state
- Frame as **complete & working**: schema applied, admin created, features live.

### 3.8 Known limitations (short, honest)
- Feed capped at latest 100 issues (older reports load on demand via `ensureIssue`).
- Citizen flow verified by build + tests; some live flows (org sign-up E2E, photo upload end-to-end) still worth a manual pass.
- Browser-automation tool was unavailable during dev — no automated E2E.

### 3.9 Brief notes
- **Demo mode** (one line): without Supabase env vars the app runs local-only.
- **Dev quirk** (one line): new-file creation via the tool was flaky; heredoc via shell worked — keep that in mind when adding files.

## 4. Tone & Length
- Long-form journal, scannable: use headers, tables, short code blocks, checkmarks.
- Personal-reference voice: honest, direct, no marketing fluff.
- Reading the overview + section headers should tell the story in ~2 minutes; the detail carries the depth.

## 5. Out of scope (confirmed)
- No chronological SQL-error history (policy mismatch, recursion, permission-denied saga).
- No per-decision blow-by-blow of every tool call.

## 6. Acceptance criteria
- [ ] README covers all 3.1–3.9 sections.
- [ ] Every original requirement (3.2) maps to its implementation.
- [ ] Setup section is accurate for a fresh clone (live.sql + admin + purge).
- [ ] Tests/tooling section lists real commands that exist in package.json.
- [ ] Reads as a complete-and-working status, with honest limitations.

# CivicTrack — Full Release Spec

> One mega-release: fixes the 12 broken/annoying things + ships the 7 trust/scale features.
> All decisions below were made through direct interview with the product owner (2026-08-12).

---

## 0. Summary of decisions

| # | Topic | Decision |
|---|-------|----------|
| 1 | Delivery | **One mega-release** — single spec, single implementation phase, one deployment |
| 2 | Org visibility | **Admin sees ALL issues & can work on any**; each regular org sees only their own (department → category mapping) |
| 3 | Trending | **Hot issues by engagement** — rank individual issues by upvotes + comments in the last 48h |
| 4 | Org scoping | Keep **department → category mapping** (no assigned_org_id schema change) |
| 5 | Multi-image | **Up to 10 photos** per report, swipable "Insta-post" style attachment |
| 6 | Achievements | **~50 achievements computed from live stats** (definitions in code, no unlock tables); show progress (e.g. 3/5) |
| 7 | World locations | **Bundled city dataset** (~25k cities: country → state → city) + Chennai locality overlays; search bar; recents / nearby quick-access; current location pinned on top |
| 8 | Soft-ban | **Login blocked + content hidden** (marked removed by moderator), fully reversible |
| 9 | Flag/report | Posts **and** comments reportable; **5+ reports → auto-hide** → admin decides (restore / delete) |
| 10 | Audit log | **All moderation actions** recorded (actor, target, action, timestamp) — no deletes of the record |
| 11 | Verified badge | **Email verified AND** (3+ reports OR 30 days active) |
| 12 | Before/After | **Tab toggle replaces the drag-slider** (Before / After buttons; slider removed) |
| 13 | Image fit | **Contain + blurred backdrop** (Instagram-story style letterbox) on desktop/large frames |
| 14 | Share | **Native share sheet** (navigator.share) with **copy-link fallback + toast** |
| 15 | Weekly digest | **In-app weekly digest notification** (special pinned card in Notifications center), **opt-in default ON**, **not email** |
| 16 | Pagination | **Infinite scroll**, page size ~20 |
| 17 | Follow user | **No** — only verify the existing issue-follow works end-to-end |
| 18 | Remove org | Admin **chooses removal depth at decision time** (3 options, see A2) |
| 19 | Comments on feed | PostCard comment button opens a **comment popup (bottom-sheet) with a close button**; fix comment posting/loading reliability |

---

## 1. Confirmed root causes found during spec research (codebase)

1. **Share dead button** — IssueDetail.tsx share button has **no onClick** handler.
2. **Gallery upload broken** — CreatePost.tsx file input uses capture="environment" which forces the camera on mobile and breaks gallery pickers on many devices.
3. **Location chooser limited** — src/lib/areas.ts has only **7 hardcoded Chennai areas** (AREAS); areaFromCoords() returns undefined beyond 60 km of those centroids.
4. **Achievements tiny** — 8 hardcoded achievements in Profile.tsx; no show-more, no requirement popup, no progress.
5. **Admin Issues & work filters** — DeptIssues.tsx filters issues by deptInfo.categories, so the admin only sees their own department categories.
6. **Image stretching** — CoverImage.tsx uses object-cover (fill/crop) in fixed-height frames everywhere.
7. **Trending fake-ish** — Search.tsx ranks categories by count from the in-memory feed (**only 100 issues** loaded, store.tsx .limit(100)), not actual engagement.
8. **Feed comment button dead** — PostCard comment button has no interaction; user expects a popup with a close button.
9. **Signup → localhost error** — Supabase Auth URL configuration / email-confirmation links resolve to localhost instead of the deployed origin (config fix).

---

## Part A — The 12 fixes

### A1. Admin "Issues & work" visibility
- DeptIssues.tsx: when org.role === 'admin', show **all issues** (no department filter). Regular orgs keep department → category filtering.
- Keep the existing filter chips (all / open / overdue / completed) working for both.
- Add a small scope indicator in the panel header when admin (All issues · N vs My department · N).

### A2. Remove organization (admin chooses depth at decision time)
- New admin decision UI in the Organizations tab: when removing an org, admin picks one of:
  1. **Full removal** — delete org row + auth login; issues stay, official updates/timelines/after-photos removed.
  2. **Remove + wipe updates** — delete org account AND strip all their official updates/after-photos/timelines (issues stay).
  3. **Deactivate** — flip to inactive; can't sign in; all history stays (reversible).
- Backed by a SECURITY DEFINER admin RPC: admin_remove_org(p_org_id, p_mode) with modes 'full' | 'wipe' | 'deactivate'. Records action in the audit log (B1).
- Reject stays for pending registrations; Remove is for existing orgs.

### A3. Signup / login redirect fix (localhost error)
- **Supabase Auth → URL Configuration**: set **Site URL** to https://civictrack-sepia.vercel.app (production); confirm Redirect URLs include the deployed domain (keep localhost:5173/5174 for dev, add prod if missing).
- Verify email-confirmation and password-reset **email templates** use the Site URL so links point at prod.
- Client hardening: auth redirectTo uses window.location.origin, never a hardcoded origin.
- Guard: if a user lands after email confirmation with a localhost/mismatched origin, show a friendly hint instead of a raw connection error.

### A4. World location chooser (search + recents/nearby/current)
- **Data**: bundle a ~25k city dataset (country → state → city, lat/lng). Keep Chennai localities (Adyar, Velachery, Anna Nagar, T. Nagar, Besant Nagar, Kilpauk, Madurai…) as **locality overlays** under Chennai so areaFromCoords resolves them first, then falls back to city-level for the rest of the world.
- **UI**: tapping the chooser opens a full-screen/bottom-sheet picker with a **search bar**; **Current location** pinned on top; **Recent locations** (local, per device) second; **Nearby locations** (within ~X km, sorted by distance) next; full grouped list (Country ▸ State ▸ City) below.
- home_area / post area can now store city names from the dataset, not just the 7 Chennai areas.
- Map-pin step in CreatePost unchanged (exact coords still set on the map).

### A5. Comments — feed popup + reliability
- PostCard comment button opens a **comment bottom-sheet popup** with the issue's thread, an input, and a **close (X) button** — same as IssueDetail's community section, extracted into a reusable CommentSheet component.
- **Fix comment posting**: audit addComment in store.tsx (DB insert + count increment + realtime). Signed-in users can post, count updates optimistically, failures surface a visible error (not silent). Verify RLS authenticated insert comments.
- Comments load for any issue (incl. deep-linked via ensureIssue) — not just feed-loaded ones.

### A6. Share button
- IssueDetail.tsx (and PostCard if desired): navigator.share({ title, text, url }) when available; fallback to clipboard.writeText(url) + toast (Link copied).
- Share URL = canonical deep link (works thanks to Phase 4 SPA rewrites).

### A7. Multi-image reports (up to 10, swipable)
- CreatePost photo step → photo gallery: add up to **10 photos**; each via camera or gallery; thumbnail strip with remove; primary cover for the feed card.
- **Data model**: issues.photos jsonb array; cover kept as derived primary/thumbnail. Backfill existing cover → photos[0].
- **Viewing**: IssueDetail + PostCard thumbnails — swipable carousel (swipe horizontally, dots indicator).
- Storage: upload each to the photos bucket; org after-photos remain single for now (see A11).

### A8. Gallery upload works
- Remove capture="environment" from the file input (it hijacks the picker).
- Two explicit buttons: Take photo (capture="environment") and Choose from gallery (no capture, accept="image/*", multiple for multi-image).
- Enforce 10-photo limit in the picker.

### A9. Achievements (50+, show more, popup, progress)
- **Definitions in code** (~50 realistic achievements), computed from live stats — no new DB unlock tables. Categories:
  - Reports (counts, per-category, per-area, weekly streaks)
  - Support received / support given
  - Comments posted
  - Resolved reports (yours resolved, you followed a resolved issue)
  - Follows, verified status, days active, milestone badges (10/50/100 reports)
- **Computed progress**: each achievement shows progress like 3/5 Road reports; earned state derived from live stats (issues count, upvotes, resolved, categories — same signals Profile already computes).
- **UI**: Profile achievements grid shows first ~12 with a **Show more** toggle revealing the rest. Tapping any achievement opens a **popup/modal** with emoji, name, requirement text, current progress bar, and earned/not-earned state.
- Seed ~50 entries; each entry: { id, emoji, label, desc (what must be done), check(stats) => boolean, progress(stats) => {cur, max} }.

### A10. Follow verification (issue-follow only)
- No user-follow feature (decided). Verify end-to-end: toggleFollow persists to follows table, following map hydrates on login, followers count updates on issues, and following an issue actually generates notifications when the org posts updates. Fix whatever breaks.

### A11. Before/After toggle (tabs replace slider)
- Replace BeforeAfterSlider usage on IssueDetail with **tab-style toggle**: **Before** tab shows the before photos (carousel); **After** tab shows after photos. If no after exists, After tab is disabled with the Not completed hint (keeps current messaging).
- **Delete** BeforeAfterSlider.tsx (code hygiene, like ProgressRing).
- Clean, minimal: two segmented buttons over the photo area; section title Before → After stays.

### A12. Image fit — contain + blurred backdrop
- Update CoverImage and all fixed-height image frames: **object-contain** on a base layer that is the **same image blurred + scaled** (Instagram-story style). Never crop/stretch the actual image.
- Apply to: IssueDetail hero, PostCard covers, Profile My reports, Search results, Before/After views, CreatePost preview. Very small thumbnails (< 96px) may keep object-cover for density.
- Component: CoverImage gains a fit prop (default contain for detail views).

### A13. Trending = hot issues by engagement
- Search.tsx (and RightRail): trending section shows **individual issues ranked by engagement in the last 48h** — score = upvotes + comments gained in-window (pick formula in code, keep it explainable).
- DB support: SQL function trending_issues(p_limit) computing from issue_votes/comments timestamps in-window (no client clock skew). Optionally a cron-maintained trending_score column.
- Category-count ranking is removed. Category chips still filter results (unchanged).

---

## Part B — The 7 feature ideas

### B1. Admin audit log
- New table admin_audit (id, actor_user_id, actor_email, action, target_type, target_id, target_summary, details jsonb, created_at).
- Recorded via SECURITY DEFINER helper called from admin RPCs: org approve/reject/remove (all 3 modes), issue delete, comment delete, user remove, user suspend/restore.
- UI: **Audit log tab** in Admin panel — newest first, filterable by action type, shows actor + target + timestamp. Read-only.

### B2. Soft-ban / suspension (login blocked + content hidden, reversible)
- profiles.suspended boolean + suspended_at + suspended_reason.
- Login blocked: app checks suspension after auth → force logout + Account suspended screen. Write RPCs (post/comment/upvote/follow) also gate via is_suspended() so suspended users can't act even if they bypass UI.
- Content hidden: issues/comments from suspended users excluded from public feeds; history kept for restore.
- Reversible: admin can restore; content reappears untouched.
- UI in Admin Citizens tab: Suspend / Restore buttons next to Remove; reason prompt.

### B3. Flag & report flow (5+ auto-hide)
- New tables: reports (id, reporter_user_id, target_type issue|comment, target_id, reason, created_at) + moderation_queue (id, target_type, target_id, reports_count, status pending|hidden|resolved, hidden_by_auto, decided_by, decided_at, decision). Unique per user per target.
- Citizen UI: Report action on any post/comment (IssueDetail + comment sheet) with reason picker (Spam / Abuse / Misleading / Off-topic / Other).
- Auto-hide: 5+ reports → content hidden from public views (store filter + hidden flag); reporter still sees hidden pending review.
- Admin queue tab: pending items with reasons + counts; admin chooses **Restore** (clears reports) or **Delete** (deletes content + audit log). Auto-hidden items flagged in UI.

### B4. Username availability check
- Live validation in Onboarding username step: debounced check (400–500 ms) calling RPC username_taken(p_username) — green available / red taken inline, block continue on taken.
- Randomize button retries until unique.

### B5. Feed pagination (infinite scroll)
- Store: replace single .limit(100) feed load with paged loading (page size ~20, range queries, hasMore flag).
- Home feed + Search results use infinite scroll (IntersectionObserver sentinel).
- Keep realtime inserts working with paging (new issues append at top).

### B6. Weekly digest (in-app, not email)
- Weekly digest notification per user (pg_cron job or scheduled function): Your week in CivicTrack — N new issues in your area, M status changes you follow, K resolved.
- Shown in Notifications center as a special pinned card, openable to a summary view.
- Opt-in, **default ON**: Settings toggle Weekly digest.
- Depends on notifications table + digest type; content from issues/follows/updates in last 7 days.

### B7. Verified-resident badge
- Derived from profile + auth: badge shows when **email confirmed** AND (**3+ reports** OR **30+ days since created_at**).
- Computed client-side from available data (no new table). Blue BadgeCheck next to username (Profile, PostCard reporter row, comments) where verified displays today.

---

## 2. Data model changes (SQL — one upgrade-phase8.sql, idempotent)

New tables:
- admin_audit
- reports (+ unique per user/target)
- moderation_queue (or hidden boolean + report_count on issues/comments — spec prefers the queue table for history)
- suspensions history via profiles.suspended flag + audit rows

Altered tables:
- issues: photos jsonb (array), cover kept as primary/thumbnail, hidden boolean default false, optional trending_score numeric
- comments: hidden boolean default false; ensure user_id/username for suspension filtering
- profiles: suspended boolean, suspended_at, suspended_reason, digest boolean default true
- organizations: inactive boolean (deactivate mode)

New RPCs (SECURITY DEFINER, admin-gated via is_org_admin()):
- admin_remove_org(p_org_id, p_mode full|wipe|deactivate)
- admin_suspend_user(p_user_id, p_reason) / admin_restore_user(p_user_id)
- report_content(p_target_type, p_target_id, p_reason) (authenticated)
- resolve_report(p_queue_id, p_decision restore|delete) (admin; delete reuses delete_issue / comment delete)
- username_taken(p_username) returns boolean
- trending_issues(p_limit) (server-computed)
- weekly_digest_build() (cron)
- log_audit(...) helper used by all admin RPCs

Realtime: add reports / moderation_queue / admin_audit to the publication if admins should see new reports live.

## 3. Frontend changes

- New components: CommentSheet (bottom-sheet comments with close), PhotoCarousel (swipe + dots), FitImage (contain + blurred backdrop), AchievementModal, LocationPicker (search/recents/nearby/current), ReportDialog (reason picker), WeeklyDigestCard.
- Reworked: CreatePost photo step (multi-photo, camera vs gallery), IssueDetail (Before/After tabs, share, report, carousel, fit images), PostCard (comment opens sheet, report menu), Search (trending issues), Profile (achievements grid + show-more + modal), RightRail (trending issues), Admin (Audit log tab, Moderation queue tab, org removal depth dialog, suspend/restore), DeptIssues (admin sees all), Onboarding (username availability check), Settings (wee
- Store: paged feed, hidden-content filtering, suspend state handling (force logout + banner), report actions, digest badge, trending fetch, username check.
- lib/areas.ts → world city dataset + locality overlays + reverse resolution; lib/geo.ts unchanged.

## 4. Validation plan (end of phase)
1. npx tsc -b --noEmit
2. npm run build
3. npx vitest run (existing 34 tests + new: engagement score, achievement computations, area/city resolution, report auto-hide threshold)
4. Browser smoke: citizen report w/ 10 photos → feed card → comment sheet → share → follow → achievements popup → location picker; gov admin: all issues, moderation queue, audit log, suspend/restore, org removal (3 modes); weekly digest card in Notifications
5. Code review + commit + deploy to Vercel + run upgrade-phase8.sql in SQL editor + live verify

## 5. Out of scope (explicitly deferred)
- Follow-user feature (explicit no from owner)
- Email delivery of digests (in-app only)
- assigned_org_id per-issue assignment model
- Seed/mock data (project policy: real data only)
- Achievement unlock history persistence (computed live only)

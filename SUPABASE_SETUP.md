# CivicTrack — Supabase (Live)

CivicTrack is fully wired to Supabase. With `VITE_SUPABASE_URL` and
`VITE_SUPABASE_ANON_KEY` in `.env` the app runs on **real data only** — no mock
arrays anywhere. Citizen accounts, anonymous usernames, notifications, issue
photos, comments, organizations and budgets are all stored in the database.

## 1. One-time setup — run `supabase/live.sql`

Open the **SQL Editor** in your Supabase dashboard, paste the entire contents of
`supabase/live.sql`, and click **Run** (idempotent — safe to re-run). It creates:

| Table | Purpose |
|---|---|
| `issues` | Citizen reports; carries `user_id`, `cover` (before photo), `aftercover` (org completion proof), `official`, `budget`/`spent`, `timeline` |
| `profiles` | One row per citizen — **random username** (unique), home area, lat/lng, avatar color |
| `organizations` | Org accounts (email + password) with `status`: `pending` → `approved`/`rejected` |
| `notifications` | Per-user notifications, generated when orgs update/resolve issues |
| `follows` | Who follows which issue (drives follower counts + notifications) |
| `comments` | Citizen comments carrying the anonymous `username` |
| storage `photos` | Public bucket for before/after photos |

It also adds `issues` + `comments` + `notifications` to the realtime publication
so changes appear instantly everywhere.

## 2. Purge the old demo data (once)

The old seed script has been removed. To start from a clean database:

1. Add your **service-role key** to `.env` (Dashboard → Settings → API →
   `service_role`, Secret). It is required because RLS now locks down row
   deletes; the anon key can no longer delete content. The script reads it only
   from `.env` — it is never bundled into the client.
2. Run:

```bash
npm run purge
```

This deletes all `issues`, `comments`, `follows` and `notifications` rows
(profiles and organizations are kept). The app now starts empty — the feed fills
with real reports as citizens file them.

## 3. Create the first admin (once)

To approve organizations you need one admin account:

```sql
insert into organizations (email, org_name, department, role, status)
values ('admin@civictrack.gov', 'CivicTrack Admin', 'admin', 'admin', 'approved');
```

Then create the matching auth user in **Authentication → Users → Add user**
(`admin@civictrack.gov` + a password). Sign in at `/gov` with those credentials
and use the **Admin** tab to approve/reject new organizations.

## 4. How it behaves now

- **Login** — email OTP or Google via Supabase Auth. After the first login a new
  citizen lands on **onboarding**: they roll a random anonymous username (unlimited
  rerolls, never linked to their email) and set a home area via **real GPS** or a
  manual pick. That area becomes their default feed area.
- **Anonymity** — feeds, comments, reports and achievements show only the username.
- **My reports & achievements** — computed live from `issues.user_id`; they unlock
  as you actually use the app.
- **Notifications** — stored per user in `notifications`; generated when an org
  posts an update, revises a budget or completes an issue you follow/reported.
  Marking read syncs to the DB; realtime pushes new ones instantly.
- **Budgets** — real sanctioned/spent values entered by organizations on their
  work panel; formatted consistently (₹) everywhere, never "TBD".
- **Before → After** — the citizen's photo is the "before"; the org uploads the
  "after" photo when completing. The slider appears only once completed; until
  then the issue page shows a clear "Not completed" state.
- **Organizations** — separate portal at `/gov`: real email + password login,
  registration → **pending admin approval** → access only after approval. From
  the Issues tab they post public updates, set budgets/spent, upload completion
  photos and mark issues complete.
- **Realtime** — new issues, comments, updates and notifications appear across
  devices instantly.

## 5. Enabling providers

- **Email OTP** — Authentication → Providers → ensure **Email** is on; set the
  Site URL / redirects to your origin (e.g. `http://localhost:5173`).
- **Google** — create an OAuth client in Google Cloud with redirect URI
  `https://<your-project-ref>.supabase.co/auth/v1/callback`, then paste the
  Client ID + Secret in Authentication → Providers → Google.

## 6. Notes

- RLS is locked down: profiles are private per user (no public GPS/email reads),   
  content writes require a signed-in user, deletes are disabled, org actions go
  through `SECURITY DEFINER` RPCs (`post_official_update`, `approve_organization`)
  that verify the caller's role server-side, and notifications can only be
  created by approved organizations.
- Photos upload to the public `photos` bucket under `issues/` (readable by all,
  uploads require a signed-in user).
- Unit tests: `npm test` (vitest) covers the formatters, anonymous-username
  generator and area geolocation resolver.

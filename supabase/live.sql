-- ============================================================
-- CivicTrack — Supabase setup. Run ONCE in the SQL Editor.
-- Fully idempotent: safe to re-run any number of times.
-- ============================================================

-- 0) Issues table
create table if not exists issues (
  id text primary key,
  title text not null,
  description text,
  area text,
  category text,
  status text default 'reported',
  lat double precision,
  lng double precision,
  budget numeric default 0,
  spent numeric default 0,
  days integer default 0,
  upvotes integer default 0,
  comments integer default 0,
  followers integer default 0,
  cover jsonb,
  aftercover jsonb,
  timeline jsonb,
  reporter jsonb,
  official jsonb,
  user_id text,
  contractor text,
  expected text,
  completionpct numeric,
  timeposted text,
  completed_at timestamptz,
  created_at timestamptz default now()
);

alter table issues enable row level security;

-- Read is public (feeds are public). Writes require a signed-in user;
-- guests only ever see a local preview. Deletion is locked down — the
-- purge script uses the service-role key, which bypasses RLS entirely.
drop policy if exists "public read issues" on issues;
create policy "public read issues" on issues for select using (true);

drop policy if exists "public insert issues" on issues;
create policy "public insert issues" on issues for insert with check (auth.role() = 'authenticated');

drop policy if exists "public update issues" on issues;
create policy "public update issues" on issues for update using (auth.role() = 'authenticated');

drop policy if exists "public delete issues" on issues;
create policy "public delete issues" on issues for delete using (false);

-- 1) Citizen profiles — private per user. Nothing in the app needs public
--    profile reads (usernames are denormalized onto issues/comments), so no
--    GPS or email is ever exposed.
create table if not exists profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  home_area text not null default 'Anna Nagar',
  lat double precision,
  lng double precision,
  avatar_color text not null default '#00C853',
  onboarded boolean not null default false,
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;

drop policy if exists "read own profile" on profiles;
create policy "read own profile" on profiles for select using (auth.uid() = user_id);

drop policy if exists "user insert own profile" on profiles;
create policy "user insert own profile" on profiles for insert with check (auth.uid() = user_id);

drop policy if exists "user update own profile" on profiles;
create policy "user update own profile" on profiles for update using (auth.uid() = user_id);

-- 2) Organizations — registrations are public (anon), but reads are limited
--    to the org's own row or an approved admin. Status changes go through
--    the approve_organization function only.
create table if not exists organizations (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  org_name text not null,
  department text not null,
  contact text,
  role text not null default 'org',          -- 'org' | 'admin'
  status text not null default 'pending',    -- 'pending' | 'approved' | 'rejected'
  created_at timestamptz not null default now(),
  approved_at timestamptz
);

alter table organizations enable row level security;

-- Helper: is the current user an approved admin? SECURITY DEFINER so the
-- policy can check without re-entering RLS (avoids infinite recursion).
create or replace function is_org_admin()
returns boolean
language sql security definer stable
as $$
  select exists (
    select 1 from organizations o
    join auth.users u on u.id = auth.uid()
    where o.email = u.email and o.role = 'admin' and o.status = 'approved'
  );
$$;

-- Helper: is the current user an approved org of any role?
create or replace function is_approved_org()
returns boolean
language sql security definer stable
as $$
  select exists (
    select 1 from organizations o
    join auth.users u on u.id = auth.uid()
    where o.email = u.email and o.status = 'approved'
  );
$$;

drop policy if exists "own or admin read organizations" on organizations;
-- Use auth.email() (a safe Supabase helper) — reading auth.users directly from
-- a policy raises "permission denied" for the authenticated role.
create policy "own or admin read organizations" on organizations for select using (
  email = auth.email()
  or is_org_admin()
);

drop policy if exists "anyone register organization" on organizations;
create policy "anyone register organization" on organizations for insert with check (true);

drop policy if exists "update organizations" on organizations;
create policy "update organizations" on organizations for update using (false);

drop policy if exists "delete organizations" on organizations;
create policy "delete organizations" on organizations for delete using (false);

-- Admin-only organization approval: SECURITY DEFINER so it runs with the
-- owner's privileges; only an approved admin-role organization may call it.
create or replace function approve_organization(p_id uuid, p_status text)
returns void
language plpgsql security definer
as $$
declare
  caller_admin boolean;
begin
  if p_status not in ('approved', 'rejected') then
    raise exception 'invalid status';
  end if;
  select exists (
    select 1
    from organizations o
    join auth.users u on u.id = auth.uid()
    where o.email = u.email and o.role = 'admin' and o.status = 'approved'
  ) into caller_admin;
  if not caller_admin then
    raise exception 'Not authorized — only an approved admin organization can approve registrations';
  end if;
  update organizations
  set status = p_status,
      approved_at = case when p_status = 'approved' then now() else null end
  where id = p_id;
end $$;

-- Organization work updates: only an approved org may change status, budgets,
-- completion proof and official updates on an issue. Everything the org
-- portal does on an issue goes through this single function.
create or replace function post_official_update(
  p_issue_id text,
  p_official jsonb,
  p_status text default null,
  p_budget numeric default null,
  p_spent numeric default null,
  p_completionpct numeric default null,
  p_aftercover jsonb default null,
  p_clear_expected boolean default false,
  p_completed_at timestamptz default null,
  p_timeline jsonb default null
)
returns void
language plpgsql security definer
as $$
declare
  caller_email text;
begin
  select u.email into caller_email from auth.users u where u.id = auth.uid();
  if caller_email is null or not exists (
    select 1 from organizations o
    where o.email = caller_email and o.status = 'approved'
  ) then
    raise exception 'Not authorized — only an approved organization can post official updates';
  end if;
  update issues
  set official = p_official,
      status = coalesce(p_status, status),
      budget = coalesce(p_budget, budget),
      spent = coalesce(p_spent, spent),
      completionpct = coalesce(p_completionpct, completionpct),
      aftercover = coalesce(p_aftercover, aftercover),
      expected = case when p_clear_expected then null else expected end,
      completed_at = coalesce(p_completed_at, completed_at),
      timeline = coalesce(p_timeline, timeline)
  where id = p_issue_id;
  if not found then
    raise exception 'Issue not found';
  end if;
end $$;

-- 3) Notifications — private per user; only approved orgs can create them
--    (they are generated when orgs update/resolve issues).
create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  issue_id text,
  icon text,
  title text not null,
  body text,
  type text not null default 'update',
  read boolean not null default false,
  created_at timestamptz not null default now()
);

alter table notifications enable row level security;

drop policy if exists "read own notifications" on notifications;
create policy "read own notifications" on notifications for select using (auth.uid() = user_id);

drop policy if exists "org insert notifications" on notifications;
create policy "org insert notifications" on notifications for insert with check (is_approved_org());

drop policy if exists "update own notifications" on notifications;
create policy "update own notifications" on notifications for update using (auth.uid() = user_id);

-- 4) Follows — public read is needed so orgs can notify followers; users can
--    only create/delete their own rows.
create table if not exists follows (
  user_id uuid not null references auth.users(id) on delete cascade,
  issue_id text not null references issues(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, issue_id)
);

alter table follows enable row level security;

drop policy if exists "read follows" on follows;
create policy "read follows" on follows for select using (true);

drop policy if exists "insert own follow" on follows;
create policy "insert own follow" on follows for insert with check (auth.uid() = user_id);

drop policy if exists "delete own follow" on follows;
create policy "delete own follow" on follows for delete using (auth.uid() = user_id);

-- 5) Comments — public read, signed-in users only for posting.
create table if not exists comments (
  id text primary key,
  issue_id text not null,
  user_id text,
  username text,
  name text,
  text text not null,
  time text,
  created_at timestamptz default now()
);

alter table comments enable row level security;

drop policy if exists "public read comments" on comments;
create policy "public read comments" on comments for select using (true);

drop policy if exists "authenticated insert comments" on comments;
create policy "authenticated insert comments" on comments for insert with check (auth.role() = 'authenticated');

-- 6) Storage bucket for photos (before = citizen report photo,
--    after = org completion proof). Public read, signed-in uploads only.
insert into storage.buckets (id, name, public)
values ('photos', 'photos', true)
on conflict (id) do nothing;

drop policy if exists "public read photos" on storage.objects;
create policy "public read photos" on storage.objects for select using (bucket_id = 'photos');

drop policy if exists "public upload photos" on storage.objects;
create policy "authenticated upload photos" on storage.objects for insert with check (bucket_id = 'photos' and auth.role() = 'authenticated');

-- 7) Realtime — issues, comments and notifications appear instantly.
do $$
declare
  tbl text;
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    foreach tbl in array array['issues', 'comments', 'notifications'] loop
      if not exists (
        select 1 from pg_publication_tables
        where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = tbl
      ) then
        execute format('alter publication supabase_realtime add table %I', tbl);
      end if;
    end loop;
  end if;
end $$;

-- ============================================================

-- ============================================================
-- 8) Phase 1: per-user votes & reactions + notification prefs
-- ============================================================
-- Fully idempotent: safe to re-run any number of times.
-- ============================================================

-- 0) Notification preferences on the citizen profile
alter table profiles add column if not exists settings jsonb;

-- 0b) Purge ANY existing policies on the vote/reaction tables first, so
--     re-runs never fail with "policy already exists" no matter what the
--     tables were created with.
do $$
declare r record;
begin
  for r in select policyname, tablename from pg_policies
    where schemaname = 'public' and tablename in ('issue_votes', 'issue_reactions')
  loop
    execute format('drop policy if exists %I on %I', r.policyname, r.tablename);
  end loop;
end $$;

-- 1) Per-user issue votes (one row per user per issue)
create table if not exists issue_votes (
  user_id uuid not null references auth.users(id) on delete cascade,
  issue_id text not null references issues(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, issue_id)
);

alter table issue_votes enable row level security;

-- Counts are denormalized onto issues.upvotes, so nobody needs to read the
-- full table — only your own rows (keeps user↔issue mappings private).
create policy "read own issue_votes" on issue_votes for select using (auth.uid() = user_id);
create policy "insert own issue_votes" on issue_votes for insert with check (auth.uid() = user_id);
create policy "delete own issue_votes" on issue_votes for delete using (auth.uid() = user_id);

-- 2) Per-user reactions on official updates (one row per user per issue)
create table if not exists issue_reactions (
  user_id uuid not null references auth.users(id) on delete cascade,
  issue_id text not null references issues(id) on delete cascade,
  type text not null check (type in ('up', 'heart', 'down')),
  created_at timestamptz not null default now(),
  primary key (user_id, issue_id)
);

alter table issue_reactions enable row level security;

create policy "read own issue_reactions" on issue_reactions for select using (auth.uid() = user_id);
create policy "insert own issue_reactions" on issue_reactions for insert with check (auth.uid() = user_id);
create policy "update own issue_reactions" on issue_reactions for update using (auth.uid() = user_id);
create policy "delete own issue_reactions" on issue_reactions for delete using (auth.uid() = user_id);

-- 3) Toggle an upvote atomically; returns the new count.
create or replace function record_vote(p_issue_id text)
returns integer
language plpgsql security definer
as $$
declare
  v_user_id uuid := auth.uid();
  v_new integer;
begin
  if v_user_id is null then
    raise exception 'Not signed in';
  end if;
  if exists (select 1 from issue_votes where user_id = v_user_id and issue_id = p_issue_id) then
    delete from issue_votes where user_id = v_user_id and issue_id = p_issue_id;
    update issues set upvotes = greatest(0, upvotes - 1) where id = p_issue_id;
  else
    insert into issue_votes (user_id, issue_id) values (v_user_id, p_issue_id);
    update issues set upvotes = upvotes + 1 where id = p_issue_id;
  end if;
  select upvotes into v_new from issues where id = p_issue_id;
  if v_new is null then
    raise exception 'Issue not found';
  end if;
  return v_new;
end $$;

-- 4) Toggle / switch a reaction; recomputes official.reactions from the table.
--    Returns {"reactions": {"up": n, "heart": n, "down": n}, "active": "up"|null}
create or replace function record_reaction(p_issue_id text, p_type text)
returns jsonb
language plpgsql security definer
as $$
declare
  v_user_id uuid := auth.uid();
  v_reactions jsonb;
  v_active text;
begin
  if v_user_id is null then
    raise exception 'Not signed in';
  end if;
  if p_type not in ('up', 'heart', 'down') then
    raise exception 'Invalid reaction type';
  end if;
  if not exists (select 1 from issues where id = p_issue_id) then
    raise exception 'Issue not found';
  end if;

  if exists (
    select 1 from issue_reactions
    where user_id = v_user_id and issue_id = p_issue_id and type = p_type
  ) then
    delete from issue_reactions where user_id = v_user_id and issue_id = p_issue_id;
    v_active := null;
  elsif exists (
    select 1 from issue_reactions
    where user_id = v_user_id and issue_id = p_issue_id
  ) then
    update issue_reactions set type = p_type
    where user_id = v_user_id and issue_id = p_issue_id;
    v_active := p_type;
  else
    insert into issue_reactions (user_id, issue_id, type) values (v_user_id, p_issue_id, p_type);
    v_active := p_type;
  end if;

  select jsonb_build_object(
    'up',    (select count(*) from issue_reactions where issue_id = p_issue_id and type = 'up'),
    'heart', (select count(*) from issue_reactions where issue_id = p_issue_id and type = 'heart'),
    'down',  (select count(*) from issue_reactions where issue_id = p_issue_id and type = 'down')
  ) into v_reactions;

  update issues
  set official = jsonb_set(coalesce(official, '{}'::jsonb), '{reactions}', v_reactions)
  where id = p_issue_id;

  return jsonb_build_object('reactions', v_reactions, 'active', v_active);
end $$;

-- 5) Notification preference gate (mirrors the Settings screen).
--    Default: notify unless the user explicitly disabled that type.
create or replace function should_notify(p_user_id uuid, p_type text)
returns boolean
language sql stable
as $$
  select coalesce(
    case
      when p_type = 'budget' then (p.settings ->> 'notifBudget') is distinct from 'false'
      when p_type in ('update', 'resolved', 'alert', 'event', 'reply') then (p.settings ->> 'notifPush') is distinct from 'false'
      else true
    end,
    true
  )
  from profiles p
  where p.user_id = p_user_id;
$$;

-- 6) Fan out a notification to followers + the reporter, honoring prefs.
--    Only an approved organization may call this (same rule as post_official_update).
create or replace function notify_followers(
  p_issue_id text,
  p_title text,
  p_body text,
  p_type text default 'update',
  p_icon text default '🔔'
)
returns void
language plpgsql security definer
as $$
declare
  v_user_id uuid;
begin
  if not exists (
    select 1 from organizations o
    join auth.users u on u.id = auth.uid()
    where o.email = u.email and o.status = 'approved'
  ) then
    raise exception 'Not authorized — only an approved organization can notify citizens';
  end if;
  for v_user_id in
    select distinct user_id
    from (
      select user_id from follows where issue_id = p_issue_id
      union
      select user_id::uuid from issues
      where id = p_issue_id
        and user_id is not null
        and user_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    ) t
  loop
    if should_notify(v_user_id, p_type) then
      insert into notifications (user_id, issue_id, icon, title, body, type, read)
      values (v_user_id, p_issue_id, p_icon, p_title, p_body, p_type, false);
    end if;
  end loop;
end $$;

-- ============================================================
-- 9) Phase 2: SLA deadlines & auto-overdue
-- ============================================================
-- ============================================================

-- 0) SLA deadline per issue, computed at report time per category.
--    Mirrors SLA_DAYS in src/lib/constants.ts — keep both in sync.
alter table issues add column if not exists expected_at timestamptz;

create or replace function sla_interval(p_category text)
returns interval
language sql immutable
as $$
  select case p_category
    when 'Water' then interval '7 days'
    when 'Garbage' then interval '5 days'
    when 'Road' then interval '15 days'
    when 'Electricity' then interval '10 days'
    when 'Traffic' then interval '15 days'
    when 'Drainage' then interval '10 days'
    else interval '21 days'
  end;
$$;

-- 1) Backfill existing rows from their creation time.
update issues
set expected_at = created_at + sla_interval(category)
where expected_at is null;

-- 2) Trigger: set expected_at on new reports (authoritative; a client-provided
--    value is never overwritten).
create or replace function set_issue_expected_at()
returns trigger
language plpgsql
as $$
begin
  if new.expected_at is null then
    new.expected_at := now() + sla_interval(new.category);
  end if;
  return new;
end $$;

drop trigger if exists trg_set_expected_at on issues;
create trigger trg_set_expected_at
before insert on issues
for each row execute function set_issue_expected_at();

-- 3) Auto-overdue: flips open issues past their deadline. Called hourly by cron.
create or replace function mark_overdue()
returns integer
language plpgsql security definer
as $$
declare
  v_count integer;
begin
  update issues
  set status = 'overdue'
  where expected_at is not null
    and expected_at < now()
    and status in ('reported', 'under_review', 'in_progress');
  get diagnostics v_count = row_count;
  return v_count;
end $$;

-- 4) Hourly pg_cron job (idempotent: drop any previous job with this name first).
create extension if not exists pg_cron;

do $$
declare
  j record;
begin
  for j in select jobid from cron.job where jobname = 'ct-mark-overdue' loop
    perform cron.unschedule(j.jobid);
  end loop;
end $$;

select cron.schedule('ct-mark-overdue', '0 * * * *', $$ select public.mark_overdue() $$);

-- ============================================================
-- 10) Phase 3: org portal depth (post_official_update + contractor)
-- ============================================================
-- Fully idempotent: safe to re-run any number of times.
-- ============================================================

create or replace function post_official_update(
  p_issue_id text,
  p_official jsonb,
  p_status text default null,
  p_budget numeric default null,
  p_spent numeric default null,
  p_completionpct numeric default null,
  p_aftercover jsonb default null,
  p_clear_expected boolean default false,
  p_completed_at timestamptz default null,
  p_timeline jsonb default null,
  p_contractor text default null
)
returns void
language plpgsql security definer
as $$
declare
  caller_email text;
begin
  select u.email into caller_email from auth.users u where u.id = auth.uid();
  if caller_email is null or not exists (
    select 1 from organizations o
    where o.email = caller_email and o.status = 'approved'
  ) then
    raise exception 'Not authorized — only an approved organization can post official updates';
  end if;
  update issues
  set official = p_official,
      status = coalesce(p_status, status),
      budget = coalesce(p_budget, budget),
      spent = coalesce(p_spent, spent),
      completionpct = coalesce(p_completionpct, completionpct),
      aftercover = coalesce(p_aftercover, aftercover),
      expected = case when p_clear_expected then null else expected end,
      completed_at = coalesce(p_completed_at, completed_at),
      timeline = coalesce(p_timeline, timeline),
      contractor = coalesce(p_contractor, contractor)
  where id = p_issue_id;
  if not found then
    raise exception 'Issue not found';
  end if;
end $$;

-- ============================================================
-- 11) Phase 4: org RLS fix + admin approval (see upgrade-phase4.sql)
-- ============================================================
-- organizations inside itself -> "infinite recursion detected".
-- This purges EVERY policy on the org tables and rebuilds them
-- through SECURITY DEFINER helpers, plus recreates
-- approve_organization (missing on some projects).
-- Fully idempotent: safe to re-run any number of times.
-- ============================================================

-- 0) Purge ALL existing policies on organizations + notifications first,
--     so re-runs never fail with "policy already exists" no matter what
--     earlier versions created.
do $$
declare r record;
begin
  for r in select policyname, tablename from pg_policies
    where schemaname = 'public' and tablename in ('organizations', 'notifications')
  loop
    execute format('drop policy if exists %I on %I', r.policyname, r.tablename);
  end loop;
end $$;

-- 1) Helpers used by policies. SECURITY DEFINER so they run as the owner
--    and never re-enter RLS on organizations (kills the recursion).
create or replace function is_org_admin()
returns boolean
language sql security definer stable
as $$
  select exists (
    select 1 from organizations o
    join auth.users u on u.id = auth.uid()
    where o.email = u.email and o.role = 'admin' and o.status = 'approved'
  );
$$;

create or replace function is_approved_org()
returns boolean
language sql security definer stable
as $$
  select exists (
    select 1 from organizations o
    join auth.users u on u.id = auth.uid()
    where o.email = u.email and o.status = 'approved'
  );
$$;

-- 2) Organizations RLS — reads only for your own row or an approved admin.
alter table organizations enable row level security;

create policy "own or admin read organizations" on organizations
  for select using (email = auth.email() or is_org_admin());

create policy "anyone register organization" on organizations
  for insert with check (true);

create policy "update organizations" on organizations
  for update using (false);

create policy "delete organizations" on organizations
  for delete using (false);

-- 3) Notifications RLS — own reads; only approved orgs can insert
--    (they are generated by notify_followers / post_official_update).
alter table notifications enable row level security;

create policy "read own notifications" on notifications
  for select using (auth.uid() = user_id);

create policy "org insert notifications" on notifications
  for insert with check (is_approved_org());

create policy "update own notifications" on notifications
  for update using (auth.uid() = user_id);

-- 4) Admin-only organization approval: SECURITY DEFINER so it runs with the
--    owner's privileges; only an approved admin-role organization may call it.
create or replace function approve_organization(p_id uuid, p_status text)
returns void
language plpgsql security definer
as $$
declare
  caller_admin boolean;
begin
  if p_status not in ('approved', 'rejected') then
    raise exception 'invalid status';
  end if;
  select exists (
    select 1
    from organizations o
    join auth.users u on u.id = auth.uid()
    where o.email = u.email and o.role = 'admin' and o.status = 'approved'
  ) into caller_admin;
  if not caller_admin then
    raise exception 'Not authorized — only an approved admin organization can approve registrations';
  end if;
  update organizations
  set status = p_status,
      approved_at = case when p_status = 'approved' then now() else null end
  where id = p_id;
end $$;

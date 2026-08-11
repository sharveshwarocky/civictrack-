-- ============================================================
-- CivicTrack — Phase 1 upgrade: per-user votes & reactions,
-- notification preferences + fan-out RPC.
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

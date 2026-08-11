-- ============================================================
-- CivicTrack — Phase 7 upgrade: identity history for admin.
-- A private audit table linking every auth user to their real
-- Gmail (via auth.users) and EVERY username they've ever used.
-- Readable only by an approved admin (through admin_list_users,
-- SECURITY DEFINER). Citizens never see it.
-- Fully idempotent: safe to re-run any number of times.
-- ============================================================

-- ============================================================
-- 1) username_history — one row per username a person has held.
-- ============================================================
create table if not exists username_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  username text not null,
  changed_at timestamptz not null default now()
);

alter table username_history enable row level security;

-- No read/insert/update/delete policies: the table is only reachable
-- through SECURITY DEFINER admin functions (bypass RLS). Citizens have
-- zero access — not even to their own history.

-- Index for the admin's per-user lookup.
create index if not exists username_history_user_idx on username_history (user_id, changed_at desc);

-- ============================================================
-- 2) Trigger: record every username the moment it's set/changed.
--    Fires on INSERT (signup/onboarding) and UPDATE of username
--    (profile edit), so the full audit trail is automatic.
--    SECURITY DEFINER is required: it runs as the owner and bypasses
--    the table's RLS so citizens can't write their own history.
-- ============================================================
create or replace function record_username_change()
returns trigger
language plpgsql security definer
as $$
begin
  -- Only record a real change (skip no-op updates).
  if tg_op = 'INSERT' or new.username is distinct from old.username then
    insert into username_history (user_id, username, changed_at)
    values (new.user_id, new.username, now());
  end if;
  return new;
end $$;

drop trigger if exists trg_username_history on profiles;
create trigger trg_username_history
  after insert or update of username on profiles
  for each row execute function record_username_change();

-- ============================================================
-- 3) Backfill: capture the current username of existing profiles
--    (they predate the trigger) with their created_at as the date.
--    Note: only the CURRENT username is recoverable — earlier
--    renames made before this phase cannot be reconstructed.
-- ============================================================
insert into username_history (user_id, username, changed_at)
select p.user_id, p.username, coalesce(p.created_at, now())
from profiles p
where not exists (
  select 1 from username_history h
  where h.user_id = p.user_id and h.username = p.username
);

-- ============================================================
-- 4) Extend admin_list_users with a compact history summary so the
--    Citizens tab can show previous usernames inline (latest first).
--    CRITICAL: CREATE OR REPLACE cannot change a function's return
--    type (Phase 3 lesson), so the old 7-column version must be
--    dropped first.
-- ============================================================
drop function if exists admin_list_users(text);

create or replace function admin_list_users(p_search text default '')
returns table (
  user_id uuid,
  email text,
  username text,
  home_area text,
  created_at timestamptz,
  issues_count bigint,
  comments_count bigint,
  username_history jsonb
)
language plpgsql security definer
as $$
begin
  if not is_org_admin() then
    raise exception 'Not authorized — only an approved admin can list users';
  end if;
  return query
    select
      u.id::uuid,
      u.email::text,
      p.username::text,
      p.home_area::text,
      u.created_at::timestamptz,
      (select count(*)::bigint from issues i where i.user_id = u.id::text),
      (select count(*)::bigint from comments c where c.user_id = u.id::text),
      coalesce(
        (select jsonb_agg(jsonb_build_object('username', h.username, 'changed_at', h.changed_at) order by h.changed_at desc)
         from username_history h where h.user_id = u.id),
        '[]'::jsonb
      )
    from auth.users u
    left join profiles p on p.user_id = u.id
    where p_search = ''
       or u.email ilike '%' || p_search || '%'
       or p.username ilike '%' || p_search || '%'
    order by u.created_at desc
    limit 100;
end $$;

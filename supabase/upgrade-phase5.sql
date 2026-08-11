-- ============================================================
-- CivicTrack — Phase 5 upgrade: fix post_official_update overload.
-- Phase 3's `create or replace` added p_contractor, but PostgreSQL
-- cannot change a function signature with CREATE OR REPLACE — it
-- created a NEW 11-param overload while the old 10-param one
-- survived. PostgREST then reports PGRST203 (ambiguous) when the
-- app calls without p_contractor.
-- Fully idempotent: safe to re-run any number of times.
-- ============================================================

-- Drop the stale 10-param overload (old Phase-2 signature).
drop function if exists post_official_update(
  p_issue_id text,
  p_official jsonb,
  p_status text,
  p_budget numeric,
  p_spent numeric,
  p_completionpct numeric,
  p_aftercover jsonb,
  p_clear_expected boolean,
  p_completed_at timestamptz,
  p_timeline jsonb
);

-- Recreate the current 11-param signature (with p_contractor).
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

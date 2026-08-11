-- ============================================================
-- CivicTrack — Phase 3 upgrade: org portal depth.
-- (1) post_official_update gains a contractor param.
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

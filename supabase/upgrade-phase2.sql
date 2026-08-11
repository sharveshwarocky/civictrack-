-- ============================================================
-- CivicTrack — Phase 2 upgrade: SLA deadlines & auto-overdue.
-- Fully idempotent: safe to re-run any number of times.
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

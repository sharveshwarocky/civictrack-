-- ============================================================
-- CivicTrack — Phase 8 upgrade: full release.
-- Moderation & trust (audit log, suspension, flag/report),
-- multi-photo reports, world location chooser support,
-- trending by engagement, weekly in-app digest.
-- Fully idempotent: safe to re-run any number of times.
-- ============================================================

-- ============================================================
-- 1) Column additions (idempotent)
-- ============================================================
alter table issues add column if not exists photos jsonb;
alter table issues add column if not exists hidden boolean not null default false;
alter table comments add column if not exists hidden boolean not null default false;
alter table profiles add column if not exists suspended boolean not null default false;
alter table profiles add column if not exists suspended_at timestamptz;
alter table profiles add column if not exists suspended_reason text;
alter table profiles add column if not exists digest boolean not null default true;
alter table organizations add column if not exists inactive boolean not null default false;
-- Trending (section 8) counts votes in the last 48h — guarantee the column exists.
alter table issue_votes add column if not exists created_at timestamptz not null default now();

-- Backfill: existing single cover becomes photos[0] so multi-photo views work.
update issues set photos = jsonb_build_array(cover) where photos is null and cover is not null and cover <> 'null'::jsonb;
update issues set photos = '[]'::jsonb where photos is null;

-- ============================================================
-- 2) is_suspended() helper — SECURITY DEFINER so RLS policies and
--    write RPCs can call it without tripping profiles' own-row RLS.
-- ============================================================
create or replace function is_suspended()
returns boolean
language sql security definer stable
as $$
  select exists (select 1 from profiles p where p.user_id = auth.uid() and p.suspended);
$$;

-- ============================================================
-- 3) Admin audit log — every moderation action, never deleted.
-- ============================================================
create table if not exists admin_audit (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid,
  actor_email text,
  action text not null,
  target_type text not null,
  target_id text,
  target_summary text,
  details jsonb,
  created_at timestamptz not null default now()
);

alter table admin_audit enable row level security;

drop policy if exists "admin read audit" on admin_audit;
create policy "admin read audit" on admin_audit for select using (is_org_admin());
-- No insert/update/delete policies: only SECURITY DEFINER functions write.

create or replace function log_audit(
  p_action text,
  p_target_type text,
  p_target_id text default null,
  p_target_summary text default null,
  p_details jsonb default null
) returns void
language plpgsql security definer
as $$
declare
  v_email text;
begin
  select u.email::text into v_email from auth.users u where u.id = auth.uid();
  insert into admin_audit (actor_user_id, actor_email, action, target_type, target_id, target_summary, details)
  values (auth.uid(), v_email, p_action, p_target_type, p_target_id, p_target_summary, p_details);
end $$;

create or replace function admin_list_audit(p_limit integer default 100)
returns table (
  actor_email text,
  action text,
  target_type text,
  target_id text,
  target_summary text,
  details jsonb,
  created_at timestamptz
)
language plpgsql security definer
as $$
begin
  if not is_org_admin() then
    raise exception 'Not authorized — only an approved admin can view the audit log';
  end if;
  return query
    select a.actor_email::text, a.action::text, a.target_type::text, a.target_id::text,
           a.target_summary::text, a.details, a.created_at::timestamptz
    from admin_audit a
    order by a.created_at desc
    limit greatest(coalesce(p_limit, 100), 1);
end $$;

-- ============================================================
-- 4) Flag & report flow — 5+ reports auto-hides, admin decides.
-- ============================================================
create table if not exists reports (
  id uuid primary key default gen_random_uuid(),
  reporter_user_id uuid not null references auth.users(id) on delete cascade,
  target_type text not null check (target_type in ('issue', 'comment')),
  target_id text not null,
  reason text not null,
  created_at timestamptz not null default now(),
  unique (reporter_user_id, target_type, target_id)
);

alter table reports enable row level security;

drop policy if exists "read reports" on reports;
create policy "read reports" on reports
  for select using (auth.uid() = reporter_user_id or is_org_admin());

drop policy if exists "insert own report" on reports;
create policy "insert own report" on reports
  for insert with check (auth.uid() = reporter_user_id and auth.role() = 'authenticated' and not is_suspended());
-- No update/delete policies — moderation runs through RPCs only.

create table if not exists moderation_queue (
  id uuid primary key default gen_random_uuid(),
  target_type text not null check (target_type in ('issue', 'comment')),
  target_id text not null,
  reports_count integer not null default 1,
  status text not null default 'pending',   -- pending | hidden | resolved
  hidden_by_auto boolean not null default false,
  decided_by uuid,
  decided_at timestamptz,
  decision text,                            -- restored | deleted
  created_at timestamptz not null default now(),
  unique (target_type, target_id)
);

alter table moderation_queue enable row level security;

drop policy if exists "admin read queue" on moderation_queue;
create policy "admin read queue" on moderation_queue for select using (is_org_admin());
-- Writes only through report_content / resolve_report (SECURITY DEFINER).

-- Citizen reports content. Returns null on success, else an error message.
create or replace function report_content(p_target_type text, p_target_id text, p_reason text)
returns text
language plpgsql security definer
as $$
declare
  v_uid uuid := auth.uid();
  v_count integer;
  v_qid uuid;
begin
  if v_uid is null then return 'Sign in to report content'; end if;
  if is_suspended() then return 'Your account is suspended'; end if;
  if p_target_type not in ('issue', 'comment') then return 'Invalid target type'; end if;
  if p_reason is null or length(p_reason) < 3 then return 'Please choose a reason'; end if;
  if p_target_type = 'issue' and not exists (select 1 from issues where id = p_target_id) then
    return 'Report not found';
  end if;
  if p_target_type = 'comment' and not exists (select 1 from comments where id = p_target_id) then
    return 'Comment not found';
  end if;
  if exists (select 1 from reports where reporter_user_id = v_uid and target_type = p_target_type and target_id = p_target_id) then
    return 'You have already reported this';
  end if;

  insert into reports (reporter_user_id, target_type, target_id, reason)
  values (v_uid, p_target_type, p_target_id, p_reason);

  insert into moderation_queue (target_type, target_id, reports_count)
  values (p_target_type, p_target_id, 1)
  on conflict (target_type, target_id)
  do update set reports_count = moderation_queue.reports_count + 1
  returning id into v_qid;

  -- Auto-hide at 5+ reports; the admin decides in the moderation queue.
  select reports_count into v_count from moderation_queue where id = v_qid;
  if v_count >= 5 then
    update moderation_queue set status = 'hidden', hidden_by_auto = true where id = v_qid;
    if p_target_type = 'issue' then
      update issues set hidden = true where id = p_target_id;
    else
      update comments set hidden = true where id = p_target_id;
    end if;
  end if;
  return null;
end $$;

-- Admin decides on a queued item: restore (unhide + clear reports) or delete.
create or replace function resolve_report(p_queue_id uuid, p_decision text)
returns text
language plpgsql security definer
as $$
declare
  v_rec moderation_queue%rowtype;
begin
  if not is_org_admin() then return 'Not authorized — only an approved admin can moderate'; end if;
  if p_decision not in ('restore', 'delete') then return 'Invalid decision'; end if;
  select * into v_rec from moderation_queue where id = p_queue_id;
  if not found then return 'Queue item not found'; end if;

  if p_decision = 'restore' then
    if v_rec.target_type = 'issue' then
      update issues set hidden = false where id = v_rec.target_id;
    else
      update comments set hidden = false where id = v_rec.target_id;
    end if;
    update moderation_queue
      set status = 'resolved', decision = 'restored', decided_by = auth.uid(), decided_at = now()
      where id = p_queue_id;
    delete from reports where target_type = v_rec.target_type and target_id = v_rec.target_id;
  else
    if v_rec.target_type = 'issue' then
      perform delete_issue(v_rec.target_id);
    else
      delete from comments where id = v_rec.target_id;
    end if;
    update moderation_queue
      set status = 'resolved', decision = 'deleted', decided_by = auth.uid(), decided_at = now()
      where id = p_queue_id;
  end if;

  perform log_audit('moderate_' || p_decision, v_rec.target_type, v_rec.target_id,
    case when v_rec.target_type = 'issue' then (select title from issues where id = v_rec.target_id) else null end,
    jsonb_build_object('queue_id', p_queue_id, 'reports_count', v_rec.reports_count));
  return null;
end $$;

-- Admin reads the queue (pending + auto-hidden first).
create or replace function admin_list_queue()
returns table (
  id uuid,
  target_type text,
  target_id text,
  reports_count integer,
  status text,
  hidden_by_auto boolean,
  target_title text,
  reasons jsonb
)
language plpgsql security definer
as $$
begin
  if not is_org_admin() then
    raise exception 'Not authorized — only an approved admin can view the queue';
  end if;
  return query
    select q.id::uuid, q.target_type::text, q.target_id::text,
           q.reports_count::integer, q.status::text, q.hidden_by_auto::boolean,
           case when q.target_type = 'issue' then (select i.title from issues i where i.id = q.target_id) else null end::text,
           (select jsonb_agg(r.reason) from reports r where r.target_type = q.target_type and r.target_id = q.target_id)::jsonb
    from moderation_queue q
    where q.status <> 'resolved'
    order by (q.status = 'hidden') desc, q.reports_count desc, q.created_at desc;
end $$;

-- ============================================================
-- 5) Admin removes an organization — admin picks the depth.
--    'full'      → delete org row + auth login (issues stay)
--    'wipe'      → delete org account + strip all their official
--                  updates / after photos / timelines from issues
--    'deactivate'→ flip inactive + rejected (reversible, history stays)
-- ============================================================
create or replace function admin_remove_org(p_org_id uuid, p_mode text)
returns text
language plpgsql security definer
as $$
declare
  v_org organizations%rowtype;
  v_email text;
begin
  if not is_org_admin() then return 'Not authorized — only an approved admin can remove organizations'; end if;
  if p_mode not in ('full', 'wipe', 'deactivate') then return 'Invalid mode'; end if;
  select * into v_org from organizations where id = p_org_id;
  if not found then return 'Organization not found'; end if;
  v_email := v_org.email;

  -- Never let an admin remove their own account.
  if exists (select 1 from auth.users u where u.email = v_email and u.id = auth.uid()) then
    return 'You cannot remove your own organization account';
  end if;

  if p_mode = 'deactivate' then
    update organizations set inactive = true, status = 'rejected' where id = p_org_id;
    perform log_audit('org_deactivate', 'organization', p_org_id::text, v_org.org_name);
    return null;
  end if;

  -- Strip this org's official footprint from issues (orgId or agency name).
  update issues
    set official = null, aftercover = null, timeline = '[]'::jsonb, contractor = null
    where official is not null
      and (official->>'orgId' = v_org.id::text or official->>'agency' = v_org.org_name);

  if p_mode = 'wipe' then
    update organizations set inactive = true, status = 'rejected' where id = p_org_id;
    delete from auth.users where email = v_email;
    perform log_audit('org_remove_wipe', 'organization', p_org_id::text, v_org.org_name);
    return null;
  end if;

  delete from organizations where id = p_org_id;
  delete from auth.users where email = v_email;
  perform log_audit('org_remove_full', 'organization', p_org_id::text, v_org.org_name);
  return null;
end $$;

-- ============================================================
-- 6) Suspension (soft-ban): login blocked + content hidden, reversible.
-- ============================================================
create or replace function admin_suspend_user(p_user_id uuid, p_reason text default '')
returns text
language plpgsql security definer
as $$
begin
  if not is_org_admin() then return 'Not authorized — only an approved admin can suspend accounts'; end if;
  if p_user_id = auth.uid() then return 'You cannot suspend yourself'; end if;
  if not exists (select 1 from auth.users where id = p_user_id) then return 'User not found'; end if;
  update profiles
    set suspended = true, suspended_at = now(),
        suspended_reason = coalesce(nullif(p_reason, ''), 'No reason given')
    where user_id = p_user_id;
  update issues set hidden = true where user_id = p_user_id::text;
  update comments set hidden = true where user_id = p_user_id::text;
  perform log_audit('user_suspend', 'user', p_user_id::text, null, jsonb_build_object('reason', p_reason));
  return null;
end $$;

create or replace function admin_restore_user(p_user_id uuid)
returns text
language plpgsql security definer
as $$
begin
  if not is_org_admin() then return 'Not authorized — only an approved admin can restore accounts'; end if;
  update profiles set suspended = false, suspended_at = null, suspended_reason = null
    where user_id = p_user_id;
  update issues set hidden = false where user_id = p_user_id::text;
  update comments set hidden = false where user_id = p_user_id::text;
  perform log_audit('user_restore', 'user', p_user_id::text);
  return null;
end $$;

-- ============================================================
-- 7) Username availability check for onboarding.
-- ============================================================
create or replace function username_taken(p_username text)
returns boolean
language sql security definer stable
as $$
  select exists (select 1 from profiles where lower(username) = lower(p_username));
$$;

-- ============================================================
-- 8) Trending = hot issues by engagement in the last 48h.
-- ============================================================
create or replace function trending_issues(p_limit integer default 10)
returns table (id text, score bigint)
language sql stable
as $$
  select i.id,
    (count(distinct v.user_id) + count(distinct c.id))::bigint as score
  from issues i
  left join issue_votes v on v.issue_id = i.id and v.created_at > now() - interval '48 hours'
  left join comments c on c.issue_id = i.id and c.created_at > now() - interval '48 hours'
  where i.hidden = false
  group by i.id
  order by score desc, i.created_at desc
  limit greatest(coalesce(p_limit, 10), 1);
$$;

-- ============================================================
-- 9) Weekly in-app digest — builds a digest notification per user.
--    Runs weekly via pg_cron (job created below, idempotent).
-- ============================================================
create or replace function weekly_digest_build()
returns void
language plpgsql security definer
as $$
declare
  r record;
  v_new integer;
  v_changed integer;
  v_resolved integer;
begin
  for r in
    select u.id as uid, p.home_area
    from auth.users u
    join profiles p on p.user_id = u.id
    where p.onboarded and p.digest
  loop
    select count(*) into v_new from issues
      where created_at > now() - interval '7 days'
        and (r.home_area is null or area = r.home_area)
        and hidden = false;
    select count(*) into v_changed from issues i
      where i.official is not null
        and i.official->>'postedAt' ~ '^[0-9]{4}-'
        and (i.official->>'postedAt')::timestamptz > now() - interval '7 days'
        and (exists (select 1 from follows f where f.user_id = r.uid and f.issue_id = i.id)
             or i.user_id = r.uid::text);
    select count(*) into v_resolved from issues
      where completed_at > now() - interval '7 days'
        and (exists (select 1 from follows f where f.user_id = r.uid and f.issue_id = id)
             or user_id = r.uid::text);
    insert into notifications (user_id, issue_id, icon, title, body, type)
    values (r.uid, null, '📊', 'Your weekly civic digest',
      format('%s new issues in %s · %s updates you follow · %s resolved',
             v_new, coalesce(r.home_area, 'your area'), v_changed, v_resolved),
      'event');
  end loop;
end $$;

-- ============================================================
-- 10) Gate suspended users out of content writes.
-- ============================================================
drop policy if exists "public insert issues" on issues;
create policy "public insert issues" on issues
  for insert with check (auth.role() = 'authenticated' and not is_suspended());

drop policy if exists "authenticated insert comments" on comments;
create policy "authenticated insert comments" on comments
  for insert with check (auth.role() = 'authenticated' and not is_suspended());

drop policy if exists "insert own follow" on follows;
create policy "insert own follow" on follows
  for insert with check (auth.uid() = user_id and not is_suspended());

-- ============================================================
-- 11) Suspended users can't vote or react either (server-authoritative).
-- ============================================================
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
  if is_suspended() then
    raise exception 'Account suspended';
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
  if is_suspended() then
    raise exception 'Account suspended';
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

  return jsonb_build_object('reactions', v_reactions, 'active', v_active);
end $$;

-- ============================================================
-- 12) admin_list_users — add the suspended flag (return type changed,
--     so DROP first: CREATE OR REPLACE cannot change the return type).
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
  suspended boolean,
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
      coalesce(p.suspended, false)::boolean,
      coalesce((
        select jsonb_agg(jsonb_build_object('username', h.username, 'changed_at', h.changed_at) order by h.changed_at desc)
        from username_history h where h.user_id = u.id
      ), '[]'::jsonb)::jsonb
    from auth.users u
    left join profiles p on p.user_id = u.id
    where p_search = ''
       or u.email ilike '%' || p_search || '%'
       or p.username ilike '%' || p_search || '%'
    order by u.created_at desc
    limit 100;
end $$;

-- ============================================================
-- 13) Weekly digest cron (idempotent). Runs every Monday 7am.
-- ============================================================
do $$
declare
  j record;
begin
  create extension if not exists pg_cron;
  for j in select jobid from cron.job where jobname = 'ct-weekly-digest' loop
    perform cron.unschedule(j.jobid);
  end loop;
  perform cron.schedule('ct-weekly-digest', '0 7 * * 1', $$select weekly_digest_build()$$);
end $$;

-- ============================================================
-- 14) Realtime — admin moderation surfaces appear instantly.
-- ============================================================
do $$
declare
  tbl text;
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    foreach tbl in array array['reports', 'moderation_queue', 'admin_audit'] loop
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
-- 15) Grants — new RPCs callable by anon (RPCs self-gate) and
--     the authenticated role.
-- ============================================================
grant execute on function report_content(text, text, text) to anon, authenticated;
grant execute on function resolve_report(uuid, text) to authenticated;
grant execute on function admin_list_queue() to authenticated;
grant execute on function admin_list_audit(integer) to authenticated;
grant execute on function admin_remove_org(uuid, text) to authenticated;
grant execute on function admin_suspend_user(uuid, text) to authenticated;
grant execute on function admin_restore_user(uuid) to authenticated;
grant execute on function username_taken(text) to anon, authenticated;
grant execute on function trending_issues(integer) to anon, authenticated;
grant execute on function weekly_digest_build() to authenticated;

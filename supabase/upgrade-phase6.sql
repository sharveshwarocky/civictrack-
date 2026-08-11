-- ============================================================
-- 1) Delete policies
-- ============================================================

-- Issues: the reporter (user_id) or any approved admin may delete.
drop policy if exists "public delete issues" on issues;
drop policy if exists "owner or admin delete issues" on issues;
create policy "owner or admin delete issues" on issues
  for delete using (auth.uid()::text = user_id or is_org_admin());

-- Comments: the author (user_id) or any approved admin may delete.
drop policy if exists "owner or admin delete comments" on comments;
create policy "owner or admin delete comments" on comments
  for delete using (auth.uid()::text = user_id or is_org_admin());

-- ============================================================
-- 2) Atomic issue deletion (issue + its comments + cascades)
--    Comments carry no FK to issues, so deleting a report must
--    remove its comments in the same transaction.
-- ============================================================
create or replace function delete_issue(p_issue_id text)
returns void
language plpgsql security definer
as $$
declare
  v_reporter text;
begin
  if not exists (select 1 from issues where id = p_issue_id) then
    raise exception 'Issue not found';
  end if;
  select user_id into v_reporter from issues where id = p_issue_id;
  -- The reporter may be null on legacy/guest reports; an admin may delete
  -- those, a signed-in reporter may delete only their own.
  if not is_org_admin() and (v_reporter is null or v_reporter <> auth.uid()::text) then
    raise exception 'Not authorized — only the reporter or an admin can delete this issue';
  end if;
  delete from comments where issue_id = p_issue_id;
  delete from issues where id = p_issue_id;
end $$;

-- ============================================================
-- 3) Admin: list / search citizens
--    Profiles are RLS-private ("read own profile"), so the admin
--    needs a SECURITY DEFINER helper to see all of them. Returns
--    the auth identity plus username/home area plus activity.
-- ============================================================
-- ============================================================
-- Phase 6 hotfix: admin_list_users type mismatch.
-- auth.users.email is varchar(255); the declared return column is
-- text, so PostgREST rejects the RPC with 42804. Cast explicitly.
-- Safe to re-run (create or replace).
-- ============================================================
create or replace function admin_list_users(p_search text default '')
returns table (
  user_id uuid,
  email text,
  username text,
  home_area text,
  created_at timestamptz,
  issues_count bigint,
  comments_count bigint
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
      (select count(*)::bigint from comments c where c.user_id = u.id::text)
    from auth.users u
    left join profiles p on p.user_id = u.id
    where p_search = ''
       or u.email ilike '%' || p_search || '%'
       or p.username ilike '%' || p_search || '%'
    order by u.created_at desc
    limit 100;
end $$;

-- ============================================================
-- 4) Admin: remove a citizen account (and all their content)
--    Deleting from auth.users cascades to profiles, follows,
--    notifications, issue_votes and issue_reactions via FK.
--    issues/comments carry text user_id (no FK) so we clean
--    those explicitly first. Organization accounts are managed
--    from the Organizations tab, never deleted from here.
-- ============================================================
create or replace function admin_delete_user(p_user_id uuid)
returns void
language plpgsql security definer
as $$
begin
  if not is_org_admin() then
    raise exception 'Not authorized — only an approved admin can remove users';
  end if;
  if p_user_id = auth.uid() then
    raise exception 'You cannot remove your own account';
  end if;
  if exists (
    select 1 from auth.users u
    where u.id = p_user_id and u.raw_user_meta_data ->> 'role' = 'org'
  ) then
    raise exception 'This is an organization account — remove it from the Organizations tab instead';
  end if;
  -- Wipe content authored by this user (both the reports they filed and
  -- the comments they wrote, including comments on reports they filed).
  delete from comments where user_id = p_user_id::text;
  delete from comments
  where issue_id in (select id from issues where user_id = p_user_id::text);
  delete from issues where user_id = p_user_id::text;
  -- Cascade removes the profile, follows, notifications, votes, reactions.
  delete from auth.users where id = p_user_id;
end $$;

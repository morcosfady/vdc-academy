-- VDC Academy, migration 4: email bookkeeping for the Edge Functions and a fix for the admin bootstrap.
-- Idempotent. Run after 0003 (SQL editor or `supabase db push`).
--
-- The v6 database webhooks are gone. The browser now calls three Edge Functions after it writes a row
-- (supabase/functions/on-application-submitted, on-status-changed, notify-lead). Each function marks the row
-- once it has emailed, so a retried call or a repeated click never sends the same email twice.

-- 1. When the confirmation went out, and when the last status email went out.
alter table public.applications add column if not exists notified_at timestamptz;
alter table public.applications add column if not exists status_notified_at timestamptz;

-- Leads and contact messages get the same marker (the admin summary is sent once per row).
alter table public.leads add column if not exists notified_at timestamptz;
alter table public.contact_messages add column if not exists notified_at timestamptz;

-- Students never write these columns: the update trigger from 0003 already blocks edits to submitted rows,
-- and drafts have nothing to notify. The functions write them with the service role.
create or replace function public.applications_before_update() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    -- students: only drafts change (policy), only to draft or submitted, never the admin columns
    new.user_id := old.user_id;
    new.notes := old.notes;
    new.discount_verified := old.discount_verified;
    new.turnstile_ok := old.turnstile_ok;
    new.notified_at := old.notified_at;
    new.status_notified_at := old.status_notified_at;
    if old.status <> 'draft' then raise exception 'a submitted application can no longer be edited'; end if;
    if new.status not in ('draft','submitted') then new.status := old.status; end if;
    new.discount_status := case when new.status = 'submitted' and coalesce(new.discount_type, '') <> '' then 'pending' else 'none' end;
  end if;
  if new.status = 'submitted' and old.status <> 'submitted' then new.submitted_at := coalesce(new.submitted_at, now()); end if;
  return new;
end $$;

-- 2. Admin bootstrap. The guard in 0003 raised "only an admin can change a role" even for the dashboard, because
--    the SQL editor has no JWT (auth.uid() is null, so is_admin() is false). A call without a JWT is the dashboard
--    or the service role, both trusted; `anon` has no privileges on profiles at all; `authenticated` always carries
--    a `sub`. So: no JWT, no guard. A signed-in student still cannot promote themselves.
create or replace function public.profiles_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.id is distinct from old.id then raise exception 'profile id is immutable'; end if;
  if new.role is distinct from old.role and auth.uid() is not null and not public.is_admin() then
    raise exception 'only an admin can change a role';
  end if;
  return new;
end $$;

-- 3. Make yourself an admin (run once, with the email you signed up with on the site):
--   update public.profiles set role = 'admin' where id = (select id from auth.users where email = 'you@example.com');

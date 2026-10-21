-- VDC Academy, migration 6: bookkeeping for the account emails.
-- Idempotent. Run after 0001 to 0005 (SQL editor or `supabase db push`).
--
-- Two Edge Functions send the v9 account emails and stamp these columns with the service role:
-- - on-account-verified: the welcome email after the confirmation link (welcome_sent_at) and, for a recruiter,
--   the "new recruiter to review" email to the team (recruiter_alert_sent_at).
-- - on-recruiter-verified: the approved or rejected email (recruiter_profiles.verify_notified_at, from 0005).
-- The browser never writes them: a signed-in non-admin always keeps the stored values.

-- 1. The columns ---------------------------------------------------------------------------------------------
alter table public.profiles add column if not exists welcome_sent_at timestamptz;
alter table public.profiles add column if not exists recruiter_alert_sent_at timestamptz;

-- 2. The guard (beside public.profiles_guard from 0005, which stays as it is) ----------------------------------
-- No JWT (the dashboard, the service role, Auth itself) is trusted, the same rule as profiles_guard.
-- A client-side insert (the upsert fallback) starts with both columns empty; a client-side update keeps them.
create or replace function public.profiles_email_columns_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    if tg_op = 'INSERT' then
      new.welcome_sent_at := null;
      new.recruiter_alert_sent_at := null;
    else
      new.welcome_sent_at := old.welcome_sent_at;
      new.recruiter_alert_sent_at := old.recruiter_alert_sent_at;
    end if;
  end if;
  return new;
end $$;
drop trigger if exists profiles_email_columns_guard on public.profiles;
create trigger profiles_email_columns_guard before insert or update on public.profiles
  for each row execute function public.profiles_email_columns_guard();

-- VDC Academy, migration 3: student accounts, drafts, status timeline, admin role, private buckets.
-- Idempotent. Run after 0001 and 0002 (SQL editor or `supabase db push`).
-- Model: every applicant has an account (auth.users + public.profiles). Applications belong to a user, start as a
-- draft, and move through a status pipeline. Students see only their own rows; admins (profiles.role = 'admin')
-- see everything. Row Level Security is the real protection; the site only hides screens.

create extension if not exists pgcrypto with schema extensions;

-- 1. Profiles: one row per user, created by a trigger on sign-up.
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text,
  phone text,
  whatsapp text,
  country text,
  city text,
  age_range text,
  language text,
  current_status text check (current_status is null or current_status in ('fresh_grad','student','professional','career_changer','other')),
  degree text,
  university text,
  graduation_year int check (graduation_year is null or graduation_year between 1950 and 2100),
  linkedin_url text,
  portfolio_url text,
  avatar_path text,
  role text not null default 'student' check (role in ('student','admin')),
  marketing_opt_in boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists profiles_role_idx on public.profiles (role);

-- is_admin() reads the role on the profile (the legacy admin_emails list still works as a fallback).
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select role = 'admin' from public.profiles where id = auth.uid()), false)
      or exists (select 1 from public.admin_emails where lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')));
$$;

create or replace function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- Profile row on sign-up, from the metadata the sign-up form sends.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, current_status, marketing_opt_in)
  values (
    new.id,
    new.email,
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    case when (new.raw_user_meta_data ->> 'current_status') in ('fresh_grad','student','professional','career_changer','other')
      then new.raw_user_meta_data ->> 'current_status' else null end,
    coalesce((new.raw_user_meta_data ->> 'marketing_opt_in')::boolean, false)
  )
  on conflict (id) do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- Keep profiles.email in step with auth.users.email (change-email flow).
create or replace function public.handle_user_email_change() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update public.profiles set email = new.email where id = new.id and email is distinct from new.email;
  return new;
end $$;
drop trigger if exists on_auth_user_email_changed on auth.users;
create trigger on_auth_user_email_changed after update of email on auth.users for each row execute function public.handle_user_email_change();

-- Nobody promotes themselves: only an admin can change `role`; `id` never changes.
create or replace function public.profiles_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.id is distinct from old.id then raise exception 'profile id is immutable'; end if;
  if new.role is distinct from old.role and not public.is_admin() then
    raise exception 'only an admin can change a role';
  end if;
  return new;
end $$;
drop trigger if exists profiles_guard on public.profiles;
create trigger profiles_guard before update on public.profiles for each row execute function public.profiles_guard();
drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();

-- 2. Applications belong to a user and move through a pipeline. Drafts may be incomplete.
alter table public.applications add column if not exists user_id uuid references auth.users (id) on delete cascade;
alter table public.applications add column if not exists discount_status text not null default 'none';
alter table public.applications add column if not exists utm jsonb;
alter table public.applications add column if not exists submitted_at timestamptz;
alter table public.applications add column if not exists updated_at timestamptz not null default now();
alter table public.applications alter column full_name drop not null;
alter table public.applications alter column email drop not null;
alter table public.applications alter column phone drop not null;
alter table public.applications alter column country drop not null;
alter table public.applications alter column city drop not null;
alter table public.applications alter column consent_privacy set default false;
alter table public.applications alter column consent_contact set default false;
create index if not exists applications_user_idx on public.applications (user_id);

-- New status set (old rows are mapped: new -> submitted, contacted -> under_review).
alter table public.applications drop constraint if exists applications_status_check;
update public.applications set status = 'submitted' where status = 'new';
update public.applications set status = 'under_review' where status = 'contacted';
alter table public.applications add constraint applications_status_check
  check (status in ('draft','submitted','under_review','interview','accepted','enrolled','waitlist','rejected'));
alter table public.applications alter column status set default 'draft';
alter table public.applications drop constraint if exists applications_discount_status_check;
alter table public.applications add constraint applications_discount_status_check check (discount_status in ('none','pending','verified','rejected'));

-- Shape checks apply once an application is submitted; drafts can be partial. Documents live in the
-- `documents` bucket as <user_id>/<uuid>.<ext>.
alter table public.applications drop constraint if exists applications_email_chk;
alter table public.applications drop constraint if exists applications_lengths_chk;
alter table public.applications drop constraint if exists applications_submitted_chk;
alter table public.applications add constraint applications_submitted_chk check (
  status = 'draft' or (
    full_name is not null and char_length(full_name) between 2 and 200
    and email is not null and email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' and char_length(email) <= 200
    and phone is not null and char_length(phone) between 7 and 40
    and country is not null and char_length(country) between 1 and 100
    and city is not null and char_length(city) between 1 and 100
    and coalesce(array_length(programs, 1), 0) between 1 and 12
    and consent_privacy and consent_contact
  )
);
alter table public.applications drop constraint if exists applications_paths_chk;
alter table public.applications add constraint applications_paths_chk check (
  coalesce(discount_percent, 0) between 0 and 100
  and (graduation_year is null or graduation_year between 1950 and 2100)
  and (proof_file_path is null or proof_file_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.[a-z0-9]{1,5}$')
  and (cv_file_path is null or cv_file_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.[a-z0-9]{1,5}$')
);

-- The public insert trigger from 0001/0002 forced status = 'new'. Applications are no longer anonymous:
-- the trigger now stamps the owner and keeps students out of the admin-only columns.
create or replace function public.applications_before_insert() returns trigger
language plpgsql security definer set search_path = public, extensions as $$
declare
  headers text := nullif(current_setting('request.headers', true), '');
  ip text := coalesce(headers::json ->> 'x-forwarded-for', headers::json ->> 'cf-connecting-ip', '');
begin
  new.ip_hash := encode(digest(ip, 'sha256'), 'hex');
  if not public.is_admin() then
    new.user_id := auth.uid();
    if new.status not in ('draft','submitted') then new.status := 'draft'; end if;
    new.discount_verified := false;
    new.notes := null;
    new.discount_status := case when new.status = 'submitted' and coalesce(new.discount_type, '') <> '' then 'pending' else 'none' end;
    new.turnstile_ok := null;
  end if;
  if new.user_id is null then raise exception 'an application needs an owner'; end if;
  if new.status = 'submitted' then new.submitted_at := coalesce(new.submitted_at, now()); end if;
  return new;
end $$;
drop trigger if exists before_public_insert on public.applications;
drop trigger if exists applications_before_insert on public.applications;
create trigger applications_before_insert before insert on public.applications for each row execute function public.applications_before_insert();

create or replace function public.applications_before_update() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    -- students: only drafts change (policy), only to draft or submitted, never the admin columns
    new.user_id := old.user_id;
    new.notes := old.notes;
    new.discount_verified := old.discount_verified;
    new.turnstile_ok := old.turnstile_ok;
    if old.status <> 'draft' then raise exception 'a submitted application can no longer be edited'; end if;
    if new.status not in ('draft','submitted') then new.status := old.status; end if;
    new.discount_status := case when new.status = 'submitted' and coalesce(new.discount_type, '') <> '' then 'pending' else 'none' end;
  end if;
  if new.status = 'submitted' and old.status <> 'submitted' then new.submitted_at := coalesce(new.submitted_at, now()); end if;
  return new;
end $$;
drop trigger if exists applications_before_update on public.applications;
create trigger applications_before_update before update on public.applications for each row execute function public.applications_before_update();
drop trigger if exists applications_updated_at on public.applications;
create trigger applications_updated_at before update on public.applications for each row execute function public.set_updated_at();

-- 3. Events: the student's timeline and the admin's activity log. A status change writes one automatically.
create table if not exists public.application_events (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications (id) on delete cascade,
  actor_id uuid references auth.users (id) on delete set null,
  type text not null check (type in ('status_change','note','document','message')),
  from_status text,
  to_status text,
  note text,
  visible_to_student boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists application_events_app_idx on public.application_events (application_id, created_at);

create or replace function public.log_status_change() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status is distinct from old.status then
    insert into public.application_events (application_id, actor_id, type, from_status, to_status, visible_to_student)
    values (new.id, auth.uid(), 'status_change', old.status, new.status, true);
  end if;
  return new;
end $$;
drop trigger if exists applications_log_status on public.applications;
create trigger applications_log_status after update on public.applications for each row execute function public.log_status_change();

-- 4. Account deletion requests (the client never hard-deletes; an admin does it in the dashboard).
create table if not exists public.account_deletion_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  reason text,
  handled boolean not null default false,
  created_at timestamptz not null default now()
);

-- Leads and messages get a "handled" flag for the admin inbox.
alter table public.leads add column if not exists handled boolean not null default false;
alter table public.contact_messages add column if not exists handled boolean not null default false;

-- 5. Row Level Security
alter table public.profiles enable row level security;
alter table public.applications enable row level security;
alter table public.application_events enable row level security;
alter table public.account_deletion_requests enable row level security;
alter table public.leads enable row level security;
alter table public.contact_messages enable row level security;

-- Drop every old policy on applications (the anonymous insert era) before defining the account ones.
do $$
declare p record;
begin
  for p in select policyname from pg_policies where schemaname = 'public' and tablename = 'applications' loop
    execute format('drop policy if exists %I on public.applications', p.policyname);
  end loop;
end $$;

drop policy if exists "profiles self select" on public.profiles;
create policy "profiles self select" on public.profiles for select to authenticated using (id = auth.uid() or public.is_admin());
drop policy if exists "profiles self insert" on public.profiles;
create policy "profiles self insert" on public.profiles for insert to authenticated with check (id = auth.uid());
drop policy if exists "profiles self update" on public.profiles;
create policy "profiles self update" on public.profiles for update to authenticated using (id = auth.uid() or public.is_admin()) with check (id = auth.uid() or public.is_admin());

create policy "applications own insert" on public.applications for insert to authenticated with check (user_id = auth.uid() or public.is_admin());
create policy "applications own select" on public.applications for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy "applications own draft update" on public.applications for update to authenticated
  using ((user_id = auth.uid() and status = 'draft') or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());
create policy "applications own draft delete" on public.applications for delete to authenticated using (user_id = auth.uid() and status = 'draft');

drop policy if exists "events student select" on public.application_events;
create policy "events student select" on public.application_events for select to authenticated
  using (public.is_admin() or (visible_to_student and exists (select 1 from public.applications a where a.id = application_id and a.user_id = auth.uid())));
drop policy if exists "events admin write" on public.application_events;
create policy "events admin write" on public.application_events for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "deletion own insert" on public.account_deletion_requests;
create policy "deletion own insert" on public.account_deletion_requests for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "deletion select" on public.account_deletion_requests;
create policy "deletion select" on public.account_deletion_requests for select to authenticated using (user_id = auth.uid() or public.is_admin());
drop policy if exists "deletion admin update" on public.account_deletion_requests;
create policy "deletion admin update" on public.account_deletion_requests for update to authenticated using (public.is_admin());

-- Leads and messages: the public inserts (policies from 0001 stay), admins read and mark handled.
drop policy if exists "leads admin read" on public.leads;
create policy "leads admin read" on public.leads for select to authenticated using (public.is_admin());
drop policy if exists "leads admin update" on public.leads;
create policy "leads admin update" on public.leads for update to authenticated using (public.is_admin());
drop policy if exists "contact admin read" on public.contact_messages;
create policy "contact admin read" on public.contact_messages for select to authenticated using (public.is_admin());
drop policy if exists "contact admin update" on public.contact_messages;
create policy "contact admin update" on public.contact_messages for update to authenticated using (public.is_admin());

-- Grants: anon never touches account tables; authenticated goes through the policies above.
revoke all on public.profiles, public.application_events, public.account_deletion_requests from anon;
revoke insert on public.applications from anon;
grant select, insert, update on public.profiles to authenticated;
grant select, insert, update, delete on public.applications to authenticated;
grant select, insert, update, delete on public.application_events to authenticated;
grant select, insert, update on public.account_deletion_requests to authenticated;
grant select, update on public.leads, public.contact_messages to authenticated;

-- 6. Storage: private buckets, one folder per user, admins read through signed URLs.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('documents', 'documents', false, 5242880, array['application/pdf','image/jpeg','image/png'])
on conflict (id) do update set public = false, file_size_limit = 5242880, allowed_mime_types = array['application/pdf','image/jpeg','image/png'];
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', false, 2097152, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = false, file_size_limit = 2097152, allowed_mime_types = array['image/jpeg','image/png','image/webp'];

drop policy if exists "own folder insert" on storage.objects;
create policy "own folder insert" on storage.objects for insert to authenticated
  with check (bucket_id in ('documents','avatars') and (storage.foldername(name))[1] = auth.uid()::text and array_length(storage.foldername(name), 1) = 1 and storage.filename(name) ~ '^[0-9a-f-]{36}\.[a-z0-9]{1,5}$');
drop policy if exists "own folder select" on storage.objects;
create policy "own folder select" on storage.objects for select to authenticated
  using (bucket_id in ('documents','avatars') and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));
drop policy if exists "own folder update" on storage.objects;
create policy "own folder update" on storage.objects for update to authenticated
  using (bucket_id in ('documents','avatars') and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "own folder delete" on storage.objects;
create policy "own folder delete" on storage.objects for delete to authenticated
  using (bucket_id in ('documents','avatars') and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));
-- The old anonymous upload path is closed.
drop policy if exists "public upload applications" on storage.objects;

-- 7. Make yourself an admin (run once, with your own email):
--   update public.profiles set role = 'admin' where id = (select id from auth.users where email = 'you@example.com');

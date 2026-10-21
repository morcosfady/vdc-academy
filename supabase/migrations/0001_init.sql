-- VDC Academy schema. Run in the Supabase SQL editor (or `supabase db push`).
-- Public visitors can only INSERT. Only admins listed in admin_emails can read or update.

create extension if not exists pgcrypto;

create table if not exists public.admin_emails (email text primary key);

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admin_emails where lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')));
$$;

create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  status text not null default 'new' check (status in ('new','contacted','interview','accepted','enrolled','rejected','waitlist')),
  full_name text not null,
  email text not null,
  phone text not null,
  whatsapp text,
  country text not null,
  city text not null,
  dob_or_age text,
  language text,
  current_status text,
  degree text,
  university text,
  graduation_year int,
  gpa text,
  experience_years text,
  job_title text,
  company text,
  software_skills jsonb,
  career_goal text,
  linkedin_url text,
  portfolio_url text,
  programs text[] not null default '{}',
  format text,
  schedule text,
  start_pref text,
  has_laptop text,
  source text,
  discount_type text,
  discount_percent int default 0,
  discount_verified boolean not null default false,
  proof_file_path text,
  cv_file_path text,
  consent_privacy boolean not null,
  consent_contact boolean not null,
  newsletter boolean not null default false,
  notes text,
  utm_source text, utm_medium text, utm_campaign text,
  ip_hash text,
  turnstile_token text,
  turnstile_ok boolean
);
create index if not exists applications_email_idx on public.applications (email);
create index if not exists applications_status_idx on public.applications (status);
create index if not exists applications_created_idx on public.applications (created_at desc);

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null, email text not null, topic text,
  turnstile_token text, turnstile_ok boolean, ip_hash text
);
create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null, email text not null, message text not null,
  turnstile_token text, turnstile_ok boolean, ip_hash text
);
create table if not exists public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  email text not null, name text, ip_hash text
);
create table if not exists public.activity_log (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  application_id uuid references public.applications(id) on delete cascade,
  actor text, action text, detail text
);

-- Hash the caller IP and force admin-only fields on every public insert.
create or replace function public.before_public_insert() returns trigger
language plpgsql security definer set search_path = public as $$
declare ip text := coalesce(current_setting('request.headers', true)::json ->> 'x-forwarded-for', '');
begin
  new.ip_hash := encode(digest(ip, 'sha256'), 'hex');
  if tg_table_name = 'applications' then
    new.status := 'new'; new.discount_verified := false; new.notes := null;
  end if;
  if tg_table_name in ('applications','leads','contact_messages') then new.turnstile_ok := null; end if;
  return new;
end $$;

do $$ declare t text; begin
  foreach t in array array['applications','leads','contact_messages','newsletter_subscribers'] loop
    execute format('drop trigger if exists trg_%1$s_before on public.%1$s', t);
    execute format('create trigger trg_%1$s_before before insert on public.%1$s for each row execute function public.before_public_insert()', t);
    execute format('alter table public.%1$s enable row level security', t);
  end loop;
end $$;
alter table public.admin_emails enable row level security;
alter table public.activity_log enable row level security;

-- Public: insert only.
drop policy if exists "anon insert applications" on public.applications;
create policy "anon insert applications" on public.applications for insert to anon, authenticated
  with check (consent_privacy is true and consent_contact is true and char_length(full_name) between 2 and 200);
drop policy if exists "anon insert leads" on public.leads;
create policy "anon insert leads" on public.leads for insert to anon, authenticated with check (char_length(email) between 5 and 200);
drop policy if exists "anon insert contact" on public.contact_messages;
create policy "anon insert contact" on public.contact_messages for insert to anon, authenticated with check (char_length(message) between 10 and 5000);
drop policy if exists "anon insert newsletter" on public.newsletter_subscribers;
create policy "anon insert newsletter" on public.newsletter_subscribers for insert to anon, authenticated with check (char_length(email) between 5 and 200);

-- Admins: read and update.
drop policy if exists "admin read applications" on public.applications;
create policy "admin read applications" on public.applications for select to authenticated using (public.is_admin());
drop policy if exists "admin update applications" on public.applications;
create policy "admin update applications" on public.applications for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admin read leads" on public.leads;
create policy "admin read leads" on public.leads for select to authenticated using (public.is_admin());
drop policy if exists "admin read contact" on public.contact_messages;
create policy "admin read contact" on public.contact_messages for select to authenticated using (public.is_admin());
drop policy if exists "admin read newsletter" on public.newsletter_subscribers;
create policy "admin read newsletter" on public.newsletter_subscribers for select to authenticated using (public.is_admin());
drop policy if exists "admin log" on public.activity_log;
create policy "admin log" on public.activity_log for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Private bucket for CVs and proof documents: 5 MB, limited types, insert only for the public.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('applications', 'applications', false, 5242880,
  array['application/pdf','image/jpeg','image/png','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document'])
on conflict (id) do update set file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types, public = false;

drop policy if exists "public upload applications" on storage.objects;
create policy "public upload applications" on storage.objects for insert to anon, authenticated with check (bucket_id = 'applications');
drop policy if exists "admin read uploads" on storage.objects;
create policy "admin read uploads" on storage.objects for select to authenticated using (bucket_id = 'applications' and public.is_admin());

-- After running this file add yourself as an admin:
--   insert into public.admin_emails (email) values ('you@example.com');
-- Then create Database Webhooks (Dashboard > Database > Webhooks) on INSERT for applications, leads and
-- contact_messages that call the Edge Function `notify` (supabase/functions/notify).

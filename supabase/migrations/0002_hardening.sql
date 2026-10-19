-- VDC Academy, migration 2: fixes and guards on top of 0001_init.sql. Safe to run more than once.
-- Run after 0001 in the Supabase SQL editor (or `supabase db push`).

-- 1. The insert trigger in 0001 calls digest() with search_path = public. On Supabase, pgcrypto lives in the
--    `extensions` schema, so every public insert would fail with "function digest does not exist".
--    Also guard against an empty request.headers setting ('' is not valid JSON).
create extension if not exists pgcrypto with schema extensions;

create or replace function public.before_public_insert() returns trigger
language plpgsql security definer set search_path = public, extensions as $$
declare
  headers text := nullif(current_setting('request.headers', true), '');
  ip text := coalesce(headers::json ->> 'x-forwarded-for', headers::json ->> 'cf-connecting-ip', '');
begin
  new.ip_hash := encode(digest(ip, 'sha256'), 'hex');
  if tg_table_name = 'applications' then
    new.status := 'new'; new.discount_verified := false; new.notes := null;
  end if;
  if tg_table_name in ('applications','leads','contact_messages') then new.turnstile_ok := null; end if;
  return new;
end $$;

-- 2. Basic shape checks on public rows (the browser validates too, but anon can call REST directly).
alter table public.applications drop constraint if exists applications_email_chk;
alter table public.applications add constraint applications_email_chk check (email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' and char_length(email) <= 200);
alter table public.applications drop constraint if exists applications_lengths_chk;
alter table public.applications add constraint applications_lengths_chk check (
  char_length(phone) between 7 and 40 and char_length(country) between 1 and 100 and char_length(city) between 1 and 100
  and coalesce(array_length(programs, 1), 0) between 1 and 12 and coalesce(discount_percent, 0) between 0 and 100
  and (graduation_year is null or graduation_year between 1950 and 2100)
  and (proof_file_path is null or proof_file_path ~ '^proof/[0-9a-f-]{36}\.[a-z0-9]{1,5}$')
  and (cv_file_path is null or cv_file_path ~ '^cv/[0-9a-f-]{36}\.[a-z0-9]{1,5}$')
);
alter table public.leads drop constraint if exists leads_email_chk;
alter table public.leads add constraint leads_email_chk check (email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' and char_length(name) between 1 and 200);
alter table public.contact_messages drop constraint if exists contact_email_chk;
alter table public.contact_messages add constraint contact_email_chk check (email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' and char_length(name) between 1 and 200);
alter table public.newsletter_subscribers drop constraint if exists newsletter_email_chk;
alter table public.newsletter_subscribers add constraint newsletter_email_chk check (email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$');
-- One newsletter row per address. The site ignores a failed newsletter insert, so a repeat is harmless.
create unique index if not exists newsletter_subscribers_email_uidx on public.newsletter_subscribers (lower(email));

-- 3. Belt and braces: the public roles never get SELECT, UPDATE or DELETE on these tables, even if a policy is
--    added by mistake later. Admins read through `authenticated` + is_admin() (policies in 0001).
revoke select, update, delete, truncate, references, trigger on public.applications, public.leads, public.contact_messages, public.newsletter_subscribers from anon;
revoke all on public.admin_emails, public.activity_log from anon;

-- 4. Storage: uploads must land in proof/ or cv/ under a random UUID name, as the site writes them, and the
--    public can never list, read, update or delete objects. Size (5 MB) and MIME type are enforced by the bucket
--    settings in 0001 (file_size_limit, allowed_mime_types); storage policies cannot see the file size at insert.
drop policy if exists "public upload applications" on storage.objects;
create policy "public upload applications" on storage.objects for insert to anon, authenticated
  with check (
    bucket_id = 'applications'
    and (storage.foldername(name))[1] in ('proof', 'cv')
    and array_length(storage.foldername(name), 1) = 1
    and storage.filename(name) ~ '^[0-9a-f-]{36}\.[a-z0-9]{1,5}$'
  );
drop policy if exists "admin read uploads" on storage.objects;
create policy "admin read uploads" on storage.objects for select to authenticated using (bucket_id = 'applications' and public.is_admin());
drop policy if exists "admin delete uploads" on storage.objects;
create policy "admin delete uploads" on storage.objects for delete to authenticated using (bucket_id = 'applications' and public.is_admin());

-- 5. Keep the bucket private and limited even if someone edited it in the dashboard.
update storage.buckets set public = false, file_size_limit = 5242880,
  allowed_mime_types = array['application/pdf','image/jpeg','image/png','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document']
where id = 'applications';

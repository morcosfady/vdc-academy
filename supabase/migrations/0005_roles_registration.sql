-- VDC Academy, migration 5: registration with roles (student, recruiter, admin, super admin).
-- Idempotent. Run after 0001 to 0004 (SQL editor or `supabase db push`).
--
-- Model
-- - account_type (student | recruiter) is chosen once at sign-up and never changes (only an admin can fix it).
-- - role (student | recruiter | admin | super_admin) decides permissions. The browser never sets it.
-- - super_admin comes from public.role_grants, applied by a trigger on auth.users only once the email is confirmed.
--   The owner's email lives here and nowhere in the frontend.
-- - Sign-up happens before the email is confirmed, so the browser has no session yet: every answer travels in the
--   sign-up metadata, and handle_new_user copies it into profiles and recruiter_profiles. onboarding_complete turns
--   true only when public.profile_complete() says every required field is there (the same rules as
--   lib/signupSchema.ts). Anyone signed in with an incomplete profile is sent to /onboarding/ by the site.

create extension if not exists citext with schema extensions;

-- 1. Roles and the new profile columns -------------------------------------------------------------------------
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check check (role in ('student','recruiter','admin','super_admin'));

alter table public.profiles add column if not exists account_type text;
alter table public.profiles add column if not exists onboarding_complete boolean not null default false;
alter table public.profiles add column if not exists date_of_birth date;
alter table public.profiles add column if not exists degree_field text;
alter table public.profiles add column if not exists degree_level text;
alter table public.profiles add column if not exists experience_years text;
alter table public.profiles add column if not exists revit_level text;
alter table public.profiles add column if not exists career_goal text;
alter table public.profiles add column if not exists preferred_format text;
alter table public.profiles add column if not exists heard_from text;
alter table public.profiles add column if not exists consent_terms_at timestamptz;
alter table public.profiles add column if not exists consent_contact_at timestamptz;

alter table public.profiles drop constraint if exists profiles_account_type_check;
alter table public.profiles add constraint profiles_account_type_check check (account_type is null or account_type in ('student','recruiter'));
-- v9 student statuses are four of the five v7 ones ('other' stays valid for old rows).
alter table public.profiles drop constraint if exists profiles_v9_values_check;
alter table public.profiles add constraint profiles_v9_values_check check (
  (degree_field is null or degree_field in ('architecture','civil','structural','mechanical','electrical','construction_management','other_engineering','other'))
  and (degree_level is null or degree_level in ('diploma','bachelor','master','phd'))
  and (experience_years is null or experience_years in ('0','lt1','1-3','3-5','5+'))
  and (revit_level is null or revit_level in ('none','beginner','intermediate','advanced'))
  and (career_goal is null or career_goal in ('bim_modeler','bim_coordinator','vdc_engineer','bim_manager','not_sure'))
  and (preferred_format is null or preferred_format in ('online','in_person','either'))
  and (heard_from is null or heard_from in ('linkedin','google','friend','university','bay_bim','event','other'))
  and (date_of_birth is null or date_of_birth between date '1920-01-01' and date '2100-01-01')
);

-- v7/v8 accounts were all students.
update public.profiles set account_type = 'student' where account_type is null and role = 'student';
create index if not exists profiles_account_type_idx on public.profiles (account_type);

-- admin and super_admin both count as admin for Row Level Security; super_admin has its own check for the
-- (future) owner-only powers. Keep the legacy admin_emails fallback from 0001.
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select role in ('admin','super_admin') from public.profiles where id = auth.uid()), false)
      or exists (select 1 from public.admin_emails where lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')));
$$;
create or replace function public.is_super_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select role = 'super_admin' from public.profiles where id = auth.uid()), false);
$$;
create or replace function public.is_student() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select account_type = 'student' and role = 'student' from public.profiles where id = auth.uid()), false);
$$;
create or replace function public.is_recruiter() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select account_type = 'recruiter' and role = 'recruiter' from public.profiles where id = auth.uid()), false);
$$;

-- 2. Recruiter profiles (1:1) and hiring requests ----------------------------------------------------------------
create table if not exists public.recruiter_profiles (
  id uuid primary key references public.profiles (id) on delete cascade,
  job_title text,
  company_name text,
  company_website text,
  company_type text check (company_type is null or company_type in ('ae_firm','general_contractor','subcontractor','owner_developer','bim_consultancy','other')),
  company_size text check (company_size is null or company_size in ('1-10','11-50','51-200','201-1000','1000+')),
  linkedin_url text,
  hiring_roles text[] not null default '{}',
  expected_hires text check (expected_hires is null or expected_hires in ('1','2-5','6-10','10+')),
  authorised_confirmed boolean not null default false,
  verification_status text not null default 'pending' check (verification_status in ('pending','approved','rejected')),
  verified_by uuid, -- the admin who decided (audit only: no foreign key, so deleting users never rewrites this row)
  verified_at timestamptz,
  rejection_note text check (rejection_note is null or char_length(rejection_note) <= 1000),
  verify_notified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint recruiter_hiring_roles_chk check (hiring_roles <@ array['bim_modeler','bim_coordinator','vdc_engineer','bim_manager','revit_drafter','other']::text[]),
  constraint recruiter_urls_chk check (
    (company_website is null or company_website ~* '^https?://[^[:space:]/$.?#][^[:space:]]*\.[^[:space:]]{2,}$')
    and (linkedin_url is null or linkedin_url ~* '^https?://([a-z]{2,3}\.)?linkedin\.com/(in|pub|company)/[^[:space:]/]+')
  )
);
create index if not exists recruiter_profiles_status_idx on public.recruiter_profiles (verification_status);
alter table public.recruiter_profiles drop constraint if exists recruiter_profiles_verified_by_fkey;

create table if not exists public.hiring_requests (
  id uuid primary key default gen_random_uuid(),
  recruiter_id uuid not null references public.profiles (id) on delete cascade,
  role text not null check (role in ('bim_modeler','bim_coordinator','vdc_engineer','bim_manager','revit_drafter','other')),
  hires int not null check (hires between 1 and 500),
  location text not null check (char_length(location) between 2 and 160),
  work_mode text not null check (work_mode in ('on_site','hybrid','remote')),
  start_date date not null,
  notes text not null default '' check (char_length(notes) <= 2000),
  status text not null default 'new' check (status in ('new','in_review','matched','closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists hiring_requests_recruiter_idx on public.hiring_requests (recruiter_id, created_at desc);

-- 3. Required fields: the database decides when a profile is complete ------------------------------------------
create or replace function public.profile_complete(p public.profiles) returns boolean
language plpgsql stable security definer set search_path = public as $$
declare
  r public.recruiter_profiles;
  f text := nullif(btrim(coalesce(p.full_name, '')), '');
begin
  if p.role in ('admin','super_admin') then
    return f is not null and nullif(btrim(coalesce(p.phone, '')), '') is not null;
  end if;
  if p.account_type = 'student' then
    return f is not null and char_length(f) >= 2
      and nullif(btrim(coalesce(p.phone, '')), '') is not null
      and nullif(btrim(coalesce(p.whatsapp, '')), '') is not null
      and nullif(btrim(coalesce(p.country, '')), '') is not null
      and nullif(btrim(coalesce(p.city, '')), '') is not null
      and p.date_of_birth is not null and p.date_of_birth <= (current_date - interval '16 years')
      and p.current_status in ('fresh_grad','student','professional','career_changer')
      and p.degree_field is not null and p.degree_level is not null
      and nullif(btrim(coalesce(p.university, '')), '') is not null
      and p.graduation_year is not null
      and p.experience_years is not null and p.revit_level is not null and p.career_goal is not null
      and p.preferred_format is not null and p.heard_from is not null
      and p.consent_terms_at is not null and p.consent_contact_at is not null;
  end if;
  if p.account_type = 'recruiter' then
    select * into r from public.recruiter_profiles where id = p.id;
    return f is not null and char_length(f) >= 2
      and nullif(btrim(coalesce(p.phone, '')), '') is not null
      and nullif(btrim(coalesce(p.country, '')), '') is not null
      and nullif(btrim(coalesce(p.city, '')), '') is not null
      and p.heard_from is not null
      and p.consent_terms_at is not null and p.consent_contact_at is not null
      and r.id is not null
      and nullif(btrim(coalesce(r.job_title, '')), '') is not null
      and nullif(btrim(coalesce(r.company_name, '')), '') is not null
      and r.company_website is not null and r.company_type is not null and r.company_size is not null
      and r.linkedin_url is not null and coalesce(array_length(r.hiring_roles, 1), 0) >= 1
      and r.expected_hires is not null and r.authorised_confirmed;
  end if;
  return false;
end $$;

-- 4. Guards: nobody promotes themselves, switches account type, or marks an incomplete profile complete ----------
create or replace function public.profiles_guard() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  trusted boolean := auth.uid() is null; -- the dashboard, the service role, Auth itself (no JWT)
begin
  if tg_op = 'UPDATE' and new.id is distinct from old.id then raise exception 'profile id is immutable'; end if;
  if not trusted then
    if tg_op = 'INSERT' then
      -- a client-side insert (the upsert fallback) can never carry a role or a finished onboarding
      if not public.is_admin() then
        new.role := case when new.account_type = 'recruiter' then 'recruiter' else 'student' end;
      end if;
    else
      if new.role is distinct from old.role then
        if not public.is_admin() then raise exception 'only an admin can change a role'; end if;
        if (new.role in ('admin','super_admin') or old.role in ('admin','super_admin')) and not public.is_super_admin() then
          raise exception 'only a super admin can grant or remove admin roles';
        end if;
      end if;
      if new.account_type is distinct from old.account_type and old.account_type is not null and not public.is_admin() then
        raise exception 'the account type is chosen once at sign-up';
      end if;
    end if;
    if new.consent_terms_at is distinct from (case when tg_op = 'UPDATE' then old.consent_terms_at end) and new.consent_terms_at is not null then
      new.consent_terms_at := now(); -- consents are timestamped by the server, not the browser
    end if;
    if new.consent_contact_at is distinct from (case when tg_op = 'UPDATE' then old.consent_contact_at end) and new.consent_contact_at is not null then
      new.consent_contact_at := now();
    end if;
  end if;
  -- the account type decides the base role for non-admins
  if new.role not in ('admin','super_admin') and new.account_type in ('student','recruiter') then
    new.role := new.account_type;
  end if;
  if new.onboarding_complete and not public.profile_complete(new) then
    raise exception 'onboarding_complete needs every required field (profile_complete)';
  end if;
  return new;
end $$;
drop trigger if exists profiles_guard on public.profiles;
create trigger profiles_guard before insert or update on public.profiles for each row execute function public.profiles_guard();

create or replace function public.recruiter_profiles_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    if tg_op = 'INSERT' then
      if not exists (select 1 from public.profiles where id = new.id and account_type = 'recruiter') then
        raise exception 'only recruiter accounts have a company profile';
      end if;
      new.verification_status := 'pending';
      new.verified_by := null;
      new.verified_at := null;
      new.rejection_note := null;
      new.verify_notified_at := null;
    else
      new.id := old.id;
      new.verification_status := old.verification_status;
      new.verified_by := old.verified_by;
      new.verified_at := old.verified_at;
      new.rejection_note := old.rejection_note;
      new.verify_notified_at := old.verify_notified_at;
    end if;
  elsif tg_op = 'UPDATE' and new.verification_status is distinct from old.verification_status and auth.uid() is not null then
    -- an admin decision is signed and dated by the database
    new.verified_by := auth.uid();
    new.verified_at := now();
    if new.verification_status = 'approved' then new.rejection_note := null; end if;
  end if;
  return new;
end $$;
drop trigger if exists recruiter_profiles_guard on public.recruiter_profiles;
create trigger recruiter_profiles_guard before insert or update on public.recruiter_profiles for each row execute function public.recruiter_profiles_guard();
drop trigger if exists recruiter_profiles_updated_at on public.recruiter_profiles;
create trigger recruiter_profiles_updated_at before update on public.recruiter_profiles for each row execute function public.set_updated_at();

create or replace function public.hiring_requests_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    if tg_op = 'INSERT' then
      new.recruiter_id := auth.uid();
      new.status := 'new';
    else
      raise exception 'only the academy team updates a hiring request';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists hiring_requests_guard on public.hiring_requests;
create trigger hiring_requests_guard before insert or update on public.hiring_requests for each row execute function public.hiring_requests_guard();
drop trigger if exists hiring_requests_updated_at on public.hiring_requests;
create trigger hiring_requests_updated_at before update on public.hiring_requests for each row execute function public.set_updated_at();

-- 5. Sign-up: copy the metadata into the profile (whitelisted, cast safely, never a role) ---------------------------
create or replace function public.meta_text(m jsonb, k text, max_len int default 200) returns text
language sql immutable as $$ select nullif(left(btrim(coalesce(m ->> k, '')), max_len), '') $$;

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  m jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  t text := case when m ->> 'account_type' in ('student','recruiter') then m ->> 'account_type' end;
  dob date;
  grad int;
  roles text[];
  p public.profiles;
begin
  begin dob := (m ->> 'date_of_birth')::date; exception when others then dob := null; end;
  begin grad := (m ->> 'graduation_year')::int; exception when others then grad := null; end;
  if grad is not null and (grad < 1950 or grad > 2100) then grad := null; end if;
  begin
    select coalesce(array_agg(x), '{}') into roles from jsonb_array_elements_text(case when jsonb_typeof(m -> 'hiring_roles') = 'array' then m -> 'hiring_roles' else '[]'::jsonb end) as x
    where x in ('bim_modeler','bim_coordinator','vdc_engineer','bim_manager','revit_drafter','other');
  exception when others then roles := '{}';
  end;

  insert into public.profiles (id, email, full_name, account_type, role, phone, whatsapp, country, city, date_of_birth, current_status,
    degree_field, degree_level, university, graduation_year, experience_years, revit_level, career_goal, preferred_format, heard_from,
    marketing_opt_in, consent_terms_at, consent_contact_at)
  values (
    new.id, new.email, public.meta_text(m, 'full_name', 120), t, coalesce(t, 'student'),
    public.meta_text(m, 'phone', 40), public.meta_text(m, 'whatsapp', 40), public.meta_text(m, 'country', 80), public.meta_text(m, 'city', 80),
    case when dob between date '1920-01-01' and current_date then dob end,
    case when m ->> 'current_status' in ('fresh_grad','student','professional','career_changer','other') then m ->> 'current_status' end,
    case when m ->> 'degree_field' in ('architecture','civil','structural','mechanical','electrical','construction_management','other_engineering','other') then m ->> 'degree_field' end,
    case when m ->> 'degree_level' in ('diploma','bachelor','master','phd') then m ->> 'degree_level' end,
    public.meta_text(m, 'university', 160), grad,
    case when m ->> 'experience_years' in ('0','lt1','1-3','3-5','5+') then m ->> 'experience_years' end,
    case when m ->> 'revit_level' in ('none','beginner','intermediate','advanced') then m ->> 'revit_level' end,
    case when m ->> 'career_goal' in ('bim_modeler','bim_coordinator','vdc_engineer','bim_manager','not_sure') then m ->> 'career_goal' end,
    case when m ->> 'preferred_format' in ('online','in_person','either') then m ->> 'preferred_format' end,
    case when m ->> 'heard_from' in ('linkedin','google','friend','university','bay_bim','event','other') then m ->> 'heard_from' end,
    coalesce((m ->> 'marketing_opt_in')::boolean, false),
    case when (m ->> 'consent_terms')::boolean then now() end,
    case when (m ->> 'consent_contact')::boolean then now() end
  )
  on conflict (id) do nothing;

  if t = 'recruiter' then
    insert into public.recruiter_profiles (id, job_title, company_name, company_website, company_type, company_size, linkedin_url, hiring_roles, expected_hires, authorised_confirmed)
    values (
      new.id, public.meta_text(m, 'job_title', 120), public.meta_text(m, 'company_name', 160),
      case when public.meta_text(m, 'company_website', 300) ~* '^https?://[^[:space:]/$.?#][^[:space:]]*\.[^[:space:]]{2,}$' then public.meta_text(m, 'company_website', 300) end,
      case when m ->> 'company_type' in ('ae_firm','general_contractor','subcontractor','owner_developer','bim_consultancy','other') then m ->> 'company_type' end,
      case when m ->> 'company_size' in ('1-10','11-50','51-200','201-1000','1000+') then m ->> 'company_size' end,
      case when public.meta_text(m, 'linkedin_url', 300) ~* '^https?://([a-z]{2,3}\.)?linkedin\.com/(in|pub|company)/[^[:space:]/]+' then public.meta_text(m, 'linkedin_url', 300) end,
      roles,
      case when m ->> 'expected_hires' in ('1','2-5','6-10','10+') then m ->> 'expected_hires' end,
      coalesce((m ->> 'authorised_confirmed')::boolean, false)
    )
    on conflict (id) do nothing;
  end if;

  -- complete answers finish onboarding at once; anything missing sends the user to /onboarding/ after login
  select * into p from public.profiles where id = new.id;
  if p.id is not null and public.profile_complete(p) then
    update public.profiles set onboarding_complete = true where id = new.id;
  end if;
  return new;
exception when others then
  -- never block a sign-up over metadata: the profile exists, onboarding fills the gaps
  insert into public.profiles (id, email) values (new.id, new.email) on conflict (id) do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- 6. Role grants: the owner becomes super admin, only after the email is confirmed --------------------------------
create table if not exists public.role_grants (
  email extensions.citext primary key,
  role text not null check (role in ('admin','super_admin')),
  created_at timestamptz not null default now()
);
alter table public.role_grants enable row level security;
revoke all on public.role_grants from anon, authenticated;
grant select on public.role_grants to authenticated;
drop policy if exists "role grants super admin read" on public.role_grants;
create policy "role grants super admin read" on public.role_grants for select to authenticated using (public.is_super_admin());

insert into public.role_grants (email, role) values ('thefadys99@gmail.com', 'super_admin') on conflict (email) do update set role = excluded.role;

-- Runs after insert and after any change to email or email_confirmed_at. An unconfirmed address never gets a grant.
-- Name sorts after on_auth_user_created, so the profile row exists first.
create or replace function public.apply_role_grant() returns trigger
language plpgsql security definer set search_path = public, extensions as $$
declare g text;
begin
  if new.email_confirmed_at is null or new.email is null then return new; end if;
  select role into g from public.role_grants where email = new.email::citext;
  if g is null then return new; end if;
  insert into public.profiles (id, email) values (new.id, new.email) on conflict (id) do nothing;
  update public.profiles set role = g where id = new.id and role is distinct from g;
  -- the owner step only asks for a name and a phone
  update public.profiles p set onboarding_complete = true where p.id = new.id and not p.onboarding_complete and public.profile_complete(p);
  return new;
end $$;
drop trigger if exists on_auth_user_role_grant on auth.users;
create trigger on_auth_user_role_grant after insert or update of email, email_confirmed_at on auth.users for each row execute function public.apply_role_grant();

-- A grant added later still applies to an account that already exists and is confirmed.
update public.profiles p set role = g.role
from public.role_grants g, auth.users u
where u.id = p.id and u.email::citext = g.email and u.email_confirmed_at is not null and p.role is distinct from g.role;

-- Safety net for databases that ran 0003 before its fix: the 0001 insert trigger must not touch applications.
drop trigger if exists trg_applications_before on public.applications;

-- 7. Row Level Security -----------------------------------------------------------------------------------------
alter table public.recruiter_profiles enable row level security;
alter table public.hiring_requests enable row level security;

-- profiles: unchanged shape (own row or admin). Recruiters and students only ever see their own row.
drop policy if exists "profiles self select" on public.profiles;
create policy "profiles self select" on public.profiles for select to authenticated using (id = auth.uid() or public.is_admin());

drop policy if exists "recruiter own select" on public.recruiter_profiles;
create policy "recruiter own select" on public.recruiter_profiles for select to authenticated using (id = auth.uid() or public.is_admin());
drop policy if exists "recruiter own insert" on public.recruiter_profiles;
create policy "recruiter own insert" on public.recruiter_profiles for insert to authenticated with check (id = auth.uid() or public.is_admin());
drop policy if exists "recruiter own update" on public.recruiter_profiles;
create policy "recruiter own update" on public.recruiter_profiles for update to authenticated using (id = auth.uid() or public.is_admin()) with check (id = auth.uid() or public.is_admin());

drop policy if exists "hiring own select" on public.hiring_requests;
create policy "hiring own select" on public.hiring_requests for select to authenticated using (recruiter_id = auth.uid() or public.is_admin());
drop policy if exists "hiring recruiter insert" on public.hiring_requests;
create policy "hiring recruiter insert" on public.hiring_requests for insert to authenticated with check ((recruiter_id = auth.uid() and public.is_recruiter()) or public.is_admin());
drop policy if exists "hiring admin update" on public.hiring_requests;
create policy "hiring admin update" on public.hiring_requests for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- applications: only students apply (recruiters never create or read applications).
drop policy if exists "applications own insert" on public.applications;
create policy "applications own insert" on public.applications for insert to authenticated with check ((user_id = auth.uid() and public.is_student()) or public.is_admin());

revoke all on public.recruiter_profiles, public.hiring_requests from anon;
grant select, insert, update on public.recruiter_profiles to authenticated;
grant select, insert, update on public.hiring_requests to authenticated;

-- 8. The old bootstrap is now a fallback. The owner signs up with the granted email and confirms it.
--   update public.profiles set role = 'admin' where id = (select id from auth.users where email = 'colleague@example.com');
--   (run in the SQL editor; promoting to admin from the site needs a super admin)

-- 9. Team sign-up. The site never knows which emails are granted (that would tell anonymous visitors who the owner
--    is). The "Academy team account" path sends only a name and a phone (no account_type). With a grant, the
--    confirmed email becomes super_admin and profile_complete() accepts name + phone. Without a grant the account
--    stays a plain, incomplete profile and /onboarding/ asks for the student or recruiter details.

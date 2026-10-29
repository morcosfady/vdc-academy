-- VDC Academy, migration 8: instructors (the people who teach the courses) as the second sign-up choice.
-- Idempotent. Run after 0001 to 0007 (SQL editor or `supabase db push`).
--
-- Model
-- - account_type becomes student | instructor | recruiter. The sign-up offers student and instructor; recruiter stays in
--   the database and the code (v9/v10) but is no longer offered.
-- - role gets 'instructor'. Like every role it is set by the database from the account type, never by the browser.
-- - instructor_profiles (1:1 with profiles) holds the teaching profile. Its verification columns are written by admins
--   only, exactly like recruiter_profiles. An instructor sees no applications and no other student's data.
-- - profile_complete(), profiles_guard() and handle_new_user() are replaced with instructor branches. The rules
--   mirror lib/signupSchema.ts (the form) and lib/demo/engine.ts (the mock). Change one, change all three.

-- 1. Roles ---------------------------------------------------------------------------------------------------------
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check check (role in ('student','instructor','recruiter','admin','super_admin'));
alter table public.profiles drop constraint if exists profiles_account_type_check;
alter table public.profiles add constraint profiles_account_type_check check (account_type is null or account_type in ('student','instructor','recruiter'));

create or replace function public.is_instructor() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select account_type = 'instructor' and role = 'instructor' from public.profiles where id = auth.uid()), false);
$$;

-- 2. Instructor profiles -------------------------------------------------------------------------------------------
create table if not exists public.instructor_profiles (
  id uuid primary key references public.profiles (id) on delete cascade,
  job_title text,
  employer text,
  industry_years text check (industry_years is null or industry_years in ('3-5','5-10','10-15','15+')),
  teaching_years text check (teaching_years is null or teaching_years in ('none','lt2','2-5','5+')),
  subjects text[] not null default '{}',
  teaching_format text check (teaching_format is null or teaching_format in ('online','in_person','either')),
  availability text check (availability is null or availability in ('evenings','weekends','daytime','flexible')),
  linkedin_url text,
  bio text check (bio is null or char_length(bio) <= 600),
  info_confirmed boolean not null default false,
  verification_status text not null default 'pending' check (verification_status in ('pending','approved','rejected')),
  verified_by uuid, -- the admin who decided (audit only: no foreign key, so deleting users never rewrites this row)
  verified_at timestamptz,
  rejection_note text check (rejection_note is null or char_length(rejection_note) <= 1000),
  verify_notified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint instructor_subjects_chk check (subjects <@ array[
    'vdc-professional-bootcamp','bim-fundamentals-revit','revit-architecture','revit-structure','revit-mep','low-voltage-bim',
    'revit-family-creation','navisworks-clash-detection','4d-5d-simulation','dynamo-for-revit','bim-management-iso-19650']::text[]),
  constraint instructor_linkedin_chk check (linkedin_url is null or linkedin_url ~* '^https?://([a-z]{2,3}\.)?linkedin\.com/(in|pub|company)/[^[:space:]/]+')
);
create index if not exists instructor_profiles_status_idx on public.instructor_profiles (verification_status);
alter table public.instructor_profiles drop constraint if exists instructor_profiles_verified_by_fkey;

-- 3. Required fields: the database decides when a profile is complete ---------------------------------------------
create or replace function public.profile_complete(p public.profiles) returns boolean
language plpgsql stable security definer set search_path = public as $$
declare
  r public.recruiter_profiles;
  i public.instructor_profiles;
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
  if p.account_type = 'instructor' then
    select * into i from public.instructor_profiles where id = p.id;
    return f is not null and char_length(f) >= 2
      and nullif(btrim(coalesce(p.phone, '')), '') is not null
      and nullif(btrim(coalesce(p.country, '')), '') is not null
      and nullif(btrim(coalesce(p.city, '')), '') is not null
      and p.heard_from is not null
      and p.consent_terms_at is not null and p.consent_contact_at is not null
      and i.id is not null
      and nullif(btrim(coalesce(i.job_title, '')), '') is not null
      and nullif(btrim(coalesce(i.employer, '')), '') is not null
      and i.industry_years is not null and i.teaching_years is not null
      and coalesce(array_length(i.subjects, 1), 0) >= 1
      and i.teaching_format is not null and i.availability is not null
      and i.linkedin_url is not null
      and char_length(btrim(coalesce(i.bio, ''))) >= 40
      and i.info_confirmed;
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

-- 4. Guards ----------------------------------------------------------------------------------------------------------
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
        new.role := case when new.account_type in ('instructor','recruiter') then new.account_type else 'student' end;
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
  if new.role not in ('admin','super_admin') and new.account_type in ('student','instructor','recruiter') then
    new.role := new.account_type;
  end if;
  if new.onboarding_complete and not public.profile_complete(new) then
    raise exception 'onboarding_complete needs every required field (profile_complete)';
  end if;
  return new;
end $$;

create or replace function public.instructor_profiles_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    if tg_op = 'INSERT' then
      if not exists (select 1 from public.profiles where id = new.id and account_type = 'instructor') then
        raise exception 'only instructor accounts have a teaching profile';
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
drop trigger if exists instructor_profiles_guard on public.instructor_profiles;
create trigger instructor_profiles_guard before insert or update on public.instructor_profiles for each row execute function public.instructor_profiles_guard();
drop trigger if exists instructor_profiles_updated_at on public.instructor_profiles;
create trigger instructor_profiles_updated_at before update on public.instructor_profiles for each row execute function public.set_updated_at();

-- 5. Sign-up: copy the metadata into the profile (whitelisted, cast safely, never a role) --------------------------
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  m jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  t text := case when m ->> 'account_type' in ('student','instructor','recruiter') then m ->> 'account_type' end;
  dob date;
  grad int;
  roles text[];
  subj text[];
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
  begin
    select coalesce(array_agg(x), '{}') into subj from jsonb_array_elements_text(case when jsonb_typeof(m -> 'subjects') = 'array' then m -> 'subjects' else '[]'::jsonb end) as x
    where x in ('vdc-professional-bootcamp','bim-fundamentals-revit','revit-architecture','revit-structure','revit-mep','low-voltage-bim','revit-family-creation','navisworks-clash-detection','4d-5d-simulation','dynamo-for-revit','bim-management-iso-19650');
  exception when others then subj := '{}';
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

  if t = 'instructor' then
    insert into public.instructor_profiles (id, job_title, employer, industry_years, teaching_years, subjects, teaching_format, availability, linkedin_url, bio, info_confirmed)
    values (
      new.id, public.meta_text(m, 'job_title', 120), public.meta_text(m, 'employer', 160),
      case when m ->> 'industry_years' in ('3-5','5-10','10-15','15+') then m ->> 'industry_years' end,
      case when m ->> 'teaching_years' in ('none','lt2','2-5','5+') then m ->> 'teaching_years' end,
      subj,
      case when m ->> 'teaching_format' in ('online','in_person','either') then m ->> 'teaching_format' end,
      case when m ->> 'availability' in ('evenings','weekends','daytime','flexible') then m ->> 'availability' end,
      case when public.meta_text(m, 'linkedin_url', 300) ~* '^https?://([a-z]{2,3}\.)?linkedin\.com/(in|pub|company)/[^[:space:]/]+' then public.meta_text(m, 'linkedin_url', 300) end,
      public.meta_text(m, 'bio', 600),
      coalesce((m ->> 'info_confirmed')::boolean, false)
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

-- 6. Row Level Security ---------------------------------------------------------------------------------------------
alter table public.instructor_profiles enable row level security;

drop policy if exists "instructor own select" on public.instructor_profiles;
create policy "instructor own select" on public.instructor_profiles for select to authenticated using (id = auth.uid() or public.is_admin());
drop policy if exists "instructor own insert" on public.instructor_profiles;
create policy "instructor own insert" on public.instructor_profiles for insert to authenticated with check (id = auth.uid() or public.is_admin());
drop policy if exists "instructor own update" on public.instructor_profiles;
create policy "instructor own update" on public.instructor_profiles for update to authenticated using (id = auth.uid() or public.is_admin()) with check (id = auth.uid() or public.is_admin());

revoke all on public.instructor_profiles from anon;
grant select, insert, update on public.instructor_profiles to authenticated;

-- Instructors never create or read applications (the 0005 policy already allows only students), and they read no
-- other profile: "profiles self select" is own row or admin. Nothing more to open or close here.

-- VDC Academy, migration 7: student evaluations by verified recruiters.
-- Idempotent (CI applies every migration twice). Run after 0001 to 0006 (SQL editor or `supabase db push`).
--
-- Privacy model
-- - A student is invisible to recruiters until the student turns on profiles.talent_visible. Only the student can change
--   it (an admin edit of somebody else's profile keeps the stored value). Turning it off hides the student from the talent
--   list at once and keeps every evaluation that was already published.
-- - Recruiters never read profiles. They read public.talent_cards, a view that exposes a first name plus the initial of
--   the last name, city, country, graduation year, programs the student is enrolled in, software skills and the LinkedIn
--   and portfolio links if the student filled them. No email, phone, date of birth, photo or document. The view returns rows
--   only to a verified recruiter (recruiter_profiles.verification_status = 'approved') or an admin.
-- - public.student_evaluations is readable by the recruiter who wrote a row and by admins. Students have NO select policy on
--   the table: they read their published evaluations through public.my_evaluations, a view that has no private_note, no
--   recruiter id and no moderation columns, and that shows the company name only when the recruiter ticked "show my company".
-- - New evaluations are always 'submitted'. The team (admin or super admin) publishes or hides them (hiding needs a note).
--   The recruiter edits until the team publishes; after that the row is locked.

-- 1. The opt-in --------------------------------------------------------------------------------------------------------
alter table public.profiles add column if not exists talent_visible boolean not null default false;
alter table public.profiles add column if not exists talent_consent_at timestamptz;
create index if not exists profiles_talent_visible_idx on public.profiles (talent_visible) where talent_visible;

-- Only the student turns it on or off, and only a student account can have it on. The server stamps the consent time.
create or replace function public.profiles_talent_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and auth.uid() is distinct from new.id then
    -- somebody else's profile (an admin edit): the opt-in belongs to the student alone
    if tg_op = 'UPDATE' then
      new.talent_visible := old.talent_visible;
      new.talent_consent_at := old.talent_consent_at;
    else
      new.talent_visible := false;
      new.talent_consent_at := null;
    end if;
    return new;
  end if;
  if new.talent_visible and not (new.account_type = 'student' and new.role = 'student') then
    raise exception 'only student accounts can share a profile with recruiters';
  end if;
  if new.talent_visible then
    if tg_op = 'UPDATE' then
      if old.talent_visible then
        new.talent_consent_at := old.talent_consent_at;
      else
        new.talent_consent_at := now();
      end if;
    else
      new.talent_consent_at := now();
    end if;
  else
    new.talent_consent_at := null;
  end if;
  return new;
end $$;
drop trigger if exists profiles_talent_guard on public.profiles;
create trigger profiles_talent_guard before insert or update on public.profiles for each row execute function public.profiles_talent_guard();

-- 2. Who counts as a verified recruiter ----------------------------------------------------------------------------------
create or replace function public.is_verified_recruiter() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((
    select true from public.profiles p join public.recruiter_profiles r on r.id = p.id
    where p.id = auth.uid() and p.account_type = 'recruiter' and p.role = 'recruiter' and r.verification_status = 'approved'
  ), false);
$$;

-- 3. The evaluations ------------------------------------------------------------------------------------------------------
-- scores: exactly six keys, each a whole number from 1 to 5
create or replace function public.evaluation_scores_ok(s jsonb) returns boolean
language sql immutable as $$
  select case when jsonb_typeof(s) = 'object' then
    (select count(*) from jsonb_object_keys(s)) = 6
    and (select count(*) from jsonb_object_keys(s) k where k in ('modeling','coordination','standards','communication','professionalism','portfolio')) = 6
    and not exists (select 1 from jsonb_each(s) e where jsonb_typeof(e.value) <> 'number' or e.value::text !~ '^[1-5]$')
  else false end
$$;

create table if not exists public.student_evaluations (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id) on delete cascade,
  recruiter_id uuid not null references public.profiles (id) on delete cascade,
  application_id uuid references public.applications (id) on delete set null,
  context text not null check (context in ('portfolio_review','interview','project_review','worked_together')),
  scores jsonb not null,
  overall smallint not null check (overall between 1 and 5),
  recommendation text not null check (recommendation in ('strong_yes','yes','maybe','not_now')),
  strengths text not null default '',
  improvements text not null default '',
  private_note text not null default '',
  show_company_name boolean not null default true,
  status text not null default 'submitted' check (status in ('submitted','published','hidden')),
  moderation_note text,
  moderated_by uuid, -- the admin who decided (audit only: no foreign key, deleting users never rewrites this row)
  moderated_at timestamptz,
  published_at timestamptz,
  notified_at timestamptz, -- stamped by the on-evaluation-published function
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint student_evaluations_one_per_context unique (student_id, recruiter_id, context)
);

alter table public.student_evaluations drop constraint if exists student_evaluations_scores_chk;
alter table public.student_evaluations add constraint student_evaluations_scores_chk check (public.evaluation_scores_ok(scores));
alter table public.student_evaluations drop constraint if exists student_evaluations_people_chk;
alter table public.student_evaluations add constraint student_evaluations_people_chk check (student_id <> recruiter_id);
-- text only: a length limit on every field and no HTML tags (the site also renders everything as plain text)
alter table public.student_evaluations drop constraint if exists student_evaluations_text_chk;
alter table public.student_evaluations add constraint student_evaluations_text_chk check (
  char_length(strengths) <= 1000 and char_length(improvements) <= 1000 and char_length(private_note) <= 1000
  and (moderation_note is null or char_length(moderation_note) <= 1000)
  and strengths !~ '<[[:space:]]*/?[[:space:]]*[a-zA-Z!]'
  and improvements !~ '<[[:space:]]*/?[[:space:]]*[a-zA-Z!]'
  and private_note !~ '<[[:space:]]*/?[[:space:]]*[a-zA-Z!]'
  and coalesce(moderation_note, '') !~ '<[[:space:]]*/?[[:space:]]*[a-zA-Z!]'
);

create index if not exists student_evaluations_student_idx on public.student_evaluations (student_id, status);
create index if not exists student_evaluations_recruiter_idx on public.student_evaluations (recruiter_id, created_at desc);
create index if not exists student_evaluations_status_idx on public.student_evaluations (status, created_at desc);

-- 4. Guards ------------------------------------------------------------------------------------------------------------------
-- No JWT (the SQL editor, the service role, the notification function) is trusted, the same rule as the other guards.
create or replace function public.student_evaluations_guard() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  s public.profiles;
  recent int;
begin
  if tg_op = 'INSERT' then
    if auth.uid() is not null then
      -- a new evaluation is always a submission by the signed-in recruiter; the team decides everything after that
      new.recruiter_id := auth.uid();
      new.status := 'submitted';
      new.moderation_note := null;
      new.moderated_by := null;
      new.moderated_at := null;
      new.published_at := null;
      new.notified_at := null;
      select * into s from public.profiles where id = new.student_id;
      if s.id is null or s.account_type is distinct from 'student' or s.role is distinct from 'student' or not s.talent_visible then
        raise exception 'this student is not available for evaluation';
      end if;
      if new.application_id is not null and not exists (select 1 from public.applications a where a.id = new.application_id and a.user_id = new.student_id) then
        new.application_id := null;
      end if;
      perform pg_advisory_xact_lock(hashtext(new.recruiter_id::text));
      select count(*) into recent from public.student_evaluations where recruiter_id = new.recruiter_id and created_at > now() - interval '24 hours';
      if recent >= 20 then
        raise exception 'daily limit of 20 evaluations reached';
      end if;
    end if;
    return new;
  end if;

  -- update
  if new.student_id is distinct from old.student_id or new.recruiter_id is distinct from old.recruiter_id then
    raise exception 'the student and the recruiter of an evaluation never change';
  end if;
  new.created_at := old.created_at;
  if auth.uid() is not null then
    new.context := old.context;
    new.application_id := old.application_id;
    new.notified_at := old.notified_at;
    if public.is_admin() then
      -- the team moderates; the words stay as the recruiter wrote them
      new.scores := old.scores;
      new.overall := old.overall;
      new.recommendation := old.recommendation;
      new.strengths := old.strengths;
      new.improvements := old.improvements;
      new.private_note := old.private_note;
      new.show_company_name := old.show_company_name;
      if new.status is distinct from old.status or new.moderation_note is distinct from old.moderation_note then
        new.moderated_by := auth.uid();
        new.moderated_at := now();
      else
        new.moderated_by := old.moderated_by;
        new.moderated_at := old.moderated_at;
      end if;
      if new.status = 'hidden' and nullif(btrim(coalesce(new.moderation_note, '')), '') is null then
        raise exception 'a note is required to hide an evaluation';
      end if;
      if new.status = 'published' then
        new.published_at := coalesce(old.published_at, now());
      else
        new.published_at := old.published_at;
      end if;
    else
      -- the recruiter edits their own words until the team publishes; nothing about the decision
      if old.status <> 'submitted' then
        raise exception 'an evaluation the team has decided on is locked';
      end if;
      new.status := 'submitted';
      new.moderation_note := old.moderation_note;
      new.moderated_by := old.moderated_by;
      new.moderated_at := old.moderated_at;
      new.published_at := old.published_at;
    end if;
  end if;
  return new;
end $$;
drop trigger if exists student_evaluations_guard on public.student_evaluations;
create trigger student_evaluations_guard before insert or update on public.student_evaluations for each row execute function public.student_evaluations_guard();
drop trigger if exists student_evaluations_updated_at on public.student_evaluations;
create trigger student_evaluations_updated_at before update on public.student_evaluations for each row execute function public.set_updated_at();

-- 5. The two views --------------------------------------------------------------------------------------------------------------
-- "John Smith" becomes "John S."; one word stays as it is.
create or replace function public.first_name_last_initial(name_in text) returns text
language sql immutable as $$
  select case
    when nullif(btrim(coalesce(name_in, '')), '') is null then null
    when btrim(name_in) !~ '[[:space:]]' then left(btrim(name_in), 40)
    else left((regexp_match(btrim(name_in), '^([^[:space:]]+)'))[1], 40) || ' ' || upper(left((regexp_match(btrim(name_in), '([^[:space:]]+)$'))[1], 1)) || '.'
  end
$$;

-- Programs the student is enrolled in, and the software they named on an application. Callable only through the view.
create or replace function public.talent_programs(uid uuid) returns text[]
language sql stable security definer set search_path = public as $$
  select coalesce((select array_agg(p order by p) from (
    select distinct left(x, 80) as p from public.applications a, unnest(a.programs) as x where a.user_id = uid and a.status = 'enrolled'
  ) q), '{}'::text[])
$$;
create or replace function public.talent_software(uid uuid) returns text[]
language sql stable security definer set search_path = public as $$
  select coalesce((select array_agg(s order by s) from (
    select left(e.key, 40) as s
    from public.applications a, jsonb_each_text(case when jsonb_typeof(a.software_skills) = 'object' then a.software_skills else '{}'::jsonb end) as e
    where a.user_id = uid and a.status <> 'draft' and lower(btrim(e.value)) not in ('', 'none')
    union
    select left(x, 40) as s
    from public.applications a, jsonb_array_elements_text(case when jsonb_typeof(a.software_skills) = 'array' then a.software_skills else '[]'::jsonb end) as x
    where a.user_id = uid and a.status <> 'draft'
  ) q), '{}'::text[])
$$;
revoke all on function public.talent_programs(uuid), public.talent_software(uuid) from public, anon, authenticated;

drop view if exists public.talent_cards;
create view public.talent_cards as
select
  p.id as student_id,
  public.first_name_last_initial(p.full_name) as display_name,
  p.city,
  p.country,
  p.graduation_year,
  public.talent_programs(p.id) as programs,
  public.talent_software(p.id) as software,
  case when p.linkedin_url ~* '^https?://' then p.linkedin_url end as linkedin_url,
  case when p.portfolio_url ~* '^https?://' then p.portfolio_url end as portfolio_url
from public.profiles p
where p.talent_visible
  and p.account_type = 'student' and p.role = 'student'
  and nullif(btrim(coalesce(p.full_name, '')), '') is not null
  and (public.is_verified_recruiter() or public.is_admin());

drop view if exists public.my_evaluations;
create view public.my_evaluations as
select
  e.id,
  e.published_at,
  e.context,
  e.scores,
  e.overall,
  e.recommendation,
  e.strengths,
  e.improvements,
  case when e.show_company_name then nullif(btrim(coalesce(r.company_name, '')), '') end as company_name
from public.student_evaluations e
left join public.recruiter_profiles r on r.id = e.recruiter_id
where e.student_id = auth.uid() and e.status = 'published';

-- 6. Row Level Security and grants ------------------------------------------------------------------------------------------
alter table public.student_evaluations enable row level security;

-- Recruiters read their own rows; admins read all. There is deliberately no student policy: students use my_evaluations.
drop policy if exists "evaluations own select" on public.student_evaluations;
create policy "evaluations own select" on public.student_evaluations for select to authenticated
  using ((recruiter_id = auth.uid() and public.is_recruiter()) or public.is_admin());
drop policy if exists "evaluations recruiter insert" on public.student_evaluations;
create policy "evaluations recruiter insert" on public.student_evaluations for insert to authenticated
  with check (recruiter_id = auth.uid() and public.is_verified_recruiter());
drop policy if exists "evaluations recruiter update" on public.student_evaluations;
create policy "evaluations recruiter update" on public.student_evaluations for update to authenticated
  using ((recruiter_id = auth.uid() and status = 'submitted' and public.is_verified_recruiter()) or public.is_admin())
  with check ((recruiter_id = auth.uid() and public.is_verified_recruiter()) or public.is_admin());

revoke all on public.student_evaluations, public.talent_cards, public.my_evaluations from anon;
revoke all on public.talent_cards, public.my_evaluations from authenticated;
grant select, insert, update on public.student_evaluations to authenticated;
grant select on public.talent_cards, public.my_evaluations to authenticated;

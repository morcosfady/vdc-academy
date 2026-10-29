-- VDC Academy, migration 9: instructors evaluate the students they teach.
-- Idempotent (CI applies every migration twice). Run after 0001 to 0008 (SQL editor or `supabase db push`).
--
-- Model
-- - The academy team (admin or super admin) assigns students to an instructor: public.instructor_assignments. An instructor
--   sees only the students assigned to them, and only through the view public.my_students (full name, program, since when).
--   No email, phone, date of birth, documents or applications. Nothing else about a student is readable by an instructor.
-- - Only a verified instructor (instructor_profiles.verification_status = 'approved') can write evaluations, only for a student
--   assigned to them, at most 30 per day. A new evaluation is always 'submitted'; the team publishes it or hides it (hiding needs
--   a note). The instructor edits until the team decides; after that the row is locked. The same rules as recruiter evaluations
--   (0007), kept in their own table so the two flows never mix.
-- - Students have NO select policy on the table. They read published evaluations through public.my_evaluations, which now
--   unions recruiter and instructor evaluations (no private note, no author id, no moderation columns). For an instructor the
--   view shows the first name and the initial of the last name.
-- - The student does not opt in: an assignment is part of the course the student enrolled in (the privacy page says so).

-- 1. Who counts as a verified instructor ---------------------------------------------------------------------------------
create or replace function public.is_verified_instructor() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((
    select true from public.profiles p join public.instructor_profiles i on i.id = p.id
    where p.id = auth.uid() and p.account_type = 'instructor' and p.role = 'instructor' and i.verification_status = 'approved'
  ), false);
$$;

-- 2. Assignments ----------------------------------------------------------------------------------------------------------
create table if not exists public.instructor_assignments (
  id uuid primary key default gen_random_uuid(),
  instructor_id uuid not null references public.profiles (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  program text check (program is null or program in (
    'vdc-professional-bootcamp','bim-fundamentals-revit','revit-architecture','revit-structure','revit-mep','low-voltage-bim',
    'revit-family-creation','navisworks-clash-detection','4d-5d-simulation','dynamo-for-revit','bim-management-iso-19650')),
  created_by uuid, -- the admin who assigned (audit only: no foreign key)
  created_at timestamptz not null default now(),
  constraint instructor_assignments_unique unique (instructor_id, student_id),
  constraint instructor_assignments_people_chk check (instructor_id <> student_id)
);
create index if not exists instructor_assignments_instructor_idx on public.instructor_assignments (instructor_id);
create index if not exists instructor_assignments_student_idx on public.instructor_assignments (student_id);

create or replace function public.instructor_assignments_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'UPDATE' then
    if new.instructor_id is distinct from old.instructor_id or new.student_id is distinct from old.student_id then
      raise exception 'the instructor and the student of an assignment never change';
    end if;
    new.created_by := old.created_by;
    new.created_at := old.created_at;
    return new;
  end if;
  if not exists (select 1 from public.profiles where id = new.instructor_id and account_type = 'instructor' and role = 'instructor') then
    raise exception 'an assignment needs an instructor account';
  end if;
  if not exists (select 1 from public.profiles where id = new.student_id and account_type = 'student' and role = 'student') then
    raise exception 'an assignment needs a student account';
  end if;
  if auth.uid() is not null then new.created_by := auth.uid(); end if;
  return new;
end $$;
drop trigger if exists instructor_assignments_guard on public.instructor_assignments;
create trigger instructor_assignments_guard before insert or update on public.instructor_assignments for each row execute function public.instructor_assignments_guard();

-- 3. The evaluations ------------------------------------------------------------------------------------------------------
create table if not exists public.instructor_evaluations (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id) on delete cascade,
  instructor_id uuid not null references public.profiles (id) on delete cascade,
  program text check (program is null or program in (
    'vdc-professional-bootcamp','bim-fundamentals-revit','revit-architecture','revit-structure','revit-mep','low-voltage-bim',
    'revit-family-creation','navisworks-clash-detection','4d-5d-simulation','dynamo-for-revit','bim-management-iso-19650')),
  context text not null check (context in ('mid_course','end_of_course','project_review')),
  scores jsonb not null,
  overall smallint not null check (overall between 1 and 5),
  readiness text not null check (readiness in ('ready','almost_there','needs_practice')),
  strengths text not null default '',
  improvements text not null default '',
  private_note text not null default '',
  status text not null default 'submitted' check (status in ('submitted','published','hidden')),
  moderation_note text,
  moderated_by uuid, -- the admin who decided (audit only: no foreign key)
  moderated_at timestamptz,
  published_at timestamptz,
  notified_at timestamptz, -- stamped by the on-evaluation-published function
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint instructor_evaluations_one_per_context unique (student_id, instructor_id, context)
);

alter table public.instructor_evaluations drop constraint if exists instructor_evaluations_scores_chk;
alter table public.instructor_evaluations add constraint instructor_evaluations_scores_chk check (public.evaluation_scores_ok(scores));
alter table public.instructor_evaluations drop constraint if exists instructor_evaluations_people_chk;
alter table public.instructor_evaluations add constraint instructor_evaluations_people_chk check (student_id <> instructor_id);
alter table public.instructor_evaluations drop constraint if exists instructor_evaluations_text_chk;
alter table public.instructor_evaluations add constraint instructor_evaluations_text_chk check (
  char_length(strengths) <= 1000 and char_length(improvements) <= 1000 and char_length(private_note) <= 1000
  and (moderation_note is null or char_length(moderation_note) <= 1000)
  and strengths !~ '<[[:space:]]*/?[[:space:]]*[a-zA-Z!]'
  and improvements !~ '<[[:space:]]*/?[[:space:]]*[a-zA-Z!]'
  and private_note !~ '<[[:space:]]*/?[[:space:]]*[a-zA-Z!]'
  and coalesce(moderation_note, '') !~ '<[[:space:]]*/?[[:space:]]*[a-zA-Z!]'
);
create index if not exists instructor_evaluations_student_idx on public.instructor_evaluations (student_id, status);
create index if not exists instructor_evaluations_instructor_idx on public.instructor_evaluations (instructor_id, created_at desc);
create index if not exists instructor_evaluations_status_idx on public.instructor_evaluations (status, created_at desc);

create or replace function public.instructor_evaluations_guard() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  recent int;
begin
  if tg_op = 'INSERT' then
    if auth.uid() is not null then
      new.instructor_id := auth.uid();
      new.status := 'submitted';
      new.moderation_note := null;
      new.moderated_by := null;
      new.moderated_at := null;
      new.published_at := null;
      new.notified_at := null;
      if not exists (select 1 from public.instructor_assignments a where a.instructor_id = new.instructor_id and a.student_id = new.student_id) then
        raise exception 'this student is not assigned to you';
      end if;
      perform pg_advisory_xact_lock(hashtext(new.instructor_id::text));
      select count(*) into recent from public.instructor_evaluations where instructor_id = new.instructor_id and created_at > now() - interval '24 hours';
      if recent >= 30 then
        raise exception 'daily limit of 30 evaluations reached';
      end if;
    end if;
    return new;
  end if;

  if new.student_id is distinct from old.student_id or new.instructor_id is distinct from old.instructor_id then
    raise exception 'the student and the instructor of an evaluation never change';
  end if;
  new.created_at := old.created_at;
  if auth.uid() is not null then
    new.context := old.context;
    new.program := old.program;
    new.notified_at := old.notified_at;
    if public.is_admin() then
      -- the team moderates; the words stay as the instructor wrote them
      new.scores := old.scores;
      new.overall := old.overall;
      new.readiness := old.readiness;
      new.strengths := old.strengths;
      new.improvements := old.improvements;
      new.private_note := old.private_note;
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
drop trigger if exists instructor_evaluations_guard on public.instructor_evaluations;
create trigger instructor_evaluations_guard before insert or update on public.instructor_evaluations for each row execute function public.instructor_evaluations_guard();
drop trigger if exists instructor_evaluations_updated_at on public.instructor_evaluations;
create trigger instructor_evaluations_updated_at before update on public.instructor_evaluations for each row execute function public.set_updated_at();

-- 4. The views -------------------------------------------------------------------------------------------------------------
-- What an instructor sees of the students assigned to them. A verified instructor only; nothing else about the student.
drop view if exists public.my_students;
create view public.my_students as
select
  a.id as assignment_id,
  a.student_id,
  nullif(btrim(coalesce(p.full_name, '')), '') as full_name,
  a.program,
  a.created_at as assigned_at
from public.instructor_assignments a
join public.profiles p on p.id = a.student_id
where a.instructor_id = auth.uid() and public.is_verified_instructor();

-- What a student sees of published evaluations: recruiters (0007) and instructors, no private note, no author id.
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
  case when e.show_company_name then nullif(btrim(coalesce(r.company_name, '')), '') end as company_name,
  'recruiter'::text as source,
  null::text as author_name,
  null::text as program,
  null::text as readiness
from public.student_evaluations e
left join public.recruiter_profiles r on r.id = e.recruiter_id
where e.student_id = auth.uid() and e.status = 'published'
union all
select
  i.id,
  i.published_at,
  i.context,
  i.scores,
  i.overall,
  null::text as recommendation,
  i.strengths,
  i.improvements,
  null::text as company_name,
  'instructor'::text as source,
  public.first_name_last_initial(p.full_name) as author_name,
  i.program,
  i.readiness
from public.instructor_evaluations i
left join public.profiles p on p.id = i.instructor_id
where i.student_id = auth.uid() and i.status = 'published';

-- 5. Row Level Security and grants -----------------------------------------------------------------------------------------
alter table public.instructor_assignments enable row level security;
alter table public.instructor_evaluations enable row level security;

-- Assignments: the team manages them; an instructor reads their own rows (the student side never reads this table).
drop policy if exists "assignments select" on public.instructor_assignments;
create policy "assignments select" on public.instructor_assignments for select to authenticated
  using ((instructor_id = auth.uid() and public.is_instructor()) or public.is_admin());
drop policy if exists "assignments admin insert" on public.instructor_assignments;
create policy "assignments admin insert" on public.instructor_assignments for insert to authenticated with check (public.is_admin());
drop policy if exists "assignments admin update" on public.instructor_assignments;
create policy "assignments admin update" on public.instructor_assignments for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "assignments admin delete" on public.instructor_assignments;
create policy "assignments admin delete" on public.instructor_assignments for delete to authenticated using (public.is_admin());

-- Evaluations: an instructor reads and writes their own rows; the team reads and moderates all. No student policy.
drop policy if exists "instructor evaluations select" on public.instructor_evaluations;
create policy "instructor evaluations select" on public.instructor_evaluations for select to authenticated
  using ((instructor_id = auth.uid() and public.is_instructor()) or public.is_admin());
drop policy if exists "instructor evaluations insert" on public.instructor_evaluations;
create policy "instructor evaluations insert" on public.instructor_evaluations for insert to authenticated
  with check (instructor_id = auth.uid() and public.is_verified_instructor());
drop policy if exists "instructor evaluations update" on public.instructor_evaluations;
create policy "instructor evaluations update" on public.instructor_evaluations for update to authenticated
  using ((instructor_id = auth.uid() and status = 'submitted' and public.is_verified_instructor()) or public.is_admin())
  with check ((instructor_id = auth.uid() and public.is_verified_instructor()) or public.is_admin());

revoke all on public.instructor_assignments, public.instructor_evaluations, public.my_students, public.my_evaluations from anon;
revoke all on public.my_students, public.my_evaluations from authenticated;
grant select, insert, update, delete on public.instructor_assignments to authenticated;
grant select, insert, update on public.instructor_evaluations to authenticated;
grant select on public.my_students, public.my_evaluations to authenticated;

-- VDC Academy: Row Level Security checks for the account tables (migrations 0003, 0004 and 0005).
--
-- Run the whole file in the SQL editor (it runs as `postgres`). It creates three throwaway users (student A,
-- student B, one admin), then runs each check as that user by setting the JWT claims and switching to the
-- `authenticated` role, exactly as PostgREST does. Every check prints a PASS or FAIL notice and lands in a
-- results table that is returned at the end. Safe to run more than once: the throwaway rows are removed at the
-- end, and at the start in case an earlier run stopped half way.
--
-- Requires 0004 to 0007. Checks 16 to 30 cover v9: recruiters, hiring requests, role grants (super admin only after
-- the email is confirmed) and the rule that onboarding_complete needs every required field. Checks 31 to 49 cover
-- 0007: the student opt-in, the talent list, evaluations by verified recruiters, moderation, the student-safe view
-- (no private note) and the daily cap of 20 evaluations per recruiter.
--
-- If the `insert into auth.users` below fails on your project, create the three users by hand instead:
-- Dashboard > Authentication > Users > Add user > Create new user, "Auto confirm user" on, with the emails
-- rls-test-a@example.invalid, rls-test-b@example.invalid and rls-test-admin@example.invalid, then delete the
-- `insert into auth.users ...` statement and run the file. Delete the users afterwards in the same screen.

create extension if not exists pgcrypto with schema extensions;

drop table if exists pg_temp.rls_results;
create temp table rls_results (n serial primary key, test text not null, pass boolean not null, detail text);

create or replace function pg_temp.rls_check(t text, ok boolean, d text default '') returns void
language plpgsql as $$
begin
  insert into pg_temp.rls_results (test, pass, detail) values (t, ok, d);
  raise notice '% | % | %', case when ok then 'PASS' else 'FAIL' end, t, d;
end $$;

do $$
declare
  a uuid; b uuid; adm uuid; r uuid; ow uuid; sup uuid;
  claims_a text; claims_b text; claims_adm text; claims_r text; claims_sup text;
  hr_id uuid; ok boolean; n2txt text;
  app_a_draft uuid; app_a_sub uuid; app_b_draft uuid;
  owner uuid; lead_id uuid;
  n int; n2 int; txt text;
  r2 uuid; claims_r2 text; ev1 uuid; ev2 uuid; caps uuid[]; i int;
  sc jsonb := '{"modeling":4,"coordination":4,"standards":4,"communication":4,"professionalism":4,"portfolio":4}';
  ctxs text[] := array['portfolio_review','interview','project_review','worked_together'];
begin
  -- 0. Clean up an earlier run (cascades: profiles, applications, events, deletion requests, evaluations).
  delete from auth.users where email in ('rls-test-a@example.invalid', 'rls-test-b@example.invalid', 'rls-test-admin@example.invalid', 'rls-test-recruiter@example.invalid', 'rls-test-recruiter2@example.invalid', 'rls-test-owner@example.invalid', 'rls-test-super@example.invalid')
    or email like 'rls-test-cap-%@example.invalid';
  delete from public.leads where email = 'rls-test-lead@example.invalid';
  delete from public.role_grants where email in ('rls-test-owner@example.invalid', 'rls-test-super@example.invalid');

  -- 1. Three users. The handle_new_user trigger creates their profiles.
  insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change)
  values
    ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', 'rls-test-a@example.invalid', extensions.crypt('rls-test-password', extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Test Student A"}', now(), now(), '', '', '', ''),
    ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', 'rls-test-b@example.invalid', extensions.crypt('rls-test-password', extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Test Student B"}', now(), now(), '', '', '', ''),
    ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', 'rls-test-admin@example.invalid', extensions.crypt('rls-test-password', extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Test Admin"}', now(), now(), '', '', '', '');

  select id into a from auth.users where email = 'rls-test-a@example.invalid';
  select id into b from auth.users where email = 'rls-test-b@example.invalid';
  select id into adm from auth.users where email = 'rls-test-admin@example.invalid';
  insert into public.profiles (id, email, full_name) values (a, 'rls-test-a@example.invalid', 'Test Student A') on conflict (id) do nothing;
  insert into public.profiles (id, email, full_name) values (b, 'rls-test-b@example.invalid', 'Test Student B') on conflict (id) do nothing;
  insert into public.profiles (id, email, full_name) values (adm, 'rls-test-admin@example.invalid', 'Test Admin') on conflict (id) do nothing;

  -- No JWT here, so the guard lets the dashboard set the role. A and B are students (v7 accounts were).
  update public.profiles set role = 'admin' where id = adm;
  update public.profiles set account_type = 'student' where id in (a, b);

  claims_a := json_build_object('sub', a, 'role', 'authenticated', 'email', 'rls-test-a@example.invalid')::text;
  claims_b := json_build_object('sub', b, 'role', 'authenticated', 'email', 'rls-test-b@example.invalid')::text;
  claims_adm := json_build_object('sub', adm, 'role', 'authenticated', 'email', 'rls-test-admin@example.invalid')::text;

  -- A lead row, inserted by the public, that only an admin may read.
  insert into public.leads (name, email, topic) values ('RLS test lead', 'rls-test-lead@example.invalid', 'test') returning id into lead_id;

  -- T1. A reads only their own profile.
  begin
    perform set_config('request.jwt.claims', claims_a, true);
    set local role authenticated;
    select count(*) into n from public.profiles;
    select count(*) into n2 from public.profiles where id = b;
    reset role;
    perform set_config('request.jwt.claims', '', true);
    perform pg_temp.rls_check('student reads only own profile', n = 1 and n2 = 0, format('visible=%s, other student=%s', n, n2));
  exception when others then
    reset role;
    perform set_config('request.jwt.claims', '', true);
    perform pg_temp.rls_check('student reads only own profile', false, sqlerrm);
  end;

  -- T2. A cannot change their own role (the guard trigger raises).
  begin
    perform set_config('request.jwt.claims', claims_a, true);
    set local role authenticated;
    update public.profiles set role = 'admin' where id = a;
    reset role;
    perform set_config('request.jwt.claims', '', true);
    select role into txt from public.profiles where id = a;
    perform pg_temp.rls_check('student cannot change own role', txt = 'student', 'no exception; role is ' || coalesce(txt, 'null'));
  exception when others then
    reset role;
    perform set_config('request.jwt.claims', '', true);
    perform pg_temp.rls_check('student cannot change own role', sqlerrm like '%only an admin can change a role%', sqlerrm);
  end;

  -- T3. A can update their own profile fields.
  begin
    perform set_config('request.jwt.claims', claims_a, true);
    set local role authenticated;
    update public.profiles set city = 'Fort Worth' where id = a;
    get diagnostics n = row_count;
    reset role;
    perform set_config('request.jwt.claims', '', true);
    perform pg_temp.rls_check('student updates own profile', n = 1, format('rows=%s', n));
  exception when others then
    reset role;
    perform set_config('request.jwt.claims', '', true);
    perform pg_temp.rls_check('student updates own profile', false, sqlerrm);
  end;

  -- T4. A inserts a draft and a submitted application; a forged user_id is overwritten with the caller's id.
  begin
    perform set_config('request.jwt.claims', claims_a, true);
    set local role authenticated;
    insert into public.applications (status, full_name, email, phone, country, city, programs, consent_privacy, consent_contact)
    values ('draft', 'Test Student A', 'rls-test-a@example.invalid', '+10000000000', 'US', 'Fort Worth', array['revit-mep'], true, true)
    returning id into app_a_draft;
    insert into public.applications (user_id, status, full_name, email, phone, country, city, programs, consent_privacy, consent_contact, discount_type, discount_percent)
    values (b, 'submitted', 'Test Student A', 'rls-test-a@example.invalid', '+10000000000', 'US', 'Fort Worth', array['vdc-professional-bootcamp'], true, true, 'freshGrad', 40)
    returning id, user_id into app_a_sub, owner;
    reset role;
    perform set_config('request.jwt.claims', '', true);
    perform pg_temp.rls_check('student inserts draft and submitted applications', app_a_draft is not null and app_a_sub is not null, '');
    perform pg_temp.rls_check('student cannot create an application owned by someone else', owner = a, format('owner is %s', case when owner = a then 'the caller' else 'someone else' end));
    select discount_status into txt from public.applications where id = app_a_sub;
    perform pg_temp.rls_check('submitted application with a discount is pending verification', txt = 'pending', 'discount_status=' || coalesce(txt, 'null'));
  exception when others then
    reset role;
    perform set_config('request.jwt.claims', '', true);
    perform pg_temp.rls_check('student inserts draft and submitted applications', false, sqlerrm);
  end;

  -- T5. B inserts a draft.
  begin
    perform set_config('request.jwt.claims', claims_b, true);
    set local role authenticated;
    insert into public.applications (status, full_name, email, programs) values ('draft', 'Test Student B', 'rls-test-b@example.invalid', array['revit-architecture'])
    returning id into app_b_draft;
    reset role;
    perform set_config('request.jwt.claims', '', true);
    perform pg_temp.rls_check('second student inserts a draft', app_b_draft is not null, '');
  exception when others then
    reset role;
    perform set_config('request.jwt.claims', '', true);
    perform pg_temp.rls_check('second student inserts a draft', false, sqlerrm);
  end;

  -- T6. A sees exactly their own two applications and none of B's.
  begin
    perform set_config('request.jwt.claims', claims_a, true);
    set local role authenticated;
    select count(*) into n from public.applications;
    select count(*) into n2 from public.applications where user_id = b;
    reset role;
    perform set_config('request.jwt.claims', '', true);
    perform pg_temp.rls_check('student reads only own applications', n = 2 and n2 = 0, format('visible=%s, other student=%s', n, n2));
  exception when others then
    reset role;
    perform set_config('request.jwt.claims', '', true);
    perform pg_temp.rls_check('student reads only own applications', false, sqlerrm);
  end;

  -- T7. A edits their own draft; a status jump on a draft is forced back to draft.
  begin
    perform set_config('request.jwt.claims', claims_a, true);
    set local role authenticated;
    update public.applications set city = 'Dallas', status = 'accepted' where id = app_a_draft;
    get diagnostics n = row_count;
    reset role;
    perform set_config('request.jwt.claims', '', true);
    select status into txt from public.applications where id = app_a_draft;
    perform pg_temp.rls_check('student edits own draft', n = 1, format('rows=%s', n));
    perform pg_temp.rls_check('student cannot skip the pipeline on a draft', txt = 'draft', 'status=' || coalesce(txt, 'null'));
  exception when others then
    reset role;
    perform set_config('request.jwt.claims', '', true);
    perform pg_temp.rls_check('student edits own draft', false, sqlerrm);
  end;

  -- T8. A cannot update a submitted application (the policy hides it from UPDATE, or the trigger raises).
  begin
    perform set_config('request.jwt.claims', claims_a, true);
    set local role authenticated;
    update public.applications set city = 'Nowhere', status = 'accepted' where id = app_a_sub;
    get diagnostics n = row_count;
    reset role;
    perform set_config('request.jwt.claims', '', true);
    select city || '/' || status into txt from public.applications where id = app_a_sub;
    perform pg_temp.rls_check('student cannot update a submitted application', n = 0 and txt = 'Fort Worth/submitted', format('rows=%s, row=%s', n, txt));
  exception when others then
    reset role;
    perform set_config('request.jwt.claims', '', true);
    perform pg_temp.rls_check('student cannot update a submitted application', sqlerrm like '%can no longer be edited%', sqlerrm);
  end;

  -- T9. A cannot update or delete B's draft.
  begin
    perform set_config('request.jwt.claims', claims_a, true);
    set local role authenticated;
    update public.applications set city = 'Nowhere' where id = app_b_draft;
    get diagnostics n = row_count;
    delete from public.applications where id = app_b_draft;
    get diagnostics n2 = row_count;
    reset role;
    perform set_config('request.jwt.claims', '', true);
    perform pg_temp.rls_check('student cannot touch another student''s application', n = 0 and n2 = 0 and exists (select 1 from public.applications where id = app_b_draft), format('updated=%s, deleted=%s', n, n2));
  exception when others then
    reset role;
    perform set_config('request.jwt.claims', '', true);
    perform pg_temp.rls_check('student cannot touch another student''s application', false, sqlerrm);
  end;

  -- T10. Anonymous visitors have no access to profiles at all.
  begin
    perform set_config('request.jwt.claims', '{"role":"anon"}', true);
    set local role anon;
    select count(*) into n from public.profiles;
    reset role;
    perform set_config('request.jwt.claims', '', true);
    perform pg_temp.rls_check('anon cannot read profiles', false, format('no exception, visible=%s', n));
  exception when others then
    reset role;
    perform set_config('request.jwt.claims', '', true);
    perform pg_temp.rls_check('anon cannot read profiles', sqlerrm ilike '%permission denied%', sqlerrm);
  end;

  -- T11. The admin reads every profile and application.
  begin
    perform set_config('request.jwt.claims', claims_adm, true);
    set local role authenticated;
    select count(*) into n from public.profiles where id in (a, b, adm);
    select count(*) into n2 from public.applications where id in (app_a_draft, app_a_sub, app_b_draft);
    reset role;
    perform set_config('request.jwt.claims', '', true);
    perform pg_temp.rls_check('admin reads all profiles and applications', n = 3 and n2 = 3, format('profiles=%s, applications=%s', n, n2));
  exception when others then
    reset role;
    perform set_config('request.jwt.claims', '', true);
    perform pg_temp.rls_check('admin reads all profiles and applications', false, sqlerrm);
  end;

  -- T12. The admin moves A's application forward; the status change is logged as an event.
  begin
    perform set_config('request.jwt.claims', claims_adm, true);
    set local role authenticated;
    update public.applications set status = 'under_review' where id = app_a_sub;
    get diagnostics n = row_count;
    reset role;
    perform set_config('request.jwt.claims', '', true);
    select count(*) into n2 from public.application_events where application_id = app_a_sub and type = 'status_change' and to_status = 'under_review' and visible_to_student;
    perform pg_temp.rls_check('admin changes a status and an event is logged', n = 1 and n2 = 1, format('rows=%s, events=%s', n, n2));
  exception when others then
    reset role;
    perform set_config('request.jwt.claims', '', true);
    perform pg_temp.rls_check('admin changes a status and an event is logged', false, sqlerrm);
  end;

  -- T13. A sees the event on their own application; B sees nothing.
  begin
    perform set_config('request.jwt.claims', claims_a, true);
    set local role authenticated;
    select count(*) into n from public.application_events;
    reset role;
    perform set_config('request.jwt.claims', claims_b, true);
    set local role authenticated;
    select count(*) into n2 from public.application_events;
    reset role;
    perform set_config('request.jwt.claims', '', true);
    perform pg_temp.rls_check('student sees only events on own applications', n = 1 and n2 = 0, format('A=%s, B=%s', n, n2));
  exception when others then
    reset role;
    perform set_config('request.jwt.claims', '', true);
    perform pg_temp.rls_check('student sees only events on own applications', false, sqlerrm);
  end;

  -- T14. Deletion requests: A files one, B cannot see it, the admin can.
  begin
    perform set_config('request.jwt.claims', claims_a, true);
    set local role authenticated;
    insert into public.account_deletion_requests (user_id, reason) values (a, 'rls test');
    reset role;
    perform set_config('request.jwt.claims', claims_b, true);
    set local role authenticated;
    select count(*) into n from public.account_deletion_requests where user_id = a;
    reset role;
    perform set_config('request.jwt.claims', claims_adm, true);
    set local role authenticated;
    select count(*) into n2 from public.account_deletion_requests where user_id = a;
    reset role;
    perform set_config('request.jwt.claims', '', true);
    perform pg_temp.rls_check('deletion request visible to owner and admin only', n = 0 and n2 = 1, format('other student=%s, admin=%s', n, n2));
  exception when others then
    reset role;
    perform set_config('request.jwt.claims', '', true);
    perform pg_temp.rls_check('deletion request visible to owner and admin only', false, sqlerrm);
  end;

  -- T15. Leads: students read none, the admin reads them.
  begin
    perform set_config('request.jwt.claims', claims_a, true);
    set local role authenticated;
    select count(*) into n from public.leads where id = lead_id;
    reset role;
    perform set_config('request.jwt.claims', claims_adm, true);
    set local role authenticated;
    select count(*) into n2 from public.leads where id = lead_id;
    reset role;
    perform set_config('request.jwt.claims', '', true);
    perform pg_temp.rls_check('leads are admin only', n = 0 and n2 = 1, format('student=%s, admin=%s', n, n2));
  exception when others then
    reset role;
    perform set_config('request.jwt.claims', '', true);
    perform pg_temp.rls_check('leads are admin only', false, sqlerrm);
  end;

  -- v9 ------------------------------------------------------------------------------------------------------------
  -- A recruiter signs up with the full metadata the form sends (plus a forged "role": it must be ignored), and a
  -- super admin exists for the admin-role checks.
  insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change)
  values ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', 'rls-test-recruiter@example.invalid', extensions.crypt('rls-test-password', extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}',
    '{"account_type":"recruiter","full_name":"Test Recruiter","phone":"+1 555 010 0000","country":"USA","city":"Dallas","heard_from":"linkedin","job_title":"BIM Lead","company_name":"Test Company","company_website":"https://example.com","company_type":"general_contractor","company_size":"51-200","linkedin_url":"https://www.linkedin.com/in/test-recruiter","hiring_roles":["bim_coordinator","vdc_engineer","not-a-role"],"expected_hires":"2-5","consent_terms":true,"consent_contact":true,"authorised_confirmed":true,"role":"admin"}',
    now(), now(), '', '', '', '');
  select id into r from auth.users where email = 'rls-test-recruiter@example.invalid';
  claims_r := json_build_object('sub', r, 'role', 'authenticated', 'email', 'rls-test-recruiter@example.invalid')::text;

  insert into public.role_grants (email, role) values ('rls-test-super@example.invalid', 'super_admin');
  insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change)
  values ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', 'rls-test-super@example.invalid', extensions.crypt('rls-test-password', extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Test Super","phone":"+1 555 010 0001"}', now(), now(), '', '', '', '');
  select id into sup from auth.users where email = 'rls-test-super@example.invalid';
  claims_sup := json_build_object('sub', sup, 'role', 'authenticated', 'email', 'rls-test-super@example.invalid')::text;

  -- T16. Sign-up metadata becomes a complete recruiter profile: role from account_type (never from metadata),
  --      pending verification, unknown hiring roles dropped.
  begin
    select role || '/' || account_type || '/' || onboarding_complete::text into txt from public.profiles where id = r;
    select verification_status = 'pending' and hiring_roles = array['bim_coordinator','vdc_engineer'] into ok from public.recruiter_profiles where id = r;
    perform pg_temp.rls_check('recruiter sign-up creates a complete, pending company profile', txt = 'recruiter/recruiter/true' and coalesce(ok, false), coalesce(txt, 'no profile') || ' pending+roles=' || coalesce(ok::text, 'no row'));
  exception when others then
    perform pg_temp.rls_check('recruiter sign-up creates a complete, pending company profile', false, sqlerrm);
  end;

  -- T17. A student cannot see recruiter rows (profile or company).
  begin
    perform set_config('request.jwt.claims', claims_a, true);
    set local role authenticated;
    select count(*) into n from public.recruiter_profiles;
    select count(*) into n2 from public.profiles where id = r;
    reset role;
    perform set_config('request.jwt.claims', '', true);
    perform pg_temp.rls_check('student cannot read recruiter profiles', n = 0 and n2 = 0, format('company rows=%s, profile rows=%s', n, n2));
  exception when others then
    reset role;
    perform set_config('request.jwt.claims', '', true);
    perform pg_temp.rls_check('student cannot read recruiter profiles', false, sqlerrm);
  end;

  -- T18. A recruiter reads no applications and no student profiles.
  begin
    perform set_config('request.jwt.claims', claims_r, true);
    set local role authenticated;
    select count(*) into n from public.applications;
    select count(*) into n2 from public.profiles where id in (a, b);
    reset role;
    perform set_config('request.jwt.claims', '', true);
    perform pg_temp.rls_check('recruiter cannot read applications or student profiles', n = 0 and n2 = 0, format('applications=%s, student profiles=%s', n, n2));
  exception when others then
    reset role;
    perform set_config('request.jwt.claims', '', true);
    perform pg_temp.rls_check('recruiter cannot read applications or student profiles', false, sqlerrm);
  end;

  -- T19. A recruiter cannot create an application.
  begin
    perform set_config('request.jwt.claims', claims_r, true);
    set local role authenticated;
    insert into public.applications (status, full_name, email, programs) values ('draft', 'Test Recruiter', 'rls-test-recruiter@example.invalid', array['revit-mep']);
    reset role;
    perform set_config('request.jwt.claims', '', true);
    perform pg_temp.rls_check('recruiter cannot create an application', false, 'insert succeeded');
  exception when others then
    reset role;
    perform set_config('request.jwt.claims', '', true);
    perform pg_temp.rls_check('recruiter cannot create an application', sqlerrm ilike '%row-level security%', sqlerrm);
  end;

  -- T20. A recruiter cannot approve their own company (the guard keeps the verification columns).
  begin
    perform set_config('request.jwt.claims', claims_r, true);
    set local role authenticated;
    update public.recruiter_profiles set verification_status = 'approved', verified_at = now(), job_title = 'Head of BIM' where id = r;
    reset role;
    perform set_config('request.jwt.claims', '', true);
    select verification_status || '/' || job_title into txt from public.recruiter_profiles where id = r;
    perform pg_temp.rls_check('recruiter cannot verify their own company', txt = 'pending/Head of BIM', coalesce(txt, 'null'));
  exception when others then
    reset role;
    perform set_config('request.jwt.claims', '', true);
    perform pg_temp.rls_check('recruiter cannot verify their own company', false, sqlerrm);
  end;

  -- T21. The account type is set once: a recruiter cannot become a student (or the reverse).
  begin
    perform set_config('request.jwt.claims', claims_r, true);
    set local role authenticated;
    update public.profiles set account_type = 'student' where id = r;
    reset role;
    perform set_config('request.jwt.claims', '', true);
    select account_type into txt from public.profiles where id = r;
    perform pg_temp.rls_check('account type cannot be switched by the user', txt = 'recruiter', 'no exception; account_type=' || coalesce(txt, 'null'));
  exception when others then
    reset role;
    perform set_config('request.jwt.claims', '', true);
    perform pg_temp.rls_check('account type cannot be switched by the user', sqlerrm like '%chosen once%', sqlerrm);
  end;

  -- T22. Nobody self-promotes: a recruiter to admin, a student to super admin.
  begin
    ok := true;
    begin
      perform set_config('request.jwt.claims', claims_r, true);
      set local role authenticated;
      update public.profiles set role = 'admin' where id = r;
      reset role;
      ok := false;
    exception when others then reset role; ok := ok and sqlerrm like '%only an admin%';
    end;
    begin
      perform set_config('request.jwt.claims', claims_a, true);
      set local role authenticated;
      update public.profiles set role = 'super_admin' where id = a;
      reset role;
      ok := false;
    exception when others then reset role; ok := ok and sqlerrm like '%only an admin%';
    end;
    perform set_config('request.jwt.claims', '', true);
    select ok and (select role from public.profiles where id = r) = 'recruiter' and (select role from public.profiles where id = a) = 'student' into ok;
    perform pg_temp.rls_check('nobody can promote themselves', ok, '');
  exception when others then
    reset role;
    perform set_config('request.jwt.claims', '', true);
    perform pg_temp.rls_check('nobody can promote themselves', false, sqlerrm);
  end;

  -- T23. A plain admin cannot hand out admin roles; a super admin can.
  begin
    ok := false;
    begin
      perform set_config('request.jwt.claims', claims_adm, true);
      set local role authenticated;
      update public.profiles set role = 'admin' where id = b;
      reset role;
    exception when others then reset role; ok := sqlerrm like '%only a super admin%';
    end;
    perform set_config('request.jwt.claims', claims_sup, true);
    set local role authenticated;
    update public.profiles set role = 'admin' where id = b;
    update public.profiles set role = 'student' where id = b;
    reset role;
    perform set_config('request.jwt.claims', '', true);
    select role into txt from public.profiles where id = sup;
    perform pg_temp.rls_check('only a super admin grants admin roles', ok and txt = 'super_admin' and (select role from public.profiles where id = b) = 'student', 'plain admin refused=' || ok::text || ', super=' || coalesce(txt, 'null'));
  exception when others then
    reset role;
    perform set_config('request.jwt.claims', '', true);
    perform pg_temp.rls_check('only a super admin grants admin roles', false, sqlerrm);
  end;

  -- T24. A granted email gets super_admin only after it is confirmed (and the match ignores letter case).
  begin
    insert into public.role_grants (email, role) values ('rls-test-owner@example.invalid', 'super_admin');
    insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change)
    values ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', 'rls-test-owner@example.invalid', extensions.crypt('rls-test-password', extensions.gen_salt('bf')), null, '{"provider":"email","providers":["email"]}', '{"full_name":"Test Owner","phone":"+1 555 010 0002"}', now(), now(), '', '', '', '');
    select id into ow from auth.users where email = 'rls-test-owner@example.invalid';
    select role into txt from public.profiles where id = ow;
    update auth.users set email_confirmed_at = now() where id = ow;
    select role || '/' || onboarding_complete::text into n2txt from public.profiles where id = ow;
    perform pg_temp.rls_check('super admin grant waits for email confirmation', txt = 'student' and n2txt = 'super_admin/true', format('before confirm=%s, after=%s', txt, n2txt));
  exception when others then
    perform pg_temp.rls_check('super admin grant waits for email confirmation', false, sqlerrm);
  end;

  -- T25. onboarding_complete cannot be set with missing fields (A only has a name).
  begin
    perform set_config('request.jwt.claims', claims_a, true);
    set local role authenticated;
    update public.profiles set onboarding_complete = true where id = a;
    reset role;
    perform set_config('request.jwt.claims', '', true);
    perform pg_temp.rls_check('incomplete profile cannot finish onboarding', false, 'update succeeded');
  exception when others then
    reset role;
    perform set_config('request.jwt.claims', '', true);
    perform pg_temp.rls_check('incomplete profile cannot finish onboarding', sqlerrm like '%profile_complete%', sqlerrm);
  end;

  -- T26. A student under 16 cannot finish onboarding even with every other field.
  begin
    perform set_config('request.jwt.claims', claims_a, true);
    set local role authenticated;
    update public.profiles set phone = '+1 555 010 0003', whatsapp = '+1 555 010 0003', country = 'USA', city = 'Dallas', date_of_birth = current_date - interval '15 years',
      current_status = 'fresh_grad', degree_field = 'architecture', degree_level = 'bachelor', university = 'Test University', graduation_year = 2026,
      experience_years = '0', revit_level = 'beginner', career_goal = 'bim_modeler', preferred_format = 'online', heard_from = 'google',
      consent_terms_at = now(), consent_contact_at = now(), onboarding_complete = true where id = a;
    reset role;
    perform set_config('request.jwt.claims', '', true);
    perform pg_temp.rls_check('under-16 student cannot finish onboarding', false, 'update succeeded');
  exception when others then
    reset role;
    perform set_config('request.jwt.claims', '', true);
    perform pg_temp.rls_check('under-16 student cannot finish onboarding', sqlerrm like '%profile_complete%', sqlerrm);
  end;

  -- T27. Hiring requests: a student cannot send one; a recruiter can (owner and status forced) but cannot move it.
  begin
    ok := false;
    begin
      perform set_config('request.jwt.claims', claims_a, true);
      set local role authenticated;
      insert into public.hiring_requests (recruiter_id, role, hires, location, work_mode, start_date) values (a, 'bim_modeler', 1, 'Dallas', 'on_site', current_date + 30);
      reset role;
    exception when others then reset role; ok := sqlerrm ilike '%row-level security%';
    end;
    perform set_config('request.jwt.claims', claims_r, true);
    set local role authenticated;
    insert into public.hiring_requests (recruiter_id, role, hires, location, work_mode, start_date, status) values (r, 'vdc_engineer', 2, 'Fort Worth', 'hybrid', current_date + 30, 'matched') returning id into hr_id;
    update public.hiring_requests set status = 'closed' where id = hr_id;
    get diagnostics n = row_count;
    reset role;
    perform set_config('request.jwt.claims', '', true);
    select status || '/' || (recruiter_id = r)::text into txt from public.hiring_requests where id = hr_id;
    perform pg_temp.rls_check('hiring requests: recruiters only, status set by the team', ok and n = 0 and txt = 'new/true', format('student refused=%s, recruiter updates=%s, row=%s', ok, n, coalesce(txt, 'null')));
  exception when others then
    reset role;
    perform set_config('request.jwt.claims', '', true);
    perform pg_temp.rls_check('hiring requests: recruiters only, status set by the team', sqlerrm like '%only the academy team%' and ok, sqlerrm);
  end;

  -- T28. A student cannot see a recruiter's hiring requests; the admin can.
  begin
    perform set_config('request.jwt.claims', claims_a, true);
    set local role authenticated;
    select count(*) into n from public.hiring_requests where id = hr_id;
    reset role;
    perform set_config('request.jwt.claims', claims_adm, true);
    set local role authenticated;
    select count(*) into n2 from public.hiring_requests where id = hr_id;
    reset role;
    perform set_config('request.jwt.claims', '', true);
    perform pg_temp.rls_check('hiring requests visible to their recruiter and admins only', n = 0 and n2 = 1, format('student=%s, admin=%s', n, n2));
  exception when others then
    reset role;
    perform set_config('request.jwt.claims', '', true);
    perform pg_temp.rls_check('hiring requests visible to their recruiter and admins only', false, sqlerrm);
  end;

  -- T29. An admin approves the recruiter; the database signs and dates the decision.
  begin
    perform set_config('request.jwt.claims', claims_adm, true);
    set local role authenticated;
    update public.recruiter_profiles set verification_status = 'approved' where id = r;
    reset role;
    perform set_config('request.jwt.claims', '', true);
    select verification_status = 'approved' and verified_by = adm and verified_at is not null into ok from public.recruiter_profiles where id = r;
    perform pg_temp.rls_check('admin approves a recruiter (verified_by and verified_at set)', coalesce(ok, false), '');
  exception when others then
    reset role;
    perform set_config('request.jwt.claims', '', true);
    perform pg_temp.rls_check('admin approves a recruiter (verified_by and verified_at set)', false, sqlerrm);
  end;

  -- T30. Role grants are invisible to students and recruiters.
  begin
    perform set_config('request.jwt.claims', claims_r, true);
    set local role authenticated;
    select count(*) into n from public.role_grants;
    reset role;
    perform set_config('request.jwt.claims', claims_sup, true);
    set local role authenticated;
    select count(*) into n2 from public.role_grants;
    reset role;
    perform set_config('request.jwt.claims', '', true);
    perform pg_temp.rls_check('role grants readable by super admins only', n = 0 and n2 >= 1, format('recruiter=%s, super admin=%s', n, n2));
  exception when others then
    reset role;
    perform set_config('request.jwt.claims', '', true);
    perform pg_temp.rls_check('role grants readable by super admins only', false, sqlerrm);
  end;

  -- v10: evaluations (migration 0007) ---------------------------------------------------------------------------
  -- A second recruiter, unverified for now. The verified recruiter from T29 is r; student A is the one evaluated.
  insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change)
  values ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', 'rls-test-recruiter2@example.invalid', extensions.crypt('rls-test-password', extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}',
    '{"account_type":"recruiter","full_name":"Test Recruiter Two","phone":"+1 555 010 0004","country":"USA","city":"Austin","heard_from":"google","job_title":"Talent Partner","company_name":"Test Company Two","company_website":"https://example.com","company_type":"ae_firm","company_size":"11-50","linkedin_url":"https://www.linkedin.com/in/test-recruiter-two","hiring_roles":["bim_modeler"],"expected_hires":"1","consent_terms":true,"consent_contact":true,"authorised_confirmed":true}',
    now(), now(), '', '', '', '');
  select id into r2 from auth.users where email = 'rls-test-recruiter2@example.invalid';
  claims_r2 := json_build_object('sub', r2, 'role', 'authenticated', 'email', 'rls-test-recruiter2@example.invalid')::text;

  -- T31. Student A opts in, student B does not: a verified recruiter lists A only, shown as first name + last initial.
  begin
    perform set_config('request.jwt.claims', claims_a, true);
    set local role authenticated;
    update public.profiles set talent_visible = true where id = a;
    reset role;
    perform set_config('request.jwt.claims', claims_r, true);
    set local role authenticated;
    select count(*) into n from public.talent_cards where student_id = a;
    select count(*) into n2 from public.talent_cards where student_id = b;
    select display_name into txt from public.talent_cards where student_id = a;
    reset role;
    perform set_config('request.jwt.claims', '', true);
    select talent_consent_at is not null into ok from public.profiles where id = a;
    perform pg_temp.rls_check('opted-in student is on the talent list, a student who did not opt in is not', n = 1 and n2 = 0 and coalesce(txt, '') = 'Test A.' and coalesce(ok, false), format('opted in=%s, not opted in=%s, shown as %s, consent stamped=%s', n, n2, coalesce(txt, 'null'), coalesce(ok::text, 'null')));
  exception when others then
    reset role;
    perform set_config('request.jwt.claims', '', true);
    perform pg_temp.rls_check('opted-in student is on the talent list, a student who did not opt in is not', false, sqlerrm);
  end;

  -- T32. The talent list has no email, phone, full name, birth date, photo or university column.
  begin
    select count(*) into n from information_schema.columns where table_schema = 'public' and table_name = 'talent_cards'
      and column_name in ('email', 'phone', 'whatsapp', 'full_name', 'date_of_birth', 'avatar_path', 'university', 'id', 'role', 'age_range');
    select count(*) into n2 from information_schema.columns where table_schema = 'public' and table_name = 'talent_cards';
    perform pg_temp.rls_check('talent list exposes only the safe columns', n = 0 and n2 = 9, format('private columns=%s, total columns=%s', n, n2));
  exception when others then
    perform pg_temp.rls_check('talent list exposes only the safe columns', false, sqlerrm);
  end;

  -- T33. Only a student account can opt in, and nobody can opt a student in or out for them (not even an admin).
  begin
    ok := false;
    begin
      perform set_config('request.jwt.claims', claims_r, true);
      set local role authenticated;
      update public.profiles set talent_visible = true where id = r;
      reset role;
    exception when others then reset role; ok := sqlerrm like '%only student accounts%';
    end;
    perform set_config('request.jwt.claims', claims_adm, true);
    set local role authenticated;
    update public.profiles set talent_visible = true where id = b;
    reset role;
    perform set_config('request.jwt.claims', '', true);
    select (select talent_visible from public.profiles where id = b) = false and (select talent_visible from public.profiles where id = r) = false and ok into ok;
    perform pg_temp.rls_check('only a student can opt in, and only for themselves', coalesce(ok, false), '');
  exception when others then
    reset role;
    perform set_config('request.jwt.claims', '', true);
    perform pg_temp.rls_check('only a student can opt in, and only for themselves', false, sqlerrm);
  end;

  -- T34. An unverified recruiter sees no students and cannot write an evaluation.
  begin
    ok := false;
    perform set_config('request.jwt.claims', claims_r2, true);
    set local role authenticated;
    select count(*) into n from public.talent_cards;
    begin
      insert into public.student_evaluations (student_id, recruiter_id, context, scores, overall, recommendation, strengths, improvements)
      values (a, r2, 'interview', sc, 4, 'yes', 'Clear models.', 'More detail on schedules.');
      reset role;
    exception when others then reset role; ok := sqlerrm ilike '%row-level security%';
    end;
    perform set_config('request.jwt.claims', '', true);
    perform pg_temp.rls_check('unverified recruiter reads no talent and cannot evaluate', n = 0 and ok, format('talent rows=%s, insert refused=%s', n, ok));
  exception when others then
    reset role;
    perform set_config('request.jwt.claims', '', true);
    perform pg_temp.rls_check('unverified recruiter reads no talent and cannot evaluate', false, sqlerrm);
  end;

  -- T35. Students and anonymous visitors cannot read the talent list or the evaluations table.
  begin
    perform set_config('request.jwt.claims', claims_b, true);
    set local role authenticated;
    select count(*) into n from public.talent_cards;
    reset role;
    ok := true;
    perform set_config('request.jwt.claims', '{"role":"anon"}', true);
    begin
      set local role anon;
      perform count(*) from public.talent_cards;
      reset role;
      ok := false;
    exception when others then reset role; ok := ok and sqlerrm ilike '%permission denied%';
    end;
    begin
      set local role anon;
      perform count(*) from public.student_evaluations;
      reset role;
      ok := false;
    exception when others then reset role; ok := ok and sqlerrm ilike '%permission denied%';
    end;
    begin
      set local role anon;
      perform count(*) from public.my_evaluations;
      reset role;
      ok := false;
    exception when others then reset role; ok := ok and sqlerrm ilike '%permission denied%';
    end;
    perform set_config('request.jwt.claims', '', true);
    perform pg_temp.rls_check('students and anonymous visitors cannot read the talent list or evaluations', n = 0 and ok, format('student sees %s talent rows, anon refused on all three=%s', n, ok));
  exception when others then
    reset role;
    perform set_config('request.jwt.claims', '', true);
    perform pg_temp.rls_check('students and anonymous visitors cannot read the talent list or evaluations', false, sqlerrm);
  end;

  -- T36. A verified recruiter submits an evaluation; a forged status is forced back to submitted.
  begin
    perform set_config('request.jwt.claims', claims_r, true);
    set local role authenticated;
    insert into public.student_evaluations (student_id, recruiter_id, context, scores, overall, recommendation, strengths, improvements, private_note, status)
    values (a, r, 'portfolio_review', sc, 4, 'yes', 'Clean, well named families.', 'Show more coordination work.', 'Ask about relocation.', 'published')
    returning id, status into ev1, txt;
    reset role;
    perform set_config('request.jwt.claims', '', true);
    perform pg_temp.rls_check('verified recruiter submits an evaluation, status is forced to submitted', ev1 is not null and txt = 'submitted', 'status=' || coalesce(txt, 'null'));
  exception when others then
    reset role;
    perform set_config('request.jwt.claims', '', true);
    perform pg_temp.rls_check('verified recruiter submits an evaluation, status is forced to submitted', false, sqlerrm);
  end;

  -- T37. Only an opted-in student can be evaluated (not a student who stayed hidden, not another recruiter).
  begin
    ok := false;
    begin
      perform set_config('request.jwt.claims', claims_r, true);
      set local role authenticated;
      insert into public.student_evaluations (student_id, recruiter_id, context, scores, overall, recommendation) values (b, r, 'interview', sc, 3, 'maybe');
      reset role;
    exception when others then reset role; ok := sqlerrm like '%not available%';
    end;
    if ok then
      begin
        perform set_config('request.jwt.claims', claims_r, true);
        set local role authenticated;
        insert into public.student_evaluations (student_id, recruiter_id, context, scores, overall, recommendation) values (r2, r, 'interview', sc, 3, 'maybe');
        reset role;
        ok := false;
      exception when others then reset role; ok := sqlerrm like '%not available%';
      end;
    end if;
    perform set_config('request.jwt.claims', '', true);
    perform pg_temp.rls_check('only a student who opted in can be evaluated', ok, '');
  exception when others then
    reset role;
    perform set_config('request.jwt.claims', '', true);
    perform pg_temp.rls_check('only a student who opted in can be evaluated', false, sqlerrm);
  end;

  -- T38. One evaluation per student, recruiter and context.
  begin
    perform set_config('request.jwt.claims', claims_r, true);
    set local role authenticated;
    insert into public.student_evaluations (student_id, recruiter_id, context, scores, overall, recommendation) values (a, r, 'portfolio_review', sc, 3, 'maybe');
    reset role;
    perform set_config('request.jwt.claims', '', true);
    perform pg_temp.rls_check('one evaluation per student, recruiter and context', false, 'duplicate insert succeeded');
  exception when others then
    reset role;
    perform set_config('request.jwt.claims', '', true);
    perform pg_temp.rls_check('one evaluation per student, recruiter and context', sqlerrm ilike '%duplicate key%', sqlerrm);
  end;

  -- T39. A second verified recruiter keeps a separate evaluation; neither reads the other's rows or private note.
  begin
    perform set_config('request.jwt.claims', claims_adm, true);
    set local role authenticated;
    update public.recruiter_profiles set verification_status = 'approved' where id = r2;
    reset role;
    perform set_config('request.jwt.claims', claims_r2, true);
    set local role authenticated;
    insert into public.student_evaluations (student_id, recruiter_id, context, scores, overall, recommendation, strengths, improvements, private_note)
    values (a, r2, 'interview', sc, 3, 'maybe', 'Good communication.', 'Needs more Revit practice.', 'second recruiter private note')
    returning id into ev2;
    select count(*) into n from public.student_evaluations where id = ev1;
    select count(*) into n2 from public.student_evaluations where recruiter_id <> r2;
    ok := n = 0 and n2 = 0;
    reset role;
    perform set_config('request.jwt.claims', claims_r, true);
    set local role authenticated;
    select count(*) + (select count(*) from public.student_evaluations where private_note like 'second recruiter%') into n2 from public.student_evaluations where id = ev2 or recruiter_id <> r;
    select count(*) into n from public.student_evaluations where recruiter_id = r;
    reset role;
    perform set_config('request.jwt.claims', '', true);
    perform pg_temp.rls_check('a recruiter reads only their own evaluations and private notes', ev2 is not null and ok and n = 1 and n2 = 0, format('own rows=%s, rows of the other recruiter=%s, the other side blind=%s', n, n2, ok));
  exception when others then
    reset role;
    perform set_config('request.jwt.claims', '', true);
    perform pg_temp.rls_check('a recruiter reads only their own evaluations and private notes', false, sqlerrm);
  end;

  -- T40. The recruiter edits a submitted evaluation but cannot move it to another student, another author or a new status.
  begin
    ok := true;
    perform set_config('request.jwt.claims', claims_r, true);
    set local role authenticated;
    update public.student_evaluations set strengths = 'Clean, well named families and sheets.', status = 'published' where id = ev1;
    get diagnostics n = row_count;
    begin
      update public.student_evaluations set student_id = b where id = ev1;
      reset role;
      ok := false;
    exception when others then reset role; ok := ok and sqlerrm like '%never change%';
    end;
    begin
      set local role authenticated;
      update public.student_evaluations set recruiter_id = r2 where id = ev1;
      reset role;
      ok := false;
    exception when others then reset role; ok := ok and sqlerrm like '%never change%';
    end;
    perform set_config('request.jwt.claims', '', true);
    select status || '/' || strengths into txt from public.student_evaluations where id = ev1;
    perform pg_temp.rls_check('recruiter edits own submission but cannot change status or ids', n = 1 and ok and txt = 'submitted/Clean, well named families and sheets.', format('edited rows=%s, row=%s', n, coalesce(txt, 'null')));
  exception when others then
    reset role;
    perform set_config('request.jwt.claims', '', true);
    perform pg_temp.rls_check('recruiter edits own submission but cannot change status or ids', false, sqlerrm);
  end;

  -- T41. The student sees no submitted evaluation: not in the table, not in the safe view; and cannot write one.
  begin
    perform set_config('request.jwt.claims', claims_a, true);
    set local role authenticated;
    select count(*) into n from public.student_evaluations;
    select count(*) into n2 from public.my_evaluations;
    reset role;
    perform set_config('request.jwt.claims', '', true);
    perform pg_temp.rls_check('student cannot read a submitted evaluation about themselves', n = 0 and n2 = 0, format('table rows=%s, view rows=%s', n, n2));
  exception when others then
    reset role;
    perform set_config('request.jwt.claims', '', true);
    perform pg_temp.rls_check('student cannot read a submitted evaluation about themselves', false, sqlerrm);
  end;

  -- T42. A student can neither insert nor edit an evaluation (the insert is aimed at their own opted-in record, so
  --      the guard lets it through and Row Level Security is what refuses it).
  begin
    ok := false;
    begin
      perform set_config('request.jwt.claims', claims_a, true);
      set local role authenticated;
      insert into public.student_evaluations (student_id, recruiter_id, context, scores, overall, recommendation) values (a, a, 'interview', sc, 5, 'strong_yes');
      reset role;
    exception when others then reset role; ok := sqlerrm ilike '%row-level security%';
    end;
    perform set_config('request.jwt.claims', claims_a, true);
    set local role authenticated;
    update public.student_evaluations set overall = 5, status = 'published' where id = ev1;
    get diagnostics n = row_count;
    reset role;
    perform set_config('request.jwt.claims', '', true);
    select status into txt from public.student_evaluations where id = ev1;
    perform pg_temp.rls_check('student cannot insert or edit evaluations', ok and n = 0 and txt = 'submitted', format('insert refused=%s, rows edited=%s, status=%s', ok, n, coalesce(txt, 'null')));
  exception when others then
    reset role;
    perform set_config('request.jwt.claims', '', true);
    perform pg_temp.rls_check('student cannot insert or edit evaluations', false, sqlerrm);
  end;

  -- T43. An admin publishes one evaluation and hides the other (a note is required); the recruiter's words stay as written.
  begin
    ok := false;
    perform set_config('request.jwt.claims', claims_adm, true);
    set local role authenticated;
    update public.student_evaluations set status = 'published', strengths = 'rewritten by an admin' where id = ev1;
    get diagnostics n = row_count;
    begin
      update public.student_evaluations set status = 'hidden' where id = ev2;
      reset role;
    exception when others then reset role; ok := sqlerrm like '%note is required%';
    end;
    set local role authenticated;
    update public.student_evaluations set status = 'hidden', moderation_note = 'Please describe the work you reviewed.' where id = ev2;
    get diagnostics n2 = row_count;
    reset role;
    perform set_config('request.jwt.claims', '', true);
    select (status = 'published' and published_at is not null and moderated_by = adm and strengths = 'Clean, well named families and sheets.' and ok and (select status from public.student_evaluations where id = ev2) = 'hidden') into ok from public.student_evaluations where id = ev1;
    perform pg_temp.rls_check('admin publishes and hides evaluations, hiding needs a note', n = 1 and n2 = 1 and coalesce(ok, false), format('published rows=%s, hidden rows=%s', n, n2));
  exception when others then
    reset role;
    perform set_config('request.jwt.claims', '', true);
    perform pg_temp.rls_check('admin publishes and hides evaluations, hiding needs a note', false, sqlerrm);
  end;

  -- T44. The student reads the published evaluation (and not the hidden one) with the company name.
  begin
    perform set_config('request.jwt.claims', claims_a, true);
    set local role authenticated;
    select count(*) into n from public.my_evaluations;
    select company_name into txt from public.my_evaluations where id = ev1;
    select count(*) into n2 from public.my_evaluations where id = ev2;
    reset role;
    perform set_config('request.jwt.claims', '', true);
    perform pg_temp.rls_check('student reads only published evaluations, with the company name', n = 1 and n2 = 0 and txt = 'Test Company', format('published rows=%s, hidden rows=%s, company=%s', n, n2, coalesce(txt, 'null')));
  exception when others then
    reset role;
    perform set_config('request.jwt.claims', '', true);
    perform pg_temp.rls_check('student reads only published evaluations, with the company name', false, sqlerrm);
  end;

  -- T45. The student's queries can never return the private note, the recruiter or the moderation columns.
  begin
    ok := false;
    perform set_config('request.jwt.claims', claims_a, true);
    set local role authenticated;
    select count(*) into n from public.student_evaluations where private_note <> '';
    begin
      perform private_note from public.my_evaluations;
      reset role;
    exception when others then reset role; ok := sqlerrm like '%private_note%';
    end;
    perform set_config('request.jwt.claims', '', true);
    select count(*) into n2 from information_schema.columns where table_schema = 'public' and table_name = 'my_evaluations'
      and column_name in ('private_note', 'recruiter_id', 'student_id', 'moderation_note', 'moderated_by', 'status', 'notified_at');
    perform pg_temp.rls_check('the student view never exposes the private note', n = 0 and ok and n2 = 0, format('rows with a private note via the table=%s, view query refused=%s, private columns in the view=%s', n, ok, n2));
  exception when others then
    reset role;
    perform set_config('request.jwt.claims', '', true);
    perform pg_temp.rls_check('the student view never exposes the private note', false, sqlerrm);
  end;

  -- T46. A published evaluation is locked for its author.
  begin
    perform set_config('request.jwt.claims', claims_r, true);
    set local role authenticated;
    update public.student_evaluations set strengths = 'changed after publishing', overall = 1 where id = ev1;
    get diagnostics n = row_count;
    reset role;
    perform set_config('request.jwt.claims', '', true);
    select strengths into txt from public.student_evaluations where id = ev1;
    perform pg_temp.rls_check('a published evaluation is locked for its author', n = 0 and txt = 'Clean, well named families and sheets.', format('rows edited=%s', n));
  exception when others then
    reset role;
    perform set_config('request.jwt.claims', '', true);
    perform pg_temp.rls_check('a published evaluation is locked for its author', false, sqlerrm);
  end;

  -- T47. "Show my company name" off: the student sees no company.
  begin
    update public.student_evaluations set show_company_name = false where id = ev1;
    perform set_config('request.jwt.claims', claims_a, true);
    set local role authenticated;
    select count(*) into n from public.my_evaluations where id = ev1 and company_name is null;
    reset role;
    perform set_config('request.jwt.claims', '', true);
    perform pg_temp.rls_check('company name is hidden when the recruiter chose so', n = 1, format('rows without a company=%s', n));
  exception when others then
    reset role;
    perform set_config('request.jwt.claims', '', true);
    perform pg_temp.rls_check('company name is hidden when the recruiter chose so', false, sqlerrm);
  end;

  -- T48. The student turns the opt-in off: gone from the talent list, the published evaluation stays.
  begin
    perform set_config('request.jwt.claims', claims_a, true);
    set local role authenticated;
    update public.profiles set talent_visible = false where id = a;
    select count(*) into n2 from public.my_evaluations;
    reset role;
    perform set_config('request.jwt.claims', claims_r, true);
    set local role authenticated;
    select count(*) into n from public.talent_cards where student_id = a;
    reset role;
    perform set_config('request.jwt.claims', '', true);
    select talent_consent_at is null into ok from public.profiles where id = a;
    perform pg_temp.rls_check('opting out hides the student but keeps published evaluations', n = 0 and n2 = 1 and coalesce(ok, false), format('talent rows=%s, evaluations kept=%s', n, n2));
  exception when others then
    reset role;
    perform set_config('request.jwt.claims', '', true);
    perform pg_temp.rls_check('opting out hides the student but keeps published evaluations', false, sqlerrm);
  end;

  -- T49. At most 20 evaluations per recruiter per day: the 21st is refused.
  begin
    select count(*) into n from public.student_evaluations where recruiter_id = r;
    insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change)
    select '00000000-0000-0000-0000-000000000000'::uuid, gen_random_uuid(), 'authenticated'::text, 'authenticated'::text, ('rls-test-cap-' || g || '@example.invalid')::text, extensions.crypt('rls-test-password', extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}'::jsonb, ('{"full_name":"Test Cap ' || g || '"}')::jsonb, now(), now(), ''::text, ''::text, ''::text, ''::text
    from generate_series(1, 6) as g;
    select array_agg(id order by email) into caps from auth.users where email like 'rls-test-cap-%@example.invalid';
    update public.profiles set account_type = 'student', talent_visible = true where id = any(caps);
    perform set_config('request.jwt.claims', claims_r, true);
    set local role authenticated;
    for i in 1..(20 - n) loop
      insert into public.student_evaluations (student_id, recruiter_id, context, scores, overall, recommendation)
      values (caps[((i - 1) / 4) + 1], r, ctxs[((i - 1) % 4) + 1], sc, 3, 'maybe');
    end loop;
    select count(*) into n2 from public.student_evaluations where recruiter_id = r;
    ok := false;
    begin
      insert into public.student_evaluations (student_id, recruiter_id, context, scores, overall, recommendation) values (caps[6], r, 'portfolio_review', sc, 3, 'maybe');
    exception when others then ok := sqlerrm like '%daily limit%';
    end;
    reset role;
    perform set_config('request.jwt.claims', '', true);
    perform pg_temp.rls_check('the 21st evaluation of a day is refused', n2 = 20 and ok, format('evaluations before the last attempt=%s, refused=%s', n2, ok));
  exception when others then
    reset role;
    perform set_config('request.jwt.claims', '', true);
    perform pg_temp.rls_check('the 21st evaluation of a day is refused', false, sqlerrm);
  end;

  -- 2. Clean up. Deleting the users cascades to profiles, applications, events, deletion requests and evaluations.
  reset role;
  perform set_config('request.jwt.claims', '', true);
  delete from auth.users where email in ('rls-test-a@example.invalid', 'rls-test-b@example.invalid', 'rls-test-admin@example.invalid', 'rls-test-recruiter@example.invalid', 'rls-test-recruiter2@example.invalid', 'rls-test-owner@example.invalid', 'rls-test-super@example.invalid')
    or email like 'rls-test-cap-%@example.invalid';
  delete from public.leads where id = lead_id;
  delete from public.role_grants where email in ('rls-test-owner@example.invalid', 'rls-test-super@example.invalid');

  select count(*) into n from pg_temp.rls_results where not pass;
  if n = 0 then
    raise notice 'ALL PASS (% checks)', (select count(*) from pg_temp.rls_results);
  else
    raise notice '% FAILED of % checks', n, (select count(*) from pg_temp.rls_results);
  end if;
end $$;

-- The SQL editor may hide notices; this table shows the same result.
select n, case when pass then 'PASS' else 'FAIL' end as result, test, detail from pg_temp.rls_results order by n;

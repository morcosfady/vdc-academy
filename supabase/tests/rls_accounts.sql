-- VDC Academy: Row Level Security checks for the account tables (migrations 0003 and 0004).
--
-- Run the whole file in the SQL editor (it runs as `postgres`). It creates three throwaway users (student A,
-- student B, one admin), then runs each check as that user by setting the JWT claims and switching to the
-- `authenticated` role, exactly as PostgREST does. Every check prints a PASS or FAIL notice and lands in a
-- results table that is returned at the end. Safe to run more than once: the throwaway rows are removed at the
-- end, and at the start in case an earlier run stopped half way.
--
-- Requires 0004 (its profiles_guard fix lets the dashboard promote the admin user).
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
  a uuid; b uuid; adm uuid;
  claims_a text; claims_b text; claims_adm text;
  app_a_draft uuid; app_a_sub uuid; app_b_draft uuid;
  owner uuid; lead_id uuid;
  n int; n2 int; txt text;
begin
  -- 0. Clean up an earlier run (cascades: profiles, applications, events, deletion requests).
  delete from auth.users where email in ('rls-test-a@example.invalid', 'rls-test-b@example.invalid', 'rls-test-admin@example.invalid');
  delete from public.leads where email = 'rls-test-lead@example.invalid';

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

  -- No JWT here, so the 0004 guard lets the dashboard set the role.
  update public.profiles set role = 'admin' where id = adm;

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

  -- 2. Clean up. Deleting the users cascades to profiles, applications, events and deletion requests.
  reset role;
  perform set_config('request.jwt.claims', '', true);
  delete from auth.users where email in ('rls-test-a@example.invalid', 'rls-test-b@example.invalid', 'rls-test-admin@example.invalid');
  delete from public.leads where id = lead_id;

  select count(*) into n from pg_temp.rls_results where not pass;
  if n = 0 then
    raise notice 'ALL PASS (% checks)', (select count(*) from pg_temp.rls_results);
  else
    raise notice '% FAILED of % checks', n, (select count(*) from pg_temp.rls_results);
  end if;
end $$;

-- The SQL editor may hide notices; this table shows the same result.
select n, case when pass then 'PASS' else 'FAIL' end as result, test, detail from pg_temp.rls_results order by n;

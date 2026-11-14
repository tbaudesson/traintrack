-- Acts as each kind of account the way PostgREST does and checks what it can
-- and cannot do. Run through scripts/test-rls.sh, never against a real database.
create table public._r (n serial primary key, name text, ok boolean);

create function public._as(u uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', u::text, false);
  perform set_config('role', 'authenticated', false);
end $$;
create function public._root() returns void language plpgsql as $$
begin perform set_config('role', 'none', false); end $$;
create function public._t(name text, ok boolean) returns void language sql as
  $$ insert into public._r (name, ok) values (name, coalesce(ok, false)) $$;
-- Passes when the statement raises (refused by RLS, a trigger or an RPC).
create function public._denied(name text, stmt text) returns void language plpgsql as $$
begin
  begin
    execute stmt;
    perform public._t(name, false);
  exception when others then
    perform public._t(name, true);
  end;
end $$;
create function public._allowed(name text, stmt text) returns void language plpgsql as $$
begin
  begin
    execute stmt;
    perform public._t(name, true);
  exception when others then
    perform public._t(name || ' -> ' || sqlerrm, false);
  end;
end $$;
create function public._count(stmt text) returns bigint language plpgsql as $$
declare c bigint;
begin execute 'select count(*) from (' || stmt || ') q' into c; return c; end $$;

-- ─── Fixtures ────────────────────────────────────────────────
insert into auth.users (id, email) values
  ('a0000000-0000-4000-8000-000000000001', 'attacker@x.test'),
  ('a0000000-0000-4000-8000-000000000002', 'victim@x.test'),
  ('a0000000-0000-4000-8000-000000000003', 'trainer@x.test'),
  ('a0000000-0000-4000-8000-000000000004', 'pending@x.test'),
  ('a0000000-0000-4000-8000-000000000005', 'off@x.test'),
  ('a0000000-0000-4000-8000-000000000006', 'free@x.test'),
  ('a0000000-0000-4000-8000-000000000007', 'client@x.test');
update profiles set status = 'active';
update profiles set status = 'pending' where email = 'pending@x.test';
update profiles set status = 'deactivated', role = 'admin' where email = 'off@x.test';
update profiles set plan_id = (select id from plans where name = 'Pro')
  where email in ('attacker@x.test', 'trainer@x.test', 'pending@x.test', 'off@x.test');
update profiles set display_name = 'Secret Name' where email = 'victim@x.test';

insert into workouts (id, user_id, date) values
  ('b0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000002', '2026-11-01'),
  ('b0000000-0000-4000-8000-000000000007', 'a0000000-0000-4000-8000-000000000007', '2026-11-01');
insert into workout_notes (id, user_id, workout_id, body, audio_path) values
  ('c0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000002',
   'b0000000-0000-4000-8000-000000000002', 'private',
   'a0000000-0000-4000-8000-000000000002/n.webm');
insert into storage.objects (bucket_id, name, owner) values
  ('voice-notes', 'a0000000-0000-4000-8000-000000000002/n.webm', 'a0000000-0000-4000-8000-000000000002');

-- ─── The invitation attack ───────────────────────────────────
do $$
declare
  atk uuid := 'a0000000-0000-4000-8000-000000000001';
  vic uuid := 'a0000000-0000-4000-8000-000000000002';
  g uuid; m uuid;
begin
  perform _as(atk);
  g := create_group('Fake team');
  m := invite_group_member(g, 'victim@x.test');
  perform _t('invite does not make an existing account a client',
    (select status from get_group_members(g) where id = m) = 'pending');
  perform _t('invitee name stays hidden before accepting',
    (select display_name from get_group_members(g) where id = m) = 'victim@x.test');
  perform _t('inviter cannot read invitee workouts',
    _count('select 1 from workouts where user_id = ''' || vic || '''') = 0);
  perform _t('inviter cannot read invitee notes', _count('select 1 from workout_notes') = 0);
  perform _t('inviter is not a messaging contact', not can_message(vic));
  perform _root();

  perform _as(vic);
  perform _t('invitee sees the invitation',
    _count('select 1 from get_my_memberships() where status = ''pending''') = 1);
  perform respond_to_invitation(m, false);
  perform _root();

  perform _as(atk);
  perform _t('declined invitee stays private',
    _count('select 1 from workouts where user_id = ''' || vic || '''') = 0);
  perform _root();
end $$;

-- ─── The legitimate coaching flow ────────────────────────────
do $$
declare
  tr uuid := 'a0000000-0000-4000-8000-000000000003';
  cl uuid := 'a0000000-0000-4000-8000-000000000007';
  g uuid; m uuid;
begin
  perform _as(tr);
  g := create_group('Real team');
  m := invite_group_member(g, 'client@x.test');
  perform _root();
  perform _as(cl);
  perform respond_to_invitation(m, true);
  perform _root();
  perform _as(tr);
  perform _t('accepted client data is readable by the trainer',
    _count('select 1 from workouts where user_id = ''' || cl || '''') = 1);
  perform _t('accepted client name is shown',
    (select status from get_group_members(g) where id = m) = 'active');
  perform _allowed('trainer notes a client workout',
    format('insert into workout_notes (user_id, workout_id, body, audio_path) values (%L, ''b0000000-0000-4000-8000-000000000007'', ''hi'', %L)',
      tr, tr || '/t.webm'));
  perform _allowed('trainer assigns a program to a client',
    format('insert into programs (user_id, name, assigned_to_user_id) values (%L, ''P'', %L)', tr, cl));
  perform _denied('program cannot be assigned to a stranger',
    format('insert into programs (user_id, name, assigned_to_user_id) values (%L, ''P'', ''a0000000-0000-4000-8000-000000000002'')', tr));
  perform _denied('note cannot move to a stranger workout',
    'update workout_notes set workout_id = ''b0000000-0000-4000-8000-000000000002''');
  perform _allowed('trainer uploads to own folder',
    format('insert into storage.objects (bucket_id, name, owner) values (''voice-notes'', %L, %L)', tr || '/t.webm', tr));
  perform _root();
  perform _as(cl);
  perform _t('client plays the trainer voice note',
    _count('select 1 from storage.objects where name like ''a0000000-0000-4000-8000-000000000003/%''') = 1);
  perform _root();
end $$;

-- ─── Voice notes ─────────────────────────────────────────────
do $$
declare
  atk uuid := 'a0000000-0000-4000-8000-000000000001';
  vic uuid := 'a0000000-0000-4000-8000-000000000002';
begin
  perform _as(atk);
  perform _t('a stranger cannot list voice notes', _count('select 1 from storage.objects') = 0);
  perform _denied('upload into someone else''s folder is refused',
    format('insert into storage.objects (bucket_id, name, owner) values (''voice-notes'', %L, %L)', vic || '/x.webm', atk));
  perform _root();
  perform _as(vic);
  perform _t('owner still sees their voice note',
    _count('select 1 from storage.objects where name like ''a0000000-0000-4000-8000-000000000002/%''') = 1);
  perform _root();
end $$;

-- ─── Account status and plan ─────────────────────────────────
do $$
declare
  pen uuid := 'a0000000-0000-4000-8000-000000000004';
  off uuid := 'a0000000-0000-4000-8000-000000000005';
  fre uuid := 'a0000000-0000-4000-8000-000000000006';
begin
  perform _as(pen);
  perform _denied('pending account cannot create a team', 'select create_group(''x'')');
  perform _denied('pending account cannot write data',
    format('insert into workouts (user_id, date) values (%L, ''2026-11-02'')', pen));
  perform _t('pending account can still read its profile', _count('select 1 from get_user_profile()') = 1);
  perform _root();

  perform _as(off);
  perform _denied('deactivated account cannot write data',
    format('insert into workouts (user_id, date) values (%L, ''2026-11-02'')', off));
  perform _t('deactivated admin is no longer an admin', not is_app_admin());
  perform _denied('deactivated admin cannot list users', 'select * from admin_list_users()');
  perform _root();

  perform _as(fre);
  perform _denied('Free plan cannot create a team', 'select create_group(''x'')');
  perform _allowed('Free active account writes its own data',
    format('insert into workouts (user_id, date) values (%L, ''2026-11-02'')', fre));
  perform _denied('check_invitation is closed', 'select check_invitation(''x@x.test'')');
  perform _allowed('account deletion runs', 'select delete_my_account()');
  perform _root();
end $$;

-- ─── Ready-made programs ─────────────────────────────────────
update profiles set role = 'admin' where email = 'trainer@x.test';
insert into program_templates (name, is_published) values ('Hidden one', false);
do $$
declare
  member_id uuid := 'a0000000-0000-4000-8000-000000000007';
  admin_id uuid := 'a0000000-0000-4000-8000-000000000003';
  pending uuid := 'a0000000-0000-4000-8000-000000000004';
begin
  perform _as(member_id);
  perform _t('a user sees the published templates', _count('select 1 from program_templates where is_published') >= 14);
  perform _t('a user cannot see a hidden template', _count('select 1 from program_templates where not is_published') = 0);
  perform _denied('a user cannot insert a template', 'insert into program_templates (name) values (''x'')');
  update program_templates set name = 'hacked';
  perform _t('a user cannot rename a template', not exists (select 1 from program_templates where name = 'hacked'));
  delete from program_templates;
  perform _t('a user cannot delete a template', _count('select 1 from program_templates') >= 14);
  perform _root();

  perform _as(pending);
  perform _t('a pending account sees no template', _count('select 1 from program_templates') = 0);
  perform _root();

  perform _as(admin_id);
  perform _t('an admin sees hidden templates', _count('select 1 from program_templates where not is_published') = 1);
  perform _allowed('an admin creates a template', 'insert into program_templates (name) values (''New'')');
  perform _allowed('an admin edits a template', 'update program_templates set is_published = true where name = ''New''');
  perform _allowed('an admin deletes a template', 'delete from program_templates where name = ''New''');
  perform _root();
end $$;

-- ─── Security review 037 ────────────────────────────────────
insert into workouts (id, user_id, date) values
  ('b0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', '2026-11-01');
insert into exercises (id, user_id, name, muscle_group, is_custom) values
  ('e0000000-0000-4000-8000-000000000001', null, 'Test Lift', 'chest', false);
insert into programs (id, user_id, owner_user_id, assigned_to_user_id, name, start_date) values
  ('f0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000003',
   'a0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000007', 'Assigned', '2026-11-02');
do $$
declare
  atk uuid := 'a0000000-0000-4000-8000-000000000001';
  vic uuid := 'a0000000-0000-4000-8000-000000000002';
  client uuid := 'a0000000-0000-4000-8000-000000000007';
  admin_id uuid := 'a0000000-0000-4000-8000-000000000003';
  own_w uuid := 'b0000000-0000-4000-8000-000000000001';
  vic_w uuid := 'b0000000-0000-4000-8000-000000000002';
begin
  perform _as(atk);
  -- A note on one's own workout naming someone else's file opens nothing.
  begin
    insert into workout_notes (user_id, workout_id, body, audio_path) values (atk, own_w, 'steal', vic || '/n.webm');
  exception when others then null;
  end;
  perform _t('a note cannot open someone else''s voice file',
    _count(format('select 1 from storage.objects where name like %L', vic || '/%')) = 0);
  perform _denied('a note cannot name someone else''s voice file',
    format('insert into workout_notes (user_id, workout_id, body, audio_path) values (%L, %L, %L, %L)', atk, own_w, 'x', vic || '/n.webm'));
  perform _denied('a set cannot join someone else''s workout',
    format('insert into workout_sets (user_id, workout_id, set_number, reps, weight_kg, completed) values (%L, %L, 1, 1000, 1000, true)', atk, vic_w));
  perform _allowed('a set joins one''s own workout',
    format('insert into workout_sets (user_id, workout_id, set_number, reps, weight_kg, completed) values (%L, %L, 1, 5, 60, true)', atk, own_w));
  perform _denied('a half-filled pain is refused',
    format('insert into workout_notes (user_id, workout_id, body, pain_area) values (%L, %L, %L, %L)', atk, own_w, 'x', 'knee'));
  perform _allowed('a full pain report is accepted',
    format('insert into workout_notes (user_id, workout_id, body, pain_area, pain_level) values (%L, %L, %L, %L, 6)', atk, own_w, '', 'knee'));
  perform _denied('a user cannot translate the library',
    format('select admin_update_exercise_i18n(%L, %L, %L, %L, %L)', 'e0000000-0000-4000-8000-000000000001', 'x', 'x', 'x', 'x'));
  perform _denied('a user cannot add to the library',
    format('select admin_create_library_exercise(%L, %L, %L, %L, %L, %L, %L)', 'Fake', 'chest', 'barbell', '', '', '', ''));
  perform _root();

  perform _as(client);
  update programs set start_date = '2030-01-01' where id = 'f0000000-0000-4000-8000-000000000001';
  perform _root();
  perform _t('a client cannot move their coach''s program start',
    (select start_date from programs where id = 'f0000000-0000-4000-8000-000000000001') = '2026-11-02');

  perform _as(admin_id);
  perform _allowed('an admin translates the library',
    format('select admin_update_exercise_i18n(%L, %L, %L, %L, %L)', 'e0000000-0000-4000-8000-000000000001', 'Test FR', 'Test DE', '', ''));
  perform _allowed('an admin adds to the library',
    format('select admin_create_library_exercise(%L, %L, %L, %L, %L, %L, %L)', 'Brand New Lift', 'back', 'cable', '', '', 'Nouveau', 'Neu'));
  perform _denied('the library refuses a duplicate name',
    format('select admin_create_library_exercise(%L, %L, %L, %L, %L, %L, %L)', 'test lift', 'chest', 'barbell', '', '', '', ''));
  perform _root();
end $$;

-- ─── Competition results 042 ────────────────────────────────
do $$
declare
  tr uuid := 'a0000000-0000-4000-8000-000000000003';
  cl uuid := 'a0000000-0000-4000-8000-000000000007';
  atk uuid := 'a0000000-0000-4000-8000-000000000001';
  pend uuid := 'a0000000-0000-4000-8000-000000000004';
begin
  perform _as(cl);
  perform _allowed('an athlete logs a competition',
    format('insert into competition_results (user_id, date, event, compulsory, freestyle) values (%L, %L, %L, 6.5, 7.25)', cl, '2026-10-01', 'Regional'));
  perform _denied('a score above 10 is refused',
    format('insert into competition_results (user_id, date, event, compulsory) values (%L, %L, %L, 11)', cl, '2026-10-01', 'Bad'));
  perform _denied('a competition cannot be logged for someone else',
    format('insert into competition_results (user_id, date, event) values (%L, %L, %L)', atk, '2026-10-01', 'Fake'));
  perform _root();
  perform _as(tr);
  perform _t('the coach reads the athlete''s competitions',
    _count('select 1 from competition_results where user_id = ''' || cl || '''') = 1);
  perform _denied('the coach cannot log a competition for the athlete',
    format('insert into competition_results (user_id, date, event) values (%L, %L, %L)', cl, '2026-10-01', 'Coach'));
  perform _root();
  perform _as(atk);
  perform _t('a stranger cannot read the athlete''s competitions',
    _count('select 1 from competition_results where user_id = ''' || cl || '''') = 0);
  perform _root();
  perform _as(pend);
  perform _denied('a pending account cannot log a competition',
    format('insert into competition_results (user_id, date, event) values (%L, %L, %L)', pend, '2026-10-01', 'Pending'));
  perform _root();
end $$;

-- ─── Horses and shared programs 045 ─────────────────────────
do $$
declare
  tr uuid := 'a0000000-0000-4000-8000-000000000003';
  cl uuid := 'a0000000-0000-4000-8000-000000000007';
  atk uuid := 'a0000000-0000-4000-8000-000000000001';
  pend uuid := 'a0000000-0000-4000-8000-000000000004';
  horse uuid := 'd0000000-0000-4000-8000-000000000045';
  share uuid := 'd0000000-0000-4000-8000-000000000046';
begin
  perform _as(cl);
  perform _allowed('a vaulter adds a horse',
    format('insert into horses (id, user_id, name, weekly_limit_min) values (%L, %L, %L, 150)', horse, cl, 'Tornado'));
  perform _allowed('a session goes on one''s own horse',
    format('insert into horse_sessions (user_id, horse_id, date, walk_min, canter_min) values (%L, %L, %L, 10, 12)', cl, horse, '2026-11-14'));
  perform _denied('a weekly limit out of range is refused',
    format('insert into horses (user_id, name, weekly_limit_min) values (%L, %L, 5)', cl, 'Pony'));
  perform _allowed('a program is shared',
    format('insert into shared_programs (id, user_id, name, structure) values (%L, %L, %L, %L::jsonb)', share, cl, 'Mon plan', '[{"name":"J1","exercises":[]}]'));
  perform _root();
  perform _as(atk);
  perform _denied('a session cannot go on someone else''s horse',
    format('insert into horse_sessions (user_id, horse_id, date) values (%L, %L, %L)', atk, horse, '2026-11-14'));
  perform _t('a stranger cannot see the horses',
    _count('select 1 from horses where user_id = ''' || cl || '''') = 0);
  perform _t('a stranger cannot list shared programs',
    _count('select 1 from shared_programs') = 0);
  perform _t('the link opens the shared program',
    _count('select 1 from get_shared_program(''' || share || ''')') = 1);
  perform _root();
  perform _as(tr);
  perform _t('the coach reads the vaulter''s horse workload',
    _count('select 1 from horse_sessions where user_id = ''' || cl || '''') = 1);
  perform _root();
  perform _as(pend);
  perform _t('a pending account cannot open a shared program',
    _count('select 1 from get_shared_program(''' || share || ''')') = 0);
  perform _root();
end $$;

-- ─── Security review 046 ────────────────────────────────────
do $$
declare
  cl uuid := 'a0000000-0000-4000-8000-000000000007';
  i int;
begin
  perform _t('a share cannot be opened signed out',
    not has_function_privilege('anon', 'get_shared_program(uuid)', 'execute'));
  perform _t('compliance alerts stay with the server',
    not has_function_privilege('anon', 'get_all_compliance_alerts(int)', 'execute')
    and not has_function_privilege('authenticated', 'get_all_compliance_alerts(int)', 'execute'));
  perform _as(cl);
  perform _denied('a push endpoint must be https',
    format('insert into push_subscriptions (user_id, endpoint, p256dh, auth) values (%L, %L, %L, %L)', cl, 'http://169.254.169.254/x', 'k', 'a'));
  perform _denied('push preferences stay small',
    format('insert into push_subscriptions (user_id, endpoint, p256dh, auth, notify_prefs) values (%L, %L, %L, %L, %L::jsonb)', cl, 'https://push.example/big', 'k', 'a', '{"x":"' || repeat('a', 2000) || '"}'));
  for i in 1..10 loop
    execute format('insert into push_subscriptions (user_id, endpoint, p256dh, auth) values (%L, %L, %L, %L)', cl, 'https://push.example/' || i, 'k', 'a');
  end loop;
  perform _denied('no more than ten devices per user',
    format('insert into push_subscriptions (user_id, endpoint, p256dh, auth) values (%L, %L, %L, %L)', cl, 'https://push.example/11', 'k', 'a'));
  perform _denied('a huge shared program is refused',
    format('insert into shared_programs (user_id, name, structure) values (%L, %L, %L::jsonb)', cl, 'Big', '[{"name":"' || repeat('a', 400000) || '","exercises":[]}]'));
  perform _denied('a huge timed-session plan is refused',
    format('insert into workouts (user_id, date, interval_plan) values (%L, %L, %L::jsonb)', cl, '2026-11-14', '{"x":"' || repeat('a', 5000) || '"}'));
  perform _root();
end $$;

-- ─── Program weekdays 048 ───────────────────────────────────
do $$
declare
  cl uuid := 'a0000000-0000-4000-8000-000000000007';
  tr uuid := 'a0000000-0000-4000-8000-000000000003';
  mine uuid;
begin
  perform _as(cl);
  insert into programs (user_id, name) values (cl, 'Mine') returning id into mine;
  perform _allowed('an athlete plans the days of their own program',
    format('update programs set weekdays = %L::jsonb where id = %L', '[1,3,5]', mine));
  perform _denied('a day of the week is between 1 and 7',
    format('update programs set weekdays = %L::jsonb where id = %L', '[0,8]', mine));
  perform _denied('the days are a list',
    format('update programs set weekdays = %L::jsonb where id = %L', '{"mon":true}', mine));
  -- A coach's program is read-only for the athlete: the update reaches no row.
  update programs set weekdays = '[2]'::jsonb where id = 'f0000000-0000-4000-8000-000000000001';
  perform _root();
  perform _t('an athlete cannot change the days of a coach''s program',
    _count('select 1 from programs where id = ''f0000000-0000-4000-8000-000000000001'' and weekdays is not null') = 0);
  perform _as(tr);
  perform _allowed('a coach plans the days of a program given to an athlete',
    format('update programs set weekdays = %L::jsonb where id = %L', '[2,4]', 'f0000000-0000-4000-8000-000000000001'));
  perform _root();
end $$;

-- ─── Invitation links 049 ───────────────────────────────────
insert into auth.users (id, email) values ('a0000000-0000-4000-8000-000000000049', 'newcomer@x.test');
update profiles set status = 'active' where email = 'newcomer@x.test';
insert into groups (id, user_id, name) values
  ('d0000000-0000-4000-8000-000000000049', 'a0000000-0000-4000-8000-000000000003', 'Club');
do $$
declare
  tr uuid := 'a0000000-0000-4000-8000-000000000003';
  cl uuid := 'a0000000-0000-4000-8000-000000000007';
  free uuid := 'a0000000-0000-4000-8000-000000000049';
  atk uuid := 'a0000000-0000-4000-8000-000000000001';
  pend uuid := 'a0000000-0000-4000-8000-000000000004';
  grp uuid := 'd0000000-0000-4000-8000-000000000049';
  tok text; tok2 text; tok3 text; i int; revoked uuid;
begin
  perform _t('signed out, nobody can use a link',
    not has_function_privilege('anon', 'preview_team_invite(text)', 'execute')
    and not has_function_privilege('anon', 'accept_team_invite(text)', 'execute')
    and not has_function_privilege('anon', 'create_team_invite(uuid, text, text, jsonb, date, jsonb, text)', 'execute'));

  perform _as(cl);
  perform _denied('only the team''s coach creates a link',
    format('select create_team_invite(%L)', grp));

  perform _as(tr);
  tok := create_team_invite(grp, 'Léa', 'Plan', '[{"name":"A","exercises":[]}]'::jsonb, '2026-11-16', '[1,3]'::jsonb, 'Bienvenue !');
  perform _t('a coach creates a link with a prepared program', length(tok) = 64);
  perform _denied('the table is not readable directly', 'select * from team_invites');
  perform _denied('days must be days of the week',
    format('select create_team_invite(%L, null, %L, %L::jsonb, null, %L::jsonb)', grp, 'P', '[]', '[9]'));
  perform _denied('a coach cannot join their own team', format('select * from accept_team_invite(%L)', tok));

  perform _as(atk);
  perform _t('a wrong link shows nothing', _count('select * from preview_team_invite(''00000000000000000000000000000000'')') = 0);
  perform _t('the right link shows its team and program', _count(format('select * from preview_team_invite(%L) where program_name = %L', tok, 'Plan')) = 1);
  perform _denied('a list of links is for the coach', format('select * from list_team_invites(%L)', grp));

  perform _as(pend);
  perform _denied('a pending account cannot join', format('select * from accept_team_invite(%L)', tok));

  perform _as(free);
  perform _allowed('an athlete joins with the link', format('select * from accept_team_invite(%L)', tok));
  perform _root();
  perform _t('the athlete is an active member',
    _count(format('select 1 from group_members where group_id = %L and user_id = %L and status = %L', grp, free, 'active')) = 1);
  perform _t('the prepared program is the coach''s copy for the athlete, on its days',
    _count(format('select 1 from programs where assigned_to_user_id = %L and user_id = %L and weekdays = %L::jsonb and start_date = %L', free, tr, '[1,3]', '2026-11-16')) = 1);
  perform _t('the welcome message is sent', _count(format('select 1 from messages where user_id = %L and recipient_id = %L', tr, free)) = 1);

  perform _as(atk);
  perform _denied('a link is used once', format('select * from accept_team_invite(%L)', tok));
  perform _t('a used link shows nothing', _count(format('select * from preview_team_invite(%L)', tok)) = 0);

  perform _as(tr);
  tok2 := create_team_invite(grp, 'Revoked');
  perform revoke_team_invite((select l.id from list_team_invites(grp) l where l.label = 'Revoked'));
  tok3 := create_team_invite(grp, 'Old');
  perform _root();
  update team_invites set expires_at = now() - interval '1 minute' where label = 'Old';
  select id into revoked from team_invites where label = 'Revoked';
  perform _as(atk);
  perform _denied('a revoked link no longer opens', format('select * from accept_team_invite(%L)', tok2));
  perform _denied('an expired link no longer opens', format('select * from accept_team_invite(%L)', tok3));
  perform _denied('someone else cannot revoke a link',
    format('select revoke_team_invite(%L)', revoked));

  perform _as(tr);
  for i in 1..50 loop perform create_team_invite(grp, 'n' || i); end loop;
  perform _denied('no more than fifty open links a team', format('select create_team_invite(%L)', grp));
  perform _root();
end $$;

-- ─── A coach's invitation approves the account 049 ──────────
do $$
declare
  tr uuid := 'a0000000-0000-4000-8000-000000000003';
  grp uuid := 'd0000000-0000-4000-8000-000000000049';
  tok text;
  first_id uuid := 'a0000000-0000-4000-8000-000000000050';
  second_id uuid := 'a0000000-0000-4000-8000-000000000051';
  mailed_id uuid := 'a0000000-0000-4000-8000-000000000052';
  plain_id uuid := 'a0000000-0000-4000-8000-000000000053';
begin
  update team_invites set revoked_at = now() where label ~ '^n[0-9]+$';
  perform _as(tr);
  tok := create_team_invite(grp, 'Link signup');
  perform invite_group_member(grp, 'mailed@x.test');
  perform _root();
  insert into auth.users (id, email, raw_user_meta_data) values (first_id, 'first@x.test', jsonb_build_object('team_invite', tok));
  insert into auth.users (id, email, raw_user_meta_data) values (second_id, 'second@x.test', jsonb_build_object('team_invite', tok));
  insert into auth.users (id, email) values (mailed_id, 'mailed@x.test');
  insert into auth.users (id, email, raw_user_meta_data) values (plain_id, 'plain@x.test', jsonb_build_object('team_invite', repeat('0', 64)));
  perform _t('an account signed up with a coach''s link starts active',
    (select status from profiles where user_id = first_id) = 'active');
  perform _t('a link approves one account only',
    (select status from profiles where user_id = second_id) = 'pending');
  perform _t('an address invited by a coach starts active',
    (select status from profiles where user_id = mailed_id) = 'active');
  perform _t('a made-up link approves nothing',
    (select status from profiles where user_id = plain_id) = 'pending');
  -- The second account, approved by an admin later, still cannot use the claimed link.
  update profiles set status = 'active' where user_id = second_id;
  perform _as(second_id);
  perform _t('a claimed link shows nothing to another account', _count(format('select * from preview_team_invite(%L)', tok)) = 0);
  perform _denied('a claimed link cannot be used by another account', format('select * from accept_team_invite(%L)', tok));
  perform _as(first_id);
  perform _allowed('the account that claimed the link joins with it', format('select * from accept_team_invite(%L)', tok));
  perform _root();
end $$;

select ' FAIL ' || name from _r where not ok;
select count(*) filter (where ok) as passed, count(*) filter (where not ok) as failed from _r;

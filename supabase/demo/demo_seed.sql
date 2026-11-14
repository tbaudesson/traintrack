-- demo_seed.sql — demo data to try TrainTrack for real (NOT a migration).
--
-- Before running: create the two athlete accounts in the app (sign up, then
-- confirm them in Supabase if e-mail confirmation is on), with addresses that
-- contain "demo", e.g. lea.demo@…, marc.demo@…. Then set the three addresses
-- below and run this file in the SQL editor.
--
-- What it creates, for the coach (an existing account with a team):
--   Léa  — a regular athlete: Full Body assigned and dated four weeks ago,
--          Monday, Wednesday and Friday up to this week with progressing
--          loads, a bench press record this week, a goal in progress,
--          training days and good readiness check-ins.
--   Marc — an athlete to check in with: three sessions, the last one six
--          days ago with a knee pain reported on the squat, then nothing.
--
-- It retires and rewrites only the two demo athletes' training data, so it
-- can be run again. It refuses addresses without "demo" so it never touches a
-- real athlete. To remove the demo: delete the two accounts (Réglages or
-- Supabase): everything of theirs goes with them.

DO $demo$
DECLARE
  coach_email TEXT := 'COACH_EMAIL';        -- your own account
  lea_email   TEXT := 'LEA_DEMO_EMAIL';     -- must contain "demo"
  marc_email  TEXT := 'MARC_DEMO_EMAIL';    -- must contain "demo"

  v_coach UUID; v_lea UUID; v_marc UUID; v_group UUID; v_program UUID; v_workout UUID;
  v_structure JSONB; v_day JSONB; v_ex JSONB; v_ex_id UUID;
  v_monday DATE := date_trunc('week', current_date)::date;
  v_start DATE := (date_trunc('week', current_date) - interval '4 weeks')::date;
  v_date DATE; v_week INT; v_session INT; v_set INT; v_kg NUMERIC;
BEGIN
  IF position('demo' IN lower(lea_email)) = 0 OR position('demo' IN lower(marc_email)) = 0 THEN
    RAISE EXCEPTION 'The athlete addresses must contain "demo" (safety).';
  END IF;
  SELECT id INTO v_coach FROM auth.users WHERE lower(email) = lower(coach_email);
  SELECT id INTO v_lea FROM auth.users WHERE lower(email) = lower(lea_email);
  SELECT id INTO v_marc FROM auth.users WHERE lower(email) = lower(marc_email);
  IF v_coach IS NULL OR v_lea IS NULL OR v_marc IS NULL THEN
    RAISE EXCEPTION 'Account not found: create the three accounts first (coach %, Léa %, Marc %).', v_coach, v_lea, v_marc;
  END IF;

  -- Retire the demo athletes' previous data (they are demo accounts). Marked
  -- deleted rather than erased: the sync only passes soft deletes on, so the
  -- coach's phone drops the old rows too.
  UPDATE workout_notes SET deleted_at = now(), updated_at = now() WHERE user_id IN (v_lea, v_marc) AND deleted_at IS NULL;
  UPDATE workout_sets SET deleted_at = now(), updated_at = now() WHERE user_id IN (v_lea, v_marc) AND deleted_at IS NULL;
  UPDATE workouts SET deleted_at = now(), updated_at = now() WHERE user_id IN (v_lea, v_marc) AND deleted_at IS NULL;
  UPDATE readiness_checkins SET deleted_at = now(), updated_at = now() WHERE user_id IN (v_lea, v_marc) AND deleted_at IS NULL;
  UPDATE body_metrics SET deleted_at = now(), updated_at = now() WHERE user_id IN (v_lea, v_marc) AND deleted_at IS NULL;
  UPDATE athlete_profiles SET deleted_at = now(), updated_at = now() WHERE user_id IN (v_lea, v_marc) AND deleted_at IS NULL;
  UPDATE programs SET deleted_at = now(), updated_at = now()
    WHERE assigned_to_user_id IN (v_lea, v_marc) AND user_id = v_coach AND deleted_at IS NULL;

  UPDATE profiles SET status = 'active', display_name = 'Léa (démo)' WHERE user_id = v_lea;
  UPDATE profiles SET status = 'active', display_name = 'Marc (démo)' WHERE user_id = v_marc;

  -- The coach's team, created if there is none.
  SELECT id INTO v_group FROM groups WHERE user_id = v_coach AND deleted_at IS NULL ORDER BY created_at LIMIT 1;
  IF v_group IS NULL THEN
    INSERT INTO groups (user_id, name) VALUES (v_coach, 'Équipe démo') RETURNING id INTO v_group;
  END IF;
  DELETE FROM group_members WHERE group_id = v_group AND user_id IN (v_lea, v_marc);
  INSERT INTO group_members (group_id, user_id, invited_email, role, status, joined_at) VALUES
    (v_group, v_lea, lea_email, 'member', 'active', now()),
    (v_group, v_marc, marc_email, 'member', 'active', now());

  INSERT INTO athlete_profiles (user_id, goals, fitness_level, sex, height_cm, equipment, consent_health_data, consent_at, training_days, training_time, strength_goals) VALUES
    (v_lea, '["hypertrophy"]', 'intermediate', 'female', 168, '["barbell","dumbbell","machine","cable"]', true, now(), '[1,3,5]', '18:00',
     jsonb_build_array(jsonb_build_object('id', gen_random_uuid()::text, 'exerciseName', 'Barbell Bench Press', 'targetKg', 90, 'startKg', 66, 'deadline', (current_date + 90)::text, 'createdAt', (v_start::timestamptz)::text))),
    (v_marc, '["fat_loss"]', 'beginner', 'male', 182, '["dumbbell","bodyweight"]', true, now(), '[2,4,6]', '07:30', NULL);

  -- Full Body from the catalogue, assigned by the coach and dated four weeks ago.
  SELECT structure INTO v_structure FROM program_templates WHERE name = 'Full Body — Débutant' AND locale = 'fr' LIMIT 1;
  IF v_structure IS NULL THEN
    RAISE EXCEPTION 'Ready-made program "Full Body — Débutant" not found (migration 027).';
  END IF;
  INSERT INTO programs (user_id, owner_user_id, assigned_to_user_id, group_id, name, description, structure, start_date)
  VALUES (v_coach, v_coach, v_lea, v_group, 'Full Body — Débutant', 'Programme de démonstration', v_structure, v_start)
  RETURNING id INTO v_program;

  -- Léa: Monday, Wednesday, Friday up to today, loads up 2.5 kg a week.
  FOR v_week IN 0..4 LOOP
    FOR v_session IN 0..2 LOOP
      v_date := v_start + v_week * 7 + v_session * 2;
      CONTINUE WHEN v_date > current_date;
      v_day := v_structure -> v_session;
      INSERT INTO workouts (user_id, program_id, program_day_index, date, title, duration_min, kind)
      VALUES (v_lea, v_program, v_session, v_date, 'Full Body — Débutant — ' || (v_day ->> 'name'), 55 + v_session * 5, 'strength')
      RETURNING id INTO v_workout;
      FOR v_ex IN SELECT * FROM jsonb_array_elements(v_day -> 'exercises') LOOP
        SELECT id INTO v_ex_id FROM exercises WHERE user_id IS NULL AND name = v_ex ->> 'exerciseName' LIMIT 1;
        CONTINUE WHEN v_ex_id IS NULL;
        v_kg := CASE v_ex ->> 'exerciseName'
          WHEN 'Barbell Bench Press' THEN 50 + v_week * 2.5 + CASE WHEN v_week = 4 THEN 2.5 ELSE 0 END
          WHEN 'Back Squat' THEN 60 + v_week * 2.5
          WHEN 'Romanian Deadlift' THEN 55 + v_week * 2.5
          WHEN 'Plank' THEN NULL
          WHEN 'Hanging Leg Raise' THEN NULL
          ELSE 25 + v_week * 2.5 END;
        FOR v_set IN 1..3 LOOP
          INSERT INTO workout_sets (user_id, workout_id, exercise_id, set_number, reps, weight_kg, rpe, completed, rest_sec)
          VALUES (v_lea, v_workout, v_ex_id, v_set,
                  CASE WHEN v_ex ->> 'exerciseName' = 'Plank' THEN 40 ELSE 10 - (v_set / 3) END,
                  v_kg, 7 + v_set * 0.5, true, (v_ex ->> 'restSec')::int);
        END LOOP;
      END LOOP;
    END LOOP;
  END LOOP;
  INSERT INTO readiness_checkins (user_id, date, mood, energy, sleep, soreness)
    SELECT v_lea, current_date - d, 4, 4, 4, 2 FROM generate_series(0, 4) d;
  INSERT INTO body_metrics (user_id, date, weight_kg) VALUES (v_lea, current_date - 1, 63.5);

  -- Marc: three sessions, the last six days ago with a knee pain, then nothing.
  FOR v_session IN 0..2 LOOP
    v_date := current_date - 10 + v_session * 2;
    INSERT INTO workouts (user_id, date, title, duration_min, kind)
    VALUES (v_marc, v_date, 'Séance libre', 45, 'strength') RETURNING id INTO v_workout;
    SELECT id INTO v_ex_id FROM exercises WHERE user_id IS NULL AND name = 'Back Squat' LIMIT 1;
    FOR v_set IN 1..3 LOOP
      INSERT INTO workout_sets (user_id, workout_id, exercise_id, set_number, reps, weight_kg, rpe, completed)
      VALUES (v_marc, v_workout, v_ex_id, v_set, 8, 40, 9, true);
    END LOOP;
    IF v_session = 2 THEN
      INSERT INTO workout_notes (user_id, workout_id, author_name, body, exercise_uuid, exercise_name, pain_area, pain_level)
      VALUES (v_marc, v_workout, 'Marc (démo)', 'À la descente, genou droit', v_ex_id::text, 'Back Squat', 'knee', 6);
    END IF;
  END LOOP;

  RAISE NOTICE 'Demo ready: Léa % sessions, Marc 3 sessions, team %',
    (SELECT count(*) FROM workouts WHERE user_id = v_lea AND deleted_at IS NULL), v_group;
END
$demo$;

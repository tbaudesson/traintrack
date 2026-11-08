-- ============================================================
-- 021_security_hardening.sql
--
-- Closes the holes found in the November 2026 audit:
--
--   * inviting an email that already had an account made it an active
--     client on the spot, so anyone could read anyone's training, body
--     and health data as their "trainer";
--   * every signed-in user could list and play every voice note;
--   * pending and deactivated accounts were only stopped by the UI;
--   * the coaching plan was only checked in the UI.
--
-- Memberships that are already active are deliberately left alone.
--
-- Deploy: apply this file first, then the code. The current app keeps
-- working against it: the accept/decline screen already exists.
--
-- Safe to re-run. All-or-nothing: wrapped in one transaction.
-- ============================================================

BEGIN;

-- ─── Helpers ─────────────────────────────────────────────────

-- Blocked only when a profile explicitly says so.
CREATE OR REPLACE FUNCTION is_active_account()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM profiles WHERE user_id = auth.uid() AND status <> 'active'
  );
$$;

-- True for requests from the app; false inside definer functions and for
-- the service role, so triggers below never block the server's own work.
CREATE OR REPLACE FUNCTION is_client_role()
RETURNS BOOLEAN LANGUAGE sql STABLE AS $$
  SELECT current_user IN ('authenticated', 'anon');
$$;

-- Admins pass; otherwise the user's plan (or the default plan) must list it.
CREATE OR REPLACE FUNCTION has_plan_feature(p_user_id UUID, p_feature TEXT)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles p
    LEFT JOIN plans pl
      ON pl.id = COALESCE(p.plan_id, (SELECT dp.id FROM plans dp WHERE dp.is_default LIMIT 1))
    WHERE p.user_id = p_user_id
      AND (p.role = 'admin' OR COALESCE(pl.features, '[]'::jsonb) ? p_feature)
  );
$$;

CREATE OR REPLACE FUNCTION is_app_admin()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin' AND status = 'active'
  );
$$;

-- ─── Account status on every coaching check ─────────────────

CREATE OR REPLACE FUNCTION is_group_owner_or_manager(p_group_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT is_active_account() AND (
    EXISTS (SELECT 1 FROM groups WHERE id = p_group_id AND user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM group_members
               WHERE group_id = p_group_id AND user_id = auth.uid()
                 AND role = 'manager' AND status = 'active' AND deleted_at IS NULL)
  );
$$;

CREATE OR REPLACE FUNCTION is_group_member(p_group_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT is_active_account() AND (EXISTS (
    SELECT 1 FROM groups g WHERE g.id = p_group_id AND g.user_id = auth.uid() AND g.deleted_at IS NULL
  ) OR EXISTS (
    SELECT 1 FROM group_members gm
    WHERE gm.group_id = p_group_id AND gm.user_id = auth.uid()
      AND gm.status = 'active' AND gm.deleted_at IS NULL
  ));
$$;

CREATE OR REPLACE FUNCTION is_my_client(p_user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT is_active_account() AND EXISTS (
    SELECT 1
    FROM group_members gm
    JOIN groups g ON g.id = gm.group_id AND g.deleted_at IS NULL
    WHERE gm.user_id = p_user_id
      AND gm.status = 'active'
      AND gm.deleted_at IS NULL
      AND (
        g.user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM group_members mgr
          WHERE mgr.group_id = g.id AND mgr.user_id = auth.uid()
            AND mgr.role = 'manager' AND mgr.status = 'active' AND mgr.deleted_at IS NULL
        )
      )
  );
$$;

CREATE OR REPLACE FUNCTION can_message(p_other UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p_other <> auth.uid() AND is_active_account() AND (
    is_my_client(p_other)
    OR EXISTS (
      SELECT 1 FROM group_members gm
      JOIN groups g ON g.id = gm.group_id AND g.deleted_at IS NULL
      WHERE gm.user_id = auth.uid() AND gm.status = 'active' AND gm.deleted_at IS NULL
        AND (
          g.user_id = p_other
          OR EXISTS (
            SELECT 1 FROM group_members mgr
            WHERE mgr.group_id = g.id AND mgr.user_id = p_other
              AND mgr.role = 'manager' AND mgr.status = 'active' AND mgr.deleted_at IS NULL
          )
        )
    )
  );
$$;

CREATE OR REPLACE FUNCTION update_group(p_group_id UUID, p_name TEXT, p_description TEXT DEFAULT NULL)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT is_active_account() OR NOT EXISTS (SELECT 1 FROM groups WHERE id = p_group_id AND user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Only the owner can update the team';
  END IF;
  UPDATE groups SET name = p_name, description = p_description, updated_at = now()
  WHERE id = p_group_id;
END;
$$;

CREATE OR REPLACE FUNCTION delete_group(p_group_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT is_active_account() OR NOT EXISTS (SELECT 1 FROM groups WHERE id = p_group_id AND user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Only the owner can delete the team';
  END IF;
  UPDATE groups SET deleted_at = now() WHERE id = p_group_id;
END;
$$;

CREATE OR REPLACE FUNCTION change_member_role(p_member_id UUID, p_role TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_group UUID;
BEGIN
  IF p_role NOT IN ('member','manager') THEN RAISE EXCEPTION 'Invalid role'; END IF;
  SELECT group_id INTO v_group FROM group_members WHERE id = p_member_id;
  -- Only the team owner may change roles
  IF v_group IS NULL OR NOT is_active_account() OR NOT EXISTS (SELECT 1 FROM groups WHERE id = v_group AND user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Only the owner can change roles';
  END IF;
  UPDATE group_members SET role = p_role WHERE id = p_member_id;
END;
$$;

CREATE OR REPLACE FUNCTION get_my_groups()
RETURNS TABLE (id UUID, name TEXT, description TEXT, member_count BIGINT, created_at TIMESTAMPTZ)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT g.id, g.name, g.description,
         (SELECT count(*) FROM group_members gm
          WHERE gm.group_id = g.id AND gm.status = 'active' AND gm.deleted_at IS NULL) AS member_count,
         g.created_at
  FROM groups g
  WHERE g.user_id = auth.uid() AND g.deleted_at IS NULL AND is_active_account()
  ORDER BY g.created_at DESC;
$$;

CREATE OR REPLACE FUNCTION get_my_memberships()
RETURNS TABLE (
  member_id UUID, group_id UUID, group_name TEXT, owner_name TEXT,
  role TEXT, status TEXT, member_count BIGINT
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT gm.id, g.id, g.name,
         COALESCE(p.display_name, p.email) AS owner_name,
         gm.role, gm.status,
         (SELECT count(*) FROM group_members x
          WHERE x.group_id = g.id AND x.status = 'active' AND x.deleted_at IS NULL) AS member_count
  FROM group_members gm
  JOIN groups g ON g.id = gm.group_id AND g.deleted_at IS NULL
  LEFT JOIN profiles p ON p.user_id = g.user_id
  WHERE gm.user_id = auth.uid() AND gm.deleted_at IS NULL AND is_active_account()
  ORDER BY gm.invited_at DESC;
$$;

CREATE OR REPLACE FUNCTION get_messageable_users()
RETURNS TABLE (user_id UUID, display_name TEXT, relation TEXT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  -- Clients I coach (teams I own or manage)
  SELECT DISTINCT gm.user_id,
         COALESCE(p.display_name, gm.invited_email) AS display_name,
         'client' AS relation
  FROM groups g
  JOIN group_members gm ON gm.group_id = g.id
  LEFT JOIN profiles p ON p.user_id = gm.user_id
  WHERE g.deleted_at IS NULL AND gm.deleted_at IS NULL
    AND gm.status = 'active' AND gm.user_id IS NOT NULL AND gm.user_id <> auth.uid()
    AND is_active_account()
    AND (
      g.user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM group_members mgr
        WHERE mgr.group_id = g.id AND mgr.user_id = auth.uid()
          AND mgr.role = 'manager' AND mgr.status = 'active' AND mgr.deleted_at IS NULL
      )
    )

  UNION

  -- Trainers who coach me (owners + managers of teams I'm active in)
  SELECT DISTINCT t.user_id,
         COALESCE(p.display_name, 'Trainer') AS display_name,
         'trainer' AS relation
  FROM group_members me
  JOIN groups g ON g.id = me.group_id AND g.deleted_at IS NULL
  JOIN LATERAL (
    SELECT g.user_id AS user_id
    UNION
    SELECT mgr.user_id FROM group_members mgr
      WHERE mgr.group_id = g.id AND mgr.role = 'manager'
        AND mgr.status = 'active' AND mgr.deleted_at IS NULL
  ) t ON t.user_id <> auth.uid()
  LEFT JOIN profiles p ON p.user_id = t.user_id
  WHERE me.user_id = auth.uid() AND me.status = 'active' AND me.deleted_at IS NULL
    AND is_active_account();
$$;

CREATE OR REPLACE FUNCTION get_inactive_clients(p_days INT DEFAULT 3)
RETURNS TABLE (user_id UUID, display_name TEXT, last_workout DATE, days_since INT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH clients AS (
    SELECT DISTINCT gm.user_id
    FROM groups g
    JOIN group_members gm ON gm.group_id = g.id
    WHERE g.deleted_at IS NULL AND gm.deleted_at IS NULL
      AND gm.status = 'active' AND gm.user_id IS NOT NULL
      AND is_active_account()
      AND (
        g.user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM group_members mgr
          WHERE mgr.group_id = g.id AND mgr.user_id = auth.uid()
            AND mgr.role = 'manager' AND mgr.status = 'active' AND mgr.deleted_at IS NULL
        )
      )
  )
  SELECT c.user_id,
         COALESCE(p.display_name, 'Athlete') AS display_name,
         lw.last_workout,
         (CURRENT_DATE - lw.last_workout) AS days_since
  FROM clients c
  LEFT JOIN profiles p ON p.user_id = c.user_id
  LEFT JOIN LATERAL (
    SELECT MAX(w.date) AS last_workout
    FROM workouts w
    WHERE w.user_id = c.user_id AND w.deleted_at IS NULL
  ) lw ON TRUE
  WHERE lw.last_workout IS NULL OR (CURRENT_DATE - lw.last_workout) >= p_days;
$$;

-- A client-side check is no check: every table a member's app reads or writes
-- also refuses accounts that are pending or deactivated.
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'athlete_profiles','exercises','programs','workouts','workout_sets',
    'body_metrics','readiness_checkins','nutrition_entries','workout_notes',
    'hydration_logs','messages','health_metrics','push_subscriptions',
    'groups','group_members','group_notifications'
  ] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "active_account_only" ON %I', t);
    EXECUTE format(
      'CREATE POLICY "active_account_only" ON %I AS RESTRICTIVE FOR ALL TO authenticated
         USING ((SELECT is_active_account())) WITH CHECK ((SELECT is_active_account()))', t);
  END LOOP;
END $$;

-- ─── Invitations need the invitee's consent ──────────────────

CREATE OR REPLACE FUNCTION create_group(p_name TEXT, p_description TEXT DEFAULT NULL)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id UUID;
BEGIN
  IF NOT is_active_account() OR NOT has_plan_feature(auth.uid(), 'coaching') THEN
    RAISE EXCEPTION 'PLAN_REQUIRED';
  END IF;
  INSERT INTO groups (user_id, name, description)
  VALUES (auth.uid(), p_name, p_description) RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION invite_group_member(p_group_id UUID, p_email TEXT)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id UUID; v_uid UUID;
BEGIN
  IF NOT is_group_owner_or_manager(p_group_id) THEN
    RAISE EXCEPTION 'Only the trainer can invite members';
  END IF;
  -- The team owner's plan decides, so a manager can invite for a Pro owner.
  IF NOT has_plan_feature((SELECT g.user_id FROM groups g WHERE g.id = p_group_id), 'coaching') THEN
    RAISE EXCEPTION 'PLAN_REQUIRED';
  END IF;
  IF EXISTS (SELECT 1 FROM group_members
             WHERE group_id = p_group_id AND lower(invited_email) = lower(p_email)
               AND deleted_at IS NULL) THEN
    RAISE EXCEPTION 'This email is already invited';
  END IF;
  -- Resolve to an existing user if present
  SELECT id INTO v_uid FROM auth.users WHERE lower(email) = lower(p_email);
  -- Always pending: becoming someone's client opens their data to the trainer.
  INSERT INTO group_members (group_id, user_id, invited_email, role, status)
  VALUES (p_group_id, v_uid, lower(p_email), 'member', 'pending')
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION get_group_members(p_group_id UUID)
RETURNS TABLE (
  id UUID, user_id UUID, role TEXT, status TEXT, invited_email TEXT,
  display_name TEXT, invited_at TIMESTAMPTZ, joined_at TIMESTAMPTZ
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT is_group_owner_or_manager(p_group_id) THEN
    RAISE EXCEPTION 'Unauthorized: not the team trainer';
  END IF;
  RETURN QUERY
  SELECT gm.id, gm.user_id, gm.role, gm.status, gm.invited_email,
         -- An invitee's name stays private until they accept.
         COALESCE(CASE WHEN gm.status = 'active' THEN p.display_name END, gm.invited_email) AS display_name,
         gm.invited_at, gm.joined_at
  FROM group_members gm
  LEFT JOIN profiles p ON p.user_id = gm.user_id
  WHERE gm.group_id = p_group_id AND gm.deleted_at IS NULL
  ORDER BY gm.invited_at;
END;
$$;

CREATE OR REPLACE FUNCTION respond_to_invitation(p_member_id UUID, p_accept BOOLEAN)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT is_active_account() OR NOT EXISTS (
    SELECT 1 FROM group_members
    WHERE id = p_member_id AND user_id = auth.uid() AND deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Not your invitation';
  END IF;
  IF p_accept THEN
    UPDATE group_members SET status = 'active', joined_at = now() WHERE id = p_member_id;
  ELSE
    UPDATE group_members SET deleted_at = now() WHERE id = p_member_id;
  END IF;
END;
$$;

-- Links the invitation to the new account; accepting it stays a separate act.
CREATE OR REPLACE FUNCTION claim_pending_invitations()
RETURNS INT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_email TEXT; v_count INT;
BEGIN
  SELECT email INTO v_email FROM auth.users WHERE id = auth.uid();
  IF v_email IS NULL THEN RETURN 0; END IF;
  UPDATE group_members
  SET user_id = auth.uid()
  WHERE lower(invited_email) = lower(v_email)
    AND user_id IS NULL AND deleted_at IS NULL;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN COALESCE(v_count, 0);
END;
$$;

-- Nothing calls this any more, and it told anonymous visitors who was invited.
REVOKE ALL ON FUNCTION check_invitation(TEXT) FROM PUBLIC, anon, authenticated;

-- ─── Voice notes ─────────────────────────────────────────────

-- Long enough for any real note; stops the bucket being used as free storage.
UPDATE storage.buckets SET file_size_limit = 10485760 WHERE id = 'voice-notes';

DROP POLICY IF EXISTS "voice_notes_insert" ON storage.objects;
CREATE POLICY "voice_notes_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'voice-notes'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND (SELECT is_active_account())
  );

-- Your own files, or files on a note workout_notes' RLS already lets you read.
DROP POLICY IF EXISTS "voice_notes_select" ON storage.objects;
CREATE POLICY "voice_notes_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'voice-notes'
    AND (SELECT is_active_account())
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR EXISTS (SELECT 1 FROM workout_notes n WHERE n.audio_path = objects.name)
    )
  );

-- ─── Rows may only point at people and workouts you coach ────

-- wn_update_own checks the author only: an UPDATE could otherwise drop a note
-- onto a stranger's workout, past the check wn_insert makes.
CREATE OR REPLACE FUNCTION guard_workout_note_move()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF is_client_role() AND NEW.workout_id IS DISTINCT FROM OLD.workout_id THEN
    RAISE EXCEPTION 'A note cannot move to another workout';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_workout_notes_guard ON workout_notes;
CREATE TRIGGER trg_workout_notes_guard BEFORE UPDATE ON workout_notes
  FOR EACH ROW EXECUTE FUNCTION guard_workout_note_move();

-- An existing assignment stays valid after the client leaves the team, so the
-- trainer's offline sync is not left with a row it can never push.
CREATE OR REPLACE FUNCTION guard_program_assignment()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF is_client_role()
     AND NEW.assigned_to_user_id IS NOT NULL
     AND NEW.assigned_to_user_id <> auth.uid()
     AND NOT is_my_client(NEW.assigned_to_user_id)
     AND NOT EXISTS (
       SELECT 1 FROM programs p
       WHERE p.id = NEW.id AND p.assigned_to_user_id = NEW.assigned_to_user_id
     ) THEN
    RAISE EXCEPTION 'A program can only be assigned to your own client';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_programs_guard ON programs;
CREATE TRIGGER trg_programs_guard BEFORE INSERT OR UPDATE ON programs
  FOR EACH ROW EXECUTE FUNCTION guard_program_assignment();

-- NOT VALID: applies to new writes, without judging what is already stored.
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_body_length;
ALTER TABLE messages ADD CONSTRAINT messages_body_length
  CHECK (char_length(body) <= 10000) NOT VALID;
ALTER TABLE workout_notes DROP CONSTRAINT IF EXISTS workout_notes_body_length;
ALTER TABLE workout_notes ADD CONSTRAINT workout_notes_body_length
  CHECK (char_length(body) <= 10000) NOT VALID;

-- ─── Account deletion ────────────────────────────────────────

-- Supabase refuses direct DELETEs on storage.objects, which aborted the whole
-- deletion. The app now removes the files through the Storage API first.

CREATE OR REPLACE FUNCTION delete_my_account()
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  DELETE FROM workout_notes WHERE user_id = v_user_id;

  DELETE FROM health_metrics WHERE user_id = v_user_id;
  DELETE FROM push_subscriptions WHERE user_id = v_user_id;
  DELETE FROM messages WHERE user_id = v_user_id OR recipient_id = v_user_id;
  DELETE FROM challenges WHERE created_by = v_user_id;
  DELETE FROM hydration_logs WHERE user_id = v_user_id;
  DELETE FROM nutrition_entries WHERE user_id = v_user_id;
  DELETE FROM readiness_checkins WHERE user_id = v_user_id;
  DELETE FROM workout_sets WHERE user_id = v_user_id;
  DELETE FROM workouts WHERE user_id = v_user_id;
  DELETE FROM body_metrics WHERE user_id = v_user_id;
  DELETE FROM programs WHERE user_id = v_user_id;
  DELETE FROM exercises WHERE user_id = v_user_id;
  DELETE FROM athlete_profiles WHERE user_id = v_user_id;

  DELETE FROM group_members WHERE user_id = v_user_id;
  DELETE FROM group_notifications WHERE user_id = v_user_id;
  DELETE FROM groups WHERE user_id = v_user_id;

  DELETE FROM invitations WHERE invited_by = v_user_id;
  DELETE FROM profiles WHERE user_id = v_user_id;

  DELETE FROM auth.users WHERE id = v_user_id;
END;
$$;

COMMIT;

-- 037_security_fixes.sql
-- Three holes found by the security review of 021-036.
--
-- 1. Voice notes: a file could be read by anyone who wrote, on their own
--    workout, a note naming its path. A note now only opens a file when its
--    author owns the file's folder, and a note can only name its author's files.
-- 2. Workout sets could be attached to someone else's workout (only the set's
--    author was checked), which inflated that person's challenge volume. A set
--    must now belong to one of its author's workouts, and the leaderboard only
--    counts a workout owner's own sets.
-- 3. The pain CHECK let half-filled rows through (NULL makes a CHECK pass).
--
-- The app pushes workouts before their sets, so normal sync is unaffected.
-- NOT VALID: the new constraints judge new writes, not what is stored.
--
-- Safe to re-run. All-or-nothing: wrapped in one transaction.

BEGIN;

-- 1. Voice notes ------------------------------------------------------------
DROP POLICY IF EXISTS "voice_notes_select" ON storage.objects;
CREATE POLICY "voice_notes_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'voice-notes'
    AND (SELECT is_active_account())
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR EXISTS (
        SELECT 1 FROM workout_notes n
        WHERE n.audio_path = objects.name
          AND n.user_id::text = (storage.foldername(objects.name))[1]
      )
    )
  );

ALTER TABLE workout_notes DROP CONSTRAINT IF EXISTS workout_notes_audio_path_owner;
ALTER TABLE workout_notes ADD CONSTRAINT workout_notes_audio_path_owner
  CHECK (audio_path IS NULL OR audio_path LIKE user_id::text || '/%') NOT VALID;

-- 2. Sets only on your own workouts ----------------------------------------
DROP POLICY IF EXISTS "ws_own_all" ON workout_sets;
CREATE POLICY "ws_own_all" ON workout_sets
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND (workout_id IS NULL OR EXISTS (SELECT 1 FROM workouts w WHERE w.id = workout_id AND w.user_id = auth.uid()))
  );

CREATE OR REPLACE FUNCTION get_challenge_leaderboard(p_challenge_id UUID)
RETURNS TABLE (user_id UUID, display_name TEXT, score NUMERIC)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_group UUID; v_type TEXT; v_start DATE; v_end DATE;
BEGIN
  SELECT c.group_id, c.type, c.start_date, c.end_date
    INTO v_group, v_type, v_start, v_end
  FROM challenges c WHERE c.id = p_challenge_id AND c.deleted_at IS NULL;

  IF v_group IS NULL THEN RETURN; END IF;
  IF NOT is_group_member(v_group) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN QUERY
  WITH members AS (
    -- active clients of the team + the team owner
    SELECT gm.user_id FROM group_members gm
      WHERE gm.group_id = v_group AND gm.status = 'active'
        AND gm.deleted_at IS NULL AND gm.user_id IS NOT NULL
    UNION
    SELECT g.user_id FROM groups g WHERE g.id = v_group
  ),
  scored AS (
    SELECT m.user_id,
      CASE
        WHEN v_type = 'volume' THEN COALESCE((
          SELECT SUM(ws.weight_kg * ws.reps)
          FROM workouts w
          JOIN workout_sets ws ON ws.workout_id = w.id AND ws.user_id = w.user_id AND ws.completed = TRUE AND NOT ws.is_warmup AND ws.deleted_at IS NULL
          WHERE w.user_id = m.user_id AND w.deleted_at IS NULL
            AND w.date BETWEEN v_start AND v_end
        ), 0)
        WHEN v_type = 'sessions' THEN COALESCE((
          SELECT COUNT(*) FROM workouts w
          WHERE w.user_id = m.user_id AND w.deleted_at IS NULL
            AND w.date BETWEEN v_start AND v_end
        ), 0)
        ELSE COALESCE((  -- consistency: distinct training days
          SELECT COUNT(DISTINCT w.date) FROM workouts w
          WHERE w.user_id = m.user_id AND w.deleted_at IS NULL
            AND w.date BETWEEN v_start AND v_end
        ), 0)
      END AS score
    FROM members m
  )
  SELECT s.user_id,
         COALESCE(p.display_name, 'Athlete') AS display_name,
         s.score
  FROM scored s
  LEFT JOIN profiles p ON p.user_id = s.user_id
  ORDER BY s.score DESC, display_name ASC;
END;
$$;

-- 3. Pain: both or neither --------------------------------------------------
ALTER TABLE workout_notes DROP CONSTRAINT IF EXISTS workout_notes_pain_check;
ALTER TABLE workout_notes ADD CONSTRAINT workout_notes_pain_check CHECK (
  (pain_area IS NULL AND pain_level IS NULL)
  OR (pain_area IS NOT NULL AND pain_level IS NOT NULL
      AND pain_area IN ('shoulder','elbow','wrist','neck','upper_back','lower_back','hip','knee','ankle','other')
      AND pain_level BETWEEN 1 AND 10)
);

COMMIT;

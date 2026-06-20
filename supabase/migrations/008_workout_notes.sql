-- ============================================================
-- 008_workout_notes.sql — async notes on a logged workout
-- Author = user_id (athlete on own workout, or their trainer).
-- Visible to the workout owner and their trainer (is_my_client).
-- ============================================================

CREATE TABLE IF NOT EXISTS workout_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, -- author
  workout_id UUID NOT NULL,
  author_name TEXT,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_workout_notes_user ON workout_notes(user_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_workout_notes_workout ON workout_notes(workout_id);

DROP TRIGGER IF EXISTS trg_workout_notes_updated ON workout_notes;
CREATE TRIGGER trg_workout_notes_updated BEFORE UPDATE ON workout_notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE workout_notes ENABLE ROW LEVEL SECURITY;

-- Read: the author, the workout owner, or the workout owner's trainer
CREATE POLICY "wn_read" ON workout_notes
  FOR SELECT USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM workouts w
      WHERE w.id = workout_notes.workout_id
        AND (w.user_id = auth.uid() OR is_my_client(w.user_id))
    )
  );

-- Insert: you author as yourself, on your own workout or a client's workout
CREATE POLICY "wn_insert" ON workout_notes
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM workouts w
      WHERE w.id = workout_notes.workout_id
        AND (w.user_id = auth.uid() OR is_my_client(w.user_id))
    )
  );

-- Update/delete: only the author (soft-delete via update)
CREATE POLICY "wn_update_own" ON workout_notes
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Extend account deletion to remove authored notes
CREATE OR REPLACE FUNCTION delete_my_account()
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  DELETE FROM workout_notes WHERE user_id = v_user_id;
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

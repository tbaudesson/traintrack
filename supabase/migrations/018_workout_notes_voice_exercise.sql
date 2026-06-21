-- 018_workout_notes_voice_exercise.sql
-- Extend workout notes with per-exercise anchoring and voice (audio) notes.

ALTER TABLE workout_notes ADD COLUMN IF NOT EXISTS exercise_uuid TEXT;
ALTER TABLE workout_notes ADD COLUMN IF NOT EXISTS exercise_name TEXT;
ALTER TABLE workout_notes ADD COLUMN IF NOT EXISTS audio_path TEXT;
-- A voice-only note has an empty body; allow it.
ALTER TABLE workout_notes ALTER COLUMN body SET DEFAULT '';

-- ─── Private storage bucket for voice notes ──────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('voice-notes', 'voice-notes', false)
ON CONFLICT (id) DO NOTHING;

-- Any authenticated user may upload; paths are unguessable UUIDs and the
-- audio_path only lives on note rows already protected by workout_notes RLS.
DROP POLICY IF EXISTS "voice_notes_insert" ON storage.objects;
CREATE POLICY "voice_notes_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'voice-notes');

DROP POLICY IF EXISTS "voice_notes_select" ON storage.objects;
CREATE POLICY "voice_notes_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'voice-notes');

DROP POLICY IF EXISTS "voice_notes_delete" ON storage.objects;
CREATE POLICY "voice_notes_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'voice-notes' AND owner = auth.uid());

-- ─── GDPR: remove the user's authored notes + their audio files ──────
CREATE OR REPLACE FUNCTION delete_my_account()
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  DELETE FROM storage.objects WHERE bucket_id = 'voice-notes' AND owner = v_user_id;
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

-- 100_tracking_reset.sql
-- Starting one's tracking over (Settings > Start over): one's sessions and
-- their sets and notes, the day's form, body measurements, nutrition,
-- hydration, health data, competitions and goals are put aside together,
-- as deleted, so every device of the athlete (and their coach) stops
-- showing them at the next sync. The account, the profile (injuries, VMA,
-- FTP included), the settings, one's exercises and programs, the horses
-- and their sessions, the groups and the messages are kept.
-- For the days app_settings.tracking_reset_days says (30 to start with,
-- edited in Admin > GDPR) the athlete can bring it all back; after that,
-- what was put aside is deleted for good the next time the app asks.
-- Only the last reset can be undone: a new one takes along what an earlier
-- one still kept aside.
-- Apply this file first, then the code.
-- Plain quotes only; safe to run again.

BEGIN;

INSERT INTO app_settings (key, value) VALUES ('tracking_reset_days', '30') ON CONFLICT (key) DO NOTHING;

-- One row per athlete with a reset that can still be undone.
CREATE TABLE IF NOT EXISTS tracking_resets (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  reset_at TIMESTAMPTZ NOT NULL
);
ALTER TABLE tracking_resets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tr_own_read ON tracking_resets;
CREATE POLICY tr_own_read ON tracking_resets FOR SELECT USING (user_id = auth.uid());
-- No write policy: only the functions below write it.

-- The days a reset can be undone, as the admin set them.
CREATE OR REPLACE FUNCTION tracking_reset_days()
RETURNS INT LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS '
DECLARE v TEXT;
BEGIN
  SELECT value INTO v FROM app_settings WHERE key = ''tracking_reset_days'';
  IF v IS NULL OR v !~ ''^[0-9]{1,3}$'' OR v::INT < 1 THEN
    RAISE EXCEPTION ''app_settings.tracking_reset_days is missing or invalid'';
  END IF;
  RETURN v::INT;
END;
';

-- Mark (p_from IS NULL: rows in use) or bring back (rows put aside at p_from)
-- one athlete''s tracking: p_to is the new deleted_at (NULL brings back).
CREATE OR REPLACE FUNCTION tracking_reset_mark(p_user UUID, p_from TIMESTAMPTZ, p_to TIMESTAMPTZ)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS '
BEGIN
  -- The notes of one''s sessions, whoever wrote them (a coach''s too), before the sessions.
  UPDATE workout_notes SET deleted_at = p_to
    WHERE workout_id IN (SELECT id FROM workouts WHERE user_id = p_user)
      AND deleted_at IS NOT DISTINCT FROM p_from;
  UPDATE workout_sets SET deleted_at = p_to
    WHERE (user_id = p_user OR workout_id IN (SELECT id FROM workouts WHERE user_id = p_user))
      AND deleted_at IS NOT DISTINCT FROM p_from;
  UPDATE workouts SET deleted_at = p_to WHERE user_id = p_user AND deleted_at IS NOT DISTINCT FROM p_from;
  UPDATE body_metrics SET deleted_at = p_to WHERE user_id = p_user AND deleted_at IS NOT DISTINCT FROM p_from;
  UPDATE readiness_checkins SET deleted_at = p_to WHERE user_id = p_user AND deleted_at IS NOT DISTINCT FROM p_from;
  UPDATE nutrition_entries SET deleted_at = p_to WHERE user_id = p_user AND deleted_at IS NOT DISTINCT FROM p_from;
  UPDATE hydration_logs SET deleted_at = p_to WHERE user_id = p_user AND deleted_at IS NOT DISTINCT FROM p_from;
  UPDATE health_metrics SET deleted_at = p_to WHERE user_id = p_user AND deleted_at IS NOT DISTINCT FROM p_from;
  UPDATE competition_results SET deleted_at = p_to WHERE user_id = p_user AND deleted_at IS NOT DISTINCT FROM p_from;
  UPDATE goals SET deleted_at = p_to WHERE user_id = p_user AND deleted_at IS NOT DISTINCT FROM p_from;
END;
';
REVOKE ALL ON FUNCTION tracking_reset_mark(UUID, TIMESTAMPTZ, TIMESTAMPTZ) FROM PUBLIC;
REVOKE ALL ON FUNCTION tracking_reset_mark(UUID, TIMESTAMPTZ, TIMESTAMPTZ) FROM anon, authenticated;

-- Delete for good what a reset past its days kept aside; returns the voice
-- notes'' files to remove from storage (the database may not touch them).
CREATE OR REPLACE FUNCTION tracking_reset_purge(p_user UUID, p_at TIMESTAMPTZ)
RETURNS TEXT[] LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS '
DECLARE v_audio TEXT[];
BEGIN
  SELECT coalesce(array_agg(audio_path), ''{}'') INTO v_audio FROM workout_notes
    WHERE workout_id IN (SELECT id FROM workouts WHERE user_id = p_user)
      AND deleted_at = p_at AND audio_path IS NOT NULL AND audio_path <> '''';
  DELETE FROM workout_notes WHERE workout_id IN (SELECT id FROM workouts WHERE user_id = p_user) AND deleted_at = p_at;
  DELETE FROM workout_sets WHERE (user_id = p_user OR workout_id IN (SELECT id FROM workouts WHERE user_id = p_user)) AND deleted_at = p_at;
  DELETE FROM workouts WHERE user_id = p_user AND deleted_at = p_at;
  DELETE FROM body_metrics WHERE user_id = p_user AND deleted_at = p_at;
  DELETE FROM readiness_checkins WHERE user_id = p_user AND deleted_at = p_at;
  DELETE FROM nutrition_entries WHERE user_id = p_user AND deleted_at = p_at;
  DELETE FROM hydration_logs WHERE user_id = p_user AND deleted_at = p_at;
  DELETE FROM health_metrics WHERE user_id = p_user AND deleted_at = p_at;
  DELETE FROM competition_results WHERE user_id = p_user AND deleted_at = p_at;
  DELETE FROM goals WHERE user_id = p_user AND deleted_at = p_at;
  DELETE FROM tracking_resets WHERE user_id = p_user;
  RETURN v_audio;
END;
';
REVOKE ALL ON FUNCTION tracking_reset_purge(UUID, TIMESTAMPTZ) FROM PUBLIC;
REVOKE ALL ON FUNCTION tracking_reset_purge(UUID, TIMESTAMPTZ) FROM anon, authenticated;

-- One''s reset: none, one that can still be undone (and until when), or one
-- past its days, deleted for good now (with the voice files to remove).
CREATE OR REPLACE FUNCTION my_tracking_reset()
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS '
DECLARE v_user UUID := auth.uid(); v_at TIMESTAMPTZ; v_until TIMESTAMPTZ;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION ''Not authenticated''; END IF;
  SELECT reset_at INTO v_at FROM tracking_resets WHERE user_id = v_user;
  IF v_at IS NULL THEN RETURN NULL; END IF;
  v_until := v_at + make_interval(days => tracking_reset_days());
  IF v_until <= now() THEN
    RETURN jsonb_build_object(''purgedAudio'', to_jsonb(tracking_reset_purge(v_user, v_at)));
  END IF;
  RETURN jsonb_build_object(''resetAt'', v_at, ''undoUntil'', v_until);
END;
';

-- Start over: one''s tracking put aside now; returns when, and until when it can be undone.
CREATE OR REPLACE FUNCTION reset_my_tracking()
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS '
DECLARE v_user UUID := auth.uid(); v_prev TIMESTAMPTZ; v_at TIMESTAMPTZ := now();
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION ''Not authenticated''; END IF;
  SELECT reset_at INTO v_prev FROM tracking_resets WHERE user_id = v_user FOR UPDATE;
  -- What an earlier reset still kept aside goes along with this one.
  IF v_prev IS NOT NULL THEN PERFORM tracking_reset_mark(v_user, v_prev, v_at); END IF;
  PERFORM tracking_reset_mark(v_user, NULL, v_at);
  INSERT INTO tracking_resets (user_id, reset_at) VALUES (v_user, v_at)
    ON CONFLICT (user_id) DO UPDATE SET reset_at = EXCLUDED.reset_at;
  RETURN jsonb_build_object(''resetAt'', v_at, ''undoUntil'', v_at + make_interval(days => tracking_reset_days()));
END;
';

-- Bring back what the last reset put aside, while its days last; returns when.
CREATE OR REPLACE FUNCTION undo_my_tracking_reset()
RETURNS TIMESTAMPTZ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS '
DECLARE v_user UUID := auth.uid(); v_at TIMESTAMPTZ;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION ''Not authenticated''; END IF;
  SELECT reset_at INTO v_at FROM tracking_resets WHERE user_id = v_user FOR UPDATE;
  IF v_at IS NULL OR v_at + make_interval(days => tracking_reset_days()) <= now() THEN
    RAISE EXCEPTION ''No reset to undo'';
  END IF;
  PERFORM tracking_reset_mark(v_user, v_at, NULL);
  DELETE FROM tracking_resets WHERE user_id = v_user;
  RETURN now();
END;
';

REVOKE ALL ON FUNCTION my_tracking_reset() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION reset_my_tracking() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION undo_my_tracking_reset() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION my_tracking_reset() TO authenticated;
GRANT EXECUTE ON FUNCTION reset_my_tracking() TO authenticated;
GRANT EXECUTE ON FUNCTION undo_my_tracking_reset() TO authenticated;

COMMIT;

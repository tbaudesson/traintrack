-- 080_strava.sql
-- Strava: an athlete connects their account and their activities come in as
-- sessions (workouts.source = 'strava', external_id = the activity's id).
--   strava_connections  the athlete's Strava tokens. Row-level security on and
--                       no policy: no device reads or writes them, only the
--                       server (the "strava" Edge Function, server key).
-- Strava's API agreement allows an athlete's Strava data to be shown to that
-- athlete only: a coach no longer reads the sessions that came from Strava
-- (their own reading rule now leaves them out). The app also keeps them out
-- of the AI assistant, and they are deleted when the athlete disconnects.
-- Needs 078 (workouts.source). Deploy: apply this file first, then the code
-- and the function. Safe to run again. All-or-nothing: one transaction.

BEGIN;

CREATE TABLE IF NOT EXISTS strava_connections (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  athlete_id BIGINT NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at BIGINT NOT NULL,
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE strava_connections ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON strava_connections FROM anon, authenticated;

-- A coach reads a client's sessions, except those from Strava.
DROP POLICY IF EXISTS "wo_trainer_read" ON workouts;
CREATE POLICY "wo_trainer_read" ON workouts
  FOR SELECT USING (is_my_client(user_id) AND source IS DISTINCT FROM 'strava');

COMMIT;

-- 078_session_provenance.sql
-- Where a session came from, so the same outing is never logged twice:
--   source       'manual' (or NULL), 'file' (a watch file), and later a
--                connected service: 'strava', 'garmin', 'health'
--   external_id  the service's own id of the activity
--   started_at   when the activity started, as the file says
--   file_hash    SHA-256 of the file it was imported from (64 hex characters)
-- The app refuses a file already imported (same fingerprint, or same sport
-- started within two minutes). A connected service writes each activity
-- once: one row per (user, source, external_id).
-- Deploy: apply this file first, then the code.
-- Safe to run again. All-or-nothing: one transaction.

BEGIN;

ALTER TABLE workouts ADD COLUMN IF NOT EXISTS source TEXT;
ALTER TABLE workouts ADD COLUMN IF NOT EXISTS external_id TEXT;
ALTER TABLE workouts ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ;
ALTER TABLE workouts ADD COLUMN IF NOT EXISTS file_hash TEXT;

ALTER TABLE workouts DROP CONSTRAINT IF EXISTS workouts_provenance_check;
ALTER TABLE workouts ADD CONSTRAINT workouts_provenance_check CHECK (
  (source IS NULL OR source IN ('manual', 'file', 'strava', 'garmin', 'health'))
  AND (external_id IS NULL OR char_length(external_id) BETWEEN 1 AND 120)
  AND (file_hash IS NULL OR file_hash ~ '^[0-9a-f]{64}$')
) NOT VALID;

CREATE INDEX IF NOT EXISTS idx_workouts_file_hash ON workouts(user_id, file_hash) WHERE file_hash IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_workouts_external ON workouts(user_id, source, external_id)
  WHERE external_id IS NOT NULL AND deleted_at IS NULL;

COMMIT;

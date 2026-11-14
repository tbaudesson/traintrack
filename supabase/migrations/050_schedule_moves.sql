-- 050_schedule_moves.sql
-- Sessions the athlete moved to another day, or skipped: a list of
-- { program, from, to } on the athlete’s profile (program = the program’s
-- uuid, from and to = dates, to = null for a session skipped). Kept on the
-- profile rather than on the program, since a coach’s program is only read
-- by the athlete. The app drops the moves over a month old and keeps 40.
--
-- Deploy: apply this file first, then the code. The app sends the new column,
-- and the server refuses columns it does not know.
--
-- Safe to re-run. All-or-nothing: wrapped in one transaction.

BEGIN;

ALTER TABLE athlete_profiles ADD COLUMN IF NOT EXISTS schedule_moves JSONB;

ALTER TABLE athlete_profiles DROP CONSTRAINT IF EXISTS athlete_profiles_schedule_moves_check;
ALTER TABLE athlete_profiles ADD CONSTRAINT athlete_profiles_schedule_moves_check
  CHECK (
    schedule_moves IS NULL
    OR (jsonb_typeof(schedule_moves) = 'array'
        AND jsonb_array_length(schedule_moves) <= 60
        AND pg_column_size(schedule_moves) <= 16384)
  );

COMMIT;

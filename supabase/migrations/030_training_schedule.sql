-- 030_training_schedule.sql
-- The athlete's week: the days they plan to train (1 = Monday … 7 = Sunday)
-- and the usual time, used for the week on the home screen and for the
-- calendar reminders. Kept on the athlete profile, which the athlete owns,
-- since a program assigned by a coach is read-only for them.
--
-- Deploy: apply this file first, then the code. The app sends the new
-- columns, and the server refuses columns it does not know.
--
-- Safe to re-run. All-or-nothing: wrapped in one transaction.

BEGIN;

ALTER TABLE athlete_profiles ADD COLUMN IF NOT EXISTS training_days JSONB;
ALTER TABLE athlete_profiles ADD COLUMN IF NOT EXISTS training_time TEXT;

ALTER TABLE athlete_profiles DROP CONSTRAINT IF EXISTS athlete_profiles_training_time_check;
ALTER TABLE athlete_profiles ADD CONSTRAINT athlete_profiles_training_time_check
  CHECK (training_time IS NULL OR training_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$');

ALTER TABLE athlete_profiles DROP CONSTRAINT IF EXISTS athlete_profiles_training_days_check;
ALTER TABLE athlete_profiles ADD CONSTRAINT athlete_profiles_training_days_check
  CHECK (training_days IS NULL OR jsonb_typeof(training_days) = 'array');

COMMIT;

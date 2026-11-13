-- 031_strength_goals.sql
-- The athlete's strength goals: a target estimated one-rep max on an exercise,
-- maybe by a date. Kept on the athlete profile, which the athlete owns and the
-- coach can read; the progress itself is computed from the sessions.
--
-- Deploy: apply this file first, then the code. The app sends the new column,
-- and the server refuses columns it does not know.
--
-- Safe to re-run. All-or-nothing: wrapped in one transaction.

BEGIN;

ALTER TABLE athlete_profiles ADD COLUMN IF NOT EXISTS strength_goals JSONB;

ALTER TABLE athlete_profiles DROP CONSTRAINT IF EXISTS athlete_profiles_strength_goals_check;
ALTER TABLE athlete_profiles ADD CONSTRAINT athlete_profiles_strength_goals_check
  CHECK (strength_goals IS NULL OR (jsonb_typeof(strength_goals) = 'array' AND jsonb_array_length(strength_goals) <= 20));

COMMIT;

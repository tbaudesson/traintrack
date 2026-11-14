-- 039_injuries.sql
-- The injuries an athlete declares (an area and since when), kept on the
-- athlete profile so they follow the athlete across devices and the coach
-- sees them. The app flags the exercises to avoid, or to do with caution,
-- for each injured area, and leaves the first out of timed sessions.
--
-- Deploy: apply this file first, then the code. The app sends the new column,
-- and the server refuses columns it does not know.
--
-- Safe to re-run. All-or-nothing: wrapped in one transaction.

BEGIN;

ALTER TABLE athlete_profiles ADD COLUMN IF NOT EXISTS injury_areas JSONB;

ALTER TABLE athlete_profiles DROP CONSTRAINT IF EXISTS athlete_profiles_injury_areas_check;
ALTER TABLE athlete_profiles ADD CONSTRAINT athlete_profiles_injury_areas_check
  CHECK (injury_areas IS NULL OR (jsonb_typeof(injury_areas) = 'array' AND jsonb_array_length(injury_areas) <= 10));

COMMIT;

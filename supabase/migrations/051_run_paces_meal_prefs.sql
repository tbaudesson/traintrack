-- 051_run_paces_meal_prefs.sql
-- On the athlete’s profile:
-- - run_paces: the VMA (maximal aerobic speed, km/h) and what it came from
--   (a race result, the half-Cooper test, or typed in). The app works every
--   running pace out of it.
-- - meal_prefs: the diet, the foods left out and the meals a day, for the
--   meal ideas.
--
-- Deploy: apply this file first, then the code. The app sends the new
-- columns, and the server refuses columns it does not know.
--
-- Safe to re-run. All-or-nothing: wrapped in one transaction.

BEGIN;

ALTER TABLE athlete_profiles ADD COLUMN IF NOT EXISTS run_paces JSONB;

ALTER TABLE athlete_profiles DROP CONSTRAINT IF EXISTS athlete_profiles_run_paces_check;
ALTER TABLE athlete_profiles ADD CONSTRAINT athlete_profiles_run_paces_check
  CHECK (
    run_paces IS NULL
    OR (jsonb_typeof(run_paces) = 'object'
        AND pg_column_size(run_paces) <= 1024
        AND CASE WHEN jsonb_typeof(run_paces->'vma') = 'number'
                 THEN (run_paces->>'vma')::numeric BETWEEN 8 AND 26
                 ELSE false END)
  );

ALTER TABLE athlete_profiles ADD COLUMN IF NOT EXISTS meal_prefs JSONB;

ALTER TABLE athlete_profiles DROP CONSTRAINT IF EXISTS athlete_profiles_meal_prefs_check;
ALTER TABLE athlete_profiles ADD CONSTRAINT athlete_profiles_meal_prefs_check
  CHECK (
    meal_prefs IS NULL
    OR (jsonb_typeof(meal_prefs) = 'object' AND pg_column_size(meal_prefs) <= 1024)
  );

COMMIT;

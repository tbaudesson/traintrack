-- 033_deload_week.sql
-- The week an athlete chose to deload (its Monday, YYYY-MM-DD). During that
-- week the app starts sessions with fewer sets and lighter loads. Kept on the
-- athlete profile, so it follows the athlete across devices and the coach
-- sees it.
--
-- Deploy: apply this file first, then the code. The app sends the new column,
-- and the server refuses columns it does not know.
--
-- Safe to re-run. All-or-nothing: wrapped in one transaction.

BEGIN;

ALTER TABLE athlete_profiles ADD COLUMN IF NOT EXISTS deload_week TEXT;

ALTER TABLE athlete_profiles DROP CONSTRAINT IF EXISTS athlete_profiles_deload_week_check;
ALTER TABLE athlete_profiles ADD CONSTRAINT athlete_profiles_deload_week_check
  CHECK (deload_week IS NULL OR deload_week ~ '^\d{4}-\d{2}-\d{2}$');

COMMIT;

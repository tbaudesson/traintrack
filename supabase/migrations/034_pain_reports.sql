-- 034_pain_reports.sql
-- A pain or discomfort reported on an exercise during a session: where it
-- hurts and how much (1-10). Stored on the workout note the athlete writes,
-- so the coach, who already reads those notes, sees it too.
--
-- Deploy: apply this file first, then the code. The app sends the new
-- columns, and the server refuses columns it does not know.
--
-- Safe to re-run. All-or-nothing: wrapped in one transaction.

BEGIN;

ALTER TABLE workout_notes ADD COLUMN IF NOT EXISTS pain_area TEXT;
ALTER TABLE workout_notes ADD COLUMN IF NOT EXISTS pain_level SMALLINT;

ALTER TABLE workout_notes DROP CONSTRAINT IF EXISTS workout_notes_pain_check;
ALTER TABLE workout_notes ADD CONSTRAINT workout_notes_pain_check CHECK (
  (pain_area IS NULL AND pain_level IS NULL)
  OR (pain_area IN ('shoulder','elbow','wrist','neck','upper_back','lower_back','hip','knee','ankle','other')
      AND pain_level BETWEEN 1 AND 10)
);

COMMIT;

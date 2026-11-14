-- 048_program_weekdays.sql
-- The days of the week each program is trained on (1 = Monday … 7 = Sunday).
-- A program given days is in the athlete’s planning: the week on the home
-- screen and the calendar export then show every planned program together.
-- The owner sets them, as for the start date: a coach for the programs
-- given to athletes.
--
-- Deploy: apply this file first, then the code. The app sends the new column,
-- and the server refuses columns it does not know.
--
-- Safe to re-run. All-or-nothing: wrapped in one transaction.

BEGIN;

ALTER TABLE programs ADD COLUMN IF NOT EXISTS weekdays JSONB;

ALTER TABLE programs DROP CONSTRAINT IF EXISTS programs_weekdays_check;
ALTER TABLE programs ADD CONSTRAINT programs_weekdays_check
  CHECK (weekdays IS NULL OR (jsonb_typeof(weekdays) = 'array' AND weekdays <@ '[1,2,3,4,5,6,7]'::jsonb));

COMMIT;

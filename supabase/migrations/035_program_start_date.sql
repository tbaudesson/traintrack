-- 035_program_start_date.sql
-- The day a program starts. A plan made of weeks then follows the calendar
-- from it (week 3 of 12), and a program a coach assigns starts on the day
-- chosen for the athlete.
--
-- Deploy: apply this file first, then the code. The app sends the new column,
-- and the server refuses columns it does not know.
--
-- Safe to re-run. All-or-nothing: wrapped in one transaction.

BEGIN;

ALTER TABLE programs ADD COLUMN IF NOT EXISTS start_date DATE;

COMMIT;

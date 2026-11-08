-- 022_workout_program_day.sql
-- Which day of its program a workout was started from. Until now the link
-- was only the workout's title, so renaming the workout or the program lost
-- the program's targets. NULL for free sessions and older workouts.
--
-- Deploy: apply this file first, then the code. The app sends this column
-- with every new workout, and the server refuses a column it does not know.

ALTER TABLE workouts ADD COLUMN IF NOT EXISTS program_day_index INT;

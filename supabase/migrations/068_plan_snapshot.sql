-- 068_plan_snapshot.sql
-- The plan is kept apart from what was done:
--   - workouts.planned_day: a copy of the program day as it was when the
--     session started, so editing the program later never rewrites what a
--     past session was planned to be (planned vs done stays readable);
--   - programs.revisions: the last versions of a program before each change
--     (name and days, at most 10), to see what changed and go back.
-- Both are JSON written by the app; older rows simply have none.
-- Safe to run again.

ALTER TABLE workouts ADD COLUMN IF NOT EXISTS planned_day JSONB;
ALTER TABLE programs ADD COLUMN IF NOT EXISTS revisions JSONB;

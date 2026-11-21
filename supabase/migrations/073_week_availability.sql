-- 073_week_availability.sql
-- The days and minutes the athlete can train in a given week
-- ({"monday": "YYYY-MM-DD", "days": [{"weekday": 1-7, "minutes": n}]}): the
-- assistant proposes to fit that week's planned sessions to it (moves, skips,
-- short versions), applied only when the athlete says so.
-- Safe to run again.

ALTER TABLE athlete_profiles ADD COLUMN IF NOT EXISTS week_availability JSONB;

-- 081_plan_b.sql
-- One's plan B (what to do on a day without time for the planned session)
-- follows the athlete from one device to another: kept with the profile, as
-- the favourite sport (074). A timed session, a mobility routine, an outing
-- or a program day ({"kind": ...}); {"kind": "none"} when chosen to have
-- none; NULL when never chosen on any device yet. The app checks the content;
-- here only its form and size.
-- Safe to run again.

ALTER TABLE athlete_profiles ADD COLUMN IF NOT EXISTS plan_b JSONB;
ALTER TABLE athlete_profiles DROP CONSTRAINT IF EXISTS athlete_profiles_plan_b_check;
ALTER TABLE athlete_profiles ADD CONSTRAINT athlete_profiles_plan_b_check
  CHECK (plan_b IS NULL OR (jsonb_typeof(plan_b) = 'object' AND char_length(plan_b::text) <= 1000)) NOT VALID;

-- 071_sport_fields.sql
-- Figures proper to each sport, typed in or read from a watch file (GPX, TCX):
--   - avg_cadence: steps a minute on foot, turns a minute on a bike;
--   - avg_power_w, max_power_w: watts from a power meter;
--   - swim_stroke, pool_length_m, strokes_per_length: a swim's stroke, its
--     pool (0 in open water) and strokes per length, for SWOLF;
--   - athlete_profiles.ftp_w: functional threshold power, for the power zones
--     and the estimated ride load.
-- Safe to run again.

ALTER TABLE workouts ADD COLUMN IF NOT EXISTS avg_cadence SMALLINT;
ALTER TABLE workouts ADD COLUMN IF NOT EXISTS avg_power_w SMALLINT;
ALTER TABLE workouts ADD COLUMN IF NOT EXISTS max_power_w SMALLINT;
ALTER TABLE workouts ADD COLUMN IF NOT EXISTS swim_stroke TEXT;
ALTER TABLE workouts ADD COLUMN IF NOT EXISTS pool_length_m SMALLINT;
ALTER TABLE workouts ADD COLUMN IF NOT EXISTS strokes_per_length SMALLINT;
ALTER TABLE athlete_profiles ADD COLUMN IF NOT EXISTS ftp_w SMALLINT;

ALTER TABLE workouts DROP CONSTRAINT IF EXISTS workouts_sport_fields_check;
ALTER TABLE workouts ADD CONSTRAINT workouts_sport_fields_check CHECK (
  (avg_cadence IS NULL OR avg_cadence BETWEEN 1 AND 260)
  AND (avg_power_w IS NULL OR avg_power_w BETWEEN 0 AND 2500)
  AND (max_power_w IS NULL OR max_power_w BETWEEN 0 AND 3000)
  AND (swim_stroke IS NULL OR swim_stroke IN ('free', 'breast', 'back', 'fly', 'mixed'))
  AND (pool_length_m IS NULL OR pool_length_m = 0 OR pool_length_m BETWEEN 10 AND 100)
  AND (strokes_per_length IS NULL OR strokes_per_length BETWEEN 1 AND 200)
);
ALTER TABLE athlete_profiles DROP CONSTRAINT IF EXISTS athlete_profiles_ftp_check;
ALTER TABLE athlete_profiles ADD CONSTRAINT athlete_profiles_ftp_check CHECK (ftp_w IS NULL OR ftp_w BETWEEN 30 AND 700);

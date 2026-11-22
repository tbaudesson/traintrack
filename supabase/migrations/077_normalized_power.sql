-- 077_normalized_power.sql
-- The normalized power of a ride, from a watch or bike-computer file (FIT or
-- TCX): the steady power its ups and downs cost. When known, the intensity
-- factor and the TSS use it instead of the average power.
-- Deploy: apply this file first, then the code.
-- Safe to run again.

ALTER TABLE workouts ADD COLUMN IF NOT EXISTS normalized_power_w INT;
ALTER TABLE workouts DROP CONSTRAINT IF EXISTS workouts_normalized_power_check;
ALTER TABLE workouts ADD CONSTRAINT workouts_normalized_power_check
  CHECK (normalized_power_w IS NULL OR normalized_power_w BETWEEN 0 AND 3000) NOT VALID;

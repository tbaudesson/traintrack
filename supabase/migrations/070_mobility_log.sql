-- 070_mobility_log.sql
-- Warm-ups and stretches are kept: a workout of kind 'mobility' (the kind is
-- free text, no constraint to change) with, in workouts.mobility, what was
-- done (mode, minutes, target, the moves' keys) and how supple one felt
-- afterwards (rating 1-5). They are followed on the mobility page and do not
-- count as training sessions nor in the training load.
-- Safe to run again.

ALTER TABLE workouts ADD COLUMN IF NOT EXISTS mobility JSONB;

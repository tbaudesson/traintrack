-- 069_session_feedback.sql
-- How a session felt, for every sport, and sessions called off:
--   - session_rpe: effort felt over the whole session, 1-10 (Foster's
--     session RPE); it weighs the session in the training load
--     (minutes x session RPE) instead of a default value by kind;
--   - feeling: how it went, 1 (badly) to 5 (great);
--   - cancelled_at: a session called off before anything was done, kept in
--     the history and counted nowhere.
-- Safe to run again.

ALTER TABLE workouts ADD COLUMN IF NOT EXISTS session_rpe SMALLINT;
ALTER TABLE workouts ADD COLUMN IF NOT EXISTS feeling SMALLINT;
ALTER TABLE workouts ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;
ALTER TABLE workouts DROP CONSTRAINT IF EXISTS workouts_session_rpe_check;
ALTER TABLE workouts ADD CONSTRAINT workouts_session_rpe_check CHECK (session_rpe IS NULL OR session_rpe BETWEEN 1 AND 10);
ALTER TABLE workouts DROP CONSTRAINT IF EXISTS workouts_feeling_check;
ALTER TABLE workouts ADD CONSTRAINT workouts_feeling_check CHECK (feeling IS NULL OR feeling BETWEEN 1 AND 5);

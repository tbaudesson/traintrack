-- 087_session_finish_and_intensity.sql
-- A session finished, and how hard it is made.
--   workouts.finished_at    when "Finish the session" was tapped: the session
--                           is then locked (nothing added, not finished twice)
--                           until the athlete reopens it
--   workouts.intensity_pct  the program's reps and holds made harder or easier
--                           for this session, in percent (-20 to +30 offered),
--                           offered again for the program's next session
-- And the beginner callisthenics plan (French, English, German): the Dead Bug
-- goes up with the weeks like the rest (10, 10, 12, 10, 12, 14, 16, 12) instead
-- of staying at 10. Programs already adopted keep their own copy.
-- The code sends both columns: apply this file first, then the code.
-- Plain quotes only; safe to run again. All-or-nothing: one transaction.

BEGIN;

ALTER TABLE workouts ADD COLUMN IF NOT EXISTS finished_at TIMESTAMPTZ;
ALTER TABLE workouts ADD COLUMN IF NOT EXISTS intensity_pct SMALLINT;
ALTER TABLE workouts DROP CONSTRAINT IF EXISTS workouts_intensity_pct_check;
ALTER TABLE workouts ADD CONSTRAINT workouts_intensity_pct_check
  CHECK (intensity_pct IS NULL OR intensity_pct BETWEEN -50 AND 100) NOT VALID;

UPDATE program_templates t
SET structure = (
  SELECT jsonb_agg(
    CASE
      WHEN d.day ? 'week' AND jsonb_typeof(d.day -> 'exercises') = 'array' AND jsonb_array_length(d.day -> 'exercises') > 0 THEN
        jsonb_set(d.day, '{exercises}', (
          SELECT jsonb_agg(
            CASE
              WHEN e.ex ->> 'exerciseName' = 'Dead Bug' AND (d.day ->> 'week')::int BETWEEN 1 AND 8 THEN
                jsonb_set(e.ex, '{targetReps}', to_jsonb((ARRAY['10', '10', '12', '10', '12', '14', '16', '12'])[(d.day ->> 'week')::int]))
              ELSE e.ex
            END
            ORDER BY e.i
          )
          FROM jsonb_array_elements(d.day -> 'exercises') WITH ORDINALITY AS e(ex, i)
        ))
      ELSE d.day
    END
    ORDER BY d.j
  )
  FROM jsonb_array_elements(t.structure) WITH ORDINALITY AS d(day, j)
)
WHERE t.level = 'beginner'
  AND t.name IN ('Callisthenics : débuter en 8 semaines', 'Callisthenics: get started in 8 weeks', 'Calisthenics: Einstieg in 8 Wochen')
  AND jsonb_typeof(t.structure) = 'array'
  AND jsonb_array_length(t.structure) > 0;

COMMIT;

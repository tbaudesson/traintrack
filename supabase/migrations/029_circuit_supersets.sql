-- 029_circuit_supersets.sql
-- The circuit days of the ready-made programs become supersets: each exercise
-- leads straight into the next, and the rest only comes after the last one.
-- "Lean & Strong" (both days) and "4-Day Cut" (its two circuit days), in the
-- three languages.
--
-- Only the "supersetWithNext" flag is added, on the days named below: anything
-- an admin changed in these programs is kept. Programs athletes already added
-- are their own copies and stay as they are.
--
-- Safe to re-run. All-or-nothing: wrapped in one transaction.

BEGIN;

WITH circuits(name, locale, days) AS (VALUES
  ('Lean & Strong',     'en', ARRAY['Circuit A', 'Circuit B']),
  ('Sec et fort',       'fr', ARRAY['Circuit A', 'Circuit B']),
  ('Schlank & stark',   'de', ARRAY['Zirkel A', 'Zirkel B']),
  ('4-Day Cut',         'en', ARRAY['Upper circuit', 'Lower circuit']),
  ('Sèche 4 jours',     'fr', ARRAY['Circuit haut', 'Circuit bas']),
  ('Definition 4 Tage', 'de', ARRAY['Oberkörper-Zirkel', 'Unterkörper-Zirkel'])
)
UPDATE program_templates t
SET structure = (
  SELECT jsonb_agg(
    CASE WHEN day->>'name' = ANY (c.days) AND jsonb_typeof(day->'exercises') = 'array' THEN
      jsonb_set(day, '{exercises}', COALESCE((
        SELECT jsonb_agg(
          CASE WHEN e.pos < jsonb_array_length(day->'exercises')
            THEN e.exercise || '{"supersetWithNext": true}'::jsonb
            ELSE e.exercise - 'supersetWithNext'
          END ORDER BY e.pos)
        FROM jsonb_array_elements(day->'exercises') WITH ORDINALITY AS e(exercise, pos)
      ), '[]'::jsonb))
    ELSE day END
    ORDER BY d.pos)
  FROM jsonb_array_elements(t.structure) WITH ORDINALITY AS d(day, pos)
)
FROM circuits c
WHERE t.name = c.name AND t.locale = c.locale AND jsonb_array_length(t.structure) > 0;

COMMIT;

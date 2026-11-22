-- 075_goals.sql
-- Goals of every kind, each one a row the athlete owns and the coach can read:
--   strength  an estimated one-rep max on an exercise (kg)
--   time      a time on a distance in a sport, e.g. 10 km under 50 min (seconds)
--   distance  a distance covered in a sport from the goal's start (metres)
--   frequency sessions a week, all of them or of one kind (sessions)
--   weight    a body weight (kg)
-- scope is the sport (time, distance) or what is counted (frequency: 'all',
-- 'strength', 'mobility' or a sport). priority 1 is the main goal, shown on the
-- home screen; 2 the others. Progress is computed from the sessions, never
-- stored.
-- The strength goals kept on the profile until now (031) are copied over, with
-- a stable id: running this again copies nothing twice. The profile column is
-- left as it was.
-- Deploy: apply this file first, then the code.
-- Safe to run again. All-or-nothing: one transaction.

BEGIN;

CREATE TABLE IF NOT EXISTS goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  scope TEXT,
  exercise_uuid UUID,
  exercise_name TEXT,
  distance_m NUMERIC,
  target_value NUMERIC NOT NULL,
  start_value NUMERIC,
  deadline DATE,
  priority SMALLINT NOT NULL DEFAULT 2,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT goals_check CHECK (
    type IN ('strength', 'time', 'distance', 'frequency', 'weight')
    AND (scope IS NULL OR char_length(scope) BETWEEN 1 AND 40)
    AND (exercise_name IS NULL OR char_length(exercise_name) BETWEEN 1 AND 120)
    AND (distance_m IS NULL OR (distance_m > 0 AND distance_m <= 1000000))
    AND target_value > 0 AND target_value <= 10000000
    AND (start_value IS NULL OR (start_value >= 0 AND start_value <= 10000000))
    AND priority BETWEEN 1 AND 3
    AND (type <> 'strength' OR exercise_name IS NOT NULL)
    AND (type <> 'time' OR (scope IS NOT NULL AND distance_m IS NOT NULL))
    AND (type <> 'distance' OR scope IS NOT NULL)
  )
);
CREATE INDEX IF NOT EXISTS idx_goals_user ON goals(user_id, updated_at);

DROP TRIGGER IF EXISTS trg_goals_updated ON goals;
CREATE TRIGGER trg_goals_updated BEFORE UPDATE ON goals FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE goals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "goals_own_all" ON goals;
CREATE POLICY "goals_own_all" ON goals
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "goals_trainer_read" ON goals;
CREATE POLICY "goals_trainer_read" ON goals FOR SELECT USING (is_my_client(user_id));

-- Like every table a member's app reads or writes: active accounts only.
DROP POLICY IF EXISTS "active_account_only" ON goals;
CREATE POLICY "active_account_only" ON goals AS RESTRICTIVE FOR ALL TO authenticated
  USING ((SELECT is_active_account())) WITH CHECK ((SELECT is_active_account()));

-- The strength goals of the profiles, copied once.
INSERT INTO goals (id, user_id, type, exercise_uuid, exercise_name, target_value, start_value, deadline, priority, created_at, updated_at)
SELECT
  md5(p.user_id::text || ':' || (g->>'id'))::uuid,
  p.user_id,
  'strength',
  CASE WHEN (g->>'exerciseUuid') ~ '^[0-9a-fA-F-]{36}$' THEN (g->>'exerciseUuid')::uuid END,
  left(g->>'exerciseName', 120),
  CASE WHEN (g->>'targetKg') ~ '^[0-9]+(\.[0-9]+)?$' THEN (g->>'targetKg')::numeric END,
  CASE WHEN (g->>'startKg') ~ '^[0-9]+(\.[0-9]+)?$' THEN (g->>'startKg')::numeric ELSE 0 END,
  CASE WHEN (g->>'deadline') ~ '^\d{4}-\d{2}-\d{2}$' THEN (g->>'deadline')::date END,
  2,
  CASE WHEN (g->>'createdAt') ~ '^\d{4}-\d{2}-\d{2}T' THEN (g->>'createdAt')::timestamptz ELSE now() END,
  now()
FROM athlete_profiles p
CROSS JOIN LATERAL jsonb_array_elements(p.strength_goals) AS g
WHERE p.user_id IS NOT NULL
  AND p.deleted_at IS NULL
  AND jsonb_typeof(p.strength_goals) = 'array'
  AND g ? 'id'
  AND char_length(COALESCE(g->>'exerciseName', '')) > 0
  AND (CASE WHEN (g->>'targetKg') ~ '^[0-9]+(\.[0-9]+)?$' THEN (g->>'targetKg')::numeric ELSE 0 END) > 0
ON CONFLICT (id) DO NOTHING;

COMMIT;

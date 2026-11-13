-- 028_warmups_supersets.sql
-- Warm-up sets and supersets in a session.
--   is_warmup       a ramp-up set before the working sets. It never counts:
--                   not in volume, records, last performance or challenges.
--   superset_group  exercises of a session sharing this number are done in a
--                   row; the rest only starts after the last one.
--
-- Deploy: apply this file first, then the code. The app sends the new
-- columns, and the server refuses columns it does not know.
--
-- Safe to re-run. All-or-nothing: wrapped in one transaction.

BEGIN;

ALTER TABLE workout_sets ADD COLUMN IF NOT EXISTS is_warmup BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE workout_sets ADD COLUMN IF NOT EXISTS superset_group SMALLINT;

-- Challenge volume: same as 014, without the warm-up sets.
CREATE OR REPLACE FUNCTION get_challenge_leaderboard(p_challenge_id UUID)
RETURNS TABLE (user_id UUID, display_name TEXT, score NUMERIC)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_group UUID; v_type TEXT; v_start DATE; v_end DATE;
BEGIN
  SELECT c.group_id, c.type, c.start_date, c.end_date
    INTO v_group, v_type, v_start, v_end
  FROM challenges c WHERE c.id = p_challenge_id AND c.deleted_at IS NULL;

  IF v_group IS NULL THEN RETURN; END IF;
  IF NOT is_group_member(v_group) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN QUERY
  WITH members AS (
    -- active clients of the team + the team owner
    SELECT gm.user_id FROM group_members gm
      WHERE gm.group_id = v_group AND gm.status = 'active'
        AND gm.deleted_at IS NULL AND gm.user_id IS NOT NULL
    UNION
    SELECT g.user_id FROM groups g WHERE g.id = v_group
  ),
  scored AS (
    SELECT m.user_id,
      CASE
        WHEN v_type = 'volume' THEN COALESCE((
          SELECT SUM(ws.weight_kg * ws.reps)
          FROM workouts w
          JOIN workout_sets ws ON ws.workout_id = w.id AND ws.completed = TRUE AND NOT ws.is_warmup AND ws.deleted_at IS NULL
          WHERE w.user_id = m.user_id AND w.deleted_at IS NULL
            AND w.date BETWEEN v_start AND v_end
        ), 0)
        WHEN v_type = 'sessions' THEN COALESCE((
          SELECT COUNT(*) FROM workouts w
          WHERE w.user_id = m.user_id AND w.deleted_at IS NULL
            AND w.date BETWEEN v_start AND v_end
        ), 0)
        ELSE COALESCE((  -- consistency: distinct training days
          SELECT COUNT(DISTINCT w.date) FROM workouts w
          WHERE w.user_id = m.user_id AND w.deleted_at IS NULL
            AND w.date BETWEEN v_start AND v_end
        ), 0)
      END AS score
    FROM members m
  )
  SELECT s.user_id,
         COALESCE(p.display_name, 'Athlete') AS display_name,
         s.score
  FROM scored s
  LEFT JOIN profiles p ON p.user_id = s.user_id
  ORDER BY s.score DESC, display_name ASC;
END;
$$;

COMMIT;

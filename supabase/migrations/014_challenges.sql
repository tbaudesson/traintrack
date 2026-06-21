-- 014_challenges.sql — trainer-created team challenges with computed leaderboards.

CREATE TABLE IF NOT EXISTS challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'volume',   -- 'volume' | 'sessions' | 'consistency'
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_challenges_group ON challenges(group_id);

ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;
-- All access goes through the SECURITY DEFINER RPCs below; no direct policies.

-- True when the caller is an active member (any role) of the group.
CREATE OR REPLACE FUNCTION is_group_member(p_group_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM groups g WHERE g.id = p_group_id AND g.user_id = auth.uid() AND g.deleted_at IS NULL
  ) OR EXISTS (
    SELECT 1 FROM group_members gm
    WHERE gm.group_id = p_group_id AND gm.user_id = auth.uid()
      AND gm.status = 'active' AND gm.deleted_at IS NULL
  );
$$;

-- ─── Create / delete (owner or manager only) ─────────────────────────
CREATE OR REPLACE FUNCTION create_challenge(
  p_group_id UUID, p_name TEXT, p_type TEXT, p_start DATE, p_end DATE
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id UUID;
BEGIN
  IF NOT is_group_owner_or_manager(p_group_id) THEN
    RAISE EXCEPTION 'Unauthorized: not the team trainer';
  END IF;
  IF p_type NOT IN ('volume', 'sessions', 'consistency') THEN
    RAISE EXCEPTION 'Invalid challenge type';
  END IF;
  INSERT INTO challenges (group_id, created_by, name, type, start_date, end_date)
  VALUES (p_group_id, auth.uid(), p_name, p_type, p_start, p_end)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION delete_challenge(p_challenge_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_group UUID;
BEGIN
  SELECT group_id INTO v_group FROM challenges WHERE id = p_challenge_id;
  IF v_group IS NULL THEN RETURN; END IF;
  IF NOT is_group_owner_or_manager(v_group) THEN
    RAISE EXCEPTION 'Unauthorized: not the team trainer';
  END IF;
  UPDATE challenges SET deleted_at = now() WHERE id = p_challenge_id;
END;
$$;

-- ─── Read: challenges for the current user across their teams ─────────
CREATE OR REPLACE FUNCTION get_my_challenges()
RETURNS TABLE (
  id UUID, group_id UUID, group_name TEXT, name TEXT, type TEXT,
  start_date DATE, end_date DATE, is_owner BOOLEAN
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT c.id, c.group_id, g.name, c.name, c.type, c.start_date, c.end_date,
         is_group_owner_or_manager(c.group_id) AS is_owner
  FROM challenges c
  JOIN groups g ON g.id = c.group_id AND g.deleted_at IS NULL
  WHERE c.deleted_at IS NULL
    AND is_group_member(c.group_id)
  ORDER BY c.end_date DESC, c.created_at DESC;
$$;

-- ─── Leaderboard: compute each member's score within the window ──────
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
          JOIN workout_sets ws ON ws.workout_id = w.id AND ws.completed = TRUE AND ws.deleted_at IS NULL
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

GRANT EXECUTE ON FUNCTION is_group_member(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION create_challenge(UUID, TEXT, TEXT, DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_challenge(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_my_challenges() TO authenticated;
GRANT EXECUTE ON FUNCTION get_challenge_leaderboard(UUID) TO authenticated;

-- Extend GDPR delete to cover challenges the user created.
CREATE OR REPLACE FUNCTION delete_my_account()
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  DELETE FROM challenges WHERE created_by = v_user_id;
  DELETE FROM hydration_logs WHERE user_id = v_user_id;
  DELETE FROM nutrition_entries WHERE user_id = v_user_id;
  DELETE FROM readiness_checkins WHERE user_id = v_user_id;
  DELETE FROM workout_sets WHERE user_id = v_user_id;
  DELETE FROM workouts WHERE user_id = v_user_id;
  DELETE FROM body_metrics WHERE user_id = v_user_id;
  DELETE FROM programs WHERE user_id = v_user_id;
  DELETE FROM exercises WHERE user_id = v_user_id;
  DELETE FROM athlete_profiles WHERE user_id = v_user_id;

  DELETE FROM group_members WHERE user_id = v_user_id;
  DELETE FROM group_notifications WHERE user_id = v_user_id;
  DELETE FROM groups WHERE user_id = v_user_id;

  DELETE FROM invitations WHERE invited_by = v_user_id;
  DELETE FROM profiles WHERE user_id = v_user_id;

  DELETE FROM auth.users WHERE id = v_user_id;
END;
$$;

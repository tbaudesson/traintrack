-- 016_push_subscriptions.sql — Web Push subscriptions for compliance alerts.

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_push_user ON push_subscriptions(user_id);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "push_own_all" ON push_subscriptions
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Clients of the caller (a trainer) who have skipped training for >= p_days
-- days, for compliance alerts. Returns the client + their last workout date.
CREATE OR REPLACE FUNCTION get_inactive_clients(p_days INT DEFAULT 3)
RETURNS TABLE (user_id UUID, display_name TEXT, last_workout DATE, days_since INT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH clients AS (
    SELECT DISTINCT gm.user_id
    FROM groups g
    JOIN group_members gm ON gm.group_id = g.id
    WHERE g.deleted_at IS NULL AND gm.deleted_at IS NULL
      AND gm.status = 'active' AND gm.user_id IS NOT NULL
      AND (
        g.user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM group_members mgr
          WHERE mgr.group_id = g.id AND mgr.user_id = auth.uid()
            AND mgr.role = 'manager' AND mgr.status = 'active' AND mgr.deleted_at IS NULL
        )
      )
  )
  SELECT c.user_id,
         COALESCE(p.display_name, 'Athlete') AS display_name,
         lw.last_workout,
         (CURRENT_DATE - lw.last_workout) AS days_since
  FROM clients c
  LEFT JOIN profiles p ON p.user_id = c.user_id
  LEFT JOIN LATERAL (
    SELECT MAX(w.date) AS last_workout
    FROM workouts w
    WHERE w.user_id = c.user_id AND w.deleted_at IS NULL
  ) lw ON TRUE
  WHERE lw.last_workout IS NULL OR (CURRENT_DATE - lw.last_workout) >= p_days;
$$;
GRANT EXECUTE ON FUNCTION get_inactive_clients(INT) TO authenticated;

-- All compliance alerts across every team (for the scheduled Edge Function).
-- service_role only — never exposed to clients.
CREATE OR REPLACE FUNCTION get_all_compliance_alerts(p_days INT DEFAULT 3)
RETURNS TABLE (trainer_id UUID, client_name TEXT, days_since INT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH team_trainers AS (
    SELECT g.id AS group_id, g.user_id AS trainer_id
    FROM groups g WHERE g.deleted_at IS NULL
    UNION
    SELECT gm.group_id, gm.user_id
    FROM group_members gm
    WHERE gm.role = 'manager' AND gm.status = 'active' AND gm.deleted_at IS NULL
  ),
  team_clients AS (
    SELECT gm.group_id, gm.user_id
    FROM group_members gm
    WHERE gm.status = 'active' AND gm.deleted_at IS NULL AND gm.user_id IS NOT NULL
  ),
  client_activity AS (
    SELECT tc.group_id, tc.user_id,
      (SELECT MAX(w.date) FROM workouts w WHERE w.user_id = tc.user_id AND w.deleted_at IS NULL) AS last_workout
    FROM team_clients tc
  )
  SELECT tt.trainer_id,
         COALESCE(p.display_name, 'Athlete') AS client_name,
         CASE WHEN ca.last_workout IS NULL THEN 9999 ELSE (CURRENT_DATE - ca.last_workout) END AS days_since
  FROM client_activity ca
  JOIN team_trainers tt ON tt.group_id = ca.group_id AND tt.trainer_id <> ca.user_id
  LEFT JOIN profiles p ON p.user_id = ca.user_id
  WHERE ca.last_workout IS NULL OR (CURRENT_DATE - ca.last_workout) >= p_days;
$$;
REVOKE ALL ON FUNCTION get_all_compliance_alerts(INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_all_compliance_alerts(INT) TO service_role;

-- Extend GDPR delete to remove push subscriptions.
CREATE OR REPLACE FUNCTION delete_my_account()
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  DELETE FROM push_subscriptions WHERE user_id = v_user_id;
  DELETE FROM messages WHERE user_id = v_user_id OR recipient_id = v_user_id;
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

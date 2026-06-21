-- 017_health_metrics.sql — wearable / health data: daily metrics + workout HR.

-- Heart-rate captured during a session (Web Bluetooth).
ALTER TABLE workouts ADD COLUMN IF NOT EXISTS avg_hr NUMERIC;
ALTER TABLE workouts ADD COLUMN IF NOT EXISTS max_hr NUMERIC;

CREATE TABLE IF NOT EXISTS health_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  steps NUMERIC,
  resting_hr NUMERIC,
  hrv NUMERIC,
  sleep_hours NUMERIC,
  vo2max NUMERIC,
  source TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_health_user ON health_metrics(user_id, updated_at);

DROP TRIGGER IF EXISTS trg_health_metrics_updated ON health_metrics;
CREATE TRIGGER trg_health_metrics_updated BEFORE UPDATE ON health_metrics
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE health_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "hm_own_all" ON health_metrics
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "hm_trainer_read" ON health_metrics
  FOR SELECT USING (is_my_client(user_id));

-- Extend GDPR delete to cover health metrics.
CREATE OR REPLACE FUNCTION delete_my_account()
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  DELETE FROM health_metrics WHERE user_id = v_user_id;
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

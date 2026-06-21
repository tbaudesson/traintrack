-- 015_messaging.sql — direct messages between a trainer and their clients.
-- Sender is user_id (matches the sync engine convention); recipient_id is the
-- other party. Offline-first: rows are pushed/pulled via the sync engine.

CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,       -- sender
  recipient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(user_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_messages_recipient ON messages(recipient_id, updated_at);

DROP TRIGGER IF EXISTS trg_messages_updated ON messages;
CREATE TRIGGER trg_messages_updated BEFORE UPDATE ON messages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- True when the caller may message p_other (a coaching relationship exists
-- in either direction).
CREATE OR REPLACE FUNCTION can_message(p_other UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p_other <> auth.uid() AND (
    is_my_client(p_other)
    OR EXISTS (
      SELECT 1 FROM group_members gm
      JOIN groups g ON g.id = gm.group_id AND g.deleted_at IS NULL
      WHERE gm.user_id = auth.uid() AND gm.status = 'active' AND gm.deleted_at IS NULL
        AND (
          g.user_id = p_other
          OR EXISTS (
            SELECT 1 FROM group_members mgr
            WHERE mgr.group_id = g.id AND mgr.user_id = p_other
              AND mgr.role = 'manager' AND mgr.status = 'active' AND mgr.deleted_at IS NULL
          )
        )
    )
  );
$$;
GRANT EXECUTE ON FUNCTION can_message(UUID) TO authenticated;

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "msg_sender_all" ON messages
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id AND can_message(recipient_id));
CREATE POLICY "msg_recipient_read" ON messages
  FOR SELECT USING (auth.uid() = recipient_id);

-- People the current user can message (clients they coach + their trainers).
CREATE OR REPLACE FUNCTION get_messageable_users()
RETURNS TABLE (user_id UUID, display_name TEXT, relation TEXT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  -- Clients I coach (teams I own or manage)
  SELECT DISTINCT gm.user_id,
         COALESCE(p.display_name, gm.invited_email) AS display_name,
         'client' AS relation
  FROM groups g
  JOIN group_members gm ON gm.group_id = g.id
  LEFT JOIN profiles p ON p.user_id = gm.user_id
  WHERE g.deleted_at IS NULL AND gm.deleted_at IS NULL
    AND gm.status = 'active' AND gm.user_id IS NOT NULL AND gm.user_id <> auth.uid()
    AND (
      g.user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM group_members mgr
        WHERE mgr.group_id = g.id AND mgr.user_id = auth.uid()
          AND mgr.role = 'manager' AND mgr.status = 'active' AND mgr.deleted_at IS NULL
      )
    )

  UNION

  -- Trainers who coach me (owners + managers of teams I'm active in)
  SELECT DISTINCT t.user_id,
         COALESCE(p.display_name, 'Trainer') AS display_name,
         'trainer' AS relation
  FROM group_members me
  JOIN groups g ON g.id = me.group_id AND g.deleted_at IS NULL
  JOIN LATERAL (
    SELECT g.user_id AS user_id
    UNION
    SELECT mgr.user_id FROM group_members mgr
      WHERE mgr.group_id = g.id AND mgr.role = 'manager'
        AND mgr.status = 'active' AND mgr.deleted_at IS NULL
  ) t ON t.user_id <> auth.uid()
  LEFT JOIN profiles p ON p.user_id = t.user_id
  WHERE me.user_id = auth.uid() AND me.status = 'active' AND me.deleted_at IS NULL;
$$;
GRANT EXECUTE ON FUNCTION get_messageable_users() TO authenticated;

-- Mark all messages from p_other to me as read (recipient can't UPDATE via RLS).
CREATE OR REPLACE FUNCTION mark_messages_read(p_other UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE messages
     SET read_at = now()
   WHERE recipient_id = auth.uid() AND user_id = p_other AND read_at IS NULL;
END;
$$;
GRANT EXECUTE ON FUNCTION mark_messages_read(UUID) TO authenticated;

-- Extend GDPR delete to remove the user's messages (sent and received).
CREATE OR REPLACE FUNCTION delete_my_account()
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

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

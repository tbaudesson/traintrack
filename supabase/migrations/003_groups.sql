-- ============================================================
-- 003_groups.sql — coaching teams (owner = trainer, members = clients)
-- ============================================================

CREATE TABLE IF NOT EXISTS groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, -- owner / trainer
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- null until claimed
  invited_email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'manager')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active')),
  invited_at TIMESTAMPTZ DEFAULT now(),
  joined_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_group_members_group ON group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user ON group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_group_members_email ON group_members(lower(invited_email));

CREATE TABLE IF NOT EXISTS group_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, -- recipient
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  params JSONB,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_group_notifications_user ON group_notifications(user_id, read);

ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_notifications ENABLE ROW LEVEL SECURITY;

-- RLS: access is mediated through SECURITY DEFINER RPCs below. Provide
-- minimal direct policies so the owner/members can read their own rows.
CREATE POLICY "groups_owner_all" ON groups
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "groups_member_read" ON groups
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM group_members gm
            WHERE gm.group_id = groups.id AND gm.user_id = auth.uid()
              AND gm.status = 'active' AND gm.deleted_at IS NULL)
  );
CREATE POLICY "gm_self_read" ON group_members
  FOR SELECT USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM groups g WHERE g.id = group_members.group_id AND g.user_id = auth.uid())
  );
CREATE POLICY "gn_self_all" ON group_notifications
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ─── Helpers ─────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION is_group_owner_or_manager(p_group_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM groups WHERE id = p_group_id AND user_id = auth.uid())
      OR EXISTS (SELECT 1 FROM group_members
                 WHERE group_id = p_group_id AND user_id = auth.uid()
                   AND role = 'manager' AND status = 'active' AND deleted_at IS NULL);
$$;

-- ─── Group CRUD ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION create_group(p_name TEXT, p_description TEXT DEFAULT NULL)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id UUID;
BEGIN
  INSERT INTO groups (user_id, name, description)
  VALUES (auth.uid(), p_name, p_description) RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION update_group(p_group_id UUID, p_name TEXT, p_description TEXT DEFAULT NULL)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM groups WHERE id = p_group_id AND user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Only the owner can update the team';
  END IF;
  UPDATE groups SET name = p_name, description = p_description, updated_at = now()
  WHERE id = p_group_id;
END;
$$;

CREATE OR REPLACE FUNCTION delete_group(p_group_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM groups WHERE id = p_group_id AND user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Only the owner can delete the team';
  END IF;
  UPDATE groups SET deleted_at = now() WHERE id = p_group_id;
END;
$$;

CREATE OR REPLACE FUNCTION get_my_groups()
RETURNS TABLE (id UUID, name TEXT, description TEXT, member_count BIGINT, created_at TIMESTAMPTZ)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT g.id, g.name, g.description,
         (SELECT count(*) FROM group_members gm
          WHERE gm.group_id = g.id AND gm.status = 'active' AND gm.deleted_at IS NULL) AS member_count,
         g.created_at
  FROM groups g
  WHERE g.user_id = auth.uid() AND g.deleted_at IS NULL
  ORDER BY g.created_at DESC;
$$;

-- ─── Members & invitations ───────────────────────────────────
CREATE OR REPLACE FUNCTION invite_group_member(p_group_id UUID, p_email TEXT)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id UUID; v_uid UUID;
BEGIN
  IF NOT is_group_owner_or_manager(p_group_id) THEN
    RAISE EXCEPTION 'Only the trainer can invite members';
  END IF;
  IF EXISTS (SELECT 1 FROM group_members
             WHERE group_id = p_group_id AND lower(invited_email) = lower(p_email)
               AND deleted_at IS NULL) THEN
    RAISE EXCEPTION 'This email is already invited';
  END IF;
  -- Resolve to an existing user if present
  SELECT id INTO v_uid FROM auth.users WHERE lower(email) = lower(p_email);
  INSERT INTO group_members (group_id, user_id, invited_email, role, status, joined_at)
  VALUES (p_group_id, v_uid, lower(p_email), 'member',
          CASE WHEN v_uid IS NOT NULL THEN 'active' ELSE 'pending' END,
          CASE WHEN v_uid IS NOT NULL THEN now() ELSE NULL END)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION get_group_members(p_group_id UUID)
RETURNS TABLE (
  id UUID, user_id UUID, role TEXT, status TEXT, invited_email TEXT,
  display_name TEXT, invited_at TIMESTAMPTZ, joined_at TIMESTAMPTZ
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT is_group_owner_or_manager(p_group_id) THEN
    RAISE EXCEPTION 'Unauthorized: not the team trainer';
  END IF;
  RETURN QUERY
  SELECT gm.id, gm.user_id, gm.role, gm.status, gm.invited_email,
         COALESCE(p.display_name, gm.invited_email) AS display_name,
         gm.invited_at, gm.joined_at
  FROM group_members gm
  LEFT JOIN profiles p ON p.user_id = gm.user_id
  WHERE gm.group_id = p_group_id AND gm.deleted_at IS NULL
  ORDER BY gm.invited_at;
END;
$$;

CREATE OR REPLACE FUNCTION remove_group_member(p_member_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_group UUID;
BEGIN
  SELECT group_id INTO v_group FROM group_members WHERE id = p_member_id;
  IF v_group IS NULL OR NOT is_group_owner_or_manager(v_group) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  UPDATE group_members SET deleted_at = now() WHERE id = p_member_id;
END;
$$;

CREATE OR REPLACE FUNCTION respond_to_invitation(p_member_id UUID, p_accept BOOLEAN)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM group_members WHERE id = p_member_id AND user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Not your invitation';
  END IF;
  IF p_accept THEN
    UPDATE group_members SET status = 'active', joined_at = now() WHERE id = p_member_id;
  ELSE
    UPDATE group_members SET deleted_at = now() WHERE id = p_member_id;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION get_my_memberships()
RETURNS TABLE (
  member_id UUID, group_id UUID, group_name TEXT, owner_name TEXT,
  role TEXT, status TEXT, member_count BIGINT
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT gm.id, g.id, g.name,
         COALESCE(p.display_name, p.email) AS owner_name,
         gm.role, gm.status,
         (SELECT count(*) FROM group_members x
          WHERE x.group_id = g.id AND x.status = 'active' AND x.deleted_at IS NULL) AS member_count
  FROM group_members gm
  JOIN groups g ON g.id = gm.group_id AND g.deleted_at IS NULL
  LEFT JOIN profiles p ON p.user_id = g.user_id
  WHERE gm.user_id = auth.uid() AND gm.deleted_at IS NULL
  ORDER BY gm.invited_at DESC;
$$;

CREATE OR REPLACE FUNCTION claim_pending_invitations()
RETURNS INT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_email TEXT; v_count INT;
BEGIN
  SELECT email INTO v_email FROM auth.users WHERE id = auth.uid();
  IF v_email IS NULL THEN RETURN 0; END IF;
  UPDATE group_members
  SET user_id = auth.uid(), status = 'active', joined_at = COALESCE(joined_at, now())
  WHERE lower(invited_email) = lower(v_email)
    AND user_id IS NULL AND deleted_at IS NULL;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN COALESCE(v_count, 0);
END;
$$;

CREATE OR REPLACE FUNCTION change_member_role(p_member_id UUID, p_role TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_group UUID;
BEGIN
  IF p_role NOT IN ('member','manager') THEN RAISE EXCEPTION 'Invalid role'; END IF;
  SELECT group_id INTO v_group FROM group_members WHERE id = p_member_id;
  -- Only the team owner may change roles
  IF v_group IS NULL OR NOT EXISTS (SELECT 1 FROM groups WHERE id = v_group AND user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Only the owner can change roles';
  END IF;
  UPDATE group_members SET role = p_role WHERE id = p_member_id;
END;
$$;

-- ─── Notifications ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_group_notifications()
RETURNS TABLE (
  id UUID, group_id UUID, group_name TEXT, type TEXT, title TEXT,
  params JSONB, read BOOLEAN, created_at TIMESTAMPTZ
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT n.id, n.group_id, g.name, n.type, n.title, n.params, n.read, n.created_at
  FROM group_notifications n
  JOIN groups g ON g.id = n.group_id
  WHERE n.user_id = auth.uid()
  ORDER BY n.created_at DESC
  LIMIT 100;
$$;

CREATE OR REPLACE FUNCTION mark_group_notification_read(p_notification_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE group_notifications SET read = true
  WHERE id = p_notification_id AND user_id = auth.uid();
END;
$$;

CREATE OR REPLACE FUNCTION mark_all_group_notifications_read()
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE group_notifications SET read = true WHERE user_id = auth.uid() AND read = false;
END;
$$;

-- ============================================================
-- 001_initial_schema.sql — TrainTrack core fitness domain
-- ============================================================

-- Shared updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ─── athlete_profiles ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS athlete_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  goals JSONB DEFAULT '[]'::jsonb,
  fitness_level TEXT,
  injuries TEXT,
  sex TEXT,
  height_cm NUMERIC,
  birth_date DATE,
  equipment JSONB DEFAULT '[]'::jsonb,
  consent_health_data BOOLEAN DEFAULT false,
  consent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- ─── exercises (library + custom) ────────────────────────────
-- user_id NULL = global seeded library row, readable by everyone.
CREATE TABLE IF NOT EXISTS exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  muscle_group TEXT,
  equipment TEXT,
  is_custom BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- ─── programs ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  owner_user_id UUID,
  assigned_to_user_id UUID,
  group_id UUID,
  name TEXT NOT NULL,
  description TEXT,
  structure JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- ─── workouts ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS workouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  program_id UUID,
  date DATE NOT NULL,
  title TEXT,
  notes TEXT,
  duration_min NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- ─── workout_sets ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS workout_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workout_id UUID,
  exercise_id UUID,
  set_number INT,
  reps INT,
  weight_kg NUMERIC,
  rpe NUMERIC,
  rest_sec INT,
  completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- ─── body_metrics ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS body_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  weight_kg NUMERIC,
  body_fat_pct NUMERIC,
  measurements JSONB,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- ─── Indexes (delta-sync cursor) ─────────────────────────────
CREATE INDEX IF NOT EXISTS idx_athlete_profiles_user ON athlete_profiles(user_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_exercises_user ON exercises(user_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_programs_user ON programs(user_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_programs_assigned ON programs(assigned_to_user_id);
CREATE INDEX IF NOT EXISTS idx_workouts_user ON workouts(user_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_workout_sets_user ON workout_sets(user_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_body_metrics_user ON body_metrics(user_id, updated_at);

-- ─── updated_at triggers ─────────────────────────────────────
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['athlete_profiles','exercises','programs','workouts','workout_sets','body_metrics']
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%s_updated ON %s', t, t);
    EXECUTE format('CREATE TRIGGER trg_%s_updated BEFORE UPDATE ON %s FOR EACH ROW EXECUTE FUNCTION update_updated_at()', t, t);
  END LOOP;
END $$;

-- ─── Enable RLS ──────────────────────────────────────────────
ALTER TABLE athlete_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE body_metrics ENABLE ROW LEVEL SECURITY;

-- ─── Own-data RLS (trainer SELECT policies added in 004) ──────
-- athlete_profiles
CREATE POLICY "ap_own_all" ON athlete_profiles
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- exercises: read globals (user_id NULL) + own; write only own customs
CREATE POLICY "ex_read" ON exercises
  FOR SELECT USING (user_id IS NULL OR auth.uid() = user_id);
CREATE POLICY "ex_insert_own" ON exercises
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "ex_update_own" ON exercises
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "ex_delete_own" ON exercises
  FOR DELETE USING (auth.uid() = user_id);

-- programs: own + programs assigned to the caller (read)
CREATE POLICY "pr_own_all" ON programs
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "pr_assigned_read" ON programs
  FOR SELECT USING (auth.uid() = assigned_to_user_id);

-- workouts / workout_sets / body_metrics: own-data (trainer read in 004)
CREATE POLICY "wo_own_all" ON workouts
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "ws_own_all" ON workout_sets
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "bm_own_all" ON body_metrics
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
-- ============================================================
-- 002_profiles_admin.sql — user profiles + platform admin
-- Open signup: new users are 'active' immediately (no invite gate).
-- ============================================================

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  email TEXT,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('pending', 'active', 'deactivated')),
  invited_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "profiles_select_admin" ON profiles
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.role = 'admin')
  );

CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Invitations (admin-managed; not required for signup)
CREATE TABLE IF NOT EXISTS invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  invited_by UUID NOT NULL REFERENCES auth.users(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'revoked')),
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_invitations_email_pending
  ON invitations(email) WHERE status = 'pending';
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "invitations_admin_all" ON invitations
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.role = 'admin')
  );

-- Auto-create an active profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO profiles (user_id, email, display_name, status)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    'active'
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Safe admin check (no RLS recursion)
CREATE OR REPLACE FUNCTION is_app_admin()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION check_invitation(p_email TEXT)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM invitations WHERE email = p_email AND status = 'pending');
END;
$$;

CREATE OR REPLACE FUNCTION get_user_profile()
RETURNS TABLE (
  id UUID, user_id UUID, display_name TEXT, email TEXT,
  role TEXT, status TEXT, created_at TIMESTAMPTZ
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY
  SELECT p.id, p.user_id, p.display_name, p.email, p.role, p.status, p.created_at
  FROM profiles p WHERE p.user_id = auth.uid();
END;
$$;

CREATE OR REPLACE FUNCTION admin_list_users()
RETURNS TABLE (
  id UUID, user_id UUID, display_name TEXT, email TEXT,
  role TEXT, status TEXT, invited_by UUID, created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT is_app_admin() THEN RAISE EXCEPTION 'Unauthorized: admin access required'; END IF;
  RETURN QUERY
  SELECT p.id, p.user_id, p.display_name, p.email, p.role, p.status,
         p.invited_by, p.created_at, p.updated_at
  FROM profiles p ORDER BY p.created_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION admin_update_user_status(p_user_id UUID, p_status TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT is_app_admin() THEN RAISE EXCEPTION 'Unauthorized: admin access required'; END IF;
  IF p_status NOT IN ('pending','active','deactivated') THEN RAISE EXCEPTION 'Invalid status'; END IF;
  IF p_user_id = auth.uid() AND p_status = 'deactivated' THEN RAISE EXCEPTION 'Cannot deactivate yourself'; END IF;
  UPDATE profiles SET status = p_status, updated_at = now() WHERE user_id = p_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION admin_set_role(p_user_id UUID, p_role TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT is_app_admin() THEN RAISE EXCEPTION 'Unauthorized: admin access required'; END IF;
  IF p_role NOT IN ('user','admin') THEN RAISE EXCEPTION 'Invalid role'; END IF;
  IF p_user_id = auth.uid() AND p_role = 'user' THEN RAISE EXCEPTION 'Cannot demote yourself'; END IF;
  UPDATE profiles SET role = p_role, updated_at = now() WHERE user_id = p_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION admin_create_invitation(p_email TEXT, p_plan_id UUID DEFAULT NULL)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id UUID;
BEGIN
  IF NOT is_app_admin() THEN RAISE EXCEPTION 'Unauthorized: admin access required'; END IF;
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = p_email) THEN
    RAISE EXCEPTION 'User with this email already exists';
  END IF;
  INSERT INTO invitations (email, invited_by) VALUES (p_email, auth.uid()) RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION admin_list_invitations()
RETURNS TABLE (
  id UUID, email TEXT, invited_by UUID, invited_by_name TEXT, status TEXT, created_at TIMESTAMPTZ
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT is_app_admin() THEN RAISE EXCEPTION 'Unauthorized: admin access required'; END IF;
  RETURN QUERY
  SELECT i.id, i.email, i.invited_by, COALESCE(p.display_name, p.email) AS invited_by_name,
         i.status, i.created_at
  FROM invitations i LEFT JOIN profiles p ON p.user_id = i.invited_by
  ORDER BY i.created_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION admin_revoke_invitation(p_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT is_app_admin() THEN RAISE EXCEPTION 'Unauthorized: admin access required'; END IF;
  UPDATE invitations SET status = 'revoked' WHERE id = p_id AND status = 'pending';
END;
$$;
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
-- ============================================================
-- 004_trainer_access.sql
-- Let a trainer (team owner or manager) read their clients' data.
-- ============================================================

-- True when p_user_id is an active client in a team the caller owns or manages.
CREATE OR REPLACE FUNCTION is_my_client(p_user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1
    FROM group_members gm
    JOIN groups g ON g.id = gm.group_id AND g.deleted_at IS NULL
    WHERE gm.user_id = p_user_id
      AND gm.status = 'active'
      AND gm.deleted_at IS NULL
      AND (
        g.user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM group_members mgr
          WHERE mgr.group_id = g.id AND mgr.user_id = auth.uid()
            AND mgr.role = 'manager' AND mgr.status = 'active' AND mgr.deleted_at IS NULL
        )
      )
  );
$$;

-- Additional read-only policies for trainers (OR-combined with own-data policies).
CREATE POLICY "wo_trainer_read" ON workouts
  FOR SELECT USING (is_my_client(user_id));
CREATE POLICY "ws_trainer_read" ON workout_sets
  FOR SELECT USING (is_my_client(user_id));
CREATE POLICY "bm_trainer_read" ON body_metrics
  FOR SELECT USING (is_my_client(user_id));
CREATE POLICY "ap_trainer_read" ON athlete_profiles
  FOR SELECT USING (is_my_client(user_id));
CREATE POLICY "pr_trainer_read" ON programs
  FOR SELECT USING (is_my_client(user_id));
-- ============================================================
-- 005_account_deletion.sql — GDPR right to erasure (Art. 17)
-- Hard-deletes all of the caller's data, then the auth user.
-- ============================================================

CREATE OR REPLACE FUNCTION delete_my_account()
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  DELETE FROM workout_sets WHERE user_id = v_user_id;
  DELETE FROM workouts WHERE user_id = v_user_id;
  DELETE FROM body_metrics WHERE user_id = v_user_id;
  DELETE FROM programs WHERE user_id = v_user_id;
  DELETE FROM exercises WHERE user_id = v_user_id;
  DELETE FROM athlete_profiles WHERE user_id = v_user_id;

  -- Team memberships and owned teams
  DELETE FROM group_members WHERE user_id = v_user_id;
  DELETE FROM group_notifications WHERE user_id = v_user_id;
  DELETE FROM groups WHERE user_id = v_user_id; -- cascades members/notifications

  DELETE FROM invitations WHERE invited_by = v_user_id;
  DELETE FROM profiles WHERE user_id = v_user_id;

  DELETE FROM auth.users WHERE id = v_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION delete_my_account TO authenticated;
-- ============================================================
-- 006_seed_exercises.sql — global exercise library (user_id = NULL)
-- Readable by everyone (see ex_read policy in 001). Idempotent.
-- ============================================================

INSERT INTO exercises (user_id, name, muscle_group, equipment, is_custom)
SELECT NULL, v.name, v.muscle_group, v.equipment, false
FROM (VALUES
  -- Chest
  ('Barbell Bench Press', 'chest', 'barbell'),
  ('Incline Barbell Bench Press', 'chest', 'barbell'),
  ('Dumbbell Bench Press', 'chest', 'dumbbell'),
  ('Incline Dumbbell Press', 'chest', 'dumbbell'),
  ('Cable Fly', 'chest', 'cable'),
  ('Push-up', 'chest', 'bodyweight'),
  ('Chest Dip', 'chest', 'bodyweight'),
  -- Back
  ('Deadlift', 'back', 'barbell'),
  ('Barbell Row', 'back', 'barbell'),
  ('Pull-up', 'back', 'bodyweight'),
  ('Chin-up', 'back', 'bodyweight'),
  ('Lat Pulldown', 'back', 'cable'),
  ('Seated Cable Row', 'back', 'cable'),
  ('Dumbbell Row', 'back', 'dumbbell'),
  ('T-Bar Row', 'back', 'barbell'),
  -- Legs
  ('Back Squat', 'legs', 'barbell'),
  ('Front Squat', 'legs', 'barbell'),
  ('Romanian Deadlift', 'legs', 'barbell'),
  ('Leg Press', 'legs', 'machine'),
  ('Leg Extension', 'legs', 'machine'),
  ('Leg Curl', 'legs', 'machine'),
  ('Walking Lunge', 'legs', 'dumbbell'),
  ('Bulgarian Split Squat', 'legs', 'dumbbell'),
  ('Standing Calf Raise', 'legs', 'machine'),
  ('Hip Thrust', 'legs', 'barbell'),
  -- Shoulders
  ('Overhead Press', 'shoulders', 'barbell'),
  ('Seated Dumbbell Press', 'shoulders', 'dumbbell'),
  ('Lateral Raise', 'shoulders', 'dumbbell'),
  ('Rear Delt Fly', 'shoulders', 'dumbbell'),
  ('Face Pull', 'shoulders', 'cable'),
  -- Arms
  ('Barbell Curl', 'arms', 'barbell'),
  ('Dumbbell Curl', 'arms', 'dumbbell'),
  ('Hammer Curl', 'arms', 'dumbbell'),
  ('Triceps Pushdown', 'arms', 'cable'),
  ('Skull Crusher', 'arms', 'barbell'),
  ('Overhead Triceps Extension', 'arms', 'dumbbell'),
  -- Core
  ('Plank', 'core', 'bodyweight'),
  ('Hanging Leg Raise', 'core', 'bodyweight'),
  ('Cable Crunch', 'core', 'cable'),
  ('Russian Twist', 'core', 'bodyweight')
) AS v(name, muscle_group, equipment)
WHERE NOT EXISTS (
  SELECT 1 FROM exercises e WHERE e.user_id IS NULL AND e.name = v.name
);
-- ============================================================
-- 007_readiness_nutrition.sql
-- Daily readiness check-ins + nutrition (macro) tracking.
-- ============================================================

-- Optional daily macro targets on the athlete profile
ALTER TABLE athlete_profiles ADD COLUMN IF NOT EXISTS nutrition_targets JSONB;

-- ─── readiness_checkins ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS readiness_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  mood INT,        -- 1..5
  energy INT,      -- 1..5
  sleep INT,       -- sleep quality 1..5
  soreness INT,    -- 1..5 (higher = more sore)
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_readiness_user ON readiness_checkins(user_id, updated_at);

-- ─── nutrition_entries ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS nutrition_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  meal TEXT,          -- breakfast | lunch | dinner | snack
  name TEXT NOT NULL,
  calories NUMERIC,
  protein_g NUMERIC,
  carbs_g NUMERIC,
  fat_g NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_nutrition_user ON nutrition_entries(user_id, updated_at);

-- ─── updated_at triggers ─────────────────────────────────────
DROP TRIGGER IF EXISTS trg_readiness_checkins_updated ON readiness_checkins;
CREATE TRIGGER trg_readiness_checkins_updated BEFORE UPDATE ON readiness_checkins
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
DROP TRIGGER IF EXISTS trg_nutrition_entries_updated ON nutrition_entries;
CREATE TRIGGER trg_nutrition_entries_updated BEFORE UPDATE ON nutrition_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── RLS: own data + trainer read (is_my_client) ─────────────
ALTER TABLE readiness_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE nutrition_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rc_own_all" ON readiness_checkins
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "rc_trainer_read" ON readiness_checkins
  FOR SELECT USING (is_my_client(user_id));

CREATE POLICY "ne_own_all" ON nutrition_entries
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "ne_trainer_read" ON nutrition_entries
  FOR SELECT USING (is_my_client(user_id));

-- ─── Extend GDPR account deletion to cover the new tables ─────
CREATE OR REPLACE FUNCTION delete_my_account()
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

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
-- ============================================================
-- 008_workout_notes.sql — async notes on a logged workout
-- Author = user_id (athlete on own workout, or their trainer).
-- Visible to the workout owner and their trainer (is_my_client).
-- ============================================================

CREATE TABLE IF NOT EXISTS workout_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, -- author
  workout_id UUID NOT NULL,
  author_name TEXT,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_workout_notes_user ON workout_notes(user_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_workout_notes_workout ON workout_notes(workout_id);

DROP TRIGGER IF EXISTS trg_workout_notes_updated ON workout_notes;
CREATE TRIGGER trg_workout_notes_updated BEFORE UPDATE ON workout_notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE workout_notes ENABLE ROW LEVEL SECURITY;

-- Read: the author, the workout owner, or the workout owner's trainer
CREATE POLICY "wn_read" ON workout_notes
  FOR SELECT USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM workouts w
      WHERE w.id = workout_notes.workout_id
        AND (w.user_id = auth.uid() OR is_my_client(w.user_id))
    )
  );

-- Insert: you author as yourself, on your own workout or a client's workout
CREATE POLICY "wn_insert" ON workout_notes
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM workouts w
      WHERE w.id = workout_notes.workout_id
        AND (w.user_id = auth.uid() OR is_my_client(w.user_id))
    )
  );

-- Update/delete: only the author (soft-delete via update)
CREATE POLICY "wn_update_own" ON workout_notes
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Extend account deletion to remove authored notes
CREATE OR REPLACE FUNCTION delete_my_account()
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  DELETE FROM workout_notes WHERE user_id = v_user_id;
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

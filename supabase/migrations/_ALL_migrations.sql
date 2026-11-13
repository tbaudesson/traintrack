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
-- ============================================================
-- 009_plans_admin_settings.sql
-- Licences/plans (with feature lists), app settings (GDPR config),
-- admin-approval signup, and plan info on the user profile.
-- ============================================================

-- ─── Plans ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  features JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_default BOOLEAN DEFAULT false,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "plans_read" ON plans FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "plans_admin_all" ON plans FOR ALL USING (is_app_admin()) WITH CHECK (is_app_admin());

-- Seed a Free (default) and Pro plan if none exist
INSERT INTO plans (name, description, features, is_default, sort_order)
SELECT 'Free', 'Core training tools', '[]'::jsonb, true, 0
WHERE NOT EXISTS (SELECT 1 FROM plans);
INSERT INTO plans (name, description, features, is_default, sort_order)
SELECT 'Pro', 'Everything unlocked',
  '["ai_programs","nutrition","readiness","coaching","advanced_progress"]'::jsonb, false, 1
WHERE NOT EXISTS (SELECT 1 FROM plans WHERE name = 'Pro');

-- ─── profiles.plan_id ────────────────────────────────────────
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS plan_id UUID REFERENCES plans(id);

-- ─── app_settings (key/value; GDPR config, etc.) ─────────────
CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "app_settings_read" ON app_settings FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "app_settings_admin_all" ON app_settings FOR ALL USING (is_app_admin()) WITH CHECK (is_app_admin());

INSERT INTO app_settings (key, value) VALUES
  ('company_name', 'TrainTrack'),
  ('company_address', ''),
  ('dpo_email', 'privacy@traintrack.app'),
  ('contact_email', '')
ON CONFLICT (key) DO NOTHING;

-- ─── Approval-required signup: new users start 'pending' + default plan ──
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_default_plan UUID;
BEGIN
  SELECT id INTO v_default_plan FROM plans WHERE is_default LIMIT 1;
  INSERT INTO profiles (user_id, email, display_name, status, plan_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    'pending',
    v_default_plan
  );
  RETURN NEW;
END;
$$;

-- ─── get_user_profile now returns plan info ──────────────────
DROP FUNCTION IF EXISTS get_user_profile();
CREATE OR REPLACE FUNCTION get_user_profile()
RETURNS TABLE (
  id UUID, user_id UUID, display_name TEXT, email TEXT,
  role TEXT, status TEXT, created_at TIMESTAMPTZ,
  plan_id UUID, plan_name TEXT, plan_features JSONB
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY
  SELECT p.id, p.user_id, p.display_name, p.email, p.role, p.status, p.created_at,
         pl.id, pl.name, COALESCE(pl.features, '[]'::jsonb)
  FROM profiles p
  LEFT JOIN plans pl ON pl.id = COALESCE(p.plan_id, (SELECT dp.id FROM plans dp WHERE dp.is_default LIMIT 1))
  WHERE p.user_id = auth.uid();
END;
$$;

-- ─── admin_list_users now returns plan info ──────────────────
DROP FUNCTION IF EXISTS admin_list_users();
CREATE OR REPLACE FUNCTION admin_list_users()
RETURNS TABLE (
  id UUID, user_id UUID, display_name TEXT, email TEXT,
  role TEXT, status TEXT, invited_by UUID, created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ,
  plan_id UUID, plan_name TEXT, plan_features JSONB
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT is_app_admin() THEN RAISE EXCEPTION 'Unauthorized: admin access required'; END IF;
  RETURN QUERY
  SELECT p.id, p.user_id, p.display_name, p.email, p.role, p.status,
         p.invited_by, p.created_at, p.updated_at,
         pl.id, pl.name, COALESCE(pl.features, '[]'::jsonb)
  FROM profiles p
  LEFT JOIN plans pl ON pl.id = p.plan_id
  ORDER BY p.created_at DESC;
END;
$$;

-- ─── admin: assign a plan to a user ──────────────────────────
CREATE OR REPLACE FUNCTION admin_set_user_plan(p_user_id UUID, p_plan_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT is_app_admin() THEN RAISE EXCEPTION 'Unauthorized: admin access required'; END IF;
  UPDATE profiles SET plan_id = p_plan_id, updated_at = now() WHERE user_id = p_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_set_user_plan(UUID, UUID) TO authenticated;
-- ============================================================
-- 010_fix_get_user_profile.sql
-- Fix "column reference 'id' is ambiguous" (42702): the function's OUT
-- parameter `id` collided with the unqualified `id` in the default-plan
-- subquery. Qualify every reference.
-- ============================================================

DROP FUNCTION IF EXISTS get_user_profile();
CREATE OR REPLACE FUNCTION get_user_profile()
RETURNS TABLE (
  id UUID, user_id UUID, display_name TEXT, email TEXT,
  role TEXT, status TEXT, created_at TIMESTAMPTZ,
  plan_id UUID, plan_name TEXT, plan_features JSONB
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY
  SELECT p.id, p.user_id, p.display_name, p.email, p.role, p.status, p.created_at,
         pl.id, pl.name, COALESCE(pl.features, '[]'::jsonb)
  FROM profiles p
  LEFT JOIN plans pl
    ON pl.id = COALESCE(p.plan_id, (SELECT dp.id FROM plans dp WHERE dp.is_default LIMIT 1))
  WHERE p.user_id = auth.uid();
END;
$$;

GRANT EXECUTE ON FUNCTION get_user_profile() TO authenticated;
-- ============================================================
-- 011_crud_and_invitations.sql
-- Exercise description + video, invitation auto-approval on signup,
-- admin profile editing.
-- ============================================================

-- ─── Exercises: description + video link ─────────────────────
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS video_url TEXT;

-- ─── Auto-approve invited users on signup ────────────────────
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_default_plan UUID;
  v_inv invitations%ROWTYPE;
  v_status TEXT;
BEGIN
  SELECT id INTO v_default_plan FROM plans WHERE is_default LIMIT 1;

  SELECT * INTO v_inv FROM invitations
  WHERE lower(email) = lower(NEW.email) AND status = 'pending'
  LIMIT 1;

  IF v_inv.id IS NOT NULL THEN
    UPDATE invitations SET status = 'accepted' WHERE id = v_inv.id;
    v_status := 'active';   -- invited → auto-approved
  ELSE
    v_status := 'pending';  -- needs admin approval
  END IF;

  INSERT INTO profiles (user_id, email, display_name, status, plan_id)
  VALUES (
    NEW.id, NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    v_status, v_default_plan
  );
  RETURN NEW;
END;
$$;

-- ─── Admin: edit a user's display name ───────────────────────
CREATE OR REPLACE FUNCTION admin_update_display_name(p_user_id UUID, p_name TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT is_app_admin() THEN RAISE EXCEPTION 'Unauthorized: admin access required'; END IF;
  UPDATE profiles SET display_name = p_name, updated_at = now() WHERE user_id = p_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_update_display_name(UUID, TEXT) TO authenticated;
-- 012_profile_edit_and_exercise_content.sql
-- (a) Let a user safely edit their OWN display name without being able to
--     escalate their role/status/plan. (b) Seed descriptions + video links
--     onto the built-in exercise library.

-- ─────────────────────────────────────────────────────────────────────────
-- (a) Self-service display name
-- ─────────────────────────────────────────────────────────────────────────

-- The previous broad "profiles_update_own" policy let a user UPDATE any column
-- of their own row — including role='admin' or status='active'. RLS can't see
-- OLD vs NEW per-column, so we drop that policy and funnel the one legitimate
-- self-edit (display_name) through a SECURITY DEFINER function instead.
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;

CREATE OR REPLACE FUNCTION update_my_display_name(p_name TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  UPDATE profiles
     SET display_name = NULLIF(btrim(p_name), ''),
         updated_at = now()
   WHERE user_id = auth.uid();
END;
$$;

GRANT EXECUTE ON FUNCTION update_my_display_name(TEXT) TO authenticated;

-- ─────────────────────────────────────────────────────────────────────────
-- (b) Exercise content: descriptions + a "how to" video search link
-- ─────────────────────────────────────────────────────────────────────────

UPDATE exercises e SET description = v.d
FROM (VALUES
  ('Barbell Bench Press', 'Lie flat, feet planted, shoulder blades retracted. Lower the bar to mid-chest and press up without flaring the elbows.'),
  ('Incline Barbell Bench Press', 'Bench set to 30–45°. Press from the upper chest; keeps tension on the clavicular pecs.'),
  ('Dumbbell Bench Press', 'Greater range of motion than the barbell. Lower until you feel a stretch, press the dumbbells together at the top.'),
  ('Incline Dumbbell Press', 'Incline bench, palms forward. Emphasises the upper chest and lets each arm work independently.'),
  ('Cable Fly', 'Slight bend in the elbows, hug the cables together in an arc. Squeeze the chest, control the stretch.'),
  ('Push-up', 'Body in a straight line, hands just wider than shoulders. Lower the chest to the floor, push back up.'),
  ('Chest Dip', 'Lean the torso forward to bias the chest. Lower until the shoulders are just below the elbows.'),
  ('Deadlift', 'Hip-hinge with a flat back, bar over mid-foot. Drive through the heels and lock out hips and knees together.'),
  ('Barbell Row', 'Hinge to ~45°, pull the bar to the lower ribs, squeeze the shoulder blades, lower under control.'),
  ('Pull-up', 'Overhand grip, pull the chest toward the bar, lead with the elbows, full hang at the bottom.'),
  ('Chin-up', 'Underhand grip — more biceps involvement. Pull until the chin clears the bar.'),
  ('Lat Pulldown', 'Tall chest, pull the bar to the upper chest, drive the elbows down and back.'),
  ('Seated Cable Row', 'Neutral spine, pull to the navel, squeeze the back; avoid leaning back to cheat the weight.'),
  ('Dumbbell Row', 'One hand braced on the bench, pull the dumbbell to the hip, control the stretch.'),
  ('T-Bar Row', 'Hinged torso, neutral grip, row to the chest with a strong squeeze of the mid-back.'),
  ('Back Squat', 'Bar on the upper traps, brace, sit down and back to depth, drive up keeping the chest tall.'),
  ('Front Squat', 'Bar on the front delts, elbows high. More upright torso, heavy quad emphasis.'),
  ('Romanian Deadlift', 'Soft knees, push the hips back, lower the bar along the legs until you feel the hamstrings, then drive forward.'),
  ('Leg Press', 'Feet shoulder-width on the platform, lower to ~90°, press without locking the knees harshly.'),
  ('Leg Extension', 'Isolates the quads. Extend fully, squeeze at the top, lower slowly.'),
  ('Leg Curl', 'Isolates the hamstrings. Curl with control, full squeeze, slow negative.'),
  ('Walking Lunge', 'Long step, drop the back knee toward the floor, drive through the front heel to the next step.'),
  ('Bulgarian Split Squat', 'Rear foot elevated, drop straight down over the front leg. Brutal single-leg quad/glute builder.'),
  ('Standing Calf Raise', 'Full stretch at the bottom, rise onto the toes, pause and squeeze the calves at the top.'),
  ('Hip Thrust', 'Upper back on a bench, drive the hips up, squeeze the glutes hard, chin tucked.'),
  ('Overhead Press', 'Brace the core, press the bar overhead in a straight line, move the head through at lockout.'),
  ('Seated Dumbbell Press', 'Back supported, press the dumbbells overhead without clashing them; controlled descent.'),
  ('Lateral Raise', 'Slight forward lean, raise to shoulder height with a soft elbow, lead with the elbows not the hands.'),
  ('Rear Delt Fly', 'Hinge forward, raise the dumbbells out and back, squeeze the rear delts; keep the traps relaxed.'),
  ('Face Pull', 'Rope to eye level, pull toward the forehead, externally rotate — great for shoulder health.'),
  ('Barbell Curl', 'Elbows pinned to the sides, curl the bar up, squeeze the biceps, lower slowly.'),
  ('Dumbbell Curl', 'Curl and supinate (rotate the pinky up) for a strong biceps peak contraction.'),
  ('Hammer Curl', 'Neutral grip throughout; targets the brachialis and forearms.'),
  ('Triceps Pushdown', 'Elbows tucked, push the bar/rope down to lockout, squeeze the triceps, control the return.'),
  ('Skull Crusher', 'Lying, lower the bar to the forehead by bending only the elbows, then extend.'),
  ('Overhead Triceps Extension', 'Keeps the long head of the triceps under stretch. Lower behind the head, extend overhead.'),
  ('Plank', 'Forearms and toes, body in a straight line, brace the core and glutes; do not let the hips sag.'),
  ('Hanging Leg Raise', 'Hang from a bar, raise the legs with control using the abs, avoid swinging.'),
  ('Cable Crunch', 'Kneel, rope by the head, crunch down by rounding the spine, squeeze the abs.'),
  ('Russian Twist', 'Seated, lean back, rotate the torso side to side; add weight for more challenge.')
) AS v(name, d)
WHERE e.user_id IS NULL AND e.name = v.name;

-- A YouTube "how to" search link for every built-in exercise (robust to renames).
UPDATE exercises
   SET video_url = 'https://www.youtube.com/results?search_query='
                   || replace(lower(name), ' ', '+') || '+proper+form'
 WHERE user_id IS NULL AND (video_url IS NULL OR video_url = '');
-- 013_hydration.sql — daily water-intake tracking.

CREATE TABLE IF NOT EXISTS hydration_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  ml NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_hydration_user ON hydration_logs(user_id, updated_at);

DROP TRIGGER IF EXISTS trg_hydration_logs_updated ON hydration_logs;
CREATE TRIGGER trg_hydration_logs_updated BEFORE UPDATE ON hydration_logs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE hydration_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "hl_own_all" ON hydration_logs
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "hl_trainer_read" ON hydration_logs
  FOR SELECT USING (is_my_client(user_id));

-- Extend GDPR account deletion to cover hydration.
CREATE OR REPLACE FUNCTION delete_my_account()
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

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
-- 018_workout_notes_voice_exercise.sql
-- Extend workout notes with per-exercise anchoring and voice (audio) notes.

ALTER TABLE workout_notes ADD COLUMN IF NOT EXISTS exercise_uuid TEXT;
ALTER TABLE workout_notes ADD COLUMN IF NOT EXISTS exercise_name TEXT;
ALTER TABLE workout_notes ADD COLUMN IF NOT EXISTS audio_path TEXT;
-- A voice-only note has an empty body; allow it.
ALTER TABLE workout_notes ALTER COLUMN body SET DEFAULT '';

-- ─── Private storage bucket for voice notes ──────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('voice-notes', 'voice-notes', false)
ON CONFLICT (id) DO NOTHING;

-- Any authenticated user may upload; paths are unguessable UUIDs and the
-- audio_path only lives on note rows already protected by workout_notes RLS.
DROP POLICY IF EXISTS "voice_notes_insert" ON storage.objects;
CREATE POLICY "voice_notes_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'voice-notes');

DROP POLICY IF EXISTS "voice_notes_select" ON storage.objects;
CREATE POLICY "voice_notes_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'voice-notes');

DROP POLICY IF EXISTS "voice_notes_delete" ON storage.objects;
CREATE POLICY "voice_notes_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'voice-notes' AND owner = auth.uid());

-- ─── GDPR: remove the user's authored notes + their audio files ──────
CREATE OR REPLACE FUNCTION delete_my_account()
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  DELETE FROM storage.objects WHERE bucket_id = 'voice-notes' AND owner = v_user_id;
  DELETE FROM workout_notes WHERE user_id = v_user_id;

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
-- 019_admin_exercise_content.sql
-- Let an app admin curate the description / video URL on ANY exercise
-- (including the shared built-in library rows, user_id = NULL) so a specific,
-- embeddable video can replace the generic "search YouTube" link.

CREATE OR REPLACE FUNCTION admin_update_exercise_content(
  p_uuid TEXT, p_description TEXT, p_video_url TEXT
) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT is_app_admin() THEN
    RAISE EXCEPTION 'Unauthorized: admin access required';
  END IF;
  UPDATE exercises
     SET description = NULLIF(btrim(p_description), ''),
         video_url   = NULLIF(btrim(p_video_url), ''),
         updated_at  = now()
   WHERE id = p_uuid::uuid;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_update_exercise_content(TEXT, TEXT, TEXT) TO authenticated;
-- 020_exercise_video_links.sql
-- First-pass curation: specific, embeddable YouTube form videos for the most
-- common built-in exercises (sourced from live YouTube search, June 2026).
-- These play inline via the VideoEmbed player. The remaining built-ins keep
-- their generic "search YouTube" link until curated (in-app, by an admin).
-- updated_at is bumped so the (clock-skew-fixed) sync engine re-pulls them.

UPDATE exercises e SET video_url = v.url, updated_at = now()
FROM (VALUES
  ('Barbell Bench Press',        'https://www.youtube.com/watch?v=Pp8rHcFVIYg'),
  ('Incline Barbell Bench Press','https://www.youtube.com/watch?v=5kyLUGVq_pk'),
  ('Dumbbell Bench Press',       'https://www.youtube.com/watch?v=5Y3VZsLb1Ys'),
  ('Deadlift',                   'https://www.youtube.com/watch?v=XxWcirHIwVo'),
  ('Barbell Row',                'https://www.youtube.com/watch?v=rqTOAM8WoeM'),
  ('Pull-up',                    'https://www.youtube.com/watch?v=m7NhuSXiQIs'),
  ('Lat Pulldown',               'https://www.youtube.com/watch?v=CAwf7n6Luuc'),
  ('Seated Cable Row',           'https://www.youtube.com/watch?v=7BkgqzC6WsM'),
  ('Back Squat',                 'https://www.youtube.com/watch?v=CWl0apMgshk'),
  ('Front Squat',                'https://www.youtube.com/watch?v=wyDbagKS7Rg'),
  ('Romanian Deadlift',          'https://www.youtube.com/watch?v=7j-2w4-P14I'),
  ('Leg Press',                  'https://www.youtube.com/watch?v=K5n2vg3oZa4'),
  ('Overhead Press',             'https://www.youtube.com/watch?v=F3QY5vMz_6I'),
  ('Lateral Raise',              'https://www.youtube.com/watch?v=Y29xKcze8Ik'),
  ('Barbell Curl',               'https://www.youtube.com/watch?v=pQfJR-sSIvA'),
  ('Triceps Pushdown',           'https://www.youtube.com/watch?v=IoAP0xQtROk'),
  ('Hip Thrust',                 'https://www.youtube.com/watch?v=S_uZP4UH6J0'),
  ('Plank',                      'https://www.youtube.com/watch?v=A2b2EmIg0dA'),
  ('Bulgarian Split Squat',      'https://www.youtube.com/watch?v=hiLF_pF3EJM')
) AS v(name, url)
WHERE e.user_id IS NULL AND e.name = v.name;


-- ============================================================
-- 021_security_hardening.sql
--
-- Closes the holes found in the November 2026 audit:
--
--   * inviting an email that already had an account made it an active
--     client on the spot, so anyone could read anyone's training, body
--     and health data as their "trainer";
--   * every signed-in user could list and play every voice note;
--   * pending and deactivated accounts were only stopped by the UI;
--   * the coaching plan was only checked in the UI.
--
-- Memberships that are already active are deliberately left alone.
--
-- Deploy: apply this file first, then the code. The current app keeps
-- working against it: the accept/decline screen already exists.
--
-- Safe to re-run. All-or-nothing: wrapped in one transaction.
-- ============================================================

BEGIN;

-- ─── Helpers ─────────────────────────────────────────────────

-- Blocked only when a profile explicitly says so.
CREATE OR REPLACE FUNCTION is_active_account()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM profiles WHERE user_id = auth.uid() AND status <> 'active'
  );
$$;

-- True for requests from the app; false inside definer functions and for
-- the service role, so triggers below never block the server's own work.
CREATE OR REPLACE FUNCTION is_client_role()
RETURNS BOOLEAN LANGUAGE sql STABLE AS $$
  SELECT current_user IN ('authenticated', 'anon');
$$;

-- Admins pass; otherwise the user's plan (or the default plan) must list it.
CREATE OR REPLACE FUNCTION has_plan_feature(p_user_id UUID, p_feature TEXT)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles p
    LEFT JOIN plans pl
      ON pl.id = COALESCE(p.plan_id, (SELECT dp.id FROM plans dp WHERE dp.is_default LIMIT 1))
    WHERE p.user_id = p_user_id
      AND (p.role = 'admin' OR COALESCE(pl.features, '[]'::jsonb) ? p_feature)
  );
$$;

CREATE OR REPLACE FUNCTION is_app_admin()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin' AND status = 'active'
  );
$$;

-- ─── Account status on every coaching check ─────────────────

CREATE OR REPLACE FUNCTION is_group_owner_or_manager(p_group_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT is_active_account() AND (
    EXISTS (SELECT 1 FROM groups WHERE id = p_group_id AND user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM group_members
               WHERE group_id = p_group_id AND user_id = auth.uid()
                 AND role = 'manager' AND status = 'active' AND deleted_at IS NULL)
  );
$$;

CREATE OR REPLACE FUNCTION is_group_member(p_group_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT is_active_account() AND (EXISTS (
    SELECT 1 FROM groups g WHERE g.id = p_group_id AND g.user_id = auth.uid() AND g.deleted_at IS NULL
  ) OR EXISTS (
    SELECT 1 FROM group_members gm
    WHERE gm.group_id = p_group_id AND gm.user_id = auth.uid()
      AND gm.status = 'active' AND gm.deleted_at IS NULL
  ));
$$;

CREATE OR REPLACE FUNCTION is_my_client(p_user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT is_active_account() AND EXISTS (
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

CREATE OR REPLACE FUNCTION can_message(p_other UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p_other <> auth.uid() AND is_active_account() AND (
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

CREATE OR REPLACE FUNCTION update_group(p_group_id UUID, p_name TEXT, p_description TEXT DEFAULT NULL)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT is_active_account() OR NOT EXISTS (SELECT 1 FROM groups WHERE id = p_group_id AND user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Only the owner can update the team';
  END IF;
  UPDATE groups SET name = p_name, description = p_description, updated_at = now()
  WHERE id = p_group_id;
END;
$$;

CREATE OR REPLACE FUNCTION delete_group(p_group_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT is_active_account() OR NOT EXISTS (SELECT 1 FROM groups WHERE id = p_group_id AND user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Only the owner can delete the team';
  END IF;
  UPDATE groups SET deleted_at = now() WHERE id = p_group_id;
END;
$$;

CREATE OR REPLACE FUNCTION change_member_role(p_member_id UUID, p_role TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_group UUID;
BEGIN
  IF p_role NOT IN ('member','manager') THEN RAISE EXCEPTION 'Invalid role'; END IF;
  SELECT group_id INTO v_group FROM group_members WHERE id = p_member_id;
  -- Only the team owner may change roles
  IF v_group IS NULL OR NOT is_active_account() OR NOT EXISTS (SELECT 1 FROM groups WHERE id = v_group AND user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Only the owner can change roles';
  END IF;
  UPDATE group_members SET role = p_role WHERE id = p_member_id;
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
  WHERE g.user_id = auth.uid() AND g.deleted_at IS NULL AND is_active_account()
  ORDER BY g.created_at DESC;
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
  WHERE gm.user_id = auth.uid() AND gm.deleted_at IS NULL AND is_active_account()
  ORDER BY gm.invited_at DESC;
$$;

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
    AND is_active_account()
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
  WHERE me.user_id = auth.uid() AND me.status = 'active' AND me.deleted_at IS NULL
    AND is_active_account();
$$;

CREATE OR REPLACE FUNCTION get_inactive_clients(p_days INT DEFAULT 3)
RETURNS TABLE (user_id UUID, display_name TEXT, last_workout DATE, days_since INT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH clients AS (
    SELECT DISTINCT gm.user_id
    FROM groups g
    JOIN group_members gm ON gm.group_id = g.id
    WHERE g.deleted_at IS NULL AND gm.deleted_at IS NULL
      AND gm.status = 'active' AND gm.user_id IS NOT NULL
      AND is_active_account()
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

-- A client-side check is no check: every table a member's app reads or writes
-- also refuses accounts that are pending or deactivated.
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'athlete_profiles','exercises','programs','workouts','workout_sets',
    'body_metrics','readiness_checkins','nutrition_entries','workout_notes',
    'hydration_logs','messages','health_metrics','push_subscriptions',
    'groups','group_members','group_notifications'
  ] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "active_account_only" ON %I', t);
    EXECUTE format(
      'CREATE POLICY "active_account_only" ON %I AS RESTRICTIVE FOR ALL TO authenticated
         USING ((SELECT is_active_account())) WITH CHECK ((SELECT is_active_account()))', t);
  END LOOP;
END $$;

-- ─── Invitations need the invitee's consent ──────────────────

CREATE OR REPLACE FUNCTION create_group(p_name TEXT, p_description TEXT DEFAULT NULL)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id UUID;
BEGIN
  IF NOT is_active_account() OR NOT has_plan_feature(auth.uid(), 'coaching') THEN
    RAISE EXCEPTION 'PLAN_REQUIRED';
  END IF;
  INSERT INTO groups (user_id, name, description)
  VALUES (auth.uid(), p_name, p_description) RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION invite_group_member(p_group_id UUID, p_email TEXT)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id UUID; v_uid UUID;
BEGIN
  IF NOT is_group_owner_or_manager(p_group_id) THEN
    RAISE EXCEPTION 'Only the trainer can invite members';
  END IF;
  -- The team owner's plan decides, so a manager can invite for a Pro owner.
  IF NOT has_plan_feature((SELECT g.user_id FROM groups g WHERE g.id = p_group_id), 'coaching') THEN
    RAISE EXCEPTION 'PLAN_REQUIRED';
  END IF;
  IF EXISTS (SELECT 1 FROM group_members
             WHERE group_id = p_group_id AND lower(invited_email) = lower(p_email)
               AND deleted_at IS NULL) THEN
    RAISE EXCEPTION 'This email is already invited';
  END IF;
  -- Resolve to an existing user if present
  SELECT id INTO v_uid FROM auth.users WHERE lower(email) = lower(p_email);
  -- Always pending: becoming someone's client opens their data to the trainer.
  INSERT INTO group_members (group_id, user_id, invited_email, role, status)
  VALUES (p_group_id, v_uid, lower(p_email), 'member', 'pending')
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
         -- An invitee's name stays private until they accept.
         COALESCE(CASE WHEN gm.status = 'active' THEN p.display_name END, gm.invited_email) AS display_name,
         gm.invited_at, gm.joined_at
  FROM group_members gm
  LEFT JOIN profiles p ON p.user_id = gm.user_id
  WHERE gm.group_id = p_group_id AND gm.deleted_at IS NULL
  ORDER BY gm.invited_at;
END;
$$;

CREATE OR REPLACE FUNCTION respond_to_invitation(p_member_id UUID, p_accept BOOLEAN)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT is_active_account() OR NOT EXISTS (
    SELECT 1 FROM group_members
    WHERE id = p_member_id AND user_id = auth.uid() AND deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Not your invitation';
  END IF;
  IF p_accept THEN
    UPDATE group_members SET status = 'active', joined_at = now() WHERE id = p_member_id;
  ELSE
    UPDATE group_members SET deleted_at = now() WHERE id = p_member_id;
  END IF;
END;
$$;

-- Links the invitation to the new account; accepting it stays a separate act.
CREATE OR REPLACE FUNCTION claim_pending_invitations()
RETURNS INT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_email TEXT; v_count INT;
BEGIN
  SELECT email INTO v_email FROM auth.users WHERE id = auth.uid();
  IF v_email IS NULL THEN RETURN 0; END IF;
  UPDATE group_members
  SET user_id = auth.uid()
  WHERE lower(invited_email) = lower(v_email)
    AND user_id IS NULL AND deleted_at IS NULL;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN COALESCE(v_count, 0);
END;
$$;

-- Nothing calls this any more, and it told anonymous visitors who was invited.
REVOKE ALL ON FUNCTION check_invitation(TEXT) FROM PUBLIC, anon, authenticated;

-- ─── Voice notes ─────────────────────────────────────────────

-- Long enough for any real note; stops the bucket being used as free storage.
UPDATE storage.buckets SET file_size_limit = 10485760 WHERE id = 'voice-notes';

DROP POLICY IF EXISTS "voice_notes_insert" ON storage.objects;
CREATE POLICY "voice_notes_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'voice-notes'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND (SELECT is_active_account())
  );

-- Your own files, or files on a note workout_notes' RLS already lets you read.
DROP POLICY IF EXISTS "voice_notes_select" ON storage.objects;
CREATE POLICY "voice_notes_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'voice-notes'
    AND (SELECT is_active_account())
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR EXISTS (SELECT 1 FROM workout_notes n WHERE n.audio_path = objects.name)
    )
  );

-- ─── Rows may only point at people and workouts you coach ────

-- wn_update_own checks the author only: an UPDATE could otherwise drop a note
-- onto a stranger's workout, past the check wn_insert makes.
CREATE OR REPLACE FUNCTION guard_workout_note_move()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF is_client_role() AND NEW.workout_id IS DISTINCT FROM OLD.workout_id THEN
    RAISE EXCEPTION 'A note cannot move to another workout';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_workout_notes_guard ON workout_notes;
CREATE TRIGGER trg_workout_notes_guard BEFORE UPDATE ON workout_notes
  FOR EACH ROW EXECUTE FUNCTION guard_workout_note_move();

-- An existing assignment stays valid after the client leaves the team, so the
-- trainer's offline sync is not left with a row it can never push.
CREATE OR REPLACE FUNCTION guard_program_assignment()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF is_client_role()
     AND NEW.assigned_to_user_id IS NOT NULL
     AND NEW.assigned_to_user_id <> auth.uid()
     AND NOT is_my_client(NEW.assigned_to_user_id)
     AND NOT EXISTS (
       SELECT 1 FROM programs p
       WHERE p.id = NEW.id AND p.assigned_to_user_id = NEW.assigned_to_user_id
     ) THEN
    RAISE EXCEPTION 'A program can only be assigned to your own client';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_programs_guard ON programs;
CREATE TRIGGER trg_programs_guard BEFORE INSERT OR UPDATE ON programs
  FOR EACH ROW EXECUTE FUNCTION guard_program_assignment();

-- NOT VALID: applies to new writes, without judging what is already stored.
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_body_length;
ALTER TABLE messages ADD CONSTRAINT messages_body_length
  CHECK (char_length(body) <= 10000) NOT VALID;
ALTER TABLE workout_notes DROP CONSTRAINT IF EXISTS workout_notes_body_length;
ALTER TABLE workout_notes ADD CONSTRAINT workout_notes_body_length
  CHECK (char_length(body) <= 10000) NOT VALID;

-- ─── Account deletion ────────────────────────────────────────

-- Supabase refuses direct DELETEs on storage.objects, which aborted the whole
-- deletion. The app now removes the files through the Storage API first.

CREATE OR REPLACE FUNCTION delete_my_account()
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  DELETE FROM workout_notes WHERE user_id = v_user_id;

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

COMMIT;


-- 022_workout_program_day.sql
-- Which day of its program a workout was started from. Until now the link
-- was only the workout's title, so renaming the workout or the program lost
-- the program's targets. NULL for free sessions and older workouts.
--
-- Deploy: apply this file first, then the code. The app sends this column
-- with every new workout, and the server refuses a column it does not know.

ALTER TABLE workouts ADD COLUMN IF NOT EXISTS program_day_index INT;


-- 023_program_templates.sql
-- The ready-made programs, moved from the app's code into a table so an admin
-- can create, copy, edit, hide or delete them without a new release.
-- If this table is missing or unreachable the app falls back to its built-in list.
--
-- Safe to re-run. All-or-nothing: wrapped in one transaction.

BEGIN;

CREATE TABLE IF NOT EXISTS program_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  goal TEXT NOT NULL DEFAULT 'general' CHECK (goal IN ('strength','hypertrophy','fat_loss','general')),
  level TEXT NOT NULL DEFAULT 'beginner' CHECK (level IN ('beginner','intermediate','advanced')),
  days_per_week INT NOT NULL DEFAULT 3,
  home_friendly BOOLEAN NOT NULL DEFAULT false,
  structure JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_published BOOLEAN NOT NULL DEFAULT false,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_program_templates_updated ON program_templates;
CREATE TRIGGER trg_program_templates_updated BEFORE UPDATE ON program_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE program_templates ENABLE ROW LEVEL SECURITY;

-- Everyone active sees what is published; hidden ones are for admins only.
DROP POLICY IF EXISTS "pt_read" ON program_templates;
CREATE POLICY "pt_read" ON program_templates
  FOR SELECT TO authenticated
  USING (is_app_admin() OR (is_published AND (SELECT is_active_account())));

DROP POLICY IF EXISTS "pt_admin_all" ON program_templates;
CREATE POLICY "pt_admin_all" ON program_templates
  FOR ALL TO authenticated
  USING (is_app_admin()) WITH CHECK (is_app_admin());

-- First fill only: never brings back a program an admin has since deleted.
DO $seed$
BEGIN
  IF EXISTS (SELECT 1 FROM program_templates) THEN RETURN; END IF;
  INSERT INTO program_templates (name, description, goal, level, days_per_week, home_friendly, structure, is_published, sort_order) VALUES ('Full Body — Beginner', 'Three full-body sessions a week. The simplest, most effective way to start.', 'general', 'beginner', 3, false, '[{"name":"Day A","exercises":[{"exerciseName":"Back Squat","targetSets":3,"targetReps":"8-10","restSec":120},{"exerciseName":"Barbell Bench Press","targetSets":3,"targetReps":"8-10","restSec":120},{"exerciseName":"Seated Cable Row","targetSets":3,"targetReps":"10-12","restSec":90},{"exerciseName":"Plank","targetSets":3,"targetReps":"30-45s","restSec":60}]},{"name":"Day B","exercises":[{"exerciseName":"Romanian Deadlift","targetSets":3,"targetReps":"8-10","restSec":120},{"exerciseName":"Overhead Press","targetSets":3,"targetReps":"8-10","restSec":120},{"exerciseName":"Lat Pulldown","targetSets":3,"targetReps":"10-12","restSec":90},{"exerciseName":"Hanging Leg Raise","targetSets":3,"targetReps":"10-15","restSec":60}]},{"name":"Day C","exercises":[{"exerciseName":"Leg Press","targetSets":3,"targetReps":"10-12","restSec":90},{"exerciseName":"Incline Dumbbell Press","targetSets":3,"targetReps":"10-12","restSec":90},{"exerciseName":"Dumbbell Row","targetSets":3,"targetReps":"10-12","restSec":90},{"exerciseName":"Cable Crunch","targetSets":3,"targetReps":"12-15","restSec":60}]}]'::jsonb, true, 0);
  INSERT INTO program_templates (name, description, goal, level, days_per_week, home_friendly, structure, is_published, sort_order) VALUES ('Strength 5×5', 'Classic linear-progression barbell strength program. Add weight every session.', 'strength', 'beginner', 3, false, '[{"name":"Workout A","exercises":[{"exerciseName":"Back Squat","targetSets":5,"targetReps":"5","restSec":180},{"exerciseName":"Barbell Bench Press","targetSets":5,"targetReps":"5","restSec":180},{"exerciseName":"Barbell Row","targetSets":5,"targetReps":"5","restSec":180}]},{"name":"Workout B","exercises":[{"exerciseName":"Back Squat","targetSets":5,"targetReps":"5","restSec":180},{"exerciseName":"Overhead Press","targetSets":5,"targetReps":"5","restSec":180},{"exerciseName":"Deadlift","targetSets":1,"targetReps":"5","restSec":180}]}]'::jsonb, true, 10);
  INSERT INTO program_templates (name, description, goal, level, days_per_week, home_friendly, structure, is_published, sort_order) VALUES ('Upper / Lower Split', 'Four days a week split into upper- and lower-body sessions. Great balance of volume and recovery.', 'hypertrophy', 'intermediate', 4, false, '[{"name":"Upper A","exercises":[{"exerciseName":"Barbell Bench Press","targetSets":4,"targetReps":"6-8","restSec":120},{"exerciseName":"Barbell Row","targetSets":4,"targetReps":"6-8","restSec":120},{"exerciseName":"Overhead Press","targetSets":3,"targetReps":"8-10","restSec":90},{"exerciseName":"Lat Pulldown","targetSets":3,"targetReps":"10-12","restSec":90},{"exerciseName":"Barbell Curl","targetSets":3,"targetReps":"10-12","restSec":60},{"exerciseName":"Triceps Pushdown","targetSets":3,"targetReps":"10-12","restSec":60}]},{"name":"Lower A","exercises":[{"exerciseName":"Back Squat","targetSets":4,"targetReps":"6-8","restSec":150},{"exerciseName":"Romanian Deadlift","targetSets":3,"targetReps":"8-10","restSec":120},{"exerciseName":"Leg Press","targetSets":3,"targetReps":"10-12","restSec":90},{"exerciseName":"Leg Curl","targetSets":3,"targetReps":"12-15","restSec":60},{"exerciseName":"Standing Calf Raise","targetSets":4,"targetReps":"12-15","restSec":60}]},{"name":"Upper B","exercises":[{"exerciseName":"Incline Dumbbell Press","targetSets":4,"targetReps":"8-10","restSec":90},{"exerciseName":"Seated Cable Row","targetSets":4,"targetReps":"8-10","restSec":90},{"exerciseName":"Lateral Raise","targetSets":4,"targetReps":"12-15","restSec":60},{"exerciseName":"Pull-up","targetSets":3,"targetReps":"AMRAP","restSec":90},{"exerciseName":"Hammer Curl","targetSets":3,"targetReps":"10-12","restSec":60},{"exerciseName":"Overhead Triceps Extension","targetSets":3,"targetReps":"10-12","restSec":60}]},{"name":"Lower B","exercises":[{"exerciseName":"Front Squat","targetSets":4,"targetReps":"8-10","restSec":150},{"exerciseName":"Hip Thrust","targetSets":3,"targetReps":"10-12","restSec":90},{"exerciseName":"Bulgarian Split Squat","targetSets":3,"targetReps":"10-12","restSec":90},{"exerciseName":"Leg Extension","targetSets":3,"targetReps":"12-15","restSec":60},{"exerciseName":"Standing Calf Raise","targetSets":4,"targetReps":"12-15","restSec":60}]}]'::jsonb, true, 20);
  INSERT INTO program_templates (name, description, goal, level, days_per_week, home_friendly, structure, is_published, sort_order) VALUES ('Push / Pull / Legs', 'Six high-volume days for advanced lifters chasing maximum muscle growth.', 'hypertrophy', 'advanced', 6, false, '[{"name":"Push","exercises":[{"exerciseName":"Barbell Bench Press","targetSets":4,"targetReps":"6-8","restSec":120},{"exerciseName":"Overhead Press","targetSets":4,"targetReps":"8-10","restSec":90},{"exerciseName":"Incline Dumbbell Press","targetSets":3,"targetReps":"10-12","restSec":90},{"exerciseName":"Lateral Raise","targetSets":4,"targetReps":"12-15","restSec":60},{"exerciseName":"Triceps Pushdown","targetSets":3,"targetReps":"10-12","restSec":60},{"exerciseName":"Overhead Triceps Extension","targetSets":3,"targetReps":"12-15","restSec":60}]},{"name":"Pull","exercises":[{"exerciseName":"Deadlift","targetSets":3,"targetReps":"5","restSec":180},{"exerciseName":"Pull-up","targetSets":4,"targetReps":"8-10","restSec":90},{"exerciseName":"Barbell Row","targetSets":4,"targetReps":"8-10","restSec":120},{"exerciseName":"Face Pull","targetSets":3,"targetReps":"15-20","restSec":60},{"exerciseName":"Barbell Curl","targetSets":3,"targetReps":"10-12","restSec":60},{"exerciseName":"Hammer Curl","targetSets":3,"targetReps":"12-15","restSec":60}]},{"name":"Legs","exercises":[{"exerciseName":"Back Squat","targetSets":4,"targetReps":"6-8","restSec":150},{"exerciseName":"Romanian Deadlift","targetSets":3,"targetReps":"8-10","restSec":120},{"exerciseName":"Leg Press","targetSets":3,"targetReps":"12-15","restSec":90},{"exerciseName":"Leg Curl","targetSets":3,"targetReps":"12-15","restSec":60},{"exerciseName":"Leg Extension","targetSets":3,"targetReps":"15-20","restSec":60},{"exerciseName":"Standing Calf Raise","targetSets":4,"targetReps":"15-20","restSec":60}]}]'::jsonb, true, 30);
  INSERT INTO program_templates (name, description, goal, level, days_per_week, home_friendly, structure, is_published, sort_order) VALUES ('Lean & Strong', 'Full-body circuits with short rest to keep the heart rate up while preserving muscle in a cut.', 'fat_loss', 'intermediate', 3, false, '[{"name":"Circuit A","exercises":[{"exerciseName":"Back Squat","targetSets":3,"targetReps":"12-15","restSec":45},{"exerciseName":"Push-up","targetSets":3,"targetReps":"AMRAP","restSec":45},{"exerciseName":"Seated Cable Row","targetSets":3,"targetReps":"12-15","restSec":45},{"exerciseName":"Walking Lunge","targetSets":3,"targetReps":"20","restSec":45},{"exerciseName":"Plank","targetSets":3,"targetReps":"45s","restSec":45}]},{"name":"Circuit B","exercises":[{"exerciseName":"Romanian Deadlift","targetSets":3,"targetReps":"12-15","restSec":45},{"exerciseName":"Overhead Press","targetSets":3,"targetReps":"12-15","restSec":45},{"exerciseName":"Lat Pulldown","targetSets":3,"targetReps":"12-15","restSec":45},{"exerciseName":"Hip Thrust","targetSets":3,"targetReps":"15-20","restSec":45},{"exerciseName":"Russian Twist","targetSets":3,"targetReps":"20","restSec":45}]}]'::jsonb, true, 40);
  INSERT INTO program_templates (name, description, goal, level, days_per_week, home_friendly, structure, is_published, sort_order) VALUES ('Home Dumbbell', 'A complete plan needing only a pair of dumbbells — perfect for training at home.', 'general', 'beginner', 3, true, '[{"name":"Full Body A","exercises":[{"exerciseName":"Bulgarian Split Squat","targetSets":3,"targetReps":"10-12","restSec":90},{"exerciseName":"Dumbbell Bench Press","targetSets":3,"targetReps":"10-12","restSec":90},{"exerciseName":"Dumbbell Row","targetSets":3,"targetReps":"10-12","restSec":90},{"exerciseName":"Lateral Raise","targetSets":3,"targetReps":"12-15","restSec":60},{"exerciseName":"Plank","targetSets":3,"targetReps":"30-45s","restSec":60}]},{"name":"Full Body B","exercises":[{"exerciseName":"Romanian Deadlift","targetSets":3,"targetReps":"10-12","restSec":90},{"exerciseName":"Incline Dumbbell Press","targetSets":3,"targetReps":"10-12","restSec":90},{"exerciseName":"Hammer Curl","targetSets":3,"targetReps":"12-15","restSec":60},{"exerciseName":"Walking Lunge","targetSets":3,"targetReps":"20","restSec":90},{"exerciseName":"Hanging Leg Raise","targetSets":3,"targetReps":"10-15","restSec":60}]}]'::jsonb, true, 50);
  INSERT INTO program_templates (name, description, goal, level, days_per_week, home_friendly, structure, is_published, sort_order) VALUES ('Essentiel 2 jours', 'Deux séances complètes par semaine, pour progresser avec un emploi du temps chargé.', 'general', 'beginner', 2, false, '[{"name":"Séance A","exercises":[{"exerciseName":"Back Squat","targetSets":3,"targetReps":"8-10","restSec":120},{"exerciseName":"Barbell Bench Press","targetSets":3,"targetReps":"8-10","restSec":120},{"exerciseName":"Lat Pulldown","targetSets":3,"targetReps":"10-12","restSec":90},{"exerciseName":"Plank","targetSets":3,"targetReps":"30-45s","restSec":60}]},{"name":"Séance B","exercises":[{"exerciseName":"Romanian Deadlift","targetSets":3,"targetReps":"8-10","restSec":120},{"exerciseName":"Overhead Press","targetSets":3,"targetReps":"8-10","restSec":120},{"exerciseName":"Seated Cable Row","targetSets":3,"targetReps":"10-12","restSec":90},{"exerciseName":"Hanging Leg Raise","targetSets":3,"targetReps":"10-12","restSec":60}]}]'::jsonb, true, 60);
  INSERT INTO program_templates (name, description, goal, level, days_per_week, home_friendly, structure, is_published, sort_order) VALUES ('Remise en forme', 'Une reprise en douceur, sur machines et haltères, pour retrouver de bonnes habitudes.', 'general', 'beginner', 3, false, '[{"name":"Jour 1","exercises":[{"exerciseName":"Leg Press","targetSets":3,"targetReps":"12-15","restSec":90},{"exerciseName":"Dumbbell Bench Press","targetSets":3,"targetReps":"12-15","restSec":90},{"exerciseName":"Lat Pulldown","targetSets":3,"targetReps":"12-15","restSec":90},{"exerciseName":"Plank","targetSets":3,"targetReps":"20-30s","restSec":60}]},{"name":"Jour 2","exercises":[{"exerciseName":"Walking Lunge","targetSets":3,"targetReps":"10-12","restSec":90},{"exerciseName":"Seated Dumbbell Press","targetSets":3,"targetReps":"12-15","restSec":90},{"exerciseName":"Seated Cable Row","targetSets":3,"targetReps":"12-15","restSec":90},{"exerciseName":"Russian Twist","targetSets":3,"targetReps":"15-20","restSec":60}]},{"name":"Jour 3","exercises":[{"exerciseName":"Leg Curl","targetSets":3,"targetReps":"12-15","restSec":90},{"exerciseName":"Push-up","targetSets":3,"targetReps":"8-12","restSec":90},{"exerciseName":"Dumbbell Row","targetSets":3,"targetReps":"12-15","restSec":90},{"exerciseName":"Dumbbell Curl","targetSets":3,"targetReps":"12-15","restSec":60}]}]'::jsonb, true, 70);
  INSERT INTO program_templates (name, description, goal, level, days_per_week, home_friendly, structure, is_published, sort_order) VALUES ('Force 3×5', 'Peu de répétitions, des charges lourdes et de longs repos sur les grands mouvements.', 'strength', 'intermediate', 3, false, '[{"name":"Lourd A","exercises":[{"exerciseName":"Back Squat","targetSets":3,"targetReps":"5","restSec":180},{"exerciseName":"Barbell Bench Press","targetSets":3,"targetReps":"5","restSec":180},{"exerciseName":"Barbell Row","targetSets":3,"targetReps":"5","restSec":150}]},{"name":"Lourd B","exercises":[{"exerciseName":"Deadlift","targetSets":3,"targetReps":"5","restSec":210},{"exerciseName":"Overhead Press","targetSets":3,"targetReps":"5","restSec":180},{"exerciseName":"Pull-up","targetSets":3,"targetReps":"5-8","restSec":150}]},{"name":"Lourd C","exercises":[{"exerciseName":"Front Squat","targetSets":3,"targetReps":"5","restSec":180},{"exerciseName":"Incline Barbell Bench Press","targetSets":3,"targetReps":"5","restSec":180},{"exerciseName":"T-Bar Row","targetSets":3,"targetReps":"5","restSec":150}]}]'::jsonb, true, 80);
  INSERT INTO program_templates (name, description, goal, level, days_per_week, home_friendly, structure, is_published, sort_order) VALUES ('Prise de masse 5 jours', 'Un groupe musculaire par séance et beaucoup de volume, pour les pratiquants réguliers.', 'hypertrophy', 'advanced', 5, false, '[{"name":"Pectoraux","exercises":[{"exerciseName":"Barbell Bench Press","targetSets":4,"targetReps":"6-8","restSec":150},{"exerciseName":"Incline Dumbbell Press","targetSets":4,"targetReps":"8-10","restSec":120},{"exerciseName":"Chest Dip","targetSets":3,"targetReps":"8-12","restSec":90},{"exerciseName":"Cable Fly","targetSets":3,"targetReps":"12-15","restSec":60}]},{"name":"Dos","exercises":[{"exerciseName":"Deadlift","targetSets":3,"targetReps":"5-6","restSec":180},{"exerciseName":"Pull-up","targetSets":4,"targetReps":"6-10","restSec":120},{"exerciseName":"Barbell Row","targetSets":4,"targetReps":"8-10","restSec":120},{"exerciseName":"Seated Cable Row","targetSets":3,"targetReps":"10-12","restSec":90}]},{"name":"Jambes","exercises":[{"exerciseName":"Back Squat","targetSets":4,"targetReps":"6-8","restSec":180},{"exerciseName":"Leg Press","targetSets":4,"targetReps":"10-12","restSec":120},{"exerciseName":"Leg Curl","targetSets":4,"targetReps":"10-12","restSec":90},{"exerciseName":"Standing Calf Raise","targetSets":4,"targetReps":"12-15","restSec":60}]},{"name":"Épaules","exercises":[{"exerciseName":"Overhead Press","targetSets":4,"targetReps":"6-8","restSec":150},{"exerciseName":"Lateral Raise","targetSets":4,"targetReps":"12-15","restSec":60},{"exerciseName":"Rear Delt Fly","targetSets":4,"targetReps":"12-15","restSec":60},{"exerciseName":"Face Pull","targetSets":3,"targetReps":"15-20","restSec":60}]},{"name":"Bras","exercises":[{"exerciseName":"Barbell Curl","targetSets":4,"targetReps":"8-10","restSec":90},{"exerciseName":"Skull Crusher","targetSets":4,"targetReps":"8-10","restSec":90},{"exerciseName":"Hammer Curl","targetSets":3,"targetReps":"10-12","restSec":60},{"exerciseName":"Triceps Pushdown","targetSets":3,"targetReps":"10-12","restSec":60}]}]'::jsonb, true, 90);
  INSERT INTO program_templates (name, description, goal, level, days_per_week, home_friendly, structure, is_published, sort_order) VALUES ('Fessiers et jambes', 'Trois séances centrées sur le bas du corps, avec un travail complet des fessiers.', 'hypertrophy', 'intermediate', 3, false, '[{"name":"Fessiers","exercises":[{"exerciseName":"Hip Thrust","targetSets":4,"targetReps":"8-10","restSec":120},{"exerciseName":"Bulgarian Split Squat","targetSets":3,"targetReps":"10-12","restSec":90},{"exerciseName":"Romanian Deadlift","targetSets":3,"targetReps":"10-12","restSec":90},{"exerciseName":"Plank","targetSets":3,"targetReps":"30-45s","restSec":60}]},{"name":"Quadriceps","exercises":[{"exerciseName":"Back Squat","targetSets":4,"targetReps":"8-10","restSec":150},{"exerciseName":"Leg Press","targetSets":3,"targetReps":"10-12","restSec":120},{"exerciseName":"Leg Extension","targetSets":3,"targetReps":"12-15","restSec":60},{"exerciseName":"Standing Calf Raise","targetSets":3,"targetReps":"12-15","restSec":60}]},{"name":"Ischios","exercises":[{"exerciseName":"Deadlift","targetSets":3,"targetReps":"6-8","restSec":180},{"exerciseName":"Leg Curl","targetSets":4,"targetReps":"10-12","restSec":90},{"exerciseName":"Walking Lunge","targetSets":3,"targetReps":"12-14","restSec":90},{"exerciseName":"Hanging Leg Raise","targetSets":3,"targetReps":"10-12","restSec":60}]}]'::jsonb, true, 100);
  INSERT INTO program_templates (name, description, goal, level, days_per_week, home_friendly, structure, is_published, sort_order) VALUES ('Haltères 4 jours', 'Haut et bas du corps en alternance, uniquement avec des haltères.', 'hypertrophy', 'intermediate', 4, true, '[{"name":"Haut A","exercises":[{"exerciseName":"Dumbbell Bench Press","targetSets":4,"targetReps":"8-10","restSec":120},{"exerciseName":"Dumbbell Row","targetSets":4,"targetReps":"8-10","restSec":120},{"exerciseName":"Lateral Raise","targetSets":3,"targetReps":"12-15","restSec":60},{"exerciseName":"Dumbbell Curl","targetSets":3,"targetReps":"10-12","restSec":60}]},{"name":"Bas A","exercises":[{"exerciseName":"Bulgarian Split Squat","targetSets":4,"targetReps":"8-10","restSec":120},{"exerciseName":"Romanian Deadlift","targetSets":4,"targetReps":"10-12","restSec":120},{"exerciseName":"Standing Calf Raise","targetSets":3,"targetReps":"15-20","restSec":60},{"exerciseName":"Plank","targetSets":3,"targetReps":"30-45s","restSec":60}]},{"name":"Haut B","exercises":[{"exerciseName":"Incline Dumbbell Press","targetSets":4,"targetReps":"8-10","restSec":120},{"exerciseName":"Seated Dumbbell Press","targetSets":3,"targetReps":"8-10","restSec":120},{"exerciseName":"Rear Delt Fly","targetSets":3,"targetReps":"12-15","restSec":60},{"exerciseName":"Hammer Curl","targetSets":3,"targetReps":"10-12","restSec":60}]},{"name":"Bas B","exercises":[{"exerciseName":"Walking Lunge","targetSets":4,"targetReps":"10-12","restSec":120},{"exerciseName":"Hip Thrust","targetSets":4,"targetReps":"10-12","restSec":120},{"exerciseName":"Russian Twist","targetSets":3,"targetReps":"15-20","restSec":60}]}]'::jsonb, true, 110);
  INSERT INTO program_templates (name, description, goal, level, days_per_week, home_friendly, structure, is_published, sort_order) VALUES ('Poids du corps', 'Aucun matériel sauf une barre de traction : à faire partout, tout le temps.', 'general', 'beginner', 3, true, '[{"name":"Poussée","exercises":[{"exerciseName":"Push-up","targetSets":4,"targetReps":"10-15","restSec":90},{"exerciseName":"Chest Dip","targetSets":3,"targetReps":"6-10","restSec":90},{"exerciseName":"Plank","targetSets":3,"targetReps":"30-45s","restSec":60}]},{"name":"Tirage","exercises":[{"exerciseName":"Pull-up","targetSets":4,"targetReps":"5-8","restSec":120},{"exerciseName":"Chin-up","targetSets":3,"targetReps":"5-8","restSec":120},{"exerciseName":"Hanging Leg Raise","targetSets":3,"targetReps":"8-12","restSec":60}]},{"name":"Jambes","exercises":[{"exerciseName":"Walking Lunge","targetSets":4,"targetReps":"12-16","restSec":90},{"exerciseName":"Bulgarian Split Squat","targetSets":3,"targetReps":"10-12","restSec":90},{"exerciseName":"Russian Twist","targetSets":3,"targetReps":"15-20","restSec":60}]}]'::jsonb, true, 120);
  INSERT INTO program_templates (name, description, goal, level, days_per_week, home_friendly, structure, is_published, sort_order) VALUES ('Sèche 4 jours', 'Des séances denses avec peu de repos, pour perdre du gras en gardant du muscle.', 'fat_loss', 'intermediate', 4, false, '[{"name":"Haut dense","exercises":[{"exerciseName":"Barbell Bench Press","targetSets":4,"targetReps":"10-12","restSec":60},{"exerciseName":"Barbell Row","targetSets":4,"targetReps":"10-12","restSec":60},{"exerciseName":"Seated Dumbbell Press","targetSets":3,"targetReps":"12-15","restSec":45},{"exerciseName":"Triceps Pushdown","targetSets":3,"targetReps":"12-15","restSec":45}]},{"name":"Bas dense","exercises":[{"exerciseName":"Back Squat","targetSets":4,"targetReps":"10-12","restSec":75},{"exerciseName":"Romanian Deadlift","targetSets":3,"targetReps":"12-15","restSec":60},{"exerciseName":"Walking Lunge","targetSets":3,"targetReps":"12-16","restSec":45},{"exerciseName":"Cable Crunch","targetSets":3,"targetReps":"15-20","restSec":45}]},{"name":"Circuit haut","exercises":[{"exerciseName":"Push-up","targetSets":4,"targetReps":"12-20","restSec":30},{"exerciseName":"Lat Pulldown","targetSets":4,"targetReps":"12-15","restSec":45},{"exerciseName":"Lateral Raise","targetSets":3,"targetReps":"15-20","restSec":30},{"exerciseName":"Face Pull","targetSets":3,"targetReps":"15-20","restSec":30}]},{"name":"Circuit bas","exercises":[{"exerciseName":"Leg Press","targetSets":4,"targetReps":"15-20","restSec":45},{"exerciseName":"Leg Curl","targetSets":3,"targetReps":"15-20","restSec":45},{"exerciseName":"Hip Thrust","targetSets":3,"targetReps":"12-15","restSec":45},{"exerciseName":"Plank","targetSets":3,"targetReps":"45-60s","restSec":30}]}]'::jsonb, true, 130);
END $seed$;

COMMIT;


-- 024_endurance.sql
-- Endurance sessions (a workout with a sport, distance and time), the exercises
-- that strengthening for runners and swimmers needs, and the plans themselves.
--
-- Deploy: apply this file first, then the code. The app sends the new workout
-- columns, and the server refuses columns it does not know.
--
-- Safe to re-run. All-or-nothing: wrapped in one transaction.

BEGIN;

ALTER TABLE workouts ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'strength';
ALTER TABLE workouts ADD COLUMN IF NOT EXISTS sport TEXT;
ALTER TABLE workouts ADD COLUMN IF NOT EXISTS distance_m NUMERIC;
ALTER TABLE workouts ADD COLUMN IF NOT EXISTS duration_sec INT;

ALTER TABLE program_templates DROP CONSTRAINT IF EXISTS program_templates_goal_check;
ALTER TABLE program_templates ADD CONSTRAINT program_templates_goal_check
  CHECK (goal IN ('strength','hypertrophy','fat_loss','general','endurance'));

INSERT INTO exercises (user_id, name, muscle_group, equipment, is_custom, description)
SELECT NULL, v.name, v.muscle_group, v.equipment, false, v.description
FROM (VALUES
  ('Side Plank', 'core', 'bodyweight', 'On one forearm, body in a straight line, hips high. Hold without sagging.'),
  ('Dead Bug', 'core', 'bodyweight', 'On your back, lower the opposite arm and leg slowly while keeping the lower back flat.'),
  ('Bird Dog', 'core', 'bodyweight', 'On all fours, extend the opposite arm and leg, pause, return without twisting.'),
  ('Glute Bridge', 'legs', 'bodyweight', 'On your back, knees bent, drive the hips up and squeeze the glutes.'),
  ('Single-Leg Calf Raise', 'legs', 'bodyweight', 'On one foot, rise as high as possible, then lower slowly for three seconds.'),
  ('Step-up', 'legs', 'dumbbell', 'Step onto a box, drive through the front heel, lower under control.'),
  ('Single-Leg Romanian Deadlift', 'legs', 'dumbbell', 'Balance on one leg, hinge at the hip with a flat back, return by squeezing the glute.'),
  ('External Shoulder Rotation', 'shoulders', 'cable', 'Elbow pinned to your side, rotate the forearm outward slowly. Light weight.'),
  ('Straight-Arm Pulldown', 'back', 'cable', 'Arms almost straight, pull the bar to the thighs using the lats.')
) AS v(name, muscle_group, equipment, description)
WHERE NOT EXISTS (SELECT 1 FROM exercises e WHERE e.user_id IS NULL AND e.name = v.name);

-- By name, so a program an admin has renamed is not added a second time on a re-run.
INSERT INTO program_templates (name, description, goal, level, days_per_week, home_friendly, structure, is_published, sort_order)
SELECT 'Marathon en 16 semaines', 'Quatre sorties par semaine, sortie longue jusqu''à 32 km, puis affûtage. Avis médical conseillé avant de commencer. À adapter à vos sensations.', 'endurance', 'intermediate', 4, false, '[{"name":"S1 · Footing","week":1,"exercises":[],"cardio":{"sport":"run","distanceKm":7,"intensity":"Zone 2","notes":"Allure confortable : vous devez pouvoir parler."}},{"name":"S1 · Seuil","week":1,"exercises":[],"cardio":{"sport":"run","distanceKm":9,"intensity":"Zone 4","notes":"15 min d''échauffement, 2 × 10 min à allure soutenue, 5 min de récupération entre les blocs."}},{"name":"S1 · Récupération","week":1,"exercises":[],"cardio":{"sport":"run","distanceKm":5,"intensity":"Zone 1","notes":"Très facile, pour récupérer."}},{"name":"S1 · Sortie longue","week":1,"exercises":[],"cardio":{"sport":"run","distanceKm":12,"intensity":"Zone 2","notes":"Allure régulière, hydratez-vous."}},{"name":"S2 · Footing","week":2,"exercises":[],"cardio":{"sport":"run","distanceKm":8,"intensity":"Zone 2","notes":"Allure confortable : vous devez pouvoir parler."}},{"name":"S2 · Fractionné","week":2,"exercises":[],"cardio":{"sport":"run","distanceKm":10,"intensity":"Zone 5","notes":"15 min d''échauffement, 6 × 800 m rapides, 2 min de récupération entre chaque."}},{"name":"S2 · Récupération","week":2,"exercises":[],"cardio":{"sport":"run","distanceKm":6,"intensity":"Zone 1","notes":"Très facile, pour récupérer."}},{"name":"S2 · Sortie longue","week":2,"exercises":[],"cardio":{"sport":"run","distanceKm":14,"intensity":"Zone 2","notes":"Allure régulière, hydratez-vous."}},{"name":"S3 · Footing","week":3,"exercises":[],"cardio":{"sport":"run","distanceKm":8,"intensity":"Zone 2","notes":"Allure confortable : vous devez pouvoir parler."}},{"name":"S3 · Seuil","week":3,"exercises":[],"cardio":{"sport":"run","distanceKm":10,"intensity":"Zone 4","notes":"15 min d''échauffement, 2 × 10 min à allure soutenue, 5 min de récupération entre les blocs."}},{"name":"S3 · Récupération","week":3,"exercises":[],"cardio":{"sport":"run","distanceKm":6,"intensity":"Zone 1","notes":"Très facile, pour récupérer."}},{"name":"S3 · Sortie longue","week":3,"exercises":[],"cardio":{"sport":"run","distanceKm":16,"intensity":"Zone 2","notes":"Allure régulière, hydratez-vous."}},{"name":"S4 · Footing","week":4,"exercises":[],"cardio":{"sport":"run","distanceKm":8,"intensity":"Zone 2","notes":"Allure confortable : vous devez pouvoir parler."}},{"name":"S4 · Fractionné","week":4,"exercises":[],"cardio":{"sport":"run","distanceKm":10,"intensity":"Zone 5","notes":"15 min d''échauffement, 6 × 800 m rapides, 2 min de récupération entre chaque."}},{"name":"S4 · Récupération","week":4,"exercises":[],"cardio":{"sport":"run","distanceKm":6,"intensity":"Zone 1","notes":"Très facile, pour récupérer."}},{"name":"S4 · Sortie longue","week":4,"exercises":[],"cardio":{"sport":"run","distanceKm":13,"intensity":"Zone 2","notes":"Allure régulière, hydratez-vous."}},{"name":"S5 · Footing","week":5,"exercises":[],"cardio":{"sport":"run","distanceKm":9,"intensity":"Zone 2","notes":"Allure confortable : vous devez pouvoir parler."}},{"name":"S5 · Seuil","week":5,"exercises":[],"cardio":{"sport":"run","distanceKm":11,"intensity":"Zone 4","notes":"15 min d''échauffement, 2 × 10 min à allure soutenue, 5 min de récupération entre les blocs."}},{"name":"S5 · Récupération","week":5,"exercises":[],"cardio":{"sport":"run","distanceKm":7,"intensity":"Zone 1","notes":"Très facile, pour récupérer."}},{"name":"S5 · Sortie longue","week":5,"exercises":[],"cardio":{"sport":"run","distanceKm":18,"intensity":"Zone 2","notes":"Allure régulière, hydratez-vous."}},{"name":"S6 · Footing","week":6,"exercises":[],"cardio":{"sport":"run","distanceKm":9,"intensity":"Zone 2","notes":"Allure confortable : vous devez pouvoir parler."}},{"name":"S6 · Fractionné","week":6,"exercises":[],"cardio":{"sport":"run","distanceKm":11,"intensity":"Zone 5","notes":"15 min d''échauffement, 6 × 800 m rapides, 2 min de récupération entre chaque."}},{"name":"S6 · Récupération","week":6,"exercises":[],"cardio":{"sport":"run","distanceKm":7,"intensity":"Zone 1","notes":"Très facile, pour récupérer."}},{"name":"S6 · Sortie longue","week":6,"exercises":[],"cardio":{"sport":"run","distanceKm":20,"intensity":"Zone 2","notes":"Allure régulière, hydratez-vous."}},{"name":"S7 · Footing","week":7,"exercises":[],"cardio":{"sport":"run","distanceKm":9,"intensity":"Zone 2","notes":"Allure confortable : vous devez pouvoir parler."}},{"name":"S7 · Seuil","week":7,"exercises":[],"cardio":{"sport":"run","distanceKm":11,"intensity":"Zone 4","notes":"15 min d''échauffement, 2 × 10 min à allure soutenue, 5 min de récupération entre les blocs."}},{"name":"S7 · Récupération","week":7,"exercises":[],"cardio":{"sport":"run","distanceKm":7,"intensity":"Zone 1","notes":"Très facile, pour récupérer."}},{"name":"S7 · Sortie longue","week":7,"exercises":[],"cardio":{"sport":"run","distanceKm":22,"intensity":"Zone 2","notes":"Allure régulière, hydratez-vous."}},{"name":"S8 · Footing","week":8,"exercises":[],"cardio":{"sport":"run","distanceKm":8,"intensity":"Zone 2","notes":"Allure confortable : vous devez pouvoir parler."}},{"name":"S8 · Fractionné","week":8,"exercises":[],"cardio":{"sport":"run","distanceKm":10,"intensity":"Zone 5","notes":"15 min d''échauffement, 6 × 800 m rapides, 2 min de récupération entre chaque."}},{"name":"S8 · Récupération","week":8,"exercises":[],"cardio":{"sport":"run","distanceKm":6,"intensity":"Zone 1","notes":"Très facile, pour récupérer."}},{"name":"S8 · Sortie longue","week":8,"exercises":[],"cardio":{"sport":"run","distanceKm":16,"intensity":"Zone 2","notes":"Allure régulière, hydratez-vous."}},{"name":"S9 · Footing","week":9,"exercises":[],"cardio":{"sport":"run","distanceKm":10,"intensity":"Zone 2","notes":"Allure confortable : vous devez pouvoir parler."}},{"name":"S9 · Seuil","week":9,"exercises":[],"cardio":{"sport":"run","distanceKm":12,"intensity":"Zone 4","notes":"15 min d''échauffement, 2 × 10 min à allure soutenue, 5 min de récupération entre les blocs."}},{"name":"S9 · Récupération","week":9,"exercises":[],"cardio":{"sport":"run","distanceKm":8,"intensity":"Zone 1","notes":"Très facile, pour récupérer."}},{"name":"S9 · Sortie longue","week":9,"exercises":[],"cardio":{"sport":"run","distanceKm":24,"intensity":"Zone 2","notes":"Allure régulière, hydratez-vous."}},{"name":"S10 · Footing","week":10,"exercises":[],"cardio":{"sport":"run","distanceKm":10,"intensity":"Zone 2","notes":"Allure confortable : vous devez pouvoir parler."}},{"name":"S10 · Fractionné","week":10,"exercises":[],"cardio":{"sport":"run","distanceKm":12,"intensity":"Zone 5","notes":"15 min d''échauffement, 6 × 800 m rapides, 2 min de récupération entre chaque."}},{"name":"S10 · Récupération","week":10,"exercises":[],"cardio":{"sport":"run","distanceKm":8,"intensity":"Zone 1","notes":"Très facile, pour récupérer."}},{"name":"S10 · Sortie longue","week":10,"exercises":[],"cardio":{"sport":"run","distanceKm":26,"intensity":"Zone 2","notes":"Allure régulière, hydratez-vous."}},{"name":"S11 · Footing","week":11,"exercises":[],"cardio":{"sport":"run","distanceKm":11,"intensity":"Zone 2","notes":"Allure confortable : vous devez pouvoir parler."}},{"name":"S11 · Seuil","week":11,"exercises":[],"cardio":{"sport":"run","distanceKm":13,"intensity":"Zone 4","notes":"15 min d''échauffement, 2 × 10 min à allure soutenue, 5 min de récupération entre les blocs."}},{"name":"S11 · Récupération","week":11,"exercises":[],"cardio":{"sport":"run","distanceKm":9,"intensity":"Zone 1","notes":"Très facile, pour récupérer."}},{"name":"S11 · Sortie longue","week":11,"exercises":[],"cardio":{"sport":"run","distanceKm":28,"intensity":"Zone 2","notes":"Allure régulière, hydratez-vous."}},{"name":"S12 · Footing","week":12,"exercises":[],"cardio":{"sport":"run","distanceKm":9,"intensity":"Zone 2","notes":"Allure confortable : vous devez pouvoir parler."}},{"name":"S12 · Fractionné","week":12,"exercises":[],"cardio":{"sport":"run","distanceKm":11,"intensity":"Zone 5","notes":"15 min d''échauffement, 6 × 800 m rapides, 2 min de récupération entre chaque."}},{"name":"S12 · Récupération","week":12,"exercises":[],"cardio":{"sport":"run","distanceKm":7,"intensity":"Zone 1","notes":"Très facile, pour récupérer."}},{"name":"S12 · Sortie longue","week":12,"exercises":[],"cardio":{"sport":"run","distanceKm":20,"intensity":"Zone 2","notes":"Allure régulière, hydratez-vous."}},{"name":"S13 · Footing","week":13,"exercises":[],"cardio":{"sport":"run","distanceKm":11,"intensity":"Zone 2","notes":"Allure confortable : vous devez pouvoir parler."}},{"name":"S13 · Seuil","week":13,"exercises":[],"cardio":{"sport":"run","distanceKm":13,"intensity":"Zone 4","notes":"15 min d''échauffement, 2 × 10 min à allure soutenue, 5 min de récupération entre les blocs."}},{"name":"S13 · Récupération","week":13,"exercises":[],"cardio":{"sport":"run","distanceKm":9,"intensity":"Zone 1","notes":"Très facile, pour récupérer."}},{"name":"S13 · Sortie longue","week":13,"exercises":[],"cardio":{"sport":"run","distanceKm":32,"intensity":"Zone 2","notes":"Allure régulière, hydratez-vous."}},{"name":"S14 · Footing","week":14,"exercises":[],"cardio":{"sport":"run","distanceKm":10,"intensity":"Zone 2","notes":"Allure confortable : vous devez pouvoir parler."}},{"name":"S14 · Fractionné","week":14,"exercises":[],"cardio":{"sport":"run","distanceKm":12,"intensity":"Zone 5","notes":"15 min d''échauffement, 6 × 800 m rapides, 2 min de récupération entre chaque."}},{"name":"S14 · Récupération","week":14,"exercises":[],"cardio":{"sport":"run","distanceKm":8,"intensity":"Zone 1","notes":"Très facile, pour récupérer."}},{"name":"S14 · Sortie longue","week":14,"exercises":[],"cardio":{"sport":"run","distanceKm":24,"intensity":"Zone 2","notes":"Allure régulière, hydratez-vous."}},{"name":"S15 · Footing","week":15,"exercises":[],"cardio":{"sport":"run","distanceKm":8,"intensity":"Zone 2","notes":"Allure confortable : vous devez pouvoir parler."}},{"name":"S15 · Seuil","week":15,"exercises":[],"cardio":{"sport":"run","distanceKm":10,"intensity":"Zone 4","notes":"15 min d''échauffement, 2 × 10 min à allure soutenue, 5 min de récupération entre les blocs."}},{"name":"S15 · Récupération","week":15,"exercises":[],"cardio":{"sport":"run","distanceKm":6,"intensity":"Zone 1","notes":"Très facile, pour récupérer."}},{"name":"S15 · Sortie longue","week":15,"exercises":[],"cardio":{"sport":"run","distanceKm":16,"intensity":"Zone 2","notes":"Allure régulière, hydratez-vous."}},{"name":"S16 · Footing","week":16,"exercises":[],"cardio":{"sport":"run","distanceKm":6,"intensity":"Zone 2","notes":"Court et facile."}},{"name":"S16 · Rappel","week":16,"exercises":[],"cardio":{"sport":"run","distanceKm":4,"intensity":"Zone 3","notes":"Quelques accélérations de 30 s, sans forcer."}},{"name":"S16 · Marathon","week":16,"exercises":[],"cardio":{"sport":"run","distanceKm":42.2,"intensity":"Course","notes":"Partez prudemment, et bonne course !"}}]'::jsonb, true, 200
WHERE NOT EXISTS (SELECT 1 FROM program_templates WHERE name = 'Marathon en 16 semaines');

INSERT INTO program_templates (name, description, goal, level, days_per_week, home_friendly, structure, is_published, sort_order)
SELECT 'Semi-marathon en 12 semaines', 'Trois sorties par semaine pour courir 21 km sereinement. Avis médical conseillé avant de commencer. À adapter à vos sensations.', 'endurance', 'intermediate', 3, false, '[{"name":"S1 · Footing","week":1,"exercises":[],"cardio":{"sport":"run","distanceKm":6,"intensity":"Zone 2","notes":"Allure confortable : vous devez pouvoir parler."}},{"name":"S1 · Seuil","week":1,"exercises":[],"cardio":{"sport":"run","distanceKm":8,"intensity":"Zone 4","notes":"15 min d''échauffement, 2 × 10 min à allure soutenue, 5 min de récupération entre les blocs."}},{"name":"S1 · Sortie longue","week":1,"exercises":[],"cardio":{"sport":"run","distanceKm":8,"intensity":"Zone 2","notes":"Allure régulière, hydratez-vous."}},{"name":"S2 · Footing","week":2,"exercises":[],"cardio":{"sport":"run","distanceKm":6,"intensity":"Zone 2","notes":"Allure confortable : vous devez pouvoir parler."}},{"name":"S2 · Fractionné","week":2,"exercises":[],"cardio":{"sport":"run","distanceKm":8,"intensity":"Zone 5","notes":"15 min d''échauffement, 6 × 800 m rapides, 2 min de récupération entre chaque."}},{"name":"S2 · Sortie longue","week":2,"exercises":[],"cardio":{"sport":"run","distanceKm":10,"intensity":"Zone 2","notes":"Allure régulière, hydratez-vous."}},{"name":"S3 · Footing","week":3,"exercises":[],"cardio":{"sport":"run","distanceKm":6,"intensity":"Zone 2","notes":"Allure confortable : vous devez pouvoir parler."}},{"name":"S3 · Seuil","week":3,"exercises":[],"cardio":{"sport":"run","distanceKm":8,"intensity":"Zone 4","notes":"15 min d''échauffement, 2 × 10 min à allure soutenue, 5 min de récupération entre les blocs."}},{"name":"S3 · Sortie longue","week":3,"exercises":[],"cardio":{"sport":"run","distanceKm":12,"intensity":"Zone 2","notes":"Allure régulière, hydratez-vous."}},{"name":"S4 · Footing","week":4,"exercises":[],"cardio":{"sport":"run","distanceKm":6,"intensity":"Zone 2","notes":"Allure confortable : vous devez pouvoir parler."}},{"name":"S4 · Fractionné","week":4,"exercises":[],"cardio":{"sport":"run","distanceKm":8,"intensity":"Zone 5","notes":"15 min d''échauffement, 6 × 800 m rapides, 2 min de récupération entre chaque."}},{"name":"S4 · Sortie longue","week":4,"exercises":[],"cardio":{"sport":"run","distanceKm":10,"intensity":"Zone 2","notes":"Allure régulière, hydratez-vous."}},{"name":"S5 · Footing","week":5,"exercises":[],"cardio":{"sport":"run","distanceKm":7,"intensity":"Zone 2","notes":"Allure confortable : vous devez pouvoir parler."}},{"name":"S5 · Seuil","week":5,"exercises":[],"cardio":{"sport":"run","distanceKm":9,"intensity":"Zone 4","notes":"15 min d''échauffement, 2 × 10 min à allure soutenue, 5 min de récupération entre les blocs."}},{"name":"S5 · Sortie longue","week":5,"exercises":[],"cardio":{"sport":"run","distanceKm":13,"intensity":"Zone 2","notes":"Allure régulière, hydratez-vous."}},{"name":"S6 · Footing","week":6,"exercises":[],"cardio":{"sport":"run","distanceKm":7,"intensity":"Zone 2","notes":"Allure confortable : vous devez pouvoir parler."}},{"name":"S6 · Fractionné","week":6,"exercises":[],"cardio":{"sport":"run","distanceKm":9,"intensity":"Zone 5","notes":"15 min d''échauffement, 6 × 800 m rapides, 2 min de récupération entre chaque."}},{"name":"S6 · Sortie longue","week":6,"exercises":[],"cardio":{"sport":"run","distanceKm":15,"intensity":"Zone 2","notes":"Allure régulière, hydratez-vous."}},{"name":"S7 · Footing","week":7,"exercises":[],"cardio":{"sport":"run","distanceKm":7,"intensity":"Zone 2","notes":"Allure confortable : vous devez pouvoir parler."}},{"name":"S7 · Seuil","week":7,"exercises":[],"cardio":{"sport":"run","distanceKm":9,"intensity":"Zone 4","notes":"15 min d''échauffement, 2 × 10 min à allure soutenue, 5 min de récupération entre les blocs."}},{"name":"S7 · Sortie longue","week":7,"exercises":[],"cardio":{"sport":"run","distanceKm":16,"intensity":"Zone 2","notes":"Allure régulière, hydratez-vous."}},{"name":"S8 · Footing","week":8,"exercises":[],"cardio":{"sport":"run","distanceKm":6,"intensity":"Zone 2","notes":"Allure confortable : vous devez pouvoir parler."}},{"name":"S8 · Fractionné","week":8,"exercises":[],"cardio":{"sport":"run","distanceKm":8,"intensity":"Zone 5","notes":"15 min d''échauffement, 6 × 800 m rapides, 2 min de récupération entre chaque."}},{"name":"S8 · Sortie longue","week":8,"exercises":[],"cardio":{"sport":"run","distanceKm":12,"intensity":"Zone 2","notes":"Allure régulière, hydratez-vous."}},{"name":"S9 · Footing","week":9,"exercises":[],"cardio":{"sport":"run","distanceKm":8,"intensity":"Zone 2","notes":"Allure confortable : vous devez pouvoir parler."}},{"name":"S9 · Seuil","week":9,"exercises":[],"cardio":{"sport":"run","distanceKm":10,"intensity":"Zone 4","notes":"15 min d''échauffement, 2 × 10 min à allure soutenue, 5 min de récupération entre les blocs."}},{"name":"S9 · Sortie longue","week":9,"exercises":[],"cardio":{"sport":"run","distanceKm":18,"intensity":"Zone 2","notes":"Allure régulière, hydratez-vous."}},{"name":"S10 · Footing","week":10,"exercises":[],"cardio":{"sport":"run","distanceKm":7,"intensity":"Zone 2","notes":"Allure confortable : vous devez pouvoir parler."}},{"name":"S10 · Fractionné","week":10,"exercises":[],"cardio":{"sport":"run","distanceKm":9,"intensity":"Zone 5","notes":"15 min d''échauffement, 6 × 800 m rapides, 2 min de récupération entre chaque."}},{"name":"S10 · Sortie longue","week":10,"exercises":[],"cardio":{"sport":"run","distanceKm":16,"intensity":"Zone 2","notes":"Allure régulière, hydratez-vous."}},{"name":"S11 · Footing","week":11,"exercises":[],"cardio":{"sport":"run","distanceKm":6,"intensity":"Zone 2","notes":"Allure confortable : vous devez pouvoir parler."}},{"name":"S11 · Seuil","week":11,"exercises":[],"cardio":{"sport":"run","distanceKm":8,"intensity":"Zone 4","notes":"15 min d''échauffement, 2 × 10 min à allure soutenue, 5 min de récupération entre les blocs."}},{"name":"S11 · Sortie longue","week":11,"exercises":[],"cardio":{"sport":"run","distanceKm":12,"intensity":"Zone 2","notes":"Allure régulière, hydratez-vous."}},{"name":"S12 · Footing","week":12,"exercises":[],"cardio":{"sport":"run","distanceKm":6,"intensity":"Zone 2","notes":"Court et facile."}},{"name":"S12 · Rappel","week":12,"exercises":[],"cardio":{"sport":"run","distanceKm":4,"intensity":"Zone 3","notes":"Quelques accélérations de 30 s, sans forcer."}},{"name":"S12 · Semi-marathon","week":12,"exercises":[],"cardio":{"sport":"run","distanceKm":21.1,"intensity":"Course","notes":"Partez prudemment, et bonne course !"}}]'::jsonb, true, 210
WHERE NOT EXISTS (SELECT 1 FROM program_templates WHERE name = 'Semi-marathon en 12 semaines');

INSERT INTO program_templates (name, description, goal, level, days_per_week, home_friendly, structure, is_published, sort_order)
SELECT '10 km en 8 semaines', 'Trois sorties par semaine pour réussir votre premier 10 km. Avis médical conseillé avant de commencer. À adapter à vos sensations.', 'endurance', 'beginner', 3, false, '[{"name":"S1 · Footing","week":1,"exercises":[],"cardio":{"sport":"run","distanceKm":4,"intensity":"Zone 2","notes":"Allure confortable : vous devez pouvoir parler."}},{"name":"S1 · Seuil","week":1,"exercises":[],"cardio":{"sport":"run","distanceKm":6,"intensity":"Zone 4","notes":"15 min d''échauffement, 2 × 10 min à allure soutenue, 5 min de récupération entre les blocs."}},{"name":"S1 · Sortie longue","week":1,"exercises":[],"cardio":{"sport":"run","distanceKm":5,"intensity":"Zone 2","notes":"Allure régulière, hydratez-vous."}},{"name":"S2 · Footing","week":2,"exercises":[],"cardio":{"sport":"run","distanceKm":4,"intensity":"Zone 2","notes":"Allure confortable : vous devez pouvoir parler."}},{"name":"S2 · Fractionné","week":2,"exercises":[],"cardio":{"sport":"run","distanceKm":6,"intensity":"Zone 5","notes":"15 min d''échauffement, 6 × 800 m rapides, 2 min de récupération entre chaque."}},{"name":"S2 · Sortie longue","week":2,"exercises":[],"cardio":{"sport":"run","distanceKm":6,"intensity":"Zone 2","notes":"Allure régulière, hydratez-vous."}},{"name":"S3 · Footing","week":3,"exercises":[],"cardio":{"sport":"run","distanceKm":4,"intensity":"Zone 2","notes":"Allure confortable : vous devez pouvoir parler."}},{"name":"S3 · Seuil","week":3,"exercises":[],"cardio":{"sport":"run","distanceKm":6,"intensity":"Zone 4","notes":"15 min d''échauffement, 2 × 10 min à allure soutenue, 5 min de récupération entre les blocs."}},{"name":"S3 · Sortie longue","week":3,"exercises":[],"cardio":{"sport":"run","distanceKm":7,"intensity":"Zone 2","notes":"Allure régulière, hydratez-vous."}},{"name":"S4 · Footing","week":4,"exercises":[],"cardio":{"sport":"run","distanceKm":4,"intensity":"Zone 2","notes":"Allure confortable : vous devez pouvoir parler."}},{"name":"S4 · Fractionné","week":4,"exercises":[],"cardio":{"sport":"run","distanceKm":6,"intensity":"Zone 5","notes":"15 min d''échauffement, 6 × 800 m rapides, 2 min de récupération entre chaque."}},{"name":"S4 · Sortie longue","week":4,"exercises":[],"cardio":{"sport":"run","distanceKm":6,"intensity":"Zone 2","notes":"Allure régulière, hydratez-vous."}},{"name":"S5 · Footing","week":5,"exercises":[],"cardio":{"sport":"run","distanceKm":5,"intensity":"Zone 2","notes":"Allure confortable : vous devez pouvoir parler."}},{"name":"S5 · Seuil","week":5,"exercises":[],"cardio":{"sport":"run","distanceKm":7,"intensity":"Zone 4","notes":"15 min d''échauffement, 2 × 10 min à allure soutenue, 5 min de récupération entre les blocs."}},{"name":"S5 · Sortie longue","week":5,"exercises":[],"cardio":{"sport":"run","distanceKm":8,"intensity":"Zone 2","notes":"Allure régulière, hydratez-vous."}},{"name":"S6 · Footing","week":6,"exercises":[],"cardio":{"sport":"run","distanceKm":5,"intensity":"Zone 2","notes":"Allure confortable : vous devez pouvoir parler."}},{"name":"S6 · Fractionné","week":6,"exercises":[],"cardio":{"sport":"run","distanceKm":7,"intensity":"Zone 5","notes":"15 min d''échauffement, 6 × 800 m rapides, 2 min de récupération entre chaque."}},{"name":"S6 · Sortie longue","week":6,"exercises":[],"cardio":{"sport":"run","distanceKm":9,"intensity":"Zone 2","notes":"Allure régulière, hydratez-vous."}},{"name":"S7 · Footing","week":7,"exercises":[],"cardio":{"sport":"run","distanceKm":4,"intensity":"Zone 2","notes":"Allure confortable : vous devez pouvoir parler."}},{"name":"S7 · Seuil","week":7,"exercises":[],"cardio":{"sport":"run","distanceKm":6,"intensity":"Zone 4","notes":"15 min d''échauffement, 2 × 10 min à allure soutenue, 5 min de récupération entre les blocs."}},{"name":"S7 · Sortie longue","week":7,"exercises":[],"cardio":{"sport":"run","distanceKm":7,"intensity":"Zone 2","notes":"Allure régulière, hydratez-vous."}},{"name":"S8 · Footing","week":8,"exercises":[],"cardio":{"sport":"run","distanceKm":6,"intensity":"Zone 2","notes":"Court et facile."}},{"name":"S8 · Rappel","week":8,"exercises":[],"cardio":{"sport":"run","distanceKm":4,"intensity":"Zone 3","notes":"Quelques accélérations de 30 s, sans forcer."}},{"name":"S8 · 10 km","week":8,"exercises":[],"cardio":{"sport":"run","distanceKm":10,"intensity":"Course","notes":"Partez prudemment, et bonne course !"}}]'::jsonb, true, 220
WHERE NOT EXISTS (SELECT 1 FROM program_templates WHERE name = '10 km en 8 semaines');

INSERT INTO program_templates (name, description, goal, level, days_per_week, home_friendly, structure, is_published, sort_order)
SELECT 'Débuter la course : 5 km', 'En alternant course et marche, de zéro à 5 km en 8 semaines. Avis médical conseillé avant de commencer. À adapter à vos sensations.', 'endurance', 'beginner', 3, false, '[{"name":"S1 · Séance 1","week":1,"exercises":[],"cardio":{"sport":"run","durationMin":20,"intensity":"Zone 2","notes":"8 × (1 min de course, 2 min de marche)"}},{"name":"S1 · Séance 2","week":1,"exercises":[],"cardio":{"sport":"run","durationMin":20,"intensity":"Zone 2","notes":"8 × (1 min de course, 2 min de marche)"}},{"name":"S1 · Séance 3","week":1,"exercises":[],"cardio":{"sport":"run","durationMin":20,"intensity":"Zone 2","notes":"8 × (1 min de course, 2 min de marche)"}},{"name":"S2 · Séance 1","week":2,"exercises":[],"cardio":{"sport":"run","durationMin":22,"intensity":"Zone 2","notes":"6 × (2 min de course, 2 min de marche)"}},{"name":"S2 · Séance 2","week":2,"exercises":[],"cardio":{"sport":"run","durationMin":22,"intensity":"Zone 2","notes":"6 × (2 min de course, 2 min de marche)"}},{"name":"S2 · Séance 3","week":2,"exercises":[],"cardio":{"sport":"run","durationMin":22,"intensity":"Zone 2","notes":"6 × (2 min de course, 2 min de marche)"}},{"name":"S3 · Séance 1","week":3,"exercises":[],"cardio":{"sport":"run","durationMin":24,"intensity":"Zone 2","notes":"5 × (3 min de course, 2 min de marche)"}},{"name":"S3 · Séance 2","week":3,"exercises":[],"cardio":{"sport":"run","durationMin":24,"intensity":"Zone 2","notes":"5 × (3 min de course, 2 min de marche)"}},{"name":"S3 · Séance 3","week":3,"exercises":[],"cardio":{"sport":"run","durationMin":24,"intensity":"Zone 2","notes":"5 × (3 min de course, 2 min de marche)"}},{"name":"S4 · Séance 1","week":4,"exercises":[],"cardio":{"sport":"run","durationMin":25,"intensity":"Zone 2","notes":"4 × (5 min de course, 1 min de marche)"}},{"name":"S4 · Séance 2","week":4,"exercises":[],"cardio":{"sport":"run","durationMin":25,"intensity":"Zone 2","notes":"4 × (5 min de course, 1 min de marche)"}},{"name":"S4 · Séance 3","week":4,"exercises":[],"cardio":{"sport":"run","durationMin":25,"intensity":"Zone 2","notes":"4 × (5 min de course, 1 min de marche)"}},{"name":"S5 · Séance 1","week":5,"exercises":[],"cardio":{"sport":"run","durationMin":27,"intensity":"Zone 2","notes":"3 × (8 min de course, 1 min de marche)"}},{"name":"S5 · Séance 2","week":5,"exercises":[],"cardio":{"sport":"run","durationMin":27,"intensity":"Zone 2","notes":"3 × (8 min de course, 1 min de marche)"}},{"name":"S5 · Séance 3","week":5,"exercises":[],"cardio":{"sport":"run","durationMin":27,"intensity":"Zone 2","notes":"3 × (8 min de course, 1 min de marche)"}},{"name":"S6 · Séance 1","week":6,"exercises":[],"cardio":{"sport":"run","durationMin":28,"intensity":"Zone 2","notes":"2 × (12 min de course, 1 min de marche)"}},{"name":"S6 · Séance 2","week":6,"exercises":[],"cardio":{"sport":"run","durationMin":28,"intensity":"Zone 2","notes":"2 × (12 min de course, 1 min de marche)"}},{"name":"S6 · Séance 3","week":6,"exercises":[],"cardio":{"sport":"run","durationMin":28,"intensity":"Zone 2","notes":"2 × (12 min de course, 1 min de marche)"}},{"name":"S7 · Séance 1","week":7,"exercises":[],"cardio":{"sport":"run","durationMin":30,"intensity":"Zone 2","notes":"25 min de course sans s''arrêter"}},{"name":"S7 · Séance 2","week":7,"exercises":[],"cardio":{"sport":"run","durationMin":30,"intensity":"Zone 2","notes":"25 min de course sans s''arrêter"}},{"name":"S7 · Séance 3","week":7,"exercises":[],"cardio":{"sport":"run","durationMin":30,"intensity":"Zone 2","notes":"25 min de course sans s''arrêter"}},{"name":"S8 · Séance 1","week":8,"exercises":[],"cardio":{"sport":"run","durationMin":25,"intensity":"Zone 2","notes":"Course continue."}},{"name":"S8 · Séance 2","week":8,"exercises":[],"cardio":{"sport":"run","durationMin":20,"intensity":"Zone 2","notes":"Court et facile."}},{"name":"S8 · Objectif 5 km","week":8,"exercises":[],"cardio":{"sport":"run","distanceKm":5,"intensity":"Course","notes":"Votre premier 5 km !"}}]'::jsonb, true, 230
WHERE NOT EXISTS (SELECT 1 FROM program_templates WHERE name = 'Débuter la course : 5 km');

INSERT INTO program_templates (name, description, goal, level, days_per_week, home_friendly, structure, is_published, sort_order)
SELECT 'Natation endurance', 'Technique, séries et endurance, de 1 à près de 3 km par séance. Avis médical conseillé avant de commencer. À adapter à vos sensations.', 'endurance', 'intermediate', 3, false, '[{"name":"S1 · Technique","week":1,"exercises":[],"cardio":{"sport":"swim","distanceKm":1,"intensity":"Zone 2","notes":"Éducatifs : 4 × 50 m rattrapé, 4 × 50 m battements, puis nage souple."}},{"name":"S1 · Séries","week":1,"exercises":[],"cardio":{"sport":"swim","distanceKm":1.2,"intensity":"Zone 4","notes":"Échauffement 200 m, 8 × 100 m soutenu avec 20 s de repos, retour au calme."}},{"name":"S1 · Endurance","week":1,"exercises":[],"cardio":{"sport":"swim","distanceKm":1.4,"intensity":"Zone 2","notes":"Nage continue et régulière."}},{"name":"S2 · Technique","week":2,"exercises":[],"cardio":{"sport":"swim","distanceKm":1.2,"intensity":"Zone 2","notes":"Éducatifs : 4 × 50 m rattrapé, 4 × 50 m battements, puis nage souple."}},{"name":"S2 · Séries","week":2,"exercises":[],"cardio":{"sport":"swim","distanceKm":1.4,"intensity":"Zone 4","notes":"Échauffement 200 m, 8 × 100 m soutenu avec 20 s de repos, retour au calme."}},{"name":"S2 · Endurance","week":2,"exercises":[],"cardio":{"sport":"swim","distanceKm":1.6,"intensity":"Zone 2","notes":"Nage continue et régulière."}},{"name":"S3 · Technique","week":3,"exercises":[],"cardio":{"sport":"swim","distanceKm":1.4,"intensity":"Zone 2","notes":"Éducatifs : 4 × 50 m rattrapé, 4 × 50 m battements, puis nage souple."}},{"name":"S3 · Séries","week":3,"exercises":[],"cardio":{"sport":"swim","distanceKm":1.6,"intensity":"Zone 4","notes":"Échauffement 200 m, 8 × 100 m soutenu avec 20 s de repos, retour au calme."}},{"name":"S3 · Endurance","week":3,"exercises":[],"cardio":{"sport":"swim","distanceKm":1.8,"intensity":"Zone 2","notes":"Nage continue et régulière."}},{"name":"S4 · Technique","week":4,"exercises":[],"cardio":{"sport":"swim","distanceKm":1.2,"intensity":"Zone 2","notes":"Éducatifs : 4 × 50 m rattrapé, 4 × 50 m battements, puis nage souple."}},{"name":"S4 · Séries","week":4,"exercises":[],"cardio":{"sport":"swim","distanceKm":1.4,"intensity":"Zone 4","notes":"Échauffement 200 m, 8 × 100 m soutenu avec 20 s de repos, retour au calme."}},{"name":"S4 · Endurance","week":4,"exercises":[],"cardio":{"sport":"swim","distanceKm":1.6,"intensity":"Zone 2","notes":"Nage continue et régulière."}},{"name":"S5 · Technique","week":5,"exercises":[],"cardio":{"sport":"swim","distanceKm":1.6,"intensity":"Zone 2","notes":"Éducatifs : 4 × 50 m rattrapé, 4 × 50 m battements, puis nage souple."}},{"name":"S5 · Séries","week":5,"exercises":[],"cardio":{"sport":"swim","distanceKm":1.8,"intensity":"Zone 4","notes":"Échauffement 200 m, 8 × 100 m soutenu avec 20 s de repos, retour au calme."}},{"name":"S5 · Endurance","week":5,"exercises":[],"cardio":{"sport":"swim","distanceKm":2,"intensity":"Zone 2","notes":"Nage continue et régulière."}},{"name":"S6 · Technique","week":6,"exercises":[],"cardio":{"sport":"swim","distanceKm":1.8,"intensity":"Zone 2","notes":"Éducatifs : 4 × 50 m rattrapé, 4 × 50 m battements, puis nage souple."}},{"name":"S6 · Séries","week":6,"exercises":[],"cardio":{"sport":"swim","distanceKm":2,"intensity":"Zone 4","notes":"Échauffement 200 m, 8 × 100 m soutenu avec 20 s de repos, retour au calme."}},{"name":"S6 · Endurance","week":6,"exercises":[],"cardio":{"sport":"swim","distanceKm":2.2,"intensity":"Zone 2","notes":"Nage continue et régulière."}},{"name":"S7 · Technique","week":7,"exercises":[],"cardio":{"sport":"swim","distanceKm":2,"intensity":"Zone 2","notes":"Éducatifs : 4 × 50 m rattrapé, 4 × 50 m battements, puis nage souple."}},{"name":"S7 · Séries","week":7,"exercises":[],"cardio":{"sport":"swim","distanceKm":2.2,"intensity":"Zone 4","notes":"Échauffement 200 m, 8 × 100 m soutenu avec 20 s de repos, retour au calme."}},{"name":"S7 · Endurance","week":7,"exercises":[],"cardio":{"sport":"swim","distanceKm":2.4,"intensity":"Zone 2","notes":"Nage continue et régulière."}},{"name":"S8 · Technique","week":8,"exercises":[],"cardio":{"sport":"swim","distanceKm":2.5,"intensity":"Zone 2","notes":"Éducatifs : 4 × 50 m rattrapé, 4 × 50 m battements, puis nage souple."}},{"name":"S8 · Séries","week":8,"exercises":[],"cardio":{"sport":"swim","distanceKm":2.7,"intensity":"Zone 4","notes":"Échauffement 200 m, 8 × 100 m soutenu avec 20 s de repos, retour au calme."}},{"name":"S8 · Endurance","week":8,"exercises":[],"cardio":{"sport":"swim","distanceKm":2.9,"intensity":"Zone 2","notes":"Nage continue et régulière."}}]'::jsonb, true, 240
WHERE NOT EXISTS (SELECT 1 FROM program_templates WHERE name = 'Natation endurance');

INSERT INTO program_templates (name, description, goal, level, days_per_week, home_friendly, structure, is_published, sort_order)
SELECT 'Vélo endurance', 'Trois sorties par semaine, sortie longue jusqu''à 2 h 30. Avis médical conseillé avant de commencer. À adapter à vos sensations.', 'endurance', 'intermediate', 3, false, '[{"name":"S1 · Endurance","week":1,"exercises":[],"cardio":{"sport":"bike","durationMin":45,"intensity":"Zone 2","notes":"Pédalage souple."}},{"name":"S1 · Intervalles","week":1,"exercises":[],"cardio":{"sport":"bike","durationMin":60,"intensity":"Zone 4","notes":"15 min d''échauffement, 4 × 6 min soutenu, 3 min de récupération entre chaque."}},{"name":"S1 · Sortie longue","week":1,"exercises":[],"cardio":{"sport":"bike","durationMin":60,"intensity":"Zone 2","notes":"Mangez et buvez régulièrement."}},{"name":"S2 · Endurance","week":2,"exercises":[],"cardio":{"sport":"bike","durationMin":45,"intensity":"Zone 2","notes":"Pédalage souple."}},{"name":"S2 · Intervalles","week":2,"exercises":[],"cardio":{"sport":"bike","durationMin":60,"intensity":"Zone 4","notes":"15 min d''échauffement, 4 × 6 min soutenu, 3 min de récupération entre chaque."}},{"name":"S2 · Sortie longue","week":2,"exercises":[],"cardio":{"sport":"bike","durationMin":75,"intensity":"Zone 2","notes":"Mangez et buvez régulièrement."}},{"name":"S3 · Endurance","week":3,"exercises":[],"cardio":{"sport":"bike","durationMin":45,"intensity":"Zone 2","notes":"Pédalage souple."}},{"name":"S3 · Intervalles","week":3,"exercises":[],"cardio":{"sport":"bike","durationMin":60,"intensity":"Zone 4","notes":"15 min d''échauffement, 4 × 6 min soutenu, 3 min de récupération entre chaque."}},{"name":"S3 · Sortie longue","week":3,"exercises":[],"cardio":{"sport":"bike","durationMin":90,"intensity":"Zone 2","notes":"Mangez et buvez régulièrement."}},{"name":"S4 · Endurance","week":4,"exercises":[],"cardio":{"sport":"bike","durationMin":45,"intensity":"Zone 2","notes":"Pédalage souple."}},{"name":"S4 · Intervalles","week":4,"exercises":[],"cardio":{"sport":"bike","durationMin":60,"intensity":"Zone 4","notes":"15 min d''échauffement, 4 × 6 min soutenu, 3 min de récupération entre chaque."}},{"name":"S4 · Sortie longue","week":4,"exercises":[],"cardio":{"sport":"bike","durationMin":75,"intensity":"Zone 2","notes":"Mangez et buvez régulièrement."}},{"name":"S5 · Endurance","week":5,"exercises":[],"cardio":{"sport":"bike","durationMin":45,"intensity":"Zone 2","notes":"Pédalage souple."}},{"name":"S5 · Intervalles","week":5,"exercises":[],"cardio":{"sport":"bike","durationMin":60,"intensity":"Zone 4","notes":"15 min d''échauffement, 4 × 6 min soutenu, 3 min de récupération entre chaque."}},{"name":"S5 · Sortie longue","week":5,"exercises":[],"cardio":{"sport":"bike","durationMin":105,"intensity":"Zone 2","notes":"Mangez et buvez régulièrement."}},{"name":"S6 · Endurance","week":6,"exercises":[],"cardio":{"sport":"bike","durationMin":45,"intensity":"Zone 2","notes":"Pédalage souple."}},{"name":"S6 · Intervalles","week":6,"exercises":[],"cardio":{"sport":"bike","durationMin":60,"intensity":"Zone 4","notes":"15 min d''échauffement, 4 × 6 min soutenu, 3 min de récupération entre chaque."}},{"name":"S6 · Sortie longue","week":6,"exercises":[],"cardio":{"sport":"bike","durationMin":120,"intensity":"Zone 2","notes":"Mangez et buvez régulièrement."}},{"name":"S7 · Endurance","week":7,"exercises":[],"cardio":{"sport":"bike","durationMin":45,"intensity":"Zone 2","notes":"Pédalage souple."}},{"name":"S7 · Intervalles","week":7,"exercises":[],"cardio":{"sport":"bike","durationMin":60,"intensity":"Zone 4","notes":"15 min d''échauffement, 4 × 6 min soutenu, 3 min de récupération entre chaque."}},{"name":"S7 · Sortie longue","week":7,"exercises":[],"cardio":{"sport":"bike","durationMin":135,"intensity":"Zone 2","notes":"Mangez et buvez régulièrement."}},{"name":"S8 · Endurance","week":8,"exercises":[],"cardio":{"sport":"bike","durationMin":45,"intensity":"Zone 2","notes":"Pédalage souple."}},{"name":"S8 · Intervalles","week":8,"exercises":[],"cardio":{"sport":"bike","durationMin":60,"intensity":"Zone 4","notes":"15 min d''échauffement, 4 × 6 min soutenu, 3 min de récupération entre chaque."}},{"name":"S8 · Sortie longue","week":8,"exercises":[],"cardio":{"sport":"bike","durationMin":150,"intensity":"Zone 2","notes":"Mangez et buvez régulièrement."}}]'::jsonb, true, 250
WHERE NOT EXISTS (SELECT 1 FROM program_templates WHERE name = 'Vélo endurance');

INSERT INTO program_templates (name, description, goal, level, days_per_week, home_friendly, structure, is_published, sort_order)
SELECT 'Renfo coureur', 'Hanches, mollets et gainage : deux séances courtes pour courir plus solide.', 'endurance', 'beginner', 2, true, '[{"name":"Renfo A","exercises":[{"exerciseName":"Bulgarian Split Squat","targetSets":3,"targetReps":"8-10","restSec":90},{"exerciseName":"Single-Leg Calf Raise","targetSets":3,"targetReps":"12-15","restSec":60},{"exerciseName":"Glute Bridge","targetSets":3,"targetReps":"12-15","restSec":60},{"exerciseName":"Side Plank","targetSets":3,"targetReps":"30-45s","restSec":60}]},{"name":"Renfo B","exercises":[{"exerciseName":"Single-Leg Romanian Deadlift","targetSets":3,"targetReps":"8-10","restSec":90},{"exerciseName":"Step-up","targetSets":3,"targetReps":"10-12","restSec":60},{"exerciseName":"Dead Bug","targetSets":3,"targetReps":"10-12","restSec":60},{"exerciseName":"Plank","targetSets":3,"targetReps":"45-60s","restSec":60}]}]'::jsonb, true, 260
WHERE NOT EXISTS (SELECT 1 FROM program_templates WHERE name = 'Renfo coureur');

INSERT INTO program_templates (name, description, goal, level, days_per_week, home_friendly, structure, is_published, sort_order)
SELECT 'Renfo trail', 'Force des jambes et stabilité pour encaisser les montées et les descentes.', 'endurance', 'intermediate', 2, false, '[{"name":"Montées","exercises":[{"exerciseName":"Back Squat","targetSets":4,"targetReps":"6-8","restSec":150},{"exerciseName":"Step-up","targetSets":3,"targetReps":"10-12","restSec":90},{"exerciseName":"Single-Leg Calf Raise","targetSets":3,"targetReps":"15-20","restSec":60},{"exerciseName":"Side Plank","targetSets":3,"targetReps":"45-60s","restSec":60}]},{"name":"Descentes","exercises":[{"exerciseName":"Walking Lunge","targetSets":4,"targetReps":"10-12","restSec":90},{"exerciseName":"Single-Leg Romanian Deadlift","targetSets":3,"targetReps":"8-10","restSec":90},{"exerciseName":"Leg Curl","targetSets":3,"targetReps":"10-12","restSec":60},{"exerciseName":"Bird Dog","targetSets":3,"targetReps":"10-12","restSec":60}]}]'::jsonb, true, 270
WHERE NOT EXISTS (SELECT 1 FROM program_templates WHERE name = 'Renfo trail');

INSERT INTO program_templates (name, description, goal, level, days_per_week, home_friendly, structure, is_published, sort_order)
SELECT 'Renfo nageur', 'Dos, épaules et gainage pour une nage plus puissante et des épaules protégées.', 'endurance', 'intermediate', 2, false, '[{"name":"Tirage","exercises":[{"exerciseName":"Lat Pulldown","targetSets":4,"targetReps":"8-10","restSec":90},{"exerciseName":"Straight-Arm Pulldown","targetSets":3,"targetReps":"12-15","restSec":60},{"exerciseName":"Seated Cable Row","targetSets":3,"targetReps":"10-12","restSec":90},{"exerciseName":"External Shoulder Rotation","targetSets":3,"targetReps":"15-20","restSec":60}]},{"name":"Gainage","exercises":[{"exerciseName":"Pull-up","targetSets":3,"targetReps":"5-8","restSec":120},{"exerciseName":"Face Pull","targetSets":3,"targetReps":"15-20","restSec":60},{"exerciseName":"Dead Bug","targetSets":3,"targetReps":"10-12","restSec":60},{"exerciseName":"Side Plank","targetSets":3,"targetReps":"30-45s","restSec":60}]}]'::jsonb, true, 280
WHERE NOT EXISTS (SELECT 1 FROM program_templates WHERE name = 'Renfo nageur');

INSERT INTO program_templates (name, description, goal, level, days_per_week, home_friendly, structure, is_published, sort_order)
SELECT 'Renfo cycliste', 'Jambes, fessiers et bas du dos, pour tenir la position et relancer plus fort.', 'endurance', 'intermediate', 2, false, '[{"name":"Force","exercises":[{"exerciseName":"Back Squat","targetSets":4,"targetReps":"6-8","restSec":150},{"exerciseName":"Hip Thrust","targetSets":3,"targetReps":"8-10","restSec":90},{"exerciseName":"Standing Calf Raise","targetSets":3,"targetReps":"12-15","restSec":60}]},{"name":"Stabilité","exercises":[{"exerciseName":"Bulgarian Split Squat","targetSets":3,"targetReps":"8-10","restSec":90},{"exerciseName":"Romanian Deadlift","targetSets":3,"targetReps":"8-10","restSec":90},{"exerciseName":"Bird Dog","targetSets":3,"targetReps":"10-12","restSec":60},{"exerciseName":"Plank","targetSets":3,"targetReps":"45-60s","restSec":60}]}]'::jsonb, true, 290
WHERE NOT EXISTS (SELECT 1 FROM program_templates WHERE name = 'Renfo cycliste');

COMMIT;

-- 025_richer_endurance_plans.sql
-- Rewrite the six endurance plans of the catalogue: each session now has its
-- purpose and its steps (warm-up, main set, cool-down), and the sessions change
-- from phase to phase instead of repeating week after week.
--
-- Only the catalogue is touched. A plan an admin has already edited keeps its
-- version: the update only applies while the structure is still the one 024
-- inserted. Programs athletes already added are their own copies and stay as
-- they are.
--
-- No new column: the steps live in the structure JSON. Apply before or after the
-- code, in either order. Safe to re-run.

BEGIN;

UPDATE program_templates
SET description = 'Pour courir 10 km sans difficulté et viser le marathon. Quatre sorties par semaine en quatre phases : fondations, développement, travail à allure marathon, affûtage. Sortie longue jusqu''à 32 km. Avis médical conseillé avant de commencer. À adapter à vos sensations.',
    structure = '[{"name":"S1 · Footing","week":1,"exercises":[],"cardio":{"sport":"run","distanceKm":7,"intensity":"Zone 2","purpose":"Construire l''endurance de base sans accumuler de fatigue.","steps":["5 min de trot très lent pour démarrer","Course continue à allure confortable : vous devez pouvoir parler en phrases complètes","Étirements doux des mollets et de l''arrière des cuisses"]}},{"name":"S1 · Côtes","week":1,"exercises":[],"cardio":{"sport":"run","distanceKm":6,"intensity":"Zone 4","purpose":"Renforcer les jambes et la foulée sans la violence du fractionné sur le plat.","steps":["Échauffement : 15 min de footing très facile, puis 4 gammes (montées de genoux, talons-fesses) sur 20 m","6 × 45 s en côte à bonne allure, retour en trottinant","Retour au calme : 10 min de footing très lent, puis étirements doux"]}},{"name":"S1 · Récupération","week":1,"exercises":[],"cardio":{"sport":"run","distanceKm":5,"intensity":"Zone 1","purpose":"Faire circuler le sang pour mieux récupérer, sans rien ajouter à la fatigue.","steps":["Footing très lent, sur terrain souple si possible","5 min de marche, puis mobilité des hanches et des chevilles"]}},{"name":"S1 · Sortie longue","week":1,"exercises":[],"cardio":{"sport":"run","distanceKm":12,"intensity":"Zone 2","purpose":"Habituer le corps à courir longtemps : c''est la séance clé de la semaine.","steps":["10 premières minutes très tranquilles","Allure régulière en Zone 2 jusqu''au bout, quitte à marcher dans les côtes","5 min de marche pour terminer"],"notes":"Partez avec de l''eau s''il fait chaud."}},{"name":"S2 · Footing","week":2,"exercises":[],"cardio":{"sport":"run","distanceKm":8,"intensity":"Zone 2","purpose":"Construire l''endurance de base sans accumuler de fatigue.","steps":["5 min de trot très lent pour démarrer","Course continue à allure confortable : vous devez pouvoir parler en phrases complètes","Pour finir : 5 lignes droites de 80 m en accélérant progressivement, retour en marchant"]}},{"name":"S2 · Fartlek","week":2,"exercises":[],"cardio":{"sport":"run","distanceKm":7,"intensity":"Zone 4","purpose":"Habituer le corps aux changements de rythme, en jouant.","steps":["Échauffement : 15 min de footing très facile, puis 4 gammes (montées de genoux, talons-fesses) sur 20 m","8 × (1 min vite, 1 min lent), au feeling","Retour au calme : 10 min de footing très lent, puis étirements doux"]}},{"name":"S2 · Récupération","week":2,"exercises":[],"cardio":{"sport":"run","distanceKm":6,"intensity":"Zone 1","purpose":"Faire circuler le sang pour mieux récupérer, sans rien ajouter à la fatigue.","steps":["Footing très lent, sur terrain souple si possible","5 min de marche, puis mobilité des hanches et des chevilles"]}},{"name":"S2 · Sortie longue","week":2,"exercises":[],"cardio":{"sport":"run","distanceKm":14,"intensity":"Zone 2","purpose":"Habituer le corps à courir longtemps : c''est la séance clé de la semaine.","steps":["10 premières minutes très tranquilles","Allure régulière en Zone 2 jusqu''au bout, quitte à marcher dans les côtes","5 min de marche pour terminer"],"notes":"Partez avec de l''eau s''il fait chaud."}},{"name":"S3 · Footing","week":3,"exercises":[],"cardio":{"sport":"run","distanceKm":8,"intensity":"Zone 2","purpose":"Construire l''endurance de base sans accumuler de fatigue.","steps":["5 min de trot très lent pour démarrer","Course continue à allure confortable : vous devez pouvoir parler en phrases complètes","Étirements doux des mollets et de l''arrière des cuisses"]}},{"name":"S3 · Côtes","week":3,"exercises":[],"cardio":{"sport":"run","distanceKm":6,"intensity":"Zone 4","purpose":"Renforcer les jambes et la foulée sans la violence du fractionné sur le plat.","steps":["Échauffement : 15 min de footing très facile, puis 4 gammes (montées de genoux, talons-fesses) sur 20 m","8 × 45 s en côte à bonne allure, retour en trottinant","Retour au calme : 10 min de footing très lent, puis étirements doux"]}},{"name":"S3 · Récupération","week":3,"exercises":[],"cardio":{"sport":"run","distanceKm":6,"intensity":"Zone 1","purpose":"Faire circuler le sang pour mieux récupérer, sans rien ajouter à la fatigue.","steps":["Footing très lent, sur terrain souple si possible","5 min de marche, puis mobilité des hanches et des chevilles"]}},{"name":"S3 · Sortie longue","week":3,"exercises":[],"cardio":{"sport":"run","distanceKm":16,"intensity":"Zone 2","purpose":"Habituer le corps à courir longtemps : c''est la séance clé de la semaine.","steps":["10 premières minutes très tranquilles","Allure régulière en Zone 2 jusqu''au bout, quitte à marcher dans les côtes","5 min de marche pour terminer"],"notes":"Testez votre ravitaillement de course : boire toutes les 20 min, un gel ou une barre toutes les 40 min."}},{"name":"S4 · Footing","week":4,"exercises":[],"cardio":{"sport":"run","distanceKm":8,"intensity":"Zone 2","purpose":"Construire l''endurance de base sans accumuler de fatigue.","steps":["5 min de trot très lent pour démarrer","Course continue à allure confortable : vous devez pouvoir parler en phrases complètes","Pour finir : 5 lignes droites de 80 m en accélérant progressivement, retour en marchant"]}},{"name":"S4 · Fartlek léger","week":4,"exercises":[],"cardio":{"sport":"run","distanceKm":8,"intensity":"Zone 3","purpose":"Semaine allégée : garder du rythme tout en laissant le corps assimiler.","steps":["10 min de footing facile","6 × (1 min un peu plus vite, 2 min facile)","10 min de footing facile"]}},{"name":"S4 · Récupération","week":4,"exercises":[],"cardio":{"sport":"run","distanceKm":6,"intensity":"Zone 1","purpose":"Faire circuler le sang pour mieux récupérer, sans rien ajouter à la fatigue.","steps":["Footing très lent, sur terrain souple si possible","5 min de marche, puis mobilité des hanches et des chevilles"]}},{"name":"S4 · Sortie longue","week":4,"exercises":[],"cardio":{"sport":"run","distanceKm":13,"intensity":"Zone 2","purpose":"Habituer le corps à courir longtemps : c''est la séance clé de la semaine.","steps":["10 premières minutes très tranquilles","Allure régulière en Zone 2 jusqu''au bout, quitte à marcher dans les côtes","5 min de marche pour terminer"],"notes":"Partez avec de l''eau s''il fait chaud."}},{"name":"S5 · Footing","week":5,"exercises":[],"cardio":{"sport":"run","distanceKm":9,"intensity":"Zone 2","purpose":"Construire l''endurance de base sans accumuler de fatigue.","steps":["5 min de trot très lent pour démarrer","Course continue à allure confortable : vous devez pouvoir parler en phrases complètes","Étirements doux des mollets et de l''arrière des cuisses"]}},{"name":"S5 · Fractionné court","week":5,"exercises":[],"cardio":{"sport":"run","distanceKm":9,"intensity":"Zone 5","purpose":"Développer la vitesse maximale aérobie : courir plus vite devient plus facile.","steps":["Échauffement : 15 min de footing très facile, puis 4 gammes (montées de genoux, talons-fesses) sur 20 m","8 × 400 m rapides, 1 min 30 de récupération en trottinant","Retour au calme : 10 min de footing très lent, puis étirements doux"]}},{"name":"S5 · Récupération","week":5,"exercises":[],"cardio":{"sport":"run","distanceKm":7,"intensity":"Zone 1","purpose":"Faire circuler le sang pour mieux récupérer, sans rien ajouter à la fatigue.","steps":["Footing très lent, sur terrain souple si possible","5 min de marche, puis mobilité des hanches et des chevilles"]}},{"name":"S5 · Sortie longue","week":5,"exercises":[],"cardio":{"sport":"run","distanceKm":18,"intensity":"Zone 2","purpose":"Habituer le corps à courir longtemps : c''est la séance clé de la semaine.","steps":["14 km en Zone 2","4 derniers km un peu plus soutenus (Zone 3)","5 min de marche pour terminer"],"notes":"Testez votre ravitaillement de course : boire toutes les 20 min, un gel ou une barre toutes les 40 min."}},{"name":"S6 · Footing","week":6,"exercises":[],"cardio":{"sport":"run","distanceKm":9,"intensity":"Zone 2","purpose":"Construire l''endurance de base sans accumuler de fatigue.","steps":["5 min de trot très lent pour démarrer","Course continue à allure confortable : vous devez pouvoir parler en phrases complètes","Pour finir : 5 lignes droites de 80 m en accélérant progressivement, retour en marchant"]}},{"name":"S6 · Seuil","week":6,"exercises":[],"cardio":{"sport":"run","distanceKm":10,"intensity":"Zone 4","purpose":"Repousser le seuil : tenir longtemps une allure soutenue sans s''asphyxier.","steps":["Échauffement : 15 min de footing très facile, puis 4 gammes (montées de genoux, talons-fesses) sur 20 m","3 × 8 min soutenu, 2 min de récupération","Retour au calme : 10 min de footing très lent, puis étirements doux"]}},{"name":"S6 · Récupération","week":6,"exercises":[],"cardio":{"sport":"run","distanceKm":7,"intensity":"Zone 1","purpose":"Faire circuler le sang pour mieux récupérer, sans rien ajouter à la fatigue.","steps":["Footing très lent, sur terrain souple si possible","5 min de marche, puis mobilité des hanches et des chevilles"]}},{"name":"S6 · Sortie longue","week":6,"exercises":[],"cardio":{"sport":"run","distanceKm":20,"intensity":"Zone 2","purpose":"Habituer le corps à courir longtemps : c''est la séance clé de la semaine.","steps":["15 km en Zone 2","5 derniers km un peu plus soutenus (Zone 3)","5 min de marche pour terminer"],"notes":"Testez votre ravitaillement de course : boire toutes les 20 min, un gel ou une barre toutes les 40 min."}},{"name":"S7 · Footing","week":7,"exercises":[],"cardio":{"sport":"run","distanceKm":9,"intensity":"Zone 2","purpose":"Construire l''endurance de base sans accumuler de fatigue.","steps":["5 min de trot très lent pour démarrer","Course continue à allure confortable : vous devez pouvoir parler en phrases complètes","Étirements doux des mollets et de l''arrière des cuisses"]}},{"name":"S7 · Fractionné court","week":7,"exercises":[],"cardio":{"sport":"run","distanceKm":10,"intensity":"Zone 5","purpose":"Développer la vitesse maximale aérobie : courir plus vite devient plus facile.","steps":["Échauffement : 15 min de footing très facile, puis 4 gammes (montées de genoux, talons-fesses) sur 20 m","10 × 400 m rapides, 1 min 30 de récupération en trottinant","Retour au calme : 10 min de footing très lent, puis étirements doux"]}},{"name":"S7 · Récupération","week":7,"exercises":[],"cardio":{"sport":"run","distanceKm":7,"intensity":"Zone 1","purpose":"Faire circuler le sang pour mieux récupérer, sans rien ajouter à la fatigue.","steps":["Footing très lent, sur terrain souple si possible","5 min de marche, puis mobilité des hanches et des chevilles"]}},{"name":"S7 · Sortie longue","week":7,"exercises":[],"cardio":{"sport":"run","distanceKm":22,"intensity":"Zone 2","purpose":"Habituer le corps à courir longtemps : c''est la séance clé de la semaine.","steps":["17 km en Zone 2","5 derniers km un peu plus soutenus (Zone 3)","5 min de marche pour terminer"],"notes":"Testez votre ravitaillement de course : boire toutes les 20 min, un gel ou une barre toutes les 40 min."}},{"name":"S8 · Footing","week":8,"exercises":[],"cardio":{"sport":"run","distanceKm":8,"intensity":"Zone 2","purpose":"Construire l''endurance de base sans accumuler de fatigue.","steps":["5 min de trot très lent pour démarrer","Course continue à allure confortable : vous devez pouvoir parler en phrases complètes","Pour finir : 5 lignes droites de 80 m en accélérant progressivement, retour en marchant"]}},{"name":"S8 · Fartlek léger","week":8,"exercises":[],"cardio":{"sport":"run","distanceKm":8,"intensity":"Zone 3","purpose":"Semaine allégée : garder du rythme tout en laissant le corps assimiler.","steps":["10 min de footing facile","6 × (1 min un peu plus vite, 2 min facile)","10 min de footing facile"]}},{"name":"S8 · Récupération","week":8,"exercises":[],"cardio":{"sport":"run","distanceKm":6,"intensity":"Zone 1","purpose":"Faire circuler le sang pour mieux récupérer, sans rien ajouter à la fatigue.","steps":["Footing très lent, sur terrain souple si possible","5 min de marche, puis mobilité des hanches et des chevilles"]}},{"name":"S8 · Sortie longue","week":8,"exercises":[],"cardio":{"sport":"run","distanceKm":16,"intensity":"Zone 2","purpose":"Habituer le corps à courir longtemps : c''est la séance clé de la semaine.","steps":["10 premières minutes très tranquilles","Allure régulière en Zone 2 jusqu''au bout, quitte à marcher dans les côtes","5 min de marche pour terminer"],"notes":"Testez votre ravitaillement de course : boire toutes les 20 min, un gel ou une barre toutes les 40 min."}},{"name":"S9 · Footing","week":9,"exercises":[],"cardio":{"sport":"run","distanceKm":10,"intensity":"Zone 2","purpose":"Construire l''endurance de base sans accumuler de fatigue.","steps":["5 min de trot très lent pour démarrer","Course continue à allure confortable : vous devez pouvoir parler en phrases complètes","Étirements doux des mollets et de l''arrière des cuisses"]}},{"name":"S9 · Fractionné long","week":9,"exercises":[],"cardio":{"sport":"run","distanceKm":11,"intensity":"Zone 4","purpose":"Entretenir la vitesse acquise sur des efforts plus longs.","steps":["Échauffement : 15 min de footing très facile, puis 4 gammes (montées de genoux, talons-fesses) sur 20 m","5 × 1000 m soutenus, 2 min de récupération en trottinant","Retour au calme : 10 min de footing très lent, puis étirements doux"]}},{"name":"S9 · Récupération","week":9,"exercises":[],"cardio":{"sport":"run","distanceKm":8,"intensity":"Zone 1","purpose":"Faire circuler le sang pour mieux récupérer, sans rien ajouter à la fatigue.","steps":["Footing très lent, sur terrain souple si possible","5 min de marche, puis mobilité des hanches et des chevilles"]}},{"name":"S9 · Sortie longue","week":9,"exercises":[],"cardio":{"sport":"run","distanceKm":24,"intensity":"Zone 2","purpose":"Apprendre à tenir l''allure de course sur des jambes fatiguées.","steps":["17 km en Zone 2, régulier","7 derniers km à allure marathon","5 min de marche pour terminer"],"notes":"Testez votre ravitaillement de course : boire toutes les 20 min, un gel ou une barre toutes les 40 min."}},{"name":"S10 · Footing","week":10,"exercises":[],"cardio":{"sport":"run","distanceKm":10,"intensity":"Zone 2","purpose":"Construire l''endurance de base sans accumuler de fatigue.","steps":["5 min de trot très lent pour démarrer","Course continue à allure confortable : vous devez pouvoir parler en phrases complètes","Pour finir : 5 lignes droites de 80 m en accélérant progressivement, retour en marchant"]}},{"name":"S10 · Allure spécifique","week":10,"exercises":[],"cardio":{"sport":"run","distanceKm":14,"intensity":"Allure course","purpose":"Mémoriser l''allure marathon pour la retrouver sans montre le jour J.","steps":["Échauffement : 15 min de footing très facile, puis 4 gammes (montées de genoux, talons-fesses) sur 20 m","3 × 3 km à allure marathon, 2 min de récupération","Retour au calme : 10 min de footing très lent, puis étirements doux"]}},{"name":"S10 · Récupération","week":10,"exercises":[],"cardio":{"sport":"run","distanceKm":8,"intensity":"Zone 1","purpose":"Faire circuler le sang pour mieux récupérer, sans rien ajouter à la fatigue.","steps":["Footing très lent, sur terrain souple si possible","5 min de marche, puis mobilité des hanches et des chevilles"]}},{"name":"S10 · Sortie longue","week":10,"exercises":[],"cardio":{"sport":"run","distanceKm":26,"intensity":"Zone 2","purpose":"Apprendre à tenir l''allure de course sur des jambes fatiguées.","steps":["18 km en Zone 2, régulier","8 derniers km à allure marathon","5 min de marche pour terminer"],"notes":"Testez votre ravitaillement de course : boire toutes les 20 min, un gel ou une barre toutes les 40 min."}},{"name":"S11 · Footing","week":11,"exercises":[],"cardio":{"sport":"run","distanceKm":11,"intensity":"Zone 2","purpose":"Construire l''endurance de base sans accumuler de fatigue.","steps":["5 min de trot très lent pour démarrer","Course continue à allure confortable : vous devez pouvoir parler en phrases complètes","Étirements doux des mollets et de l''arrière des cuisses"]}},{"name":"S11 · Fractionné long","week":11,"exercises":[],"cardio":{"sport":"run","distanceKm":12,"intensity":"Zone 4","purpose":"Entretenir la vitesse acquise sur des efforts plus longs.","steps":["Échauffement : 15 min de footing très facile, puis 4 gammes (montées de genoux, talons-fesses) sur 20 m","6 × 1000 m soutenus, 2 min de récupération en trottinant","Retour au calme : 10 min de footing très lent, puis étirements doux"]}},{"name":"S11 · Récupération","week":11,"exercises":[],"cardio":{"sport":"run","distanceKm":9,"intensity":"Zone 1","purpose":"Faire circuler le sang pour mieux récupérer, sans rien ajouter à la fatigue.","steps":["Footing très lent, sur terrain souple si possible","5 min de marche, puis mobilité des hanches et des chevilles"]}},{"name":"S11 · Sortie longue","week":11,"exercises":[],"cardio":{"sport":"run","distanceKm":28,"intensity":"Zone 2","purpose":"Apprendre à tenir l''allure de course sur des jambes fatiguées.","steps":["20 km en Zone 2, régulier","8 derniers km à allure marathon","5 min de marche pour terminer"],"notes":"Testez votre ravitaillement de course : boire toutes les 20 min, un gel ou une barre toutes les 40 min."}},{"name":"S12 · Footing","week":12,"exercises":[],"cardio":{"sport":"run","distanceKm":9,"intensity":"Zone 2","purpose":"Construire l''endurance de base sans accumuler de fatigue.","steps":["5 min de trot très lent pour démarrer","Course continue à allure confortable : vous devez pouvoir parler en phrases complètes","Pour finir : 5 lignes droites de 80 m en accélérant progressivement, retour en marchant"]}},{"name":"S12 · Fartlek léger","week":12,"exercises":[],"cardio":{"sport":"run","distanceKm":9,"intensity":"Zone 3","purpose":"Semaine allégée : garder du rythme tout en laissant le corps assimiler.","steps":["10 min de footing facile","6 × (1 min un peu plus vite, 2 min facile)","10 min de footing facile"]}},{"name":"S12 · Récupération","week":12,"exercises":[],"cardio":{"sport":"run","distanceKm":7,"intensity":"Zone 1","purpose":"Faire circuler le sang pour mieux récupérer, sans rien ajouter à la fatigue.","steps":["Footing très lent, sur terrain souple si possible","5 min de marche, puis mobilité des hanches et des chevilles"]}},{"name":"S12 · Sortie longue","week":12,"exercises":[],"cardio":{"sport":"run","distanceKm":20,"intensity":"Zone 2","purpose":"Apprendre à tenir l''allure de course sur des jambes fatiguées.","steps":["10 premières minutes très tranquilles","Allure régulière en Zone 2 jusqu''au bout, quitte à marcher dans les côtes","5 min de marche pour terminer"],"notes":"Testez votre ravitaillement de course : boire toutes les 20 min, un gel ou une barre toutes les 40 min."}},{"name":"S13 · Footing","week":13,"exercises":[],"cardio":{"sport":"run","distanceKm":11,"intensity":"Zone 2","purpose":"Construire l''endurance de base sans accumuler de fatigue.","steps":["5 min de trot très lent pour démarrer","Course continue à allure confortable : vous devez pouvoir parler en phrases complètes","Étirements doux des mollets et de l''arrière des cuisses"]}},{"name":"S13 · Allure spécifique","week":13,"exercises":[],"cardio":{"sport":"run","distanceKm":17,"intensity":"Allure course","purpose":"Mémoriser l''allure marathon pour la retrouver sans montre le jour J.","steps":["Échauffement : 15 min de footing très facile, puis 4 gammes (montées de genoux, talons-fesses) sur 20 m","3 × 4 km à allure marathon, 2 min de récupération","Retour au calme : 10 min de footing très lent, puis étirements doux"]}},{"name":"S13 · Récupération","week":13,"exercises":[],"cardio":{"sport":"run","distanceKm":9,"intensity":"Zone 1","purpose":"Faire circuler le sang pour mieux récupérer, sans rien ajouter à la fatigue.","steps":["Footing très lent, sur terrain souple si possible","5 min de marche, puis mobilité des hanches et des chevilles"]}},{"name":"S13 · Sortie longue","week":13,"exercises":[],"cardio":{"sport":"run","distanceKm":32,"intensity":"Zone 2","purpose":"Apprendre à tenir l''allure de course sur des jambes fatiguées.","steps":["22 km en Zone 2, régulier","10 derniers km à allure marathon","5 min de marche pour terminer"],"notes":"Testez votre ravitaillement de course : boire toutes les 20 min, un gel ou une barre toutes les 40 min."}},{"name":"S14 · Footing","week":14,"exercises":[],"cardio":{"sport":"run","distanceKm":10,"intensity":"Zone 2","purpose":"Construire l''endurance de base sans accumuler de fatigue.","steps":["5 min de trot très lent pour démarrer","Course continue à allure confortable : vous devez pouvoir parler en phrases complètes","Étirements doux des mollets et de l''arrière des cuisses"]}},{"name":"S14 · Rappel d''allure","week":14,"exercises":[],"cardio":{"sport":"run","distanceKm":10,"intensity":"Allure course","purpose":"Garder les sensations de vitesse en réduisant le volume.","steps":["Échauffement : 15 min de footing très facile, puis 4 gammes (montées de genoux, talons-fesses) sur 20 m","3 × 1 km à allure marathon, 2 min de récupération","Retour au calme : 10 min de footing très lent, puis étirements doux"]}},{"name":"S14 · Récupération","week":14,"exercises":[],"cardio":{"sport":"run","distanceKm":8,"intensity":"Zone 1","purpose":"Faire circuler le sang pour mieux récupérer, sans rien ajouter à la fatigue.","steps":["Footing très lent, sur terrain souple si possible","5 min de marche, puis mobilité des hanches et des chevilles"]}},{"name":"S14 · Sortie longue","week":14,"exercises":[],"cardio":{"sport":"run","distanceKm":24,"intensity":"Zone 2","purpose":"Habituer le corps à courir longtemps : c''est la séance clé de la semaine.","steps":["10 premières minutes très tranquilles","Allure régulière en Zone 2 jusqu''au bout, quitte à marcher dans les côtes","5 min de marche pour terminer"],"notes":"Testez votre ravitaillement de course : boire toutes les 20 min, un gel ou une barre toutes les 40 min."}},{"name":"S15 · Footing","week":15,"exercises":[],"cardio":{"sport":"run","distanceKm":8,"intensity":"Zone 2","purpose":"Construire l''endurance de base sans accumuler de fatigue.","steps":["5 min de trot très lent pour démarrer","Course continue à allure confortable : vous devez pouvoir parler en phrases complètes","Étirements doux des mollets et de l''arrière des cuisses"]}},{"name":"S15 · Rappel d''allure","week":15,"exercises":[],"cardio":{"sport":"run","distanceKm":8,"intensity":"Allure course","purpose":"Garder les sensations de vitesse en réduisant le volume.","steps":["Échauffement : 15 min de footing très facile, puis 4 gammes (montées de genoux, talons-fesses) sur 20 m","3 × 1 km à allure marathon, 2 min de récupération","Retour au calme : 10 min de footing très lent, puis étirements doux"]}},{"name":"S15 · Récupération","week":15,"exercises":[],"cardio":{"sport":"run","distanceKm":6,"intensity":"Zone 1","purpose":"Faire circuler le sang pour mieux récupérer, sans rien ajouter à la fatigue.","steps":["Footing très lent, sur terrain souple si possible","5 min de marche, puis mobilité des hanches et des chevilles"]}},{"name":"S15 · Sortie longue","week":15,"exercises":[],"cardio":{"sport":"run","distanceKm":16,"intensity":"Zone 2","purpose":"Habituer le corps à courir longtemps : c''est la séance clé de la semaine.","steps":["10 premières minutes très tranquilles","Allure régulière en Zone 2 jusqu''au bout, quitte à marcher dans les côtes","5 min de marche pour terminer"],"notes":"Testez votre ravitaillement de course : boire toutes les 20 min, un gel ou une barre toutes les 40 min."}},{"name":"S16 · Footing","week":16,"exercises":[],"cardio":{"sport":"run","distanceKm":6,"intensity":"Zone 2","purpose":"Rester en mouvement sans puiser dans les réserves.","steps":["Footing court et facile","3 lignes droites de 80 m pour réveiller les jambes"]}},{"name":"S16 · Rappel","week":16,"exercises":[],"cardio":{"sport":"run","distanceKm":4,"intensity":"Zone 3","purpose":"Deux ou trois jours avant la course : garder le jus sans se fatiguer.","steps":["15 min de footing facile","3 × 2 min à allure marathon, 2 min de récupération","5 min de footing lent"]}},{"name":"S16 · Marathon","week":16,"exercises":[],"cardio":{"sport":"run","distanceKm":42.2,"intensity":"Course","purpose":"Le jour J : profiter du travail accumulé.","steps":["La veille : repas habituel riche en féculents, affaires préparées, dossard épinglé","Échauffement : 5 min de trot suffisent, gardez votre énergie","Premier tiers : partez à allure marathon, surtout pas plus vite malgré l''euphorie du départ","Deuxième tiers : restez régulier et ravitaillez-vous comme à l''entraînement","Dernier tiers : relâchez les épaules et accélérez si les jambes le permettent"],"notes":"Bonne course !"}}]'::jsonb
WHERE name = 'Marathon en 16 semaines'
  AND structure = '[{"name":"S1 · Footing","week":1,"exercises":[],"cardio":{"sport":"run","distanceKm":7,"intensity":"Zone 2","notes":"Allure confortable : vous devez pouvoir parler."}},{"name":"S1 · Seuil","week":1,"exercises":[],"cardio":{"sport":"run","distanceKm":9,"intensity":"Zone 4","notes":"15 min d''échauffement, 2 × 10 min à allure soutenue, 5 min de récupération entre les blocs."}},{"name":"S1 · Récupération","week":1,"exercises":[],"cardio":{"sport":"run","distanceKm":5,"intensity":"Zone 1","notes":"Très facile, pour récupérer."}},{"name":"S1 · Sortie longue","week":1,"exercises":[],"cardio":{"sport":"run","distanceKm":12,"intensity":"Zone 2","notes":"Allure régulière, hydratez-vous."}},{"name":"S2 · Footing","week":2,"exercises":[],"cardio":{"sport":"run","distanceKm":8,"intensity":"Zone 2","notes":"Allure confortable : vous devez pouvoir parler."}},{"name":"S2 · Fractionné","week":2,"exercises":[],"cardio":{"sport":"run","distanceKm":10,"intensity":"Zone 5","notes":"15 min d''échauffement, 6 × 800 m rapides, 2 min de récupération entre chaque."}},{"name":"S2 · Récupération","week":2,"exercises":[],"cardio":{"sport":"run","distanceKm":6,"intensity":"Zone 1","notes":"Très facile, pour récupérer."}},{"name":"S2 · Sortie longue","week":2,"exercises":[],"cardio":{"sport":"run","distanceKm":14,"intensity":"Zone 2","notes":"Allure régulière, hydratez-vous."}},{"name":"S3 · Footing","week":3,"exercises":[],"cardio":{"sport":"run","distanceKm":8,"intensity":"Zone 2","notes":"Allure confortable : vous devez pouvoir parler."}},{"name":"S3 · Seuil","week":3,"exercises":[],"cardio":{"sport":"run","distanceKm":10,"intensity":"Zone 4","notes":"15 min d''échauffement, 2 × 10 min à allure soutenue, 5 min de récupération entre les blocs."}},{"name":"S3 · Récupération","week":3,"exercises":[],"cardio":{"sport":"run","distanceKm":6,"intensity":"Zone 1","notes":"Très facile, pour récupérer."}},{"name":"S3 · Sortie longue","week":3,"exercises":[],"cardio":{"sport":"run","distanceKm":16,"intensity":"Zone 2","notes":"Allure régulière, hydratez-vous."}},{"name":"S4 · Footing","week":4,"exercises":[],"cardio":{"sport":"run","distanceKm":8,"intensity":"Zone 2","notes":"Allure confortable : vous devez pouvoir parler."}},{"name":"S4 · Fractionné","week":4,"exercises":[],"cardio":{"sport":"run","distanceKm":10,"intensity":"Zone 5","notes":"15 min d''échauffement, 6 × 800 m rapides, 2 min de récupération entre chaque."}},{"name":"S4 · Récupération","week":4,"exercises":[],"cardio":{"sport":"run","distanceKm":6,"intensity":"Zone 1","notes":"Très facile, pour récupérer."}},{"name":"S4 · Sortie longue","week":4,"exercises":[],"cardio":{"sport":"run","distanceKm":13,"intensity":"Zone 2","notes":"Allure régulière, hydratez-vous."}},{"name":"S5 · Footing","week":5,"exercises":[],"cardio":{"sport":"run","distanceKm":9,"intensity":"Zone 2","notes":"Allure confortable : vous devez pouvoir parler."}},{"name":"S5 · Seuil","week":5,"exercises":[],"cardio":{"sport":"run","distanceKm":11,"intensity":"Zone 4","notes":"15 min d''échauffement, 2 × 10 min à allure soutenue, 5 min de récupération entre les blocs."}},{"name":"S5 · Récupération","week":5,"exercises":[],"cardio":{"sport":"run","distanceKm":7,"intensity":"Zone 1","notes":"Très facile, pour récupérer."}},{"name":"S5 · Sortie longue","week":5,"exercises":[],"cardio":{"sport":"run","distanceKm":18,"intensity":"Zone 2","notes":"Allure régulière, hydratez-vous."}},{"name":"S6 · Footing","week":6,"exercises":[],"cardio":{"sport":"run","distanceKm":9,"intensity":"Zone 2","notes":"Allure confortable : vous devez pouvoir parler."}},{"name":"S6 · Fractionné","week":6,"exercises":[],"cardio":{"sport":"run","distanceKm":11,"intensity":"Zone 5","notes":"15 min d''échauffement, 6 × 800 m rapides, 2 min de récupération entre chaque."}},{"name":"S6 · Récupération","week":6,"exercises":[],"cardio":{"sport":"run","distanceKm":7,"intensity":"Zone 1","notes":"Très facile, pour récupérer."}},{"name":"S6 · Sortie longue","week":6,"exercises":[],"cardio":{"sport":"run","distanceKm":20,"intensity":"Zone 2","notes":"Allure régulière, hydratez-vous."}},{"name":"S7 · Footing","week":7,"exercises":[],"cardio":{"sport":"run","distanceKm":9,"intensity":"Zone 2","notes":"Allure confortable : vous devez pouvoir parler."}},{"name":"S7 · Seuil","week":7,"exercises":[],"cardio":{"sport":"run","distanceKm":11,"intensity":"Zone 4","notes":"15 min d''échauffement, 2 × 10 min à allure soutenue, 5 min de récupération entre les blocs."}},{"name":"S7 · Récupération","week":7,"exercises":[],"cardio":{"sport":"run","distanceKm":7,"intensity":"Zone 1","notes":"Très facile, pour récupérer."}},{"name":"S7 · Sortie longue","week":7,"exercises":[],"cardio":{"sport":"run","distanceKm":22,"intensity":"Zone 2","notes":"Allure régulière, hydratez-vous."}},{"name":"S8 · Footing","week":8,"exercises":[],"cardio":{"sport":"run","distanceKm":8,"intensity":"Zone 2","notes":"Allure confortable : vous devez pouvoir parler."}},{"name":"S8 · Fractionné","week":8,"exercises":[],"cardio":{"sport":"run","distanceKm":10,"intensity":"Zone 5","notes":"15 min d''échauffement, 6 × 800 m rapides, 2 min de récupération entre chaque."}},{"name":"S8 · Récupération","week":8,"exercises":[],"cardio":{"sport":"run","distanceKm":6,"intensity":"Zone 1","notes":"Très facile, pour récupérer."}},{"name":"S8 · Sortie longue","week":8,"exercises":[],"cardio":{"sport":"run","distanceKm":16,"intensity":"Zone 2","notes":"Allure régulière, hydratez-vous."}},{"name":"S9 · Footing","week":9,"exercises":[],"cardio":{"sport":"run","distanceKm":10,"intensity":"Zone 2","notes":"Allure confortable : vous devez pouvoir parler."}},{"name":"S9 · Seuil","week":9,"exercises":[],"cardio":{"sport":"run","distanceKm":12,"intensity":"Zone 4","notes":"15 min d''échauffement, 2 × 10 min à allure soutenue, 5 min de récupération entre les blocs."}},{"name":"S9 · Récupération","week":9,"exercises":[],"cardio":{"sport":"run","distanceKm":8,"intensity":"Zone 1","notes":"Très facile, pour récupérer."}},{"name":"S9 · Sortie longue","week":9,"exercises":[],"cardio":{"sport":"run","distanceKm":24,"intensity":"Zone 2","notes":"Allure régulière, hydratez-vous."}},{"name":"S10 · Footing","week":10,"exercises":[],"cardio":{"sport":"run","distanceKm":10,"intensity":"Zone 2","notes":"Allure confortable : vous devez pouvoir parler."}},{"name":"S10 · Fractionné","week":10,"exercises":[],"cardio":{"sport":"run","distanceKm":12,"intensity":"Zone 5","notes":"15 min d''échauffement, 6 × 800 m rapides, 2 min de récupération entre chaque."}},{"name":"S10 · Récupération","week":10,"exercises":[],"cardio":{"sport":"run","distanceKm":8,"intensity":"Zone 1","notes":"Très facile, pour récupérer."}},{"name":"S10 · Sortie longue","week":10,"exercises":[],"cardio":{"sport":"run","distanceKm":26,"intensity":"Zone 2","notes":"Allure régulière, hydratez-vous."}},{"name":"S11 · Footing","week":11,"exercises":[],"cardio":{"sport":"run","distanceKm":11,"intensity":"Zone 2","notes":"Allure confortable : vous devez pouvoir parler."}},{"name":"S11 · Seuil","week":11,"exercises":[],"cardio":{"sport":"run","distanceKm":13,"intensity":"Zone 4","notes":"15 min d''échauffement, 2 × 10 min à allure soutenue, 5 min de récupération entre les blocs."}},{"name":"S11 · Récupération","week":11,"exercises":[],"cardio":{"sport":"run","distanceKm":9,"intensity":"Zone 1","notes":"Très facile, pour récupérer."}},{"name":"S11 · Sortie longue","week":11,"exercises":[],"cardio":{"sport":"run","distanceKm":28,"intensity":"Zone 2","notes":"Allure régulière, hydratez-vous."}},{"name":"S12 · Footing","week":12,"exercises":[],"cardio":{"sport":"run","distanceKm":9,"intensity":"Zone 2","notes":"Allure confortable : vous devez pouvoir parler."}},{"name":"S12 · Fractionné","week":12,"exercises":[],"cardio":{"sport":"run","distanceKm":11,"intensity":"Zone 5","notes":"15 min d''échauffement, 6 × 800 m rapides, 2 min de récupération entre chaque."}},{"name":"S12 · Récupération","week":12,"exercises":[],"cardio":{"sport":"run","distanceKm":7,"intensity":"Zone 1","notes":"Très facile, pour récupérer."}},{"name":"S12 · Sortie longue","week":12,"exercises":[],"cardio":{"sport":"run","distanceKm":20,"intensity":"Zone 2","notes":"Allure régulière, hydratez-vous."}},{"name":"S13 · Footing","week":13,"exercises":[],"cardio":{"sport":"run","distanceKm":11,"intensity":"Zone 2","notes":"Allure confortable : vous devez pouvoir parler."}},{"name":"S13 · Seuil","week":13,"exercises":[],"cardio":{"sport":"run","distanceKm":13,"intensity":"Zone 4","notes":"15 min d''échauffement, 2 × 10 min à allure soutenue, 5 min de récupération entre les blocs."}},{"name":"S13 · Récupération","week":13,"exercises":[],"cardio":{"sport":"run","distanceKm":9,"intensity":"Zone 1","notes":"Très facile, pour récupérer."}},{"name":"S13 · Sortie longue","week":13,"exercises":[],"cardio":{"sport":"run","distanceKm":32,"intensity":"Zone 2","notes":"Allure régulière, hydratez-vous."}},{"name":"S14 · Footing","week":14,"exercises":[],"cardio":{"sport":"run","distanceKm":10,"intensity":"Zone 2","notes":"Allure confortable : vous devez pouvoir parler."}},{"name":"S14 · Fractionné","week":14,"exercises":[],"cardio":{"sport":"run","distanceKm":12,"intensity":"Zone 5","notes":"15 min d''échauffement, 6 × 800 m rapides, 2 min de récupération entre chaque."}},{"name":"S14 · Récupération","week":14,"exercises":[],"cardio":{"sport":"run","distanceKm":8,"intensity":"Zone 1","notes":"Très facile, pour récupérer."}},{"name":"S14 · Sortie longue","week":14,"exercises":[],"cardio":{"sport":"run","distanceKm":24,"intensity":"Zone 2","notes":"Allure régulière, hydratez-vous."}},{"name":"S15 · Footing","week":15,"exercises":[],"cardio":{"sport":"run","distanceKm":8,"intensity":"Zone 2","notes":"Allure confortable : vous devez pouvoir parler."}},{"name":"S15 · Seuil","week":15,"exercises":[],"cardio":{"sport":"run","distanceKm":10,"intensity":"Zone 4","notes":"15 min d''échauffement, 2 × 10 min à allure soutenue, 5 min de récupération entre les blocs."}},{"name":"S15 · Récupération","week":15,"exercises":[],"cardio":{"sport":"run","distanceKm":6,"intensity":"Zone 1","notes":"Très facile, pour récupérer."}},{"name":"S15 · Sortie longue","week":15,"exercises":[],"cardio":{"sport":"run","distanceKm":16,"intensity":"Zone 2","notes":"Allure régulière, hydratez-vous."}},{"name":"S16 · Footing","week":16,"exercises":[],"cardio":{"sport":"run","distanceKm":6,"intensity":"Zone 2","notes":"Court et facile."}},{"name":"S16 · Rappel","week":16,"exercises":[],"cardio":{"sport":"run","distanceKm":4,"intensity":"Zone 3","notes":"Quelques accélérations de 30 s, sans forcer."}},{"name":"S16 · Marathon","week":16,"exercises":[],"cardio":{"sport":"run","distanceKm":42.2,"intensity":"Course","notes":"Partez prudemment, et bonne course !"}}]'::jsonb;

UPDATE program_templates
SET description = 'Pour qui court déjà 10 km. Trois sorties par semaine : un footing, une séance de qualité qui évolue (côtes, seuil, fractionné, allure semi) et une sortie longue jusqu''à 18 km. Avis médical conseillé avant de commencer. À adapter à vos sensations.',
    structure = '[{"name":"S1 · Footing","week":1,"exercises":[],"cardio":{"sport":"run","distanceKm":6,"intensity":"Zone 2","purpose":"Construire l''endurance de base sans accumuler de fatigue.","steps":["5 min de trot très lent pour démarrer","Course continue à allure confortable : vous devez pouvoir parler en phrases complètes","Étirements doux des mollets et de l''arrière des cuisses"]}},{"name":"S1 · Côtes","week":1,"exercises":[],"cardio":{"sport":"run","distanceKm":6,"intensity":"Zone 4","purpose":"Renforcer les jambes et la foulée sans la violence du fractionné sur le plat.","steps":["Échauffement : 15 min de footing très facile, puis 4 gammes (montées de genoux, talons-fesses) sur 20 m","6 × 45 s en côte à bonne allure, retour en trottinant","Retour au calme : 10 min de footing très lent, puis étirements doux"]}},{"name":"S1 · Sortie longue","week":1,"exercises":[],"cardio":{"sport":"run","distanceKm":8,"intensity":"Zone 2","purpose":"Habituer le corps à courir longtemps : c''est la séance clé de la semaine.","steps":["10 premières minutes très tranquilles","Allure régulière en Zone 2 jusqu''au bout, quitte à marcher dans les côtes","5 min de marche pour terminer"],"notes":"Partez avec de l''eau s''il fait chaud."}},{"name":"S2 · Footing","week":2,"exercises":[],"cardio":{"sport":"run","distanceKm":6,"intensity":"Zone 2","purpose":"Construire l''endurance de base sans accumuler de fatigue.","steps":["5 min de trot très lent pour démarrer","Course continue à allure confortable : vous devez pouvoir parler en phrases complètes","Pour finir : 5 lignes droites de 80 m en accélérant progressivement, retour en marchant"]}},{"name":"S2 · Fartlek","week":2,"exercises":[],"cardio":{"sport":"run","distanceKm":7,"intensity":"Zone 4","purpose":"Habituer le corps aux changements de rythme, en jouant.","steps":["Échauffement : 15 min de footing très facile, puis 4 gammes (montées de genoux, talons-fesses) sur 20 m","8 × (1 min vite, 1 min lent), au feeling","Retour au calme : 10 min de footing très lent, puis étirements doux"]}},{"name":"S2 · Sortie longue","week":2,"exercises":[],"cardio":{"sport":"run","distanceKm":10,"intensity":"Zone 2","purpose":"Habituer le corps à courir longtemps : c''est la séance clé de la semaine.","steps":["10 premières minutes très tranquilles","Allure régulière en Zone 2 jusqu''au bout, quitte à marcher dans les côtes","5 min de marche pour terminer"],"notes":"Partez avec de l''eau s''il fait chaud."}},{"name":"S3 · Footing","week":3,"exercises":[],"cardio":{"sport":"run","distanceKm":6,"intensity":"Zone 2","purpose":"Construire l''endurance de base sans accumuler de fatigue.","steps":["5 min de trot très lent pour démarrer","Course continue à allure confortable : vous devez pouvoir parler en phrases complètes","Étirements doux des mollets et de l''arrière des cuisses"]}},{"name":"S3 · Côtes","week":3,"exercises":[],"cardio":{"sport":"run","distanceKm":6,"intensity":"Zone 4","purpose":"Renforcer les jambes et la foulée sans la violence du fractionné sur le plat.","steps":["Échauffement : 15 min de footing très facile, puis 4 gammes (montées de genoux, talons-fesses) sur 20 m","8 × 45 s en côte à bonne allure, retour en trottinant","Retour au calme : 10 min de footing très lent, puis étirements doux"]}},{"name":"S3 · Sortie longue","week":3,"exercises":[],"cardio":{"sport":"run","distanceKm":12,"intensity":"Zone 2","purpose":"Habituer le corps à courir longtemps : c''est la séance clé de la semaine.","steps":["10 premières minutes très tranquilles","Allure régulière en Zone 2 jusqu''au bout, quitte à marcher dans les côtes","5 min de marche pour terminer"],"notes":"Partez avec de l''eau s''il fait chaud."}},{"name":"S4 · Footing","week":4,"exercises":[],"cardio":{"sport":"run","distanceKm":6,"intensity":"Zone 2","purpose":"Construire l''endurance de base sans accumuler de fatigue.","steps":["5 min de trot très lent pour démarrer","Course continue à allure confortable : vous devez pouvoir parler en phrases complètes","Pour finir : 5 lignes droites de 80 m en accélérant progressivement, retour en marchant"]}},{"name":"S4 · Fartlek léger","week":4,"exercises":[],"cardio":{"sport":"run","distanceKm":6,"intensity":"Zone 3","purpose":"Semaine allégée : garder du rythme tout en laissant le corps assimiler.","steps":["10 min de footing facile","6 × (1 min un peu plus vite, 2 min facile)","10 min de footing facile"]}},{"name":"S4 · Sortie longue","week":4,"exercises":[],"cardio":{"sport":"run","distanceKm":10,"intensity":"Zone 2","purpose":"Habituer le corps à courir longtemps : c''est la séance clé de la semaine.","steps":["10 premières minutes très tranquilles","Allure régulière en Zone 2 jusqu''au bout, quitte à marcher dans les côtes","5 min de marche pour terminer"],"notes":"Partez avec de l''eau s''il fait chaud."}},{"name":"S5 · Footing","week":5,"exercises":[],"cardio":{"sport":"run","distanceKm":7,"intensity":"Zone 2","purpose":"Construire l''endurance de base sans accumuler de fatigue.","steps":["5 min de trot très lent pour démarrer","Course continue à allure confortable : vous devez pouvoir parler en phrases complètes","Étirements doux des mollets et de l''arrière des cuisses"]}},{"name":"S5 · Fractionné court","week":5,"exercises":[],"cardio":{"sport":"run","distanceKm":9,"intensity":"Zone 5","purpose":"Développer la vitesse maximale aérobie : courir plus vite devient plus facile.","steps":["Échauffement : 15 min de footing très facile, puis 4 gammes (montées de genoux, talons-fesses) sur 20 m","8 × 400 m rapides, 1 min 30 de récupération en trottinant","Retour au calme : 10 min de footing très lent, puis étirements doux"]}},{"name":"S5 · Sortie longue","week":5,"exercises":[],"cardio":{"sport":"run","distanceKm":13,"intensity":"Zone 2","purpose":"Habituer le corps à courir longtemps : c''est la séance clé de la semaine.","steps":["10 km en Zone 2","3 derniers km un peu plus soutenus (Zone 3)","5 min de marche pour terminer"],"notes":"Partez avec de l''eau s''il fait chaud."}},{"name":"S6 · Footing","week":6,"exercises":[],"cardio":{"sport":"run","distanceKm":7,"intensity":"Zone 2","purpose":"Construire l''endurance de base sans accumuler de fatigue.","steps":["5 min de trot très lent pour démarrer","Course continue à allure confortable : vous devez pouvoir parler en phrases complètes","Pour finir : 5 lignes droites de 80 m en accélérant progressivement, retour en marchant"]}},{"name":"S6 · Seuil","week":6,"exercises":[],"cardio":{"sport":"run","distanceKm":10,"intensity":"Zone 4","purpose":"Repousser le seuil : tenir longtemps une allure soutenue sans s''asphyxier.","steps":["Échauffement : 15 min de footing très facile, puis 4 gammes (montées de genoux, talons-fesses) sur 20 m","3 × 8 min soutenu, 2 min de récupération","Retour au calme : 10 min de footing très lent, puis étirements doux"]}},{"name":"S6 · Sortie longue","week":6,"exercises":[],"cardio":{"sport":"run","distanceKm":15,"intensity":"Zone 2","purpose":"Habituer le corps à courir longtemps : c''est la séance clé de la semaine.","steps":["11 km en Zone 2","4 derniers km un peu plus soutenus (Zone 3)","5 min de marche pour terminer"],"notes":"Partez avec de l''eau s''il fait chaud."}},{"name":"S7 · Footing","week":7,"exercises":[],"cardio":{"sport":"run","distanceKm":7,"intensity":"Zone 2","purpose":"Construire l''endurance de base sans accumuler de fatigue.","steps":["5 min de trot très lent pour démarrer","Course continue à allure confortable : vous devez pouvoir parler en phrases complètes","Étirements doux des mollets et de l''arrière des cuisses"]}},{"name":"S7 · Fractionné long","week":7,"exercises":[],"cardio":{"sport":"run","distanceKm":11,"intensity":"Zone 4","purpose":"Entretenir la vitesse acquise sur des efforts plus longs.","steps":["Échauffement : 15 min de footing très facile, puis 4 gammes (montées de genoux, talons-fesses) sur 20 m","5 × 1000 m soutenus, 2 min de récupération en trottinant","Retour au calme : 10 min de footing très lent, puis étirements doux"]}},{"name":"S7 · Sortie longue","week":7,"exercises":[],"cardio":{"sport":"run","distanceKm":16,"intensity":"Zone 2","purpose":"Apprendre à tenir l''allure de course sur des jambes fatiguées.","steps":["11 km en Zone 2, régulier","5 derniers km à allure semi","5 min de marche pour terminer"],"notes":"Testez votre ravitaillement de course : boire toutes les 20 min, un gel ou une barre toutes les 40 min."}},{"name":"S8 · Footing","week":8,"exercises":[],"cardio":{"sport":"run","distanceKm":6,"intensity":"Zone 2","purpose":"Construire l''endurance de base sans accumuler de fatigue.","steps":["5 min de trot très lent pour démarrer","Course continue à allure confortable : vous devez pouvoir parler en phrases complètes","Pour finir : 5 lignes droites de 80 m en accélérant progressivement, retour en marchant"]}},{"name":"S8 · Fartlek léger","week":8,"exercises":[],"cardio":{"sport":"run","distanceKm":6,"intensity":"Zone 3","purpose":"Semaine allégée : garder du rythme tout en laissant le corps assimiler.","steps":["10 min de footing facile","6 × (1 min un peu plus vite, 2 min facile)","10 min de footing facile"]}},{"name":"S8 · Sortie longue","week":8,"exercises":[],"cardio":{"sport":"run","distanceKm":12,"intensity":"Zone 2","purpose":"Apprendre à tenir l''allure de course sur des jambes fatiguées.","steps":["10 premières minutes très tranquilles","Allure régulière en Zone 2 jusqu''au bout, quitte à marcher dans les côtes","5 min de marche pour terminer"],"notes":"Partez avec de l''eau s''il fait chaud."}},{"name":"S9 · Footing","week":9,"exercises":[],"cardio":{"sport":"run","distanceKm":8,"intensity":"Zone 2","purpose":"Construire l''endurance de base sans accumuler de fatigue.","steps":["5 min de trot très lent pour démarrer","Course continue à allure confortable : vous devez pouvoir parler en phrases complètes","Étirements doux des mollets et de l''arrière des cuisses"]}},{"name":"S9 · Allure spécifique","week":9,"exercises":[],"cardio":{"sport":"run","distanceKm":11,"intensity":"Allure course","purpose":"Mémoriser l''allure semi pour la retrouver sans montre le jour J.","steps":["Échauffement : 15 min de footing très facile, puis 4 gammes (montées de genoux, talons-fesses) sur 20 m","3 × 2 km à allure semi, 2 min de récupération","Retour au calme : 10 min de footing très lent, puis étirements doux"]}},{"name":"S9 · Sortie longue","week":9,"exercises":[],"cardio":{"sport":"run","distanceKm":18,"intensity":"Zone 2","purpose":"Apprendre à tenir l''allure de course sur des jambes fatiguées.","steps":["13 km en Zone 2, régulier","5 derniers km à allure semi","5 min de marche pour terminer"],"notes":"Testez votre ravitaillement de course : boire toutes les 20 min, un gel ou une barre toutes les 40 min."}},{"name":"S10 · Footing","week":10,"exercises":[],"cardio":{"sport":"run","distanceKm":7,"intensity":"Zone 2","purpose":"Construire l''endurance de base sans accumuler de fatigue.","steps":["5 min de trot très lent pour démarrer","Course continue à allure confortable : vous devez pouvoir parler en phrases complètes","Étirements doux des mollets et de l''arrière des cuisses"]}},{"name":"S10 · Rappel d''allure","week":10,"exercises":[],"cardio":{"sport":"run","distanceKm":7,"intensity":"Allure course","purpose":"Garder les sensations de vitesse en réduisant le volume.","steps":["Échauffement : 15 min de footing très facile, puis 4 gammes (montées de genoux, talons-fesses) sur 20 m","3 × 1 km à allure semi, 2 min de récupération","Retour au calme : 10 min de footing très lent, puis étirements doux"]}},{"name":"S10 · Sortie longue","week":10,"exercises":[],"cardio":{"sport":"run","distanceKm":16,"intensity":"Zone 2","purpose":"Habituer le corps à courir longtemps : c''est la séance clé de la semaine.","steps":["10 premières minutes très tranquilles","Allure régulière en Zone 2 jusqu''au bout, quitte à marcher dans les côtes","5 min de marche pour terminer"],"notes":"Testez votre ravitaillement de course : boire toutes les 20 min, un gel ou une barre toutes les 40 min."}},{"name":"S11 · Footing","week":11,"exercises":[],"cardio":{"sport":"run","distanceKm":6,"intensity":"Zone 2","purpose":"Construire l''endurance de base sans accumuler de fatigue.","steps":["5 min de trot très lent pour démarrer","Course continue à allure confortable : vous devez pouvoir parler en phrases complètes","Étirements doux des mollets et de l''arrière des cuisses"]}},{"name":"S11 · Rappel d''allure","week":11,"exercises":[],"cardio":{"sport":"run","distanceKm":6,"intensity":"Allure course","purpose":"Garder les sensations de vitesse en réduisant le volume.","steps":["Échauffement : 15 min de footing très facile, puis 4 gammes (montées de genoux, talons-fesses) sur 20 m","3 × 1 km à allure semi, 2 min de récupération","Retour au calme : 10 min de footing très lent, puis étirements doux"]}},{"name":"S11 · Sortie longue","week":11,"exercises":[],"cardio":{"sport":"run","distanceKm":12,"intensity":"Zone 2","purpose":"Habituer le corps à courir longtemps : c''est la séance clé de la semaine.","steps":["10 premières minutes très tranquilles","Allure régulière en Zone 2 jusqu''au bout, quitte à marcher dans les côtes","5 min de marche pour terminer"],"notes":"Partez avec de l''eau s''il fait chaud."}},{"name":"S12 · Footing","week":12,"exercises":[],"cardio":{"sport":"run","distanceKm":6,"intensity":"Zone 2","purpose":"Rester en mouvement sans puiser dans les réserves.","steps":["Footing court et facile","3 lignes droites de 80 m pour réveiller les jambes"]}},{"name":"S12 · Rappel","week":12,"exercises":[],"cardio":{"sport":"run","distanceKm":4,"intensity":"Zone 3","purpose":"Deux ou trois jours avant la course : garder le jus sans se fatiguer.","steps":["15 min de footing facile","3 × 2 min à allure semi, 2 min de récupération","5 min de footing lent"]}},{"name":"S12 · Semi-marathon","week":12,"exercises":[],"cardio":{"sport":"run","distanceKm":21.1,"intensity":"Course","purpose":"Le jour J : profiter du travail accumulé.","steps":["La veille : repas habituel riche en féculents, affaires préparées, dossard épinglé","Échauffement : 5 min de trot suffisent, gardez votre énergie","Premier tiers : partez à allure semi, surtout pas plus vite malgré l''euphorie du départ","Deuxième tiers : restez régulier et ravitaillez-vous comme à l''entraînement","Dernier tiers : relâchez les épaules et accélérez si les jambes le permettent"],"notes":"Bonne course !"}}]'::jsonb
WHERE name = 'Semi-marathon en 12 semaines'
  AND structure = '[{"name":"S1 · Footing","week":1,"exercises":[],"cardio":{"sport":"run","distanceKm":6,"intensity":"Zone 2","notes":"Allure confortable : vous devez pouvoir parler."}},{"name":"S1 · Seuil","week":1,"exercises":[],"cardio":{"sport":"run","distanceKm":8,"intensity":"Zone 4","notes":"15 min d''échauffement, 2 × 10 min à allure soutenue, 5 min de récupération entre les blocs."}},{"name":"S1 · Sortie longue","week":1,"exercises":[],"cardio":{"sport":"run","distanceKm":8,"intensity":"Zone 2","notes":"Allure régulière, hydratez-vous."}},{"name":"S2 · Footing","week":2,"exercises":[],"cardio":{"sport":"run","distanceKm":6,"intensity":"Zone 2","notes":"Allure confortable : vous devez pouvoir parler."}},{"name":"S2 · Fractionné","week":2,"exercises":[],"cardio":{"sport":"run","distanceKm":8,"intensity":"Zone 5","notes":"15 min d''échauffement, 6 × 800 m rapides, 2 min de récupération entre chaque."}},{"name":"S2 · Sortie longue","week":2,"exercises":[],"cardio":{"sport":"run","distanceKm":10,"intensity":"Zone 2","notes":"Allure régulière, hydratez-vous."}},{"name":"S3 · Footing","week":3,"exercises":[],"cardio":{"sport":"run","distanceKm":6,"intensity":"Zone 2","notes":"Allure confortable : vous devez pouvoir parler."}},{"name":"S3 · Seuil","week":3,"exercises":[],"cardio":{"sport":"run","distanceKm":8,"intensity":"Zone 4","notes":"15 min d''échauffement, 2 × 10 min à allure soutenue, 5 min de récupération entre les blocs."}},{"name":"S3 · Sortie longue","week":3,"exercises":[],"cardio":{"sport":"run","distanceKm":12,"intensity":"Zone 2","notes":"Allure régulière, hydratez-vous."}},{"name":"S4 · Footing","week":4,"exercises":[],"cardio":{"sport":"run","distanceKm":6,"intensity":"Zone 2","notes":"Allure confortable : vous devez pouvoir parler."}},{"name":"S4 · Fractionné","week":4,"exercises":[],"cardio":{"sport":"run","distanceKm":8,"intensity":"Zone 5","notes":"15 min d''échauffement, 6 × 800 m rapides, 2 min de récupération entre chaque."}},{"name":"S4 · Sortie longue","week":4,"exercises":[],"cardio":{"sport":"run","distanceKm":10,"intensity":"Zone 2","notes":"Allure régulière, hydratez-vous."}},{"name":"S5 · Footing","week":5,"exercises":[],"cardio":{"sport":"run","distanceKm":7,"intensity":"Zone 2","notes":"Allure confortable : vous devez pouvoir parler."}},{"name":"S5 · Seuil","week":5,"exercises":[],"cardio":{"sport":"run","distanceKm":9,"intensity":"Zone 4","notes":"15 min d''échauffement, 2 × 10 min à allure soutenue, 5 min de récupération entre les blocs."}},{"name":"S5 · Sortie longue","week":5,"exercises":[],"cardio":{"sport":"run","distanceKm":13,"intensity":"Zone 2","notes":"Allure régulière, hydratez-vous."}},{"name":"S6 · Footing","week":6,"exercises":[],"cardio":{"sport":"run","distanceKm":7,"intensity":"Zone 2","notes":"Allure confortable : vous devez pouvoir parler."}},{"name":"S6 · Fractionné","week":6,"exercises":[],"cardio":{"sport":"run","distanceKm":9,"intensity":"Zone 5","notes":"15 min d''échauffement, 6 × 800 m rapides, 2 min de récupération entre chaque."}},{"name":"S6 · Sortie longue","week":6,"exercises":[],"cardio":{"sport":"run","distanceKm":15,"intensity":"Zone 2","notes":"Allure régulière, hydratez-vous."}},{"name":"S7 · Footing","week":7,"exercises":[],"cardio":{"sport":"run","distanceKm":7,"intensity":"Zone 2","notes":"Allure confortable : vous devez pouvoir parler."}},{"name":"S7 · Seuil","week":7,"exercises":[],"cardio":{"sport":"run","distanceKm":9,"intensity":"Zone 4","notes":"15 min d''échauffement, 2 × 10 min à allure soutenue, 5 min de récupération entre les blocs."}},{"name":"S7 · Sortie longue","week":7,"exercises":[],"cardio":{"sport":"run","distanceKm":16,"intensity":"Zone 2","notes":"Allure régulière, hydratez-vous."}},{"name":"S8 · Footing","week":8,"exercises":[],"cardio":{"sport":"run","distanceKm":6,"intensity":"Zone 2","notes":"Allure confortable : vous devez pouvoir parler."}},{"name":"S8 · Fractionné","week":8,"exercises":[],"cardio":{"sport":"run","distanceKm":8,"intensity":"Zone 5","notes":"15 min d''échauffement, 6 × 800 m rapides, 2 min de récupération entre chaque."}},{"name":"S8 · Sortie longue","week":8,"exercises":[],"cardio":{"sport":"run","distanceKm":12,"intensity":"Zone 2","notes":"Allure régulière, hydratez-vous."}},{"name":"S9 · Footing","week":9,"exercises":[],"cardio":{"sport":"run","distanceKm":8,"intensity":"Zone 2","notes":"Allure confortable : vous devez pouvoir parler."}},{"name":"S9 · Seuil","week":9,"exercises":[],"cardio":{"sport":"run","distanceKm":10,"intensity":"Zone 4","notes":"15 min d''échauffement, 2 × 10 min à allure soutenue, 5 min de récupération entre les blocs."}},{"name":"S9 · Sortie longue","week":9,"exercises":[],"cardio":{"sport":"run","distanceKm":18,"intensity":"Zone 2","notes":"Allure régulière, hydratez-vous."}},{"name":"S10 · Footing","week":10,"exercises":[],"cardio":{"sport":"run","distanceKm":7,"intensity":"Zone 2","notes":"Allure confortable : vous devez pouvoir parler."}},{"name":"S10 · Fractionné","week":10,"exercises":[],"cardio":{"sport":"run","distanceKm":9,"intensity":"Zone 5","notes":"15 min d''échauffement, 6 × 800 m rapides, 2 min de récupération entre chaque."}},{"name":"S10 · Sortie longue","week":10,"exercises":[],"cardio":{"sport":"run","distanceKm":16,"intensity":"Zone 2","notes":"Allure régulière, hydratez-vous."}},{"name":"S11 · Footing","week":11,"exercises":[],"cardio":{"sport":"run","distanceKm":6,"intensity":"Zone 2","notes":"Allure confortable : vous devez pouvoir parler."}},{"name":"S11 · Seuil","week":11,"exercises":[],"cardio":{"sport":"run","distanceKm":8,"intensity":"Zone 4","notes":"15 min d''échauffement, 2 × 10 min à allure soutenue, 5 min de récupération entre les blocs."}},{"name":"S11 · Sortie longue","week":11,"exercises":[],"cardio":{"sport":"run","distanceKm":12,"intensity":"Zone 2","notes":"Allure régulière, hydratez-vous."}},{"name":"S12 · Footing","week":12,"exercises":[],"cardio":{"sport":"run","distanceKm":6,"intensity":"Zone 2","notes":"Court et facile."}},{"name":"S12 · Rappel","week":12,"exercises":[],"cardio":{"sport":"run","distanceKm":4,"intensity":"Zone 3","notes":"Quelques accélérations de 30 s, sans forcer."}},{"name":"S12 · Semi-marathon","week":12,"exercises":[],"cardio":{"sport":"run","distanceKm":21.1,"intensity":"Course","notes":"Partez prudemment, et bonne course !"}}]'::jsonb;

UPDATE program_templates
SET description = 'Pour qui court 30 minutes sans s''arrêter. Trois sorties par semaine, des côtes au fractionné, pour réussir votre 10 km. Avis médical conseillé avant de commencer. À adapter à vos sensations.',
    structure = '[{"name":"S1 · Footing","week":1,"exercises":[],"cardio":{"sport":"run","distanceKm":4,"intensity":"Zone 2","purpose":"Construire l''endurance de base sans accumuler de fatigue.","steps":["5 min de trot très lent pour démarrer","Course continue à allure confortable : vous devez pouvoir parler en phrases complètes","Étirements doux des mollets et de l''arrière des cuisses"]}},{"name":"S1 · Côtes","week":1,"exercises":[],"cardio":{"sport":"run","distanceKm":6,"intensity":"Zone 4","purpose":"Renforcer les jambes et la foulée sans la violence du fractionné sur le plat.","steps":["Échauffement : 15 min de footing très facile, puis 4 gammes (montées de genoux, talons-fesses) sur 20 m","5 × 45 s en côte à bonne allure, retour en trottinant","Retour au calme : 10 min de footing très lent, puis étirements doux"]}},{"name":"S1 · Sortie longue","week":1,"exercises":[],"cardio":{"sport":"run","distanceKm":5,"intensity":"Zone 2","purpose":"Habituer le corps à courir longtemps : c''est la séance clé de la semaine.","steps":["10 premières minutes très tranquilles","Allure régulière en Zone 2 jusqu''au bout, quitte à marcher dans les côtes","5 min de marche pour terminer"],"notes":"Partez avec de l''eau s''il fait chaud."}},{"name":"S2 · Footing","week":2,"exercises":[],"cardio":{"sport":"run","distanceKm":4,"intensity":"Zone 2","purpose":"Construire l''endurance de base sans accumuler de fatigue.","steps":["5 min de trot très lent pour démarrer","Course continue à allure confortable : vous devez pouvoir parler en phrases complètes","Pour finir : 5 lignes droites de 80 m en accélérant progressivement, retour en marchant"]}},{"name":"S2 · Fartlek","week":2,"exercises":[],"cardio":{"sport":"run","distanceKm":6,"intensity":"Zone 4","purpose":"Habituer le corps aux changements de rythme, en jouant.","steps":["Échauffement : 15 min de footing très facile, puis 4 gammes (montées de genoux, talons-fesses) sur 20 m","6 × (1 min vite, 1 min lent), au feeling","Retour au calme : 10 min de footing très lent, puis étirements doux"]}},{"name":"S2 · Sortie longue","week":2,"exercises":[],"cardio":{"sport":"run","distanceKm":6,"intensity":"Zone 2","purpose":"Habituer le corps à courir longtemps : c''est la séance clé de la semaine.","steps":["10 premières minutes très tranquilles","Allure régulière en Zone 2 jusqu''au bout, quitte à marcher dans les côtes","5 min de marche pour terminer"],"notes":"Partez avec de l''eau s''il fait chaud."}},{"name":"S3 · Footing","week":3,"exercises":[],"cardio":{"sport":"run","distanceKm":4,"intensity":"Zone 2","purpose":"Construire l''endurance de base sans accumuler de fatigue.","steps":["5 min de trot très lent pour démarrer","Course continue à allure confortable : vous devez pouvoir parler en phrases complètes","Étirements doux des mollets et de l''arrière des cuisses"]}},{"name":"S3 · Fractionné court","week":3,"exercises":[],"cardio":{"sport":"run","distanceKm":8,"intensity":"Zone 5","purpose":"Développer la vitesse maximale aérobie : courir plus vite devient plus facile.","steps":["Échauffement : 15 min de footing très facile, puis 4 gammes (montées de genoux, talons-fesses) sur 20 m","6 × 400 m rapides, 1 min 30 de récupération en trottinant","Retour au calme : 10 min de footing très lent, puis étirements doux"]}},{"name":"S3 · Sortie longue","week":3,"exercises":[],"cardio":{"sport":"run","distanceKm":7,"intensity":"Zone 2","purpose":"Habituer le corps à courir longtemps : c''est la séance clé de la semaine.","steps":["5 km en Zone 2","2 derniers km un peu plus soutenus (Zone 3)","5 min de marche pour terminer"],"notes":"Partez avec de l''eau s''il fait chaud."}},{"name":"S4 · Footing","week":4,"exercises":[],"cardio":{"sport":"run","distanceKm":4,"intensity":"Zone 2","purpose":"Construire l''endurance de base sans accumuler de fatigue.","steps":["5 min de trot très lent pour démarrer","Course continue à allure confortable : vous devez pouvoir parler en phrases complètes","Pour finir : 5 lignes droites de 80 m en accélérant progressivement, retour en marchant"]}},{"name":"S4 · Fartlek léger","week":4,"exercises":[],"cardio":{"sport":"run","distanceKm":4,"intensity":"Zone 3","purpose":"Semaine allégée : garder du rythme tout en laissant le corps assimiler.","steps":["10 min de footing facile","6 × (1 min un peu plus vite, 2 min facile)","10 min de footing facile"]}},{"name":"S4 · Sortie longue","week":4,"exercises":[],"cardio":{"sport":"run","distanceKm":6,"intensity":"Zone 2","purpose":"Habituer le corps à courir longtemps : c''est la séance clé de la semaine.","steps":["10 premières minutes très tranquilles","Allure régulière en Zone 2 jusqu''au bout, quitte à marcher dans les côtes","5 min de marche pour terminer"],"notes":"Partez avec de l''eau s''il fait chaud."}},{"name":"S5 · Footing","week":5,"exercises":[],"cardio":{"sport":"run","distanceKm":5,"intensity":"Zone 2","purpose":"Construire l''endurance de base sans accumuler de fatigue.","steps":["5 min de trot très lent pour démarrer","Course continue à allure confortable : vous devez pouvoir parler en phrases complètes","Étirements doux des mollets et de l''arrière des cuisses"]}},{"name":"S5 · Fractionné long","week":5,"exercises":[],"cardio":{"sport":"run","distanceKm":9,"intensity":"Zone 4","purpose":"Entretenir la vitesse acquise sur des efforts plus longs.","steps":["Échauffement : 15 min de footing très facile, puis 4 gammes (montées de genoux, talons-fesses) sur 20 m","4 × 1000 m soutenus, 2 min de récupération en trottinant","Retour au calme : 10 min de footing très lent, puis étirements doux"]}},{"name":"S5 · Sortie longue","week":5,"exercises":[],"cardio":{"sport":"run","distanceKm":8,"intensity":"Zone 2","purpose":"Apprendre à tenir l''allure de course sur des jambes fatiguées.","steps":["6 km en Zone 2, régulier","2 derniers km à allure 10 km","5 min de marche pour terminer"],"notes":"Partez avec de l''eau s''il fait chaud."}},{"name":"S6 · Footing","week":6,"exercises":[],"cardio":{"sport":"run","distanceKm":5,"intensity":"Zone 2","purpose":"Construire l''endurance de base sans accumuler de fatigue.","steps":["5 min de trot très lent pour démarrer","Course continue à allure confortable : vous devez pouvoir parler en phrases complètes","Pour finir : 5 lignes droites de 80 m en accélérant progressivement, retour en marchant"]}},{"name":"S6 · Allure spécifique","week":6,"exercises":[],"cardio":{"sport":"run","distanceKm":9,"intensity":"Allure course","purpose":"Mémoriser l''allure 10 km pour la retrouver sans montre le jour J.","steps":["Échauffement : 15 min de footing très facile, puis 4 gammes (montées de genoux, talons-fesses) sur 20 m","4 × 1 km à allure 10 km, 2 min de récupération","Retour au calme : 10 min de footing très lent, puis étirements doux"]}},{"name":"S6 · Sortie longue","week":6,"exercises":[],"cardio":{"sport":"run","distanceKm":9,"intensity":"Zone 2","purpose":"Apprendre à tenir l''allure de course sur des jambes fatiguées.","steps":["6 km en Zone 2, régulier","3 derniers km à allure 10 km","5 min de marche pour terminer"],"notes":"Partez avec de l''eau s''il fait chaud."}},{"name":"S7 · Footing","week":7,"exercises":[],"cardio":{"sport":"run","distanceKm":4,"intensity":"Zone 2","purpose":"Construire l''endurance de base sans accumuler de fatigue.","steps":["5 min de trot très lent pour démarrer","Course continue à allure confortable : vous devez pouvoir parler en phrases complètes","Étirements doux des mollets et de l''arrière des cuisses"]}},{"name":"S7 · Rappel d''allure","week":7,"exercises":[],"cardio":{"sport":"run","distanceKm":4,"intensity":"Allure course","purpose":"Garder les sensations de vitesse en réduisant le volume.","steps":["Échauffement : 15 min de footing très facile, puis 4 gammes (montées de genoux, talons-fesses) sur 20 m","3 × 1 km à allure 10 km, 2 min de récupération","Retour au calme : 10 min de footing très lent, puis étirements doux"]}},{"name":"S7 · Sortie longue","week":7,"exercises":[],"cardio":{"sport":"run","distanceKm":7,"intensity":"Zone 2","purpose":"Habituer le corps à courir longtemps : c''est la séance clé de la semaine.","steps":["10 premières minutes très tranquilles","Allure régulière en Zone 2 jusqu''au bout, quitte à marcher dans les côtes","5 min de marche pour terminer"],"notes":"Partez avec de l''eau s''il fait chaud."}},{"name":"S8 · Footing","week":8,"exercises":[],"cardio":{"sport":"run","distanceKm":6,"intensity":"Zone 2","purpose":"Rester en mouvement sans puiser dans les réserves.","steps":["Footing court et facile","3 lignes droites de 80 m pour réveiller les jambes"]}},{"name":"S8 · Rappel","week":8,"exercises":[],"cardio":{"sport":"run","distanceKm":4,"intensity":"Zone 3","purpose":"Deux ou trois jours avant la course : garder le jus sans se fatiguer.","steps":["15 min de footing facile","3 × 2 min à allure 10 km, 2 min de récupération","5 min de footing lent"]}},{"name":"S8 · 10 km","week":8,"exercises":[],"cardio":{"sport":"run","distanceKm":10,"intensity":"Course","purpose":"Le jour J : profiter du travail accumulé.","steps":["La veille : repas habituel riche en féculents, affaires préparées, dossard épinglé","Échauffement : 10 min de trot et 3 lignes droites","Premier tiers : partez à allure 10 km, surtout pas plus vite malgré l''euphorie du départ","Deuxième tiers : restez régulier et ravitaillez-vous comme à l''entraînement","Dernier tiers : relâchez les épaules et accélérez si les jambes le permettent"],"notes":"Bonne course !"}}]'::jsonb
WHERE name = '10 km en 8 semaines'
  AND structure = '[{"name":"S1 · Footing","week":1,"exercises":[],"cardio":{"sport":"run","distanceKm":4,"intensity":"Zone 2","notes":"Allure confortable : vous devez pouvoir parler."}},{"name":"S1 · Seuil","week":1,"exercises":[],"cardio":{"sport":"run","distanceKm":6,"intensity":"Zone 4","notes":"15 min d''échauffement, 2 × 10 min à allure soutenue, 5 min de récupération entre les blocs."}},{"name":"S1 · Sortie longue","week":1,"exercises":[],"cardio":{"sport":"run","distanceKm":5,"intensity":"Zone 2","notes":"Allure régulière, hydratez-vous."}},{"name":"S2 · Footing","week":2,"exercises":[],"cardio":{"sport":"run","distanceKm":4,"intensity":"Zone 2","notes":"Allure confortable : vous devez pouvoir parler."}},{"name":"S2 · Fractionné","week":2,"exercises":[],"cardio":{"sport":"run","distanceKm":6,"intensity":"Zone 5","notes":"15 min d''échauffement, 6 × 800 m rapides, 2 min de récupération entre chaque."}},{"name":"S2 · Sortie longue","week":2,"exercises":[],"cardio":{"sport":"run","distanceKm":6,"intensity":"Zone 2","notes":"Allure régulière, hydratez-vous."}},{"name":"S3 · Footing","week":3,"exercises":[],"cardio":{"sport":"run","distanceKm":4,"intensity":"Zone 2","notes":"Allure confortable : vous devez pouvoir parler."}},{"name":"S3 · Seuil","week":3,"exercises":[],"cardio":{"sport":"run","distanceKm":6,"intensity":"Zone 4","notes":"15 min d''échauffement, 2 × 10 min à allure soutenue, 5 min de récupération entre les blocs."}},{"name":"S3 · Sortie longue","week":3,"exercises":[],"cardio":{"sport":"run","distanceKm":7,"intensity":"Zone 2","notes":"Allure régulière, hydratez-vous."}},{"name":"S4 · Footing","week":4,"exercises":[],"cardio":{"sport":"run","distanceKm":4,"intensity":"Zone 2","notes":"Allure confortable : vous devez pouvoir parler."}},{"name":"S4 · Fractionné","week":4,"exercises":[],"cardio":{"sport":"run","distanceKm":6,"intensity":"Zone 5","notes":"15 min d''échauffement, 6 × 800 m rapides, 2 min de récupération entre chaque."}},{"name":"S4 · Sortie longue","week":4,"exercises":[],"cardio":{"sport":"run","distanceKm":6,"intensity":"Zone 2","notes":"Allure régulière, hydratez-vous."}},{"name":"S5 · Footing","week":5,"exercises":[],"cardio":{"sport":"run","distanceKm":5,"intensity":"Zone 2","notes":"Allure confortable : vous devez pouvoir parler."}},{"name":"S5 · Seuil","week":5,"exercises":[],"cardio":{"sport":"run","distanceKm":7,"intensity":"Zone 4","notes":"15 min d''échauffement, 2 × 10 min à allure soutenue, 5 min de récupération entre les blocs."}},{"name":"S5 · Sortie longue","week":5,"exercises":[],"cardio":{"sport":"run","distanceKm":8,"intensity":"Zone 2","notes":"Allure régulière, hydratez-vous."}},{"name":"S6 · Footing","week":6,"exercises":[],"cardio":{"sport":"run","distanceKm":5,"intensity":"Zone 2","notes":"Allure confortable : vous devez pouvoir parler."}},{"name":"S6 · Fractionné","week":6,"exercises":[],"cardio":{"sport":"run","distanceKm":7,"intensity":"Zone 5","notes":"15 min d''échauffement, 6 × 800 m rapides, 2 min de récupération entre chaque."}},{"name":"S6 · Sortie longue","week":6,"exercises":[],"cardio":{"sport":"run","distanceKm":9,"intensity":"Zone 2","notes":"Allure régulière, hydratez-vous."}},{"name":"S7 · Footing","week":7,"exercises":[],"cardio":{"sport":"run","distanceKm":4,"intensity":"Zone 2","notes":"Allure confortable : vous devez pouvoir parler."}},{"name":"S7 · Seuil","week":7,"exercises":[],"cardio":{"sport":"run","distanceKm":6,"intensity":"Zone 4","notes":"15 min d''échauffement, 2 × 10 min à allure soutenue, 5 min de récupération entre les blocs."}},{"name":"S7 · Sortie longue","week":7,"exercises":[],"cardio":{"sport":"run","distanceKm":7,"intensity":"Zone 2","notes":"Allure régulière, hydratez-vous."}},{"name":"S8 · Footing","week":8,"exercises":[],"cardio":{"sport":"run","distanceKm":6,"intensity":"Zone 2","notes":"Court et facile."}},{"name":"S8 · Rappel","week":8,"exercises":[],"cardio":{"sport":"run","distanceKm":4,"intensity":"Zone 3","notes":"Quelques accélérations de 30 s, sans forcer."}},{"name":"S8 · 10 km","week":8,"exercises":[],"cardio":{"sport":"run","distanceKm":10,"intensity":"Course","notes":"Partez prudemment, et bonne course !"}}]'::jsonb;

UPDATE program_templates
SET description = 'De zéro à 5 km en 8 semaines, en alternant course et marche. Chaque semaine allonge un peu les temps de course ; refaites une semaine si besoin. Avis médical conseillé avant de commencer. À adapter à vos sensations.',
    structure = '[{"name":"S1 · Séance 1","week":1,"exercises":[],"cardio":{"sport":"run","durationMin":34,"intensity":"Zone 2","purpose":"Démarrer en douceur : le corps découvre l''impact de la course.","steps":["Échauffement : 5 min de marche rapide","8 × (1 min de course, 2 min de marche)","Retour au calme : 5 min de marche, puis étirements des mollets"],"notes":"Courez lentement : si vous ne pouvez pas parler, ralentissez."}},{"name":"S1 · Séance 2","week":1,"exercises":[],"cardio":{"sport":"run","durationMin":34,"intensity":"Zone 2","purpose":"Démarrer en douceur : le corps découvre l''impact de la course.","steps":["Échauffement : 5 min de marche rapide","8 × (1 min de course, 2 min de marche)","Retour au calme : 5 min de marche, puis étirements des mollets"],"notes":"Courez lentement : si vous ne pouvez pas parler, ralentissez."}},{"name":"S1 · Séance 3","week":1,"exercises":[],"cardio":{"sport":"run","durationMin":34,"intensity":"Zone 2","purpose":"Démarrer en douceur : le corps découvre l''impact de la course.","steps":["Échauffement : 5 min de marche rapide","8 × (1 min de course, 2 min de marche)","Retour au calme : 5 min de marche, puis étirements des mollets"],"notes":"Si la séance a été trop dure, refaites cette semaine avant de passer à la suivante."}},{"name":"S2 · Séance 1","week":2,"exercises":[],"cardio":{"sport":"run","durationMin":34,"intensity":"Zone 2","purpose":"Allonger un peu les temps de course.","steps":["Échauffement : 5 min de marche rapide","6 × (2 min de course, 2 min de marche)","Retour au calme : 5 min de marche, puis étirements des mollets"],"notes":"Courez lentement : si vous ne pouvez pas parler, ralentissez."}},{"name":"S2 · Séance 2","week":2,"exercises":[],"cardio":{"sport":"run","durationMin":34,"intensity":"Zone 2","purpose":"Allonger un peu les temps de course.","steps":["Échauffement : 5 min de marche rapide","6 × (2 min de course, 2 min de marche)","Retour au calme : 5 min de marche, puis étirements des mollets"],"notes":"Courez lentement : si vous ne pouvez pas parler, ralentissez."}},{"name":"S2 · Séance 3","week":2,"exercises":[],"cardio":{"sport":"run","durationMin":34,"intensity":"Zone 2","purpose":"Allonger un peu les temps de course.","steps":["Échauffement : 5 min de marche rapide","6 × (2 min de course, 2 min de marche)","Retour au calme : 5 min de marche, puis étirements des mollets"],"notes":"Si la séance a été trop dure, refaites cette semaine avant de passer à la suivante."}},{"name":"S3 · Séance 1","week":3,"exercises":[],"cardio":{"sport":"run","durationMin":35,"intensity":"Zone 2","purpose":"Le souffle s''installe : courir 3 minutes devient naturel.","steps":["Échauffement : 5 min de marche rapide","5 × (3 min de course, 2 min de marche)","Retour au calme : 5 min de marche, puis étirements des mollets"],"notes":"Courez lentement : si vous ne pouvez pas parler, ralentissez."}},{"name":"S3 · Séance 2","week":3,"exercises":[],"cardio":{"sport":"run","durationMin":35,"intensity":"Zone 2","purpose":"Le souffle s''installe : courir 3 minutes devient naturel.","steps":["Échauffement : 5 min de marche rapide","5 × (3 min de course, 2 min de marche)","Retour au calme : 5 min de marche, puis étirements des mollets"],"notes":"Courez lentement : si vous ne pouvez pas parler, ralentissez."}},{"name":"S3 · Séance 3","week":3,"exercises":[],"cardio":{"sport":"run","durationMin":35,"intensity":"Zone 2","purpose":"Le souffle s''installe : courir 3 minutes devient naturel.","steps":["Échauffement : 5 min de marche rapide","5 × (3 min de course, 2 min de marche)","Retour au calme : 5 min de marche, puis étirements des mollets"],"notes":"Si la séance a été trop dure, refaites cette semaine avant de passer à la suivante."}},{"name":"S4 · Séance 1","week":4,"exercises":[],"cardio":{"sport":"run","durationMin":36,"intensity":"Zone 2","purpose":"Premier vrai cap : 5 minutes sans s''arrêter.","steps":["Échauffement : 5 min de marche rapide","4 × (5 min de course, 1 min 30 de marche)","Retour au calme : 5 min de marche, puis étirements des mollets"],"notes":"Courez lentement : si vous ne pouvez pas parler, ralentissez."}},{"name":"S4 · Séance 2","week":4,"exercises":[],"cardio":{"sport":"run","durationMin":36,"intensity":"Zone 2","purpose":"Premier vrai cap : 5 minutes sans s''arrêter.","steps":["Échauffement : 5 min de marche rapide","4 × (5 min de course, 1 min 30 de marche)","Retour au calme : 5 min de marche, puis étirements des mollets"],"notes":"Courez lentement : si vous ne pouvez pas parler, ralentissez."}},{"name":"S4 · Séance 3","week":4,"exercises":[],"cardio":{"sport":"run","durationMin":36,"intensity":"Zone 2","purpose":"Premier vrai cap : 5 minutes sans s''arrêter.","steps":["Échauffement : 5 min de marche rapide","4 × (5 min de course, 1 min 30 de marche)","Retour au calme : 5 min de marche, puis étirements des mollets"],"notes":"Si la séance a été trop dure, refaites cette semaine avant de passer à la suivante."}},{"name":"S5 · Séance 1","week":5,"exercises":[],"cardio":{"sport":"run","durationMin":37,"intensity":"Zone 2","purpose":"Les blocs s''allongent, les pauses raccourcissent.","steps":["Échauffement : 5 min de marche rapide","3 × (8 min de course, 1 min 30 de marche)","Retour au calme : 5 min de marche, puis étirements des mollets"],"notes":"Courez lentement : si vous ne pouvez pas parler, ralentissez."}},{"name":"S5 · Séance 2","week":5,"exercises":[],"cardio":{"sport":"run","durationMin":37,"intensity":"Zone 2","purpose":"Les blocs s''allongent, les pauses raccourcissent.","steps":["Échauffement : 5 min de marche rapide","3 × (8 min de course, 1 min 30 de marche)","Retour au calme : 5 min de marche, puis étirements des mollets"],"notes":"Courez lentement : si vous ne pouvez pas parler, ralentissez."}},{"name":"S5 · Séance 3","week":5,"exercises":[],"cardio":{"sport":"run","durationMin":37,"intensity":"Zone 2","purpose":"Les blocs s''allongent, les pauses raccourcissent.","steps":["Échauffement : 5 min de marche rapide","3 × (8 min de course, 1 min 30 de marche)","Retour au calme : 5 min de marche, puis étirements des mollets"],"notes":"Si la séance a été trop dure, refaites cette semaine avant de passer à la suivante."}},{"name":"S6 · Séance 1","week":6,"exercises":[],"cardio":{"sport":"run","durationMin":38,"intensity":"Zone 2","purpose":"Plus que deux blocs : vous courez presque 25 minutes.","steps":["Échauffement : 5 min de marche rapide","2 × (12 min de course, 1 min 30 de marche)","Retour au calme : 5 min de marche, puis étirements des mollets"],"notes":"Courez lentement : si vous ne pouvez pas parler, ralentissez."}},{"name":"S6 · Séance 2","week":6,"exercises":[],"cardio":{"sport":"run","durationMin":38,"intensity":"Zone 2","purpose":"Plus que deux blocs : vous courez presque 25 minutes.","steps":["Échauffement : 5 min de marche rapide","2 × (12 min de course, 1 min 30 de marche)","Retour au calme : 5 min de marche, puis étirements des mollets"],"notes":"Courez lentement : si vous ne pouvez pas parler, ralentissez."}},{"name":"S6 · Séance 3","week":6,"exercises":[],"cardio":{"sport":"run","durationMin":38,"intensity":"Zone 2","purpose":"Plus que deux blocs : vous courez presque 25 minutes.","steps":["Échauffement : 5 min de marche rapide","2 × (12 min de course, 1 min 30 de marche)","Retour au calme : 5 min de marche, puis étirements des mollets"],"notes":"Si la séance a été trop dure, refaites cette semaine avant de passer à la suivante."}},{"name":"S7 · Séance 1","week":7,"exercises":[],"cardio":{"sport":"run","durationMin":40,"intensity":"Zone 2","purpose":"Le grand saut : 25 minutes en continu.","steps":["Échauffement : 5 min de marche rapide","25 min de course sans s''arrêter","Retour au calme : 5 min de marche, puis étirements des mollets"],"notes":"Courez lentement : si vous ne pouvez pas parler, ralentissez."}},{"name":"S7 · Séance 2","week":7,"exercises":[],"cardio":{"sport":"run","durationMin":40,"intensity":"Zone 2","purpose":"Le grand saut : 25 minutes en continu.","steps":["Échauffement : 5 min de marche rapide","25 min de course sans s''arrêter","Retour au calme : 5 min de marche, puis étirements des mollets"],"notes":"Courez lentement : si vous ne pouvez pas parler, ralentissez."}},{"name":"S7 · Séance 3","week":7,"exercises":[],"cardio":{"sport":"run","durationMin":40,"intensity":"Zone 2","purpose":"Le grand saut : 25 minutes en continu.","steps":["Échauffement : 5 min de marche rapide","25 min de course sans s''arrêter","Retour au calme : 5 min de marche, puis étirements des mollets"],"notes":"Si la séance a été trop dure, refaites cette semaine avant de passer à la suivante."}},{"name":"S8 · Séance 1","week":8,"exercises":[],"cardio":{"sport":"run","durationMin":35,"intensity":"Zone 2","purpose":"Confirmer : 25 minutes de course, cette fois avec plus d''aisance.","steps":["5 min de marche rapide","25 min de course continue","5 min de marche"]}},{"name":"S8 · Séance 2","week":8,"exercises":[],"cardio":{"sport":"run","durationMin":25,"intensity":"Zone 2","purpose":"Une séance courte pour arriver frais.","steps":["5 min de marche rapide","15 min de course facile","5 min de marche"]}},{"name":"S8 · Objectif 5 km","week":8,"exercises":[],"cardio":{"sport":"run","distanceKm":5,"intensity":"Course","purpose":"Votre premier 5 km : l''objectif est de finir, pas le chrono.","steps":["5 min de marche rapide et 2 min de trot","Premier kilomètre plus lent que vous ne le pensez","À partir du 4e km, accélérez si vous vous sentez bien"],"notes":"Bravo, vous êtes coureur !"}}]'::jsonb
WHERE name = 'Débuter la course : 5 km'
  AND structure = '[{"name":"S1 · Séance 1","week":1,"exercises":[],"cardio":{"sport":"run","durationMin":20,"intensity":"Zone 2","notes":"8 × (1 min de course, 2 min de marche)"}},{"name":"S1 · Séance 2","week":1,"exercises":[],"cardio":{"sport":"run","durationMin":20,"intensity":"Zone 2","notes":"8 × (1 min de course, 2 min de marche)"}},{"name":"S1 · Séance 3","week":1,"exercises":[],"cardio":{"sport":"run","durationMin":20,"intensity":"Zone 2","notes":"8 × (1 min de course, 2 min de marche)"}},{"name":"S2 · Séance 1","week":2,"exercises":[],"cardio":{"sport":"run","durationMin":22,"intensity":"Zone 2","notes":"6 × (2 min de course, 2 min de marche)"}},{"name":"S2 · Séance 2","week":2,"exercises":[],"cardio":{"sport":"run","durationMin":22,"intensity":"Zone 2","notes":"6 × (2 min de course, 2 min de marche)"}},{"name":"S2 · Séance 3","week":2,"exercises":[],"cardio":{"sport":"run","durationMin":22,"intensity":"Zone 2","notes":"6 × (2 min de course, 2 min de marche)"}},{"name":"S3 · Séance 1","week":3,"exercises":[],"cardio":{"sport":"run","durationMin":24,"intensity":"Zone 2","notes":"5 × (3 min de course, 2 min de marche)"}},{"name":"S3 · Séance 2","week":3,"exercises":[],"cardio":{"sport":"run","durationMin":24,"intensity":"Zone 2","notes":"5 × (3 min de course, 2 min de marche)"}},{"name":"S3 · Séance 3","week":3,"exercises":[],"cardio":{"sport":"run","durationMin":24,"intensity":"Zone 2","notes":"5 × (3 min de course, 2 min de marche)"}},{"name":"S4 · Séance 1","week":4,"exercises":[],"cardio":{"sport":"run","durationMin":25,"intensity":"Zone 2","notes":"4 × (5 min de course, 1 min de marche)"}},{"name":"S4 · Séance 2","week":4,"exercises":[],"cardio":{"sport":"run","durationMin":25,"intensity":"Zone 2","notes":"4 × (5 min de course, 1 min de marche)"}},{"name":"S4 · Séance 3","week":4,"exercises":[],"cardio":{"sport":"run","durationMin":25,"intensity":"Zone 2","notes":"4 × (5 min de course, 1 min de marche)"}},{"name":"S5 · Séance 1","week":5,"exercises":[],"cardio":{"sport":"run","durationMin":27,"intensity":"Zone 2","notes":"3 × (8 min de course, 1 min de marche)"}},{"name":"S5 · Séance 2","week":5,"exercises":[],"cardio":{"sport":"run","durationMin":27,"intensity":"Zone 2","notes":"3 × (8 min de course, 1 min de marche)"}},{"name":"S5 · Séance 3","week":5,"exercises":[],"cardio":{"sport":"run","durationMin":27,"intensity":"Zone 2","notes":"3 × (8 min de course, 1 min de marche)"}},{"name":"S6 · Séance 1","week":6,"exercises":[],"cardio":{"sport":"run","durationMin":28,"intensity":"Zone 2","notes":"2 × (12 min de course, 1 min de marche)"}},{"name":"S6 · Séance 2","week":6,"exercises":[],"cardio":{"sport":"run","durationMin":28,"intensity":"Zone 2","notes":"2 × (12 min de course, 1 min de marche)"}},{"name":"S6 · Séance 3","week":6,"exercises":[],"cardio":{"sport":"run","durationMin":28,"intensity":"Zone 2","notes":"2 × (12 min de course, 1 min de marche)"}},{"name":"S7 · Séance 1","week":7,"exercises":[],"cardio":{"sport":"run","durationMin":30,"intensity":"Zone 2","notes":"25 min de course sans s''arrêter"}},{"name":"S7 · Séance 2","week":7,"exercises":[],"cardio":{"sport":"run","durationMin":30,"intensity":"Zone 2","notes":"25 min de course sans s''arrêter"}},{"name":"S7 · Séance 3","week":7,"exercises":[],"cardio":{"sport":"run","durationMin":30,"intensity":"Zone 2","notes":"25 min de course sans s''arrêter"}},{"name":"S8 · Séance 1","week":8,"exercises":[],"cardio":{"sport":"run","durationMin":25,"intensity":"Zone 2","notes":"Course continue."}},{"name":"S8 · Séance 2","week":8,"exercises":[],"cardio":{"sport":"run","durationMin":20,"intensity":"Zone 2","notes":"Court et facile."}},{"name":"S8 · Objectif 5 km","week":8,"exercises":[],"cardio":{"sport":"run","distanceKm":5,"intensity":"Course","notes":"Votre premier 5 km !"}}]'::jsonb;

UPDATE program_templates
SET description = 'Pour qui nage déjà 200 m de crawl. Chaque semaine : une séance de technique avec un nouvel éducatif, une séance de séries, une séance d''endurance. Semaine 4 allégée, test 400 m et 1500 m continu en semaine 8. Avis médical conseillé avant de commencer. À adapter à vos sensations.',
    structure = '[{"name":"S1 · Technique","week":1,"exercises":[],"cardio":{"sport":"swim","distanceKm":1.5,"intensity":"Zone 2","purpose":"Nager mieux avant de nager plus : une meilleure glisse, c''est de la vitesse gratuite.","steps":["Échauffement : 200 m crawl souple, 100 m dos","Éducatif : 4 × 50 m rattrapé (une main attend l''autre devant), 15 s de récupération","4 × 50 m battements avec planche, 20 s de récupération","5 × 100 m nage complète en appliquant l''éducatif, 20 s de récupération","200 m avec pull-buoy, en se concentrant sur la traction","Retour au calme : 100 m dos ou brasse, très souple"]}},{"name":"S1 · Séries","week":1,"exercises":[],"cardio":{"sport":"swim","distanceKm":1,"intensity":"Zone 4","purpose":"Habituer le corps à nager vite avec peu de récupération.","steps":["Échauffement : 200 m crawl souple, 4 × 25 m en accélérant","4 × 25 m vite, 30 s de récupération","8 × 50 m soutenu, 20 s de récupération","Retour au calme : 200 m très souple, en variant les nages"]}},{"name":"S1 · Endurance","week":1,"exercises":[],"cardio":{"sport":"swim","distanceKm":0.9,"intensity":"Zone 2","purpose":"Tenir longtemps sans s''arrêter, à une allure que vous pourriez garder encore.","steps":["Échauffement : 200 m en variant les nages","600 m de nage continue, régulière, en respirant tous les 3 temps si possible","Retour au calme : 100 m dos"]}},{"name":"S2 · Technique","week":2,"exercises":[],"cardio":{"sport":"swim","distanceKm":1.6,"intensity":"Zone 2","purpose":"Nager mieux avant de nager plus : une meilleure glisse, c''est de la vitesse gratuite.","steps":["Échauffement : 200 m crawl souple, 100 m dos","Éducatif : 4 × 50 m poings fermés (sentir l''appui de l''avant-bras), 15 s de récupération","4 × 50 m battements avec planche, 20 s de récupération","6 × 100 m nage complète en appliquant l''éducatif, 20 s de récupération","200 m avec pull-buoy, en se concentrant sur la traction","Retour au calme : 100 m dos ou brasse, très souple"]}},{"name":"S2 · Séries","week":2,"exercises":[],"cardio":{"sport":"swim","distanceKm":1.2,"intensity":"Zone 4","purpose":"Habituer le corps à nager vite avec peu de récupération.","steps":["Échauffement : 200 m crawl souple, 4 × 25 m en accélérant","4 × 25 m vite, 30 s de récupération","6 × 100 m soutenu, 20 s de récupération","Retour au calme : 200 m très souple, en variant les nages"]}},{"name":"S2 · Endurance","week":2,"exercises":[],"cardio":{"sport":"swim","distanceKm":1.1,"intensity":"Zone 2","purpose":"Tenir longtemps sans s''arrêter, à une allure que vous pourriez garder encore.","steps":["Échauffement : 200 m en variant les nages","800 m de nage continue, régulière, en respirant tous les 3 temps si possible","Retour au calme : 100 m dos"]}},{"name":"S3 · Technique","week":3,"exercises":[],"cardio":{"sport":"swim","distanceKm":1.7,"intensity":"Zone 2","purpose":"Nager mieux avant de nager plus : une meilleure glisse, c''est de la vitesse gratuite.","steps":["Échauffement : 200 m crawl souple, 100 m dos","Éducatif : 4 × 50 m 6 battements sur le côté, puis 1 mouvement de bras, 15 s de récupération","4 × 50 m battements avec planche, 20 s de récupération","7 × 100 m nage complète en appliquant l''éducatif, 20 s de récupération","200 m avec pull-buoy, en se concentrant sur la traction","Retour au calme : 100 m dos ou brasse, très souple"]}},{"name":"S3 · Séries","week":3,"exercises":[],"cardio":{"sport":"swim","distanceKm":1.4,"intensity":"Zone 4","purpose":"Habituer le corps à nager vite avec peu de récupération.","steps":["Échauffement : 200 m crawl souple, 4 × 25 m en accélérant","4 × 25 m vite, 30 s de récupération","Pyramide 50-100-150-200-150-100-50 m soutenu, 20 s de récupération","Retour au calme : 200 m très souple, en variant les nages"]}},{"name":"S3 · Endurance","week":3,"exercises":[],"cardio":{"sport":"swim","distanceKm":1.3,"intensity":"Zone 2","purpose":"Tenir longtemps sans s''arrêter, à une allure que vous pourriez garder encore.","steps":["Échauffement : 200 m en variant les nages","1000 m de nage continue, régulière, en respirant tous les 3 temps si possible","Retour au calme : 100 m dos"]}},{"name":"S4 · Technique","week":4,"exercises":[],"cardio":{"sport":"swim","distanceKm":1.4,"intensity":"Zone 2","purpose":"Nager mieux avant de nager plus : une meilleure glisse, c''est de la vitesse gratuite.","steps":["Échauffement : 200 m crawl souple, 100 m dos","Éducatif : 4 × 50 m respiration tous les 3 temps, 15 s de récupération","4 × 50 m battements avec planche, 20 s de récupération","4 × 100 m nage complète en appliquant l''éducatif, 20 s de récupération","200 m avec pull-buoy, en se concentrant sur la traction","Retour au calme : 100 m dos ou brasse, très souple"]}},{"name":"S4 · Séries","week":4,"exercises":[],"cardio":{"sport":"swim","distanceKm":0.9,"intensity":"Zone 2","purpose":"Habituer le corps à nager vite avec peu de récupération.","steps":["Échauffement : 200 m crawl souple, 4 × 25 m en accélérant","4 × 25 m vite, 30 s de récupération","6 × 50 m en aisance, 20 s de récupération","Retour au calme : 200 m très souple, en variant les nages"]}},{"name":"S4 · Endurance","week":4,"exercises":[],"cardio":{"sport":"swim","distanceKm":0.9,"intensity":"Zone 2","purpose":"Tenir longtemps sans s''arrêter, à une allure que vous pourriez garder encore.","steps":["Échauffement : 200 m en variant les nages","600 m de nage continue, régulière, en respirant tous les 3 temps si possible","Retour au calme : 100 m dos"]}},{"name":"S5 · Technique","week":5,"exercises":[],"cardio":{"sport":"swim","distanceKm":1.9,"intensity":"Zone 2","purpose":"Nager mieux avant de nager plus : une meilleure glisse, c''est de la vitesse gratuite.","steps":["Échauffement : 200 m crawl souple, 100 m dos","Éducatif : 4 × 50 m godille avant (mains devant, petits mouvements), 15 s de récupération","4 × 50 m battements avec planche, 20 s de récupération","9 × 100 m nage complète en appliquant l''éducatif, 20 s de récupération","200 m avec pull-buoy, en se concentrant sur la traction","Retour au calme : 100 m dos ou brasse, très souple"]}},{"name":"S5 · Séries","week":5,"exercises":[],"cardio":{"sport":"swim","distanceKm":1.4,"intensity":"Zone 4","purpose":"Habituer le corps à nager vite avec peu de récupération.","steps":["Échauffement : 200 m crawl souple, 4 × 25 m en accélérant","4 × 25 m vite, 30 s de récupération","8 × 100 m allure seuil, 15 s de récupération","Retour au calme : 200 m très souple, en variant les nages"]}},{"name":"S5 · Endurance","week":5,"exercises":[],"cardio":{"sport":"swim","distanceKm":1.5,"intensity":"Zone 2","purpose":"Tenir longtemps sans s''arrêter, à une allure que vous pourriez garder encore.","steps":["Échauffement : 200 m en variant les nages","1200 m de nage continue, régulière, en respirant tous les 3 temps si possible","Retour au calme : 100 m dos"],"notes":"Si vous devez vous arrêter, reprenez après 20 s au bord : le but est la distance."}},{"name":"S6 · Technique","week":6,"exercises":[],"cardio":{"sport":"swim","distanceKm":2,"intensity":"Zone 2","purpose":"Nager mieux avant de nager plus : une meilleure glisse, c''est de la vitesse gratuite.","steps":["Échauffement : 200 m crawl souple, 100 m dos","Éducatif : 4 × 50 m nage 1 bras (l''autre le long du corps), 15 s de récupération","4 × 50 m battements avec planche, 20 s de récupération","10 × 100 m nage complète en appliquant l''éducatif, 20 s de récupération","200 m avec pull-buoy, en se concentrant sur la traction","Retour au calme : 100 m dos ou brasse, très souple"]}},{"name":"S6 · Séries","week":6,"exercises":[],"cardio":{"sport":"swim","distanceKm":1.4,"intensity":"Zone 4","purpose":"Habituer le corps à nager vite avec peu de récupération.","steps":["Échauffement : 200 m crawl souple, 4 × 25 m en accélérant","4 × 25 m vite, 30 s de récupération","4 × 200 m allure seuil, 30 s de récupération","Retour au calme : 200 m très souple, en variant les nages"]}},{"name":"S6 · Endurance","week":6,"exercises":[],"cardio":{"sport":"swim","distanceKm":1.8,"intensity":"Zone 2","purpose":"Tenir longtemps sans s''arrêter, à une allure que vous pourriez garder encore.","steps":["Échauffement : 200 m en variant les nages","1500 m de nage continue, régulière, en respirant tous les 3 temps si possible","Retour au calme : 100 m dos"],"notes":"Si vous devez vous arrêter, reprenez après 20 s au bord : le but est la distance."}},{"name":"S7 · Technique","week":7,"exercises":[],"cardio":{"sport":"swim","distanceKm":2,"intensity":"Zone 2","purpose":"Nager mieux avant de nager plus : une meilleure glisse, c''est de la vitesse gratuite.","steps":["Échauffement : 200 m crawl souple, 100 m dos","Éducatif : 4 × 50 m rattrapé, en comptant ses mouvements par longueur, 15 s de récupération","4 × 50 m battements avec planche, 20 s de récupération","10 × 100 m nage complète en appliquant l''éducatif, 20 s de récupération","200 m avec pull-buoy, en se concentrant sur la traction","Retour au calme : 100 m dos ou brasse, très souple"]}},{"name":"S7 · Séries","week":7,"exercises":[],"cardio":{"sport":"swim","distanceKm":1.6,"intensity":"Zone 4","purpose":"Habituer le corps à nager vite avec peu de récupération.","steps":["Échauffement : 200 m crawl souple, 4 × 25 m en accélérant","4 × 25 m vite, 30 s de récupération","10 × 100 m allure seuil, 15 s de récupération","Retour au calme : 200 m très souple, en variant les nages"]}},{"name":"S7 · Endurance","week":7,"exercises":[],"cardio":{"sport":"swim","distanceKm":2.1,"intensity":"Zone 2","purpose":"Tenir longtemps sans s''arrêter, à une allure que vous pourriez garder encore.","steps":["Échauffement : 200 m en variant les nages","1800 m de nage continue, régulière, en respirant tous les 3 temps si possible","Retour au calme : 100 m dos"],"notes":"Si vous devez vous arrêter, reprenez après 20 s au bord : le but est la distance."}},{"name":"S8 · Technique","week":8,"exercises":[],"cardio":{"sport":"swim","distanceKm":2,"intensity":"Zone 2","purpose":"Nager mieux avant de nager plus : une meilleure glisse, c''est de la vitesse gratuite.","steps":["Échauffement : 200 m crawl souple, 100 m dos","Éducatif : 4 × 50 m nage complète en cherchant à faire un mouvement de moins par longueur, 15 s de récupération","4 × 50 m battements avec planche, 20 s de récupération","10 × 100 m nage complète en appliquant l''éducatif, 20 s de récupération","200 m avec pull-buoy, en se concentrant sur la traction","Retour au calme : 100 m dos ou brasse, très souple"]}},{"name":"S8 · Test","week":8,"exercises":[],"cardio":{"sport":"swim","distanceKm":1,"intensity":"Zone 4","purpose":"Mesurer vos progrès : comparez ce 400 m avec celui que vous ferez dans quelques mois.","steps":["Échauffement : 200 m crawl souple, 4 × 25 m en accélérant","4 × 25 m vite, 30 s de récupération","Test : 400 m chronométré, notez votre temps","Retour au calme : 200 m très souple, en variant les nages"]}},{"name":"S8 · Objectif 1500 m","week":8,"exercises":[],"cardio":{"sport":"swim","distanceKm":1.8,"intensity":"Zone 2","purpose":"Le but du plan : 1500 m sans vous arrêter.","steps":["Échauffement : 200 m en variant les nages","1500 m de nage continue, régulière, en respirant tous les 3 temps si possible","Retour au calme : 100 m dos"],"notes":"Si vous devez vous arrêter, reprenez après 20 s au bord : le but est la distance."}}]'::jsonb
WHERE name = 'Natation endurance'
  AND structure = '[{"name":"S1 · Technique","week":1,"exercises":[],"cardio":{"sport":"swim","distanceKm":1,"intensity":"Zone 2","notes":"Éducatifs : 4 × 50 m rattrapé, 4 × 50 m battements, puis nage souple."}},{"name":"S1 · Séries","week":1,"exercises":[],"cardio":{"sport":"swim","distanceKm":1.2,"intensity":"Zone 4","notes":"Échauffement 200 m, 8 × 100 m soutenu avec 20 s de repos, retour au calme."}},{"name":"S1 · Endurance","week":1,"exercises":[],"cardio":{"sport":"swim","distanceKm":1.4,"intensity":"Zone 2","notes":"Nage continue et régulière."}},{"name":"S2 · Technique","week":2,"exercises":[],"cardio":{"sport":"swim","distanceKm":1.2,"intensity":"Zone 2","notes":"Éducatifs : 4 × 50 m rattrapé, 4 × 50 m battements, puis nage souple."}},{"name":"S2 · Séries","week":2,"exercises":[],"cardio":{"sport":"swim","distanceKm":1.4,"intensity":"Zone 4","notes":"Échauffement 200 m, 8 × 100 m soutenu avec 20 s de repos, retour au calme."}},{"name":"S2 · Endurance","week":2,"exercises":[],"cardio":{"sport":"swim","distanceKm":1.6,"intensity":"Zone 2","notes":"Nage continue et régulière."}},{"name":"S3 · Technique","week":3,"exercises":[],"cardio":{"sport":"swim","distanceKm":1.4,"intensity":"Zone 2","notes":"Éducatifs : 4 × 50 m rattrapé, 4 × 50 m battements, puis nage souple."}},{"name":"S3 · Séries","week":3,"exercises":[],"cardio":{"sport":"swim","distanceKm":1.6,"intensity":"Zone 4","notes":"Échauffement 200 m, 8 × 100 m soutenu avec 20 s de repos, retour au calme."}},{"name":"S3 · Endurance","week":3,"exercises":[],"cardio":{"sport":"swim","distanceKm":1.8,"intensity":"Zone 2","notes":"Nage continue et régulière."}},{"name":"S4 · Technique","week":4,"exercises":[],"cardio":{"sport":"swim","distanceKm":1.2,"intensity":"Zone 2","notes":"Éducatifs : 4 × 50 m rattrapé, 4 × 50 m battements, puis nage souple."}},{"name":"S4 · Séries","week":4,"exercises":[],"cardio":{"sport":"swim","distanceKm":1.4,"intensity":"Zone 4","notes":"Échauffement 200 m, 8 × 100 m soutenu avec 20 s de repos, retour au calme."}},{"name":"S4 · Endurance","week":4,"exercises":[],"cardio":{"sport":"swim","distanceKm":1.6,"intensity":"Zone 2","notes":"Nage continue et régulière."}},{"name":"S5 · Technique","week":5,"exercises":[],"cardio":{"sport":"swim","distanceKm":1.6,"intensity":"Zone 2","notes":"Éducatifs : 4 × 50 m rattrapé, 4 × 50 m battements, puis nage souple."}},{"name":"S5 · Séries","week":5,"exercises":[],"cardio":{"sport":"swim","distanceKm":1.8,"intensity":"Zone 4","notes":"Échauffement 200 m, 8 × 100 m soutenu avec 20 s de repos, retour au calme."}},{"name":"S5 · Endurance","week":5,"exercises":[],"cardio":{"sport":"swim","distanceKm":2,"intensity":"Zone 2","notes":"Nage continue et régulière."}},{"name":"S6 · Technique","week":6,"exercises":[],"cardio":{"sport":"swim","distanceKm":1.8,"intensity":"Zone 2","notes":"Éducatifs : 4 × 50 m rattrapé, 4 × 50 m battements, puis nage souple."}},{"name":"S6 · Séries","week":6,"exercises":[],"cardio":{"sport":"swim","distanceKm":2,"intensity":"Zone 4","notes":"Échauffement 200 m, 8 × 100 m soutenu avec 20 s de repos, retour au calme."}},{"name":"S6 · Endurance","week":6,"exercises":[],"cardio":{"sport":"swim","distanceKm":2.2,"intensity":"Zone 2","notes":"Nage continue et régulière."}},{"name":"S7 · Technique","week":7,"exercises":[],"cardio":{"sport":"swim","distanceKm":2,"intensity":"Zone 2","notes":"Éducatifs : 4 × 50 m rattrapé, 4 × 50 m battements, puis nage souple."}},{"name":"S7 · Séries","week":7,"exercises":[],"cardio":{"sport":"swim","distanceKm":2.2,"intensity":"Zone 4","notes":"Échauffement 200 m, 8 × 100 m soutenu avec 20 s de repos, retour au calme."}},{"name":"S7 · Endurance","week":7,"exercises":[],"cardio":{"sport":"swim","distanceKm":2.4,"intensity":"Zone 2","notes":"Nage continue et régulière."}},{"name":"S8 · Technique","week":8,"exercises":[],"cardio":{"sport":"swim","distanceKm":2.5,"intensity":"Zone 2","notes":"Éducatifs : 4 × 50 m rattrapé, 4 × 50 m battements, puis nage souple."}},{"name":"S8 · Séries","week":8,"exercises":[],"cardio":{"sport":"swim","distanceKm":2.7,"intensity":"Zone 4","notes":"Échauffement 200 m, 8 × 100 m soutenu avec 20 s de repos, retour au calme."}},{"name":"S8 · Endurance","week":8,"exercises":[],"cardio":{"sport":"swim","distanceKm":2.9,"intensity":"Zone 2","notes":"Nage continue et régulière."}}]'::jsonb;

UPDATE program_templates
SET description = 'Trois sorties par semaine : vélocité, intervalles qui progressent du sweet spot à la puissance, et sortie longue jusqu''à 2 h 30. Semaine 4 allégée. Fonctionne aussi sur home-trainer. Avis médical conseillé avant de commencer. À adapter à vos sensations.',
    structure = '[{"name":"S1 · Vélocité","week":1,"exercises":[],"cardio":{"sport":"bike","durationMin":48,"intensity":"Zone 2","purpose":"Pédaler plus rond et plus souple : économiser les jambes sur les longues sorties.","steps":["10 min très facile, petit braquet","5 × 1 min à cadence élevée (100-110 tours/min) sans forcer, 2 min normal entre chaque","Le reste en Zone 2, cadence autour de 90 tours/min","5 min très facile pour finir"]}},{"name":"S1 · Intervalles","week":1,"exercises":[],"cardio":{"sport":"bike","durationMin":61,"intensity":"Zone 3","purpose":"Le « sweet spot » : beaucoup de bénéfice pour une fatigue raisonnable.","steps":["Échauffement : 15 min progressif, dont 3 accélérations de 15 s","3 × 8 min en Zone 3-4, 4 min de récupération","Retour au calme : 10 min très facile"],"notes":"Sur home-trainer, c''est la séance idéale : pas de feux ni de descentes pour casser l''effort."}},{"name":"S1 · Sortie longue","week":1,"exercises":[],"cardio":{"sport":"bike","durationMin":60,"intensity":"Zone 2","purpose":"Construire le fond : la base de tout le reste.","steps":["15 min de mise en route très facile","Zone 2 régulière : dans les côtes, restez assis et réduisez le braquet","10 min très facile pour finir"],"notes":"Une gourde suffit, emportez une barre au cas où."}},{"name":"S2 · Vélocité","week":2,"exercises":[],"cardio":{"sport":"bike","durationMin":51,"intensity":"Zone 2","purpose":"Pédaler plus rond et plus souple : économiser les jambes sur les longues sorties.","steps":["10 min très facile, petit braquet","6 × 1 min à cadence élevée (100-110 tours/min) sans forcer, 2 min normal entre chaque","Le reste en Zone 2, cadence autour de 90 tours/min","5 min très facile pour finir"]}},{"name":"S2 · Intervalles","week":2,"exercises":[],"cardio":{"sport":"bike","durationMin":67,"intensity":"Zone 3","purpose":"Allonger les blocs pour tenir une allure soutenue plus longtemps.","steps":["Échauffement : 15 min progressif, dont 3 accélérations de 15 s","3 × 10 min en Zone 3-4, 4 min de récupération","Retour au calme : 10 min très facile"],"notes":"Sur home-trainer, c''est la séance idéale : pas de feux ni de descentes pour casser l''effort."}},{"name":"S2 · Sortie longue","week":2,"exercises":[],"cardio":{"sport":"bike","durationMin":75,"intensity":"Zone 2","purpose":"Construire le fond : la base de tout le reste.","steps":["15 min de mise en route très facile","Zone 2 régulière : dans les côtes, restez assis et réduisez le braquet","10 min très facile pour finir"],"notes":"Une gourde suffit, emportez une barre au cas où."}},{"name":"S3 · Vélocité","week":3,"exercises":[],"cardio":{"sport":"bike","durationMin":54,"intensity":"Zone 2","purpose":"Pédaler plus rond et plus souple : économiser les jambes sur les longues sorties.","steps":["10 min très facile, petit braquet","8 × 1 min à cadence élevée (100-110 tours/min) sans forcer, 2 min normal entre chaque","Le reste en Zone 2, cadence autour de 90 tours/min","5 min très facile pour finir"]}},{"name":"S3 · Intervalles","week":3,"exercises":[],"cardio":{"sport":"bike","durationMin":60,"intensity":"Zone 4","purpose":"Travailler au seuil : l''effort qui fait le plus progresser en vélo.","steps":["Échauffement : 15 min progressif, dont 3 accélérations de 15 s","2 × 15 min en Zone 4, 5 min de récupération","Retour au calme : 10 min très facile"],"notes":"Sur home-trainer, c''est la séance idéale : pas de feux ni de descentes pour casser l''effort."}},{"name":"S3 · Sortie longue","week":3,"exercises":[],"cardio":{"sport":"bike","durationMin":90,"intensity":"Zone 2","purpose":"Construire le fond : la base de tout le reste.","steps":["15 min de mise en route très facile","Zone 2 régulière : dans les côtes, restez assis et réduisez le braquet","10 min très facile pour finir"],"notes":"Buvez toutes les 15 min et mangez toutes les 30 à 40 min dès la première heure."}},{"name":"S4 · Vélocité","week":4,"exercises":[],"cardio":{"sport":"bike","durationMin":40,"intensity":"Zone 2","purpose":"Pédaler plus rond et plus souple : économiser les jambes sur les longues sorties.","steps":["10 min très facile, petit braquet","4 × 1 min à cadence élevée (100-110 tours/min) sans forcer, 2 min normal entre chaque","Le reste en Zone 2, cadence autour de 90 tours/min","5 min très facile pour finir"]}},{"name":"S4 · Intervalles","week":4,"exercises":[],"cardio":{"sport":"bike","durationMin":37,"intensity":"Zone 3","purpose":"Semaine allégée : un peu de rythme, sans fatigue.","steps":["Échauffement : 15 min progressif, dont 3 accélérations de 15 s","4 × 1 min vif, 2 min de récupération","Retour au calme : 10 min très facile"],"notes":"Sur home-trainer, c''est la séance idéale : pas de feux ni de descentes pour casser l''effort."}},{"name":"S4 · Sortie longue","week":4,"exercises":[],"cardio":{"sport":"bike","durationMin":60,"intensity":"Zone 2","purpose":"Construire le fond : la base de tout le reste.","steps":["15 min de mise en route très facile","Zone 2 régulière : dans les côtes, restez assis et réduisez le braquet","10 min très facile pour finir"],"notes":"Une gourde suffit, emportez une barre au cas où."}},{"name":"S5 · Vélocité","week":5,"exercises":[],"cardio":{"sport":"bike","durationMin":60,"intensity":"Zone 2","purpose":"Pédaler plus rond et plus souple : économiser les jambes sur les longues sorties.","steps":["10 min très facile, petit braquet","8 × 1 min à cadence élevée (100-110 tours/min) sans forcer, 2 min normal entre chaque","Le reste en Zone 2, cadence autour de 90 tours/min","5 min très facile pour finir"]}},{"name":"S5 · Intervalles","week":5,"exercises":[],"cardio":{"sport":"bike","durationMin":55,"intensity":"Zone 5","purpose":"Développer la puissance pour les côtes et les relances.","steps":["Échauffement : 15 min progressif, dont 3 accélérations de 15 s","5 × 3 min en Zone 5, 3 min de récupération","Retour au calme : 10 min très facile"],"notes":"Sur home-trainer, c''est la séance idéale : pas de feux ni de descentes pour casser l''effort."}},{"name":"S5 · Sortie longue","week":5,"exercises":[],"cardio":{"sport":"bike","durationMin":105,"intensity":"Zone 2","purpose":"Construire le fond : la base de tout le reste.","steps":["15 min de mise en route très facile","Zone 2, avec 2 × 10 min en Zone 3 dans la dernière heure","10 min très facile pour finir"],"notes":"Buvez toutes les 15 min et mangez toutes les 30 à 40 min dès la première heure."}},{"name":"S6 · Vélocité","week":6,"exercises":[],"cardio":{"sport":"bike","durationMin":60,"intensity":"Zone 2","purpose":"Pédaler plus rond et plus souple : économiser les jambes sur les longues sorties.","steps":["10 min très facile, petit braquet","10 × 1 min à cadence élevée (100-110 tours/min) sans forcer, 2 min normal entre chaque","Le reste en Zone 2, cadence autour de 90 tours/min","5 min très facile pour finir"]}},{"name":"S6 · Intervalles","week":6,"exercises":[],"cardio":{"sport":"bike","durationMin":70,"intensity":"Zone 4","purpose":"Deux longs blocs au seuil : la séance la plus exigeante du plan.","steps":["Échauffement : 15 min progressif, dont 3 accélérations de 15 s","2 × 20 min en Zone 4, 5 min de récupération","Retour au calme : 10 min très facile"],"notes":"Sur home-trainer, c''est la séance idéale : pas de feux ni de descentes pour casser l''effort."}},{"name":"S6 · Sortie longue","week":6,"exercises":[],"cardio":{"sport":"bike","durationMin":120,"intensity":"Zone 2","purpose":"Construire le fond : la base de tout le reste.","steps":["15 min de mise en route très facile","Zone 2, avec 2 × 10 min en Zone 3 dans la dernière heure","10 min très facile pour finir"],"notes":"Buvez toutes les 15 min et mangez toutes les 30 à 40 min dès la première heure."}},{"name":"S7 · Vélocité","week":7,"exercises":[],"cardio":{"sport":"bike","durationMin":60,"intensity":"Zone 2","purpose":"Pédaler plus rond et plus souple : économiser les jambes sur les longues sorties.","steps":["10 min très facile, petit braquet","10 × 1 min à cadence élevée (100-110 tours/min) sans forcer, 2 min normal entre chaque","Le reste en Zone 2, cadence autour de 90 tours/min","5 min très facile pour finir"]}},{"name":"S7 · Intervalles","week":7,"exercises":[],"cardio":{"sport":"bike","durationMin":61,"intensity":"Zone 5","purpose":"Dernier bloc intense avant de relâcher.","steps":["Échauffement : 15 min progressif, dont 3 accélérations de 15 s","6 × 3 min en Zone 5, 3 min de récupération","Retour au calme : 10 min très facile"],"notes":"Sur home-trainer, c''est la séance idéale : pas de feux ni de descentes pour casser l''effort."}},{"name":"S7 · Sortie longue","week":7,"exercises":[],"cardio":{"sport":"bike","durationMin":135,"intensity":"Zone 2","purpose":"Construire le fond : la base de tout le reste.","steps":["15 min de mise en route très facile","Zone 2, avec 2 × 10 min en Zone 3 dans la dernière heure","10 min très facile pour finir"],"notes":"Buvez toutes les 15 min et mangez toutes les 30 à 40 min dès la première heure."}},{"name":"S8 · Vélocité","week":8,"exercises":[],"cardio":{"sport":"bike","durationMin":40,"intensity":"Zone 2","purpose":"Pédaler plus rond et plus souple : économiser les jambes sur les longues sorties.","steps":["10 min très facile, petit braquet","4 × 1 min à cadence élevée (100-110 tours/min) sans forcer, 2 min normal entre chaque","Le reste en Zone 2, cadence autour de 90 tours/min","5 min très facile pour finir"]}},{"name":"S8 · Intervalles","week":8,"exercises":[],"cardio":{"sport":"bike","durationMin":49,"intensity":"Zone 4","purpose":"Garder les sensations avant la sortie objectif.","steps":["Échauffement : 15 min progressif, dont 3 accélérations de 15 s","3 × 5 min en Zone 4, 3 min de récupération","Retour au calme : 10 min très facile"],"notes":"Sur home-trainer, c''est la séance idéale : pas de feux ni de descentes pour casser l''effort."}},{"name":"S8 · Sortie objectif","week":8,"exercises":[],"cardio":{"sport":"bike","durationMin":150,"intensity":"Zone 2","purpose":"La sortie de 2 h 30 que vous visez : régulière, bien ravitaillée.","steps":["15 min de mise en route très facile","Zone 2 régulière : dans les côtes, restez assis et réduisez le braquet","10 min très facile pour finir"],"notes":"Buvez toutes les 15 min et mangez toutes les 30 à 40 min dès la première heure."}}]'::jsonb
WHERE name = 'Vélo endurance'
  AND structure = '[{"name":"S1 · Endurance","week":1,"exercises":[],"cardio":{"sport":"bike","durationMin":45,"intensity":"Zone 2","notes":"Pédalage souple."}},{"name":"S1 · Intervalles","week":1,"exercises":[],"cardio":{"sport":"bike","durationMin":60,"intensity":"Zone 4","notes":"15 min d''échauffement, 4 × 6 min soutenu, 3 min de récupération entre chaque."}},{"name":"S1 · Sortie longue","week":1,"exercises":[],"cardio":{"sport":"bike","durationMin":60,"intensity":"Zone 2","notes":"Mangez et buvez régulièrement."}},{"name":"S2 · Endurance","week":2,"exercises":[],"cardio":{"sport":"bike","durationMin":45,"intensity":"Zone 2","notes":"Pédalage souple."}},{"name":"S2 · Intervalles","week":2,"exercises":[],"cardio":{"sport":"bike","durationMin":60,"intensity":"Zone 4","notes":"15 min d''échauffement, 4 × 6 min soutenu, 3 min de récupération entre chaque."}},{"name":"S2 · Sortie longue","week":2,"exercises":[],"cardio":{"sport":"bike","durationMin":75,"intensity":"Zone 2","notes":"Mangez et buvez régulièrement."}},{"name":"S3 · Endurance","week":3,"exercises":[],"cardio":{"sport":"bike","durationMin":45,"intensity":"Zone 2","notes":"Pédalage souple."}},{"name":"S3 · Intervalles","week":3,"exercises":[],"cardio":{"sport":"bike","durationMin":60,"intensity":"Zone 4","notes":"15 min d''échauffement, 4 × 6 min soutenu, 3 min de récupération entre chaque."}},{"name":"S3 · Sortie longue","week":3,"exercises":[],"cardio":{"sport":"bike","durationMin":90,"intensity":"Zone 2","notes":"Mangez et buvez régulièrement."}},{"name":"S4 · Endurance","week":4,"exercises":[],"cardio":{"sport":"bike","durationMin":45,"intensity":"Zone 2","notes":"Pédalage souple."}},{"name":"S4 · Intervalles","week":4,"exercises":[],"cardio":{"sport":"bike","durationMin":60,"intensity":"Zone 4","notes":"15 min d''échauffement, 4 × 6 min soutenu, 3 min de récupération entre chaque."}},{"name":"S4 · Sortie longue","week":4,"exercises":[],"cardio":{"sport":"bike","durationMin":75,"intensity":"Zone 2","notes":"Mangez et buvez régulièrement."}},{"name":"S5 · Endurance","week":5,"exercises":[],"cardio":{"sport":"bike","durationMin":45,"intensity":"Zone 2","notes":"Pédalage souple."}},{"name":"S5 · Intervalles","week":5,"exercises":[],"cardio":{"sport":"bike","durationMin":60,"intensity":"Zone 4","notes":"15 min d''échauffement, 4 × 6 min soutenu, 3 min de récupération entre chaque."}},{"name":"S5 · Sortie longue","week":5,"exercises":[],"cardio":{"sport":"bike","durationMin":105,"intensity":"Zone 2","notes":"Mangez et buvez régulièrement."}},{"name":"S6 · Endurance","week":6,"exercises":[],"cardio":{"sport":"bike","durationMin":45,"intensity":"Zone 2","notes":"Pédalage souple."}},{"name":"S6 · Intervalles","week":6,"exercises":[],"cardio":{"sport":"bike","durationMin":60,"intensity":"Zone 4","notes":"15 min d''échauffement, 4 × 6 min soutenu, 3 min de récupération entre chaque."}},{"name":"S6 · Sortie longue","week":6,"exercises":[],"cardio":{"sport":"bike","durationMin":120,"intensity":"Zone 2","notes":"Mangez et buvez régulièrement."}},{"name":"S7 · Endurance","week":7,"exercises":[],"cardio":{"sport":"bike","durationMin":45,"intensity":"Zone 2","notes":"Pédalage souple."}},{"name":"S7 · Intervalles","week":7,"exercises":[],"cardio":{"sport":"bike","durationMin":60,"intensity":"Zone 4","notes":"15 min d''échauffement, 4 × 6 min soutenu, 3 min de récupération entre chaque."}},{"name":"S7 · Sortie longue","week":7,"exercises":[],"cardio":{"sport":"bike","durationMin":135,"intensity":"Zone 2","notes":"Mangez et buvez régulièrement."}},{"name":"S8 · Endurance","week":8,"exercises":[],"cardio":{"sport":"bike","durationMin":45,"intensity":"Zone 2","notes":"Pédalage souple."}},{"name":"S8 · Intervalles","week":8,"exercises":[],"cardio":{"sport":"bike","durationMin":60,"intensity":"Zone 4","notes":"15 min d''échauffement, 4 × 6 min soutenu, 3 min de récupération entre chaque."}},{"name":"S8 · Sortie longue","week":8,"exercises":[],"cardio":{"sport":"bike","durationMin":150,"intensity":"Zone 2","notes":"Mangez et buvez régulièrement."}}]'::jsonb;

COMMIT;

-- 026_template_languages.sql
-- Ready-made programs can now belong to one language: users only see the
-- programs of their own language, plus those marked for every language.
-- Adds the English and German versions of the endurance plans and marks the
-- French ones as French. Other programs keep no language and stay visible to
-- everyone; an admin can set one in Admin › Programmes tout faits.
--
-- Deploy: apply this file first, then the code. The admin editor sends the
-- new column, and the server refuses columns it does not know.
--
-- Safe to re-run. All-or-nothing: wrapped in one transaction.

BEGIN;

ALTER TABLE program_templates ADD COLUMN IF NOT EXISTS locale TEXT;
ALTER TABLE program_templates DROP CONSTRAINT IF EXISTS program_templates_locale_check;
ALTER TABLE program_templates ADD CONSTRAINT program_templates_locale_check
  CHECK (locale IS NULL OR locale IN ('fr','en','de'));

UPDATE program_templates SET locale = 'fr'
WHERE locale IS NULL AND name IN ('Marathon en 16 semaines', 'Semi-marathon en 12 semaines', '10 km en 8 semaines', 'Débuter la course : 5 km', 'Natation endurance', 'Vélo endurance', 'Renfo coureur', 'Renfo trail', 'Renfo nageur', 'Renfo cycliste');

-- English
INSERT INTO program_templates (name, description, goal, level, days_per_week, home_friendly, structure, is_published, sort_order, locale)
SELECT 'Marathon in 16 weeks', 'For runners who can run 10 km comfortably and want a marathon. Four runs a week in four phases: base, build, marathon-pace work, taper. Long run up to 32 km. Check with a doctor before you start. Adjust to how you feel.', 'endurance', 'intermediate', 4, false, '[{"name":"W1 · Easy run","week":1,"exercises":[],"cardio":{"sport":"run","distanceKm":7,"intensity":"Zone 2","purpose":"Build your aerobic base without piling up fatigue.","steps":["5 min very slow jog to get going","Steady run at a comfortable pace: you should be able to talk in full sentences","Gentle stretching of the calves and hamstrings"]}},{"name":"W1 · Hills","week":1,"exercises":[],"cardio":{"sport":"run","distanceKm":6,"intensity":"Zone 4","purpose":"Build leg strength and stride power without the pounding of flat intervals.","steps":["Warm-up: 15 min very easy jog, then 4 drills (high knees, butt kicks) over 20 m","6 × 45 s uphill at a strong effort, jog back down","Cool-down: 10 min very slow jog, then gentle stretching"]}},{"name":"W1 · Recovery","week":1,"exercises":[],"cardio":{"sport":"run","distanceKm":5,"intensity":"Zone 1","purpose":"Get the blood flowing to recover better, without adding fatigue.","steps":["Very slow jog, on soft ground if you can","5 min walk, then hip and ankle mobility"]}},{"name":"W1 · Long run","week":1,"exercises":[],"cardio":{"sport":"run","distanceKm":12,"intensity":"Zone 2","purpose":"Teach your body to run for a long time: this is the key session of the week.","steps":["First 10 minutes very relaxed","Steady Zone 2 all the way, walking the hills if needed","5 min walk to finish"],"notes":"Take water if it is hot."}},{"name":"W2 · Easy run","week":2,"exercises":[],"cardio":{"sport":"run","distanceKm":8,"intensity":"Zone 2","purpose":"Build your aerobic base without piling up fatigue.","steps":["5 min very slow jog to get going","Steady run at a comfortable pace: you should be able to talk in full sentences","To finish: 5 × 80 m strides, building speed gradually, walk back"]}},{"name":"W2 · Fartlek","week":2,"exercises":[],"cardio":{"sport":"run","distanceKm":7,"intensity":"Zone 4","purpose":"Get used to changes of pace, playfully.","steps":["Warm-up: 15 min very easy jog, then 4 drills (high knees, butt kicks) over 20 m","8 × (1 min fast, 1 min slow), by feel","Cool-down: 10 min very slow jog, then gentle stretching"]}},{"name":"W2 · Recovery","week":2,"exercises":[],"cardio":{"sport":"run","distanceKm":6,"intensity":"Zone 1","purpose":"Get the blood flowing to recover better, without adding fatigue.","steps":["Very slow jog, on soft ground if you can","5 min walk, then hip and ankle mobility"]}},{"name":"W2 · Long run","week":2,"exercises":[],"cardio":{"sport":"run","distanceKm":14,"intensity":"Zone 2","purpose":"Teach your body to run for a long time: this is the key session of the week.","steps":["First 10 minutes very relaxed","Steady Zone 2 all the way, walking the hills if needed","5 min walk to finish"],"notes":"Take water if it is hot."}},{"name":"W3 · Easy run","week":3,"exercises":[],"cardio":{"sport":"run","distanceKm":8,"intensity":"Zone 2","purpose":"Build your aerobic base without piling up fatigue.","steps":["5 min very slow jog to get going","Steady run at a comfortable pace: you should be able to talk in full sentences","Gentle stretching of the calves and hamstrings"]}},{"name":"W3 · Hills","week":3,"exercises":[],"cardio":{"sport":"run","distanceKm":6,"intensity":"Zone 4","purpose":"Build leg strength and stride power without the pounding of flat intervals.","steps":["Warm-up: 15 min very easy jog, then 4 drills (high knees, butt kicks) over 20 m","8 × 45 s uphill at a strong effort, jog back down","Cool-down: 10 min very slow jog, then gentle stretching"]}},{"name":"W3 · Recovery","week":3,"exercises":[],"cardio":{"sport":"run","distanceKm":6,"intensity":"Zone 1","purpose":"Get the blood flowing to recover better, without adding fatigue.","steps":["Very slow jog, on soft ground if you can","5 min walk, then hip and ankle mobility"]}},{"name":"W3 · Long run","week":3,"exercises":[],"cardio":{"sport":"run","distanceKm":16,"intensity":"Zone 2","purpose":"Teach your body to run for a long time: this is the key session of the week.","steps":["First 10 minutes very relaxed","Steady Zone 2 all the way, walking the hills if needed","5 min walk to finish"],"notes":"Practise your race fuelling: drink every 20 min, a gel or bar every 40 min."}},{"name":"W4 · Easy run","week":4,"exercises":[],"cardio":{"sport":"run","distanceKm":8,"intensity":"Zone 2","purpose":"Build your aerobic base without piling up fatigue.","steps":["5 min very slow jog to get going","Steady run at a comfortable pace: you should be able to talk in full sentences","To finish: 5 × 80 m strides, building speed gradually, walk back"]}},{"name":"W4 · Easy fartlek","week":4,"exercises":[],"cardio":{"sport":"run","distanceKm":8,"intensity":"Zone 3","purpose":"Lighter week: keep some rhythm while your body absorbs the work.","steps":["10 min easy jog","6 × (1 min a little faster, 2 min easy)","10 min easy jog"]}},{"name":"W4 · Recovery","week":4,"exercises":[],"cardio":{"sport":"run","distanceKm":6,"intensity":"Zone 1","purpose":"Get the blood flowing to recover better, without adding fatigue.","steps":["Very slow jog, on soft ground if you can","5 min walk, then hip and ankle mobility"]}},{"name":"W4 · Long run","week":4,"exercises":[],"cardio":{"sport":"run","distanceKm":13,"intensity":"Zone 2","purpose":"Teach your body to run for a long time: this is the key session of the week.","steps":["First 10 minutes very relaxed","Steady Zone 2 all the way, walking the hills if needed","5 min walk to finish"],"notes":"Take water if it is hot."}},{"name":"W5 · Easy run","week":5,"exercises":[],"cardio":{"sport":"run","distanceKm":9,"intensity":"Zone 2","purpose":"Build your aerobic base without piling up fatigue.","steps":["5 min very slow jog to get going","Steady run at a comfortable pace: you should be able to talk in full sentences","Gentle stretching of the calves and hamstrings"]}},{"name":"W5 · Short intervals","week":5,"exercises":[],"cardio":{"sport":"run","distanceKm":9,"intensity":"Zone 5","purpose":"Raise your top aerobic speed so that running faster feels easier.","steps":["Warm-up: 15 min very easy jog, then 4 drills (high knees, butt kicks) over 20 m","8 × 400 m fast, 1 min 30 jog recovery","Cool-down: 10 min very slow jog, then gentle stretching"]}},{"name":"W5 · Recovery","week":5,"exercises":[],"cardio":{"sport":"run","distanceKm":7,"intensity":"Zone 1","purpose":"Get the blood flowing to recover better, without adding fatigue.","steps":["Very slow jog, on soft ground if you can","5 min walk, then hip and ankle mobility"]}},{"name":"W5 · Long run","week":5,"exercises":[],"cardio":{"sport":"run","distanceKm":18,"intensity":"Zone 2","purpose":"Teach your body to run for a long time: this is the key session of the week.","steps":["14 km in Zone 2","Last 4 km a little harder (Zone 3)","5 min walk to finish"],"notes":"Practise your race fuelling: drink every 20 min, a gel or bar every 40 min."}},{"name":"W6 · Easy run","week":6,"exercises":[],"cardio":{"sport":"run","distanceKm":9,"intensity":"Zone 2","purpose":"Build your aerobic base without piling up fatigue.","steps":["5 min very slow jog to get going","Steady run at a comfortable pace: you should be able to talk in full sentences","To finish: 5 × 80 m strides, building speed gradually, walk back"]}},{"name":"W6 · Threshold","week":6,"exercises":[],"cardio":{"sport":"run","distanceKm":10,"intensity":"Zone 4","purpose":"Push your threshold back: hold a strong pace for longer without gasping.","steps":["Warm-up: 15 min very easy jog, then 4 drills (high knees, butt kicks) over 20 m","3 × 8 min comfortably hard, 2 min recovery","Cool-down: 10 min very slow jog, then gentle stretching"]}},{"name":"W6 · Recovery","week":6,"exercises":[],"cardio":{"sport":"run","distanceKm":7,"intensity":"Zone 1","purpose":"Get the blood flowing to recover better, without adding fatigue.","steps":["Very slow jog, on soft ground if you can","5 min walk, then hip and ankle mobility"]}},{"name":"W6 · Long run","week":6,"exercises":[],"cardio":{"sport":"run","distanceKm":20,"intensity":"Zone 2","purpose":"Teach your body to run for a long time: this is the key session of the week.","steps":["15 km in Zone 2","Last 5 km a little harder (Zone 3)","5 min walk to finish"],"notes":"Practise your race fuelling: drink every 20 min, a gel or bar every 40 min."}},{"name":"W7 · Easy run","week":7,"exercises":[],"cardio":{"sport":"run","distanceKm":9,"intensity":"Zone 2","purpose":"Build your aerobic base without piling up fatigue.","steps":["5 min very slow jog to get going","Steady run at a comfortable pace: you should be able to talk in full sentences","Gentle stretching of the calves and hamstrings"]}},{"name":"W7 · Short intervals","week":7,"exercises":[],"cardio":{"sport":"run","distanceKm":10,"intensity":"Zone 5","purpose":"Raise your top aerobic speed so that running faster feels easier.","steps":["Warm-up: 15 min very easy jog, then 4 drills (high knees, butt kicks) over 20 m","10 × 400 m fast, 1 min 30 jog recovery","Cool-down: 10 min very slow jog, then gentle stretching"]}},{"name":"W7 · Recovery","week":7,"exercises":[],"cardio":{"sport":"run","distanceKm":7,"intensity":"Zone 1","purpose":"Get the blood flowing to recover better, without adding fatigue.","steps":["Very slow jog, on soft ground if you can","5 min walk, then hip and ankle mobility"]}},{"name":"W7 · Long run","week":7,"exercises":[],"cardio":{"sport":"run","distanceKm":22,"intensity":"Zone 2","purpose":"Teach your body to run for a long time: this is the key session of the week.","steps":["17 km in Zone 2","Last 5 km a little harder (Zone 3)","5 min walk to finish"],"notes":"Practise your race fuelling: drink every 20 min, a gel or bar every 40 min."}},{"name":"W8 · Easy run","week":8,"exercises":[],"cardio":{"sport":"run","distanceKm":8,"intensity":"Zone 2","purpose":"Build your aerobic base without piling up fatigue.","steps":["5 min very slow jog to get going","Steady run at a comfortable pace: you should be able to talk in full sentences","To finish: 5 × 80 m strides, building speed gradually, walk back"]}},{"name":"W8 · Easy fartlek","week":8,"exercises":[],"cardio":{"sport":"run","distanceKm":8,"intensity":"Zone 3","purpose":"Lighter week: keep some rhythm while your body absorbs the work.","steps":["10 min easy jog","6 × (1 min a little faster, 2 min easy)","10 min easy jog"]}},{"name":"W8 · Recovery","week":8,"exercises":[],"cardio":{"sport":"run","distanceKm":6,"intensity":"Zone 1","purpose":"Get the blood flowing to recover better, without adding fatigue.","steps":["Very slow jog, on soft ground if you can","5 min walk, then hip and ankle mobility"]}},{"name":"W8 · Long run","week":8,"exercises":[],"cardio":{"sport":"run","distanceKm":16,"intensity":"Zone 2","purpose":"Teach your body to run for a long time: this is the key session of the week.","steps":["First 10 minutes very relaxed","Steady Zone 2 all the way, walking the hills if needed","5 min walk to finish"],"notes":"Practise your race fuelling: drink every 20 min, a gel or bar every 40 min."}},{"name":"W9 · Easy run","week":9,"exercises":[],"cardio":{"sport":"run","distanceKm":10,"intensity":"Zone 2","purpose":"Build your aerobic base without piling up fatigue.","steps":["5 min very slow jog to get going","Steady run at a comfortable pace: you should be able to talk in full sentences","Gentle stretching of the calves and hamstrings"]}},{"name":"W9 · Long intervals","week":9,"exercises":[],"cardio":{"sport":"run","distanceKm":11,"intensity":"Zone 4","purpose":"Keep the speed you have built over longer efforts.","steps":["Warm-up: 15 min very easy jog, then 4 drills (high knees, butt kicks) over 20 m","5 × 1000 m strong, 2 min jog recovery","Cool-down: 10 min very slow jog, then gentle stretching"]}},{"name":"W9 · Recovery","week":9,"exercises":[],"cardio":{"sport":"run","distanceKm":8,"intensity":"Zone 1","purpose":"Get the blood flowing to recover better, without adding fatigue.","steps":["Very slow jog, on soft ground if you can","5 min walk, then hip and ankle mobility"]}},{"name":"W9 · Long run","week":9,"exercises":[],"cardio":{"sport":"run","distanceKm":24,"intensity":"Zone 2","purpose":"Learn to hold race pace on tired legs.","steps":["17 km in Zone 2, steady","Last 7 km at marathon pace","5 min walk to finish"],"notes":"Practise your race fuelling: drink every 20 min, a gel or bar every 40 min."}},{"name":"W10 · Easy run","week":10,"exercises":[],"cardio":{"sport":"run","distanceKm":10,"intensity":"Zone 2","purpose":"Build your aerobic base without piling up fatigue.","steps":["5 min very slow jog to get going","Steady run at a comfortable pace: you should be able to talk in full sentences","To finish: 5 × 80 m strides, building speed gradually, walk back"]}},{"name":"W10 · Race pace","week":10,"exercises":[],"cardio":{"sport":"run","distanceKm":14,"intensity":"Race pace","purpose":"Lock in your marathon pace so you can find it on race day without a watch.","steps":["Warm-up: 15 min very easy jog, then 4 drills (high knees, butt kicks) over 20 m","3 × 3 km at marathon pace, 2 min recovery","Cool-down: 10 min very slow jog, then gentle stretching"]}},{"name":"W10 · Recovery","week":10,"exercises":[],"cardio":{"sport":"run","distanceKm":8,"intensity":"Zone 1","purpose":"Get the blood flowing to recover better, without adding fatigue.","steps":["Very slow jog, on soft ground if you can","5 min walk, then hip and ankle mobility"]}},{"name":"W10 · Long run","week":10,"exercises":[],"cardio":{"sport":"run","distanceKm":26,"intensity":"Zone 2","purpose":"Learn to hold race pace on tired legs.","steps":["18 km in Zone 2, steady","Last 8 km at marathon pace","5 min walk to finish"],"notes":"Practise your race fuelling: drink every 20 min, a gel or bar every 40 min."}},{"name":"W11 · Easy run","week":11,"exercises":[],"cardio":{"sport":"run","distanceKm":11,"intensity":"Zone 2","purpose":"Build your aerobic base without piling up fatigue.","steps":["5 min very slow jog to get going","Steady run at a comfortable pace: you should be able to talk in full sentences","Gentle stretching of the calves and hamstrings"]}},{"name":"W11 · Long intervals","week":11,"exercises":[],"cardio":{"sport":"run","distanceKm":12,"intensity":"Zone 4","purpose":"Keep the speed you have built over longer efforts.","steps":["Warm-up: 15 min very easy jog, then 4 drills (high knees, butt kicks) over 20 m","6 × 1000 m strong, 2 min jog recovery","Cool-down: 10 min very slow jog, then gentle stretching"]}},{"name":"W11 · Recovery","week":11,"exercises":[],"cardio":{"sport":"run","distanceKm":9,"intensity":"Zone 1","purpose":"Get the blood flowing to recover better, without adding fatigue.","steps":["Very slow jog, on soft ground if you can","5 min walk, then hip and ankle mobility"]}},{"name":"W11 · Long run","week":11,"exercises":[],"cardio":{"sport":"run","distanceKm":28,"intensity":"Zone 2","purpose":"Learn to hold race pace on tired legs.","steps":["20 km in Zone 2, steady","Last 8 km at marathon pace","5 min walk to finish"],"notes":"Practise your race fuelling: drink every 20 min, a gel or bar every 40 min."}},{"name":"W12 · Easy run","week":12,"exercises":[],"cardio":{"sport":"run","distanceKm":9,"intensity":"Zone 2","purpose":"Build your aerobic base without piling up fatigue.","steps":["5 min very slow jog to get going","Steady run at a comfortable pace: you should be able to talk in full sentences","To finish: 5 × 80 m strides, building speed gradually, walk back"]}},{"name":"W12 · Easy fartlek","week":12,"exercises":[],"cardio":{"sport":"run","distanceKm":9,"intensity":"Zone 3","purpose":"Lighter week: keep some rhythm while your body absorbs the work.","steps":["10 min easy jog","6 × (1 min a little faster, 2 min easy)","10 min easy jog"]}},{"name":"W12 · Recovery","week":12,"exercises":[],"cardio":{"sport":"run","distanceKm":7,"intensity":"Zone 1","purpose":"Get the blood flowing to recover better, without adding fatigue.","steps":["Very slow jog, on soft ground if you can","5 min walk, then hip and ankle mobility"]}},{"name":"W12 · Long run","week":12,"exercises":[],"cardio":{"sport":"run","distanceKm":20,"intensity":"Zone 2","purpose":"Learn to hold race pace on tired legs.","steps":["First 10 minutes very relaxed","Steady Zone 2 all the way, walking the hills if needed","5 min walk to finish"],"notes":"Practise your race fuelling: drink every 20 min, a gel or bar every 40 min."}},{"name":"W13 · Easy run","week":13,"exercises":[],"cardio":{"sport":"run","distanceKm":11,"intensity":"Zone 2","purpose":"Build your aerobic base without piling up fatigue.","steps":["5 min very slow jog to get going","Steady run at a comfortable pace: you should be able to talk in full sentences","Gentle stretching of the calves and hamstrings"]}},{"name":"W13 · Race pace","week":13,"exercises":[],"cardio":{"sport":"run","distanceKm":17,"intensity":"Race pace","purpose":"Lock in your marathon pace so you can find it on race day without a watch.","steps":["Warm-up: 15 min very easy jog, then 4 drills (high knees, butt kicks) over 20 m","3 × 4 km at marathon pace, 2 min recovery","Cool-down: 10 min very slow jog, then gentle stretching"]}},{"name":"W13 · Recovery","week":13,"exercises":[],"cardio":{"sport":"run","distanceKm":9,"intensity":"Zone 1","purpose":"Get the blood flowing to recover better, without adding fatigue.","steps":["Very slow jog, on soft ground if you can","5 min walk, then hip and ankle mobility"]}},{"name":"W13 · Long run","week":13,"exercises":[],"cardio":{"sport":"run","distanceKm":32,"intensity":"Zone 2","purpose":"Learn to hold race pace on tired legs.","steps":["22 km in Zone 2, steady","Last 10 km at marathon pace","5 min walk to finish"],"notes":"Practise your race fuelling: drink every 20 min, a gel or bar every 40 min."}},{"name":"W14 · Easy run","week":14,"exercises":[],"cardio":{"sport":"run","distanceKm":10,"intensity":"Zone 2","purpose":"Build your aerobic base without piling up fatigue.","steps":["5 min very slow jog to get going","Steady run at a comfortable pace: you should be able to talk in full sentences","Gentle stretching of the calves and hamstrings"]}},{"name":"W14 · Pace reminder","week":14,"exercises":[],"cardio":{"sport":"run","distanceKm":10,"intensity":"Race pace","purpose":"Keep the feel for speed while cutting the volume.","steps":["Warm-up: 15 min very easy jog, then 4 drills (high knees, butt kicks) over 20 m","3 × 1 km at marathon pace, 2 min recovery","Cool-down: 10 min very slow jog, then gentle stretching"]}},{"name":"W14 · Recovery","week":14,"exercises":[],"cardio":{"sport":"run","distanceKm":8,"intensity":"Zone 1","purpose":"Get the blood flowing to recover better, without adding fatigue.","steps":["Very slow jog, on soft ground if you can","5 min walk, then hip and ankle mobility"]}},{"name":"W14 · Long run","week":14,"exercises":[],"cardio":{"sport":"run","distanceKm":24,"intensity":"Zone 2","purpose":"Teach your body to run for a long time: this is the key session of the week.","steps":["First 10 minutes very relaxed","Steady Zone 2 all the way, walking the hills if needed","5 min walk to finish"],"notes":"Practise your race fuelling: drink every 20 min, a gel or bar every 40 min."}},{"name":"W15 · Easy run","week":15,"exercises":[],"cardio":{"sport":"run","distanceKm":8,"intensity":"Zone 2","purpose":"Build your aerobic base without piling up fatigue.","steps":["5 min very slow jog to get going","Steady run at a comfortable pace: you should be able to talk in full sentences","Gentle stretching of the calves and hamstrings"]}},{"name":"W15 · Pace reminder","week":15,"exercises":[],"cardio":{"sport":"run","distanceKm":8,"intensity":"Race pace","purpose":"Keep the feel for speed while cutting the volume.","steps":["Warm-up: 15 min very easy jog, then 4 drills (high knees, butt kicks) over 20 m","3 × 1 km at marathon pace, 2 min recovery","Cool-down: 10 min very slow jog, then gentle stretching"]}},{"name":"W15 · Recovery","week":15,"exercises":[],"cardio":{"sport":"run","distanceKm":6,"intensity":"Zone 1","purpose":"Get the blood flowing to recover better, without adding fatigue.","steps":["Very slow jog, on soft ground if you can","5 min walk, then hip and ankle mobility"]}},{"name":"W15 · Long run","week":15,"exercises":[],"cardio":{"sport":"run","distanceKm":16,"intensity":"Zone 2","purpose":"Teach your body to run for a long time: this is the key session of the week.","steps":["First 10 minutes very relaxed","Steady Zone 2 all the way, walking the hills if needed","5 min walk to finish"],"notes":"Practise your race fuelling: drink every 20 min, a gel or bar every 40 min."}},{"name":"W16 · Easy run","week":16,"exercises":[],"cardio":{"sport":"run","distanceKm":6,"intensity":"Zone 2","purpose":"Keep moving without dipping into your reserves.","steps":["Short, easy jog","3 × 80 m strides to wake the legs up"]}},{"name":"W16 · Sharpener","week":16,"exercises":[],"cardio":{"sport":"run","distanceKm":4,"intensity":"Zone 3","purpose":"Two or three days before the race: stay sharp without getting tired.","steps":["15 min easy jog","3 × 2 min at marathon pace, 2 min recovery","5 min slow jog"]}},{"name":"W16 · Marathon","week":16,"exercises":[],"cardio":{"sport":"run","distanceKm":42.2,"intensity":"Race","purpose":"Race day: enjoy all the work you have put in.","steps":["The day before: your usual meal, rich in carbohydrates; kit ready, bib pinned","Warm-up: 5 min of jogging is enough, save your energy","First third: start at marathon pace, and no faster despite the excitement of the start","Second third: stay even and fuel as you did in training","Last third: relax your shoulders and pick up the pace if your legs allow"],"notes":"Have a great race!"}}]'::jsonb, true, 200, 'en'
WHERE NOT EXISTS (SELECT 1 FROM program_templates WHERE name = 'Marathon in 16 weeks' AND locale = 'en');

INSERT INTO program_templates (name, description, goal, level, days_per_week, home_friendly, structure, is_published, sort_order, locale)
SELECT 'Half marathon in 12 weeks', 'For runners who already run 10 km. Three runs a week: an easy run, a quality session that changes over time (hills, threshold, intervals, half-marathon pace) and a long run up to 18 km. Check with a doctor before you start. Adjust to how you feel.', 'endurance', 'intermediate', 3, false, '[{"name":"W1 · Easy run","week":1,"exercises":[],"cardio":{"sport":"run","distanceKm":6,"intensity":"Zone 2","purpose":"Build your aerobic base without piling up fatigue.","steps":["5 min very slow jog to get going","Steady run at a comfortable pace: you should be able to talk in full sentences","Gentle stretching of the calves and hamstrings"]}},{"name":"W1 · Hills","week":1,"exercises":[],"cardio":{"sport":"run","distanceKm":6,"intensity":"Zone 4","purpose":"Build leg strength and stride power without the pounding of flat intervals.","steps":["Warm-up: 15 min very easy jog, then 4 drills (high knees, butt kicks) over 20 m","6 × 45 s uphill at a strong effort, jog back down","Cool-down: 10 min very slow jog, then gentle stretching"]}},{"name":"W1 · Long run","week":1,"exercises":[],"cardio":{"sport":"run","distanceKm":8,"intensity":"Zone 2","purpose":"Teach your body to run for a long time: this is the key session of the week.","steps":["First 10 minutes very relaxed","Steady Zone 2 all the way, walking the hills if needed","5 min walk to finish"],"notes":"Take water if it is hot."}},{"name":"W2 · Easy run","week":2,"exercises":[],"cardio":{"sport":"run","distanceKm":6,"intensity":"Zone 2","purpose":"Build your aerobic base without piling up fatigue.","steps":["5 min very slow jog to get going","Steady run at a comfortable pace: you should be able to talk in full sentences","To finish: 5 × 80 m strides, building speed gradually, walk back"]}},{"name":"W2 · Fartlek","week":2,"exercises":[],"cardio":{"sport":"run","distanceKm":7,"intensity":"Zone 4","purpose":"Get used to changes of pace, playfully.","steps":["Warm-up: 15 min very easy jog, then 4 drills (high knees, butt kicks) over 20 m","8 × (1 min fast, 1 min slow), by feel","Cool-down: 10 min very slow jog, then gentle stretching"]}},{"name":"W2 · Long run","week":2,"exercises":[],"cardio":{"sport":"run","distanceKm":10,"intensity":"Zone 2","purpose":"Teach your body to run for a long time: this is the key session of the week.","steps":["First 10 minutes very relaxed","Steady Zone 2 all the way, walking the hills if needed","5 min walk to finish"],"notes":"Take water if it is hot."}},{"name":"W3 · Easy run","week":3,"exercises":[],"cardio":{"sport":"run","distanceKm":6,"intensity":"Zone 2","purpose":"Build your aerobic base without piling up fatigue.","steps":["5 min very slow jog to get going","Steady run at a comfortable pace: you should be able to talk in full sentences","Gentle stretching of the calves and hamstrings"]}},{"name":"W3 · Hills","week":3,"exercises":[],"cardio":{"sport":"run","distanceKm":6,"intensity":"Zone 4","purpose":"Build leg strength and stride power without the pounding of flat intervals.","steps":["Warm-up: 15 min very easy jog, then 4 drills (high knees, butt kicks) over 20 m","8 × 45 s uphill at a strong effort, jog back down","Cool-down: 10 min very slow jog, then gentle stretching"]}},{"name":"W3 · Long run","week":3,"exercises":[],"cardio":{"sport":"run","distanceKm":12,"intensity":"Zone 2","purpose":"Teach your body to run for a long time: this is the key session of the week.","steps":["First 10 minutes very relaxed","Steady Zone 2 all the way, walking the hills if needed","5 min walk to finish"],"notes":"Take water if it is hot."}},{"name":"W4 · Easy run","week":4,"exercises":[],"cardio":{"sport":"run","distanceKm":6,"intensity":"Zone 2","purpose":"Build your aerobic base without piling up fatigue.","steps":["5 min very slow jog to get going","Steady run at a comfortable pace: you should be able to talk in full sentences","To finish: 5 × 80 m strides, building speed gradually, walk back"]}},{"name":"W4 · Easy fartlek","week":4,"exercises":[],"cardio":{"sport":"run","distanceKm":6,"intensity":"Zone 3","purpose":"Lighter week: keep some rhythm while your body absorbs the work.","steps":["10 min easy jog","6 × (1 min a little faster, 2 min easy)","10 min easy jog"]}},{"name":"W4 · Long run","week":4,"exercises":[],"cardio":{"sport":"run","distanceKm":10,"intensity":"Zone 2","purpose":"Teach your body to run for a long time: this is the key session of the week.","steps":["First 10 minutes very relaxed","Steady Zone 2 all the way, walking the hills if needed","5 min walk to finish"],"notes":"Take water if it is hot."}},{"name":"W5 · Easy run","week":5,"exercises":[],"cardio":{"sport":"run","distanceKm":7,"intensity":"Zone 2","purpose":"Build your aerobic base without piling up fatigue.","steps":["5 min very slow jog to get going","Steady run at a comfortable pace: you should be able to talk in full sentences","Gentle stretching of the calves and hamstrings"]}},{"name":"W5 · Short intervals","week":5,"exercises":[],"cardio":{"sport":"run","distanceKm":9,"intensity":"Zone 5","purpose":"Raise your top aerobic speed so that running faster feels easier.","steps":["Warm-up: 15 min very easy jog, then 4 drills (high knees, butt kicks) over 20 m","8 × 400 m fast, 1 min 30 jog recovery","Cool-down: 10 min very slow jog, then gentle stretching"]}},{"name":"W5 · Long run","week":5,"exercises":[],"cardio":{"sport":"run","distanceKm":13,"intensity":"Zone 2","purpose":"Teach your body to run for a long time: this is the key session of the week.","steps":["10 km in Zone 2","Last 3 km a little harder (Zone 3)","5 min walk to finish"],"notes":"Take water if it is hot."}},{"name":"W6 · Easy run","week":6,"exercises":[],"cardio":{"sport":"run","distanceKm":7,"intensity":"Zone 2","purpose":"Build your aerobic base without piling up fatigue.","steps":["5 min very slow jog to get going","Steady run at a comfortable pace: you should be able to talk in full sentences","To finish: 5 × 80 m strides, building speed gradually, walk back"]}},{"name":"W6 · Threshold","week":6,"exercises":[],"cardio":{"sport":"run","distanceKm":10,"intensity":"Zone 4","purpose":"Push your threshold back: hold a strong pace for longer without gasping.","steps":["Warm-up: 15 min very easy jog, then 4 drills (high knees, butt kicks) over 20 m","3 × 8 min comfortably hard, 2 min recovery","Cool-down: 10 min very slow jog, then gentle stretching"]}},{"name":"W6 · Long run","week":6,"exercises":[],"cardio":{"sport":"run","distanceKm":15,"intensity":"Zone 2","purpose":"Teach your body to run for a long time: this is the key session of the week.","steps":["11 km in Zone 2","Last 4 km a little harder (Zone 3)","5 min walk to finish"],"notes":"Take water if it is hot."}},{"name":"W7 · Easy run","week":7,"exercises":[],"cardio":{"sport":"run","distanceKm":7,"intensity":"Zone 2","purpose":"Build your aerobic base without piling up fatigue.","steps":["5 min very slow jog to get going","Steady run at a comfortable pace: you should be able to talk in full sentences","Gentle stretching of the calves and hamstrings"]}},{"name":"W7 · Long intervals","week":7,"exercises":[],"cardio":{"sport":"run","distanceKm":11,"intensity":"Zone 4","purpose":"Keep the speed you have built over longer efforts.","steps":["Warm-up: 15 min very easy jog, then 4 drills (high knees, butt kicks) over 20 m","5 × 1000 m strong, 2 min jog recovery","Cool-down: 10 min very slow jog, then gentle stretching"]}},{"name":"W7 · Long run","week":7,"exercises":[],"cardio":{"sport":"run","distanceKm":16,"intensity":"Zone 2","purpose":"Learn to hold race pace on tired legs.","steps":["11 km in Zone 2, steady","Last 5 km at half-marathon pace","5 min walk to finish"],"notes":"Practise your race fuelling: drink every 20 min, a gel or bar every 40 min."}},{"name":"W8 · Easy run","week":8,"exercises":[],"cardio":{"sport":"run","distanceKm":6,"intensity":"Zone 2","purpose":"Build your aerobic base without piling up fatigue.","steps":["5 min very slow jog to get going","Steady run at a comfortable pace: you should be able to talk in full sentences","To finish: 5 × 80 m strides, building speed gradually, walk back"]}},{"name":"W8 · Easy fartlek","week":8,"exercises":[],"cardio":{"sport":"run","distanceKm":6,"intensity":"Zone 3","purpose":"Lighter week: keep some rhythm while your body absorbs the work.","steps":["10 min easy jog","6 × (1 min a little faster, 2 min easy)","10 min easy jog"]}},{"name":"W8 · Long run","week":8,"exercises":[],"cardio":{"sport":"run","distanceKm":12,"intensity":"Zone 2","purpose":"Learn to hold race pace on tired legs.","steps":["First 10 minutes very relaxed","Steady Zone 2 all the way, walking the hills if needed","5 min walk to finish"],"notes":"Take water if it is hot."}},{"name":"W9 · Easy run","week":9,"exercises":[],"cardio":{"sport":"run","distanceKm":8,"intensity":"Zone 2","purpose":"Build your aerobic base without piling up fatigue.","steps":["5 min very slow jog to get going","Steady run at a comfortable pace: you should be able to talk in full sentences","Gentle stretching of the calves and hamstrings"]}},{"name":"W9 · Race pace","week":9,"exercises":[],"cardio":{"sport":"run","distanceKm":11,"intensity":"Race pace","purpose":"Lock in your half-marathon pace so you can find it on race day without a watch.","steps":["Warm-up: 15 min very easy jog, then 4 drills (high knees, butt kicks) over 20 m","3 × 2 km at half-marathon pace, 2 min recovery","Cool-down: 10 min very slow jog, then gentle stretching"]}},{"name":"W9 · Long run","week":9,"exercises":[],"cardio":{"sport":"run","distanceKm":18,"intensity":"Zone 2","purpose":"Learn to hold race pace on tired legs.","steps":["13 km in Zone 2, steady","Last 5 km at half-marathon pace","5 min walk to finish"],"notes":"Practise your race fuelling: drink every 20 min, a gel or bar every 40 min."}},{"name":"W10 · Easy run","week":10,"exercises":[],"cardio":{"sport":"run","distanceKm":7,"intensity":"Zone 2","purpose":"Build your aerobic base without piling up fatigue.","steps":["5 min very slow jog to get going","Steady run at a comfortable pace: you should be able to talk in full sentences","Gentle stretching of the calves and hamstrings"]}},{"name":"W10 · Pace reminder","week":10,"exercises":[],"cardio":{"sport":"run","distanceKm":7,"intensity":"Race pace","purpose":"Keep the feel for speed while cutting the volume.","steps":["Warm-up: 15 min very easy jog, then 4 drills (high knees, butt kicks) over 20 m","3 × 1 km at half-marathon pace, 2 min recovery","Cool-down: 10 min very slow jog, then gentle stretching"]}},{"name":"W10 · Long run","week":10,"exercises":[],"cardio":{"sport":"run","distanceKm":16,"intensity":"Zone 2","purpose":"Teach your body to run for a long time: this is the key session of the week.","steps":["First 10 minutes very relaxed","Steady Zone 2 all the way, walking the hills if needed","5 min walk to finish"],"notes":"Practise your race fuelling: drink every 20 min, a gel or bar every 40 min."}},{"name":"W11 · Easy run","week":11,"exercises":[],"cardio":{"sport":"run","distanceKm":6,"intensity":"Zone 2","purpose":"Build your aerobic base without piling up fatigue.","steps":["5 min very slow jog to get going","Steady run at a comfortable pace: you should be able to talk in full sentences","Gentle stretching of the calves and hamstrings"]}},{"name":"W11 · Pace reminder","week":11,"exercises":[],"cardio":{"sport":"run","distanceKm":6,"intensity":"Race pace","purpose":"Keep the feel for speed while cutting the volume.","steps":["Warm-up: 15 min very easy jog, then 4 drills (high knees, butt kicks) over 20 m","3 × 1 km at half-marathon pace, 2 min recovery","Cool-down: 10 min very slow jog, then gentle stretching"]}},{"name":"W11 · Long run","week":11,"exercises":[],"cardio":{"sport":"run","distanceKm":12,"intensity":"Zone 2","purpose":"Teach your body to run for a long time: this is the key session of the week.","steps":["First 10 minutes very relaxed","Steady Zone 2 all the way, walking the hills if needed","5 min walk to finish"],"notes":"Take water if it is hot."}},{"name":"W12 · Easy run","week":12,"exercises":[],"cardio":{"sport":"run","distanceKm":6,"intensity":"Zone 2","purpose":"Keep moving without dipping into your reserves.","steps":["Short, easy jog","3 × 80 m strides to wake the legs up"]}},{"name":"W12 · Sharpener","week":12,"exercises":[],"cardio":{"sport":"run","distanceKm":4,"intensity":"Zone 3","purpose":"Two or three days before the race: stay sharp without getting tired.","steps":["15 min easy jog","3 × 2 min at half-marathon pace, 2 min recovery","5 min slow jog"]}},{"name":"W12 · Half marathon","week":12,"exercises":[],"cardio":{"sport":"run","distanceKm":21.1,"intensity":"Race","purpose":"Race day: enjoy all the work you have put in.","steps":["The day before: your usual meal, rich in carbohydrates; kit ready, bib pinned","Warm-up: 5 min of jogging is enough, save your energy","First third: start at half-marathon pace, and no faster despite the excitement of the start","Second third: stay even and fuel as you did in training","Last third: relax your shoulders and pick up the pace if your legs allow"],"notes":"Have a great race!"}}]'::jsonb, true, 210, 'en'
WHERE NOT EXISTS (SELECT 1 FROM program_templates WHERE name = 'Half marathon in 12 weeks' AND locale = 'en');

INSERT INTO program_templates (name, description, goal, level, days_per_week, home_friendly, structure, is_published, sort_order, locale)
SELECT '10K in 8 weeks', 'For runners who can run 30 minutes without stopping. Three runs a week, from hills to intervals, to nail your 10K. Check with a doctor before you start. Adjust to how you feel.', 'endurance', 'beginner', 3, false, '[{"name":"W1 · Easy run","week":1,"exercises":[],"cardio":{"sport":"run","distanceKm":4,"intensity":"Zone 2","purpose":"Build your aerobic base without piling up fatigue.","steps":["5 min very slow jog to get going","Steady run at a comfortable pace: you should be able to talk in full sentences","Gentle stretching of the calves and hamstrings"]}},{"name":"W1 · Hills","week":1,"exercises":[],"cardio":{"sport":"run","distanceKm":6,"intensity":"Zone 4","purpose":"Build leg strength and stride power without the pounding of flat intervals.","steps":["Warm-up: 15 min very easy jog, then 4 drills (high knees, butt kicks) over 20 m","5 × 45 s uphill at a strong effort, jog back down","Cool-down: 10 min very slow jog, then gentle stretching"]}},{"name":"W1 · Long run","week":1,"exercises":[],"cardio":{"sport":"run","distanceKm":5,"intensity":"Zone 2","purpose":"Teach your body to run for a long time: this is the key session of the week.","steps":["First 10 minutes very relaxed","Steady Zone 2 all the way, walking the hills if needed","5 min walk to finish"],"notes":"Take water if it is hot."}},{"name":"W2 · Easy run","week":2,"exercises":[],"cardio":{"sport":"run","distanceKm":4,"intensity":"Zone 2","purpose":"Build your aerobic base without piling up fatigue.","steps":["5 min very slow jog to get going","Steady run at a comfortable pace: you should be able to talk in full sentences","To finish: 5 × 80 m strides, building speed gradually, walk back"]}},{"name":"W2 · Fartlek","week":2,"exercises":[],"cardio":{"sport":"run","distanceKm":6,"intensity":"Zone 4","purpose":"Get used to changes of pace, playfully.","steps":["Warm-up: 15 min very easy jog, then 4 drills (high knees, butt kicks) over 20 m","6 × (1 min fast, 1 min slow), by feel","Cool-down: 10 min very slow jog, then gentle stretching"]}},{"name":"W2 · Long run","week":2,"exercises":[],"cardio":{"sport":"run","distanceKm":6,"intensity":"Zone 2","purpose":"Teach your body to run for a long time: this is the key session of the week.","steps":["First 10 minutes very relaxed","Steady Zone 2 all the way, walking the hills if needed","5 min walk to finish"],"notes":"Take water if it is hot."}},{"name":"W3 · Easy run","week":3,"exercises":[],"cardio":{"sport":"run","distanceKm":4,"intensity":"Zone 2","purpose":"Build your aerobic base without piling up fatigue.","steps":["5 min very slow jog to get going","Steady run at a comfortable pace: you should be able to talk in full sentences","Gentle stretching of the calves and hamstrings"]}},{"name":"W3 · Short intervals","week":3,"exercises":[],"cardio":{"sport":"run","distanceKm":8,"intensity":"Zone 5","purpose":"Raise your top aerobic speed so that running faster feels easier.","steps":["Warm-up: 15 min very easy jog, then 4 drills (high knees, butt kicks) over 20 m","6 × 400 m fast, 1 min 30 jog recovery","Cool-down: 10 min very slow jog, then gentle stretching"]}},{"name":"W3 · Long run","week":3,"exercises":[],"cardio":{"sport":"run","distanceKm":7,"intensity":"Zone 2","purpose":"Teach your body to run for a long time: this is the key session of the week.","steps":["5 km in Zone 2","Last 2 km a little harder (Zone 3)","5 min walk to finish"],"notes":"Take water if it is hot."}},{"name":"W4 · Easy run","week":4,"exercises":[],"cardio":{"sport":"run","distanceKm":4,"intensity":"Zone 2","purpose":"Build your aerobic base without piling up fatigue.","steps":["5 min very slow jog to get going","Steady run at a comfortable pace: you should be able to talk in full sentences","To finish: 5 × 80 m strides, building speed gradually, walk back"]}},{"name":"W4 · Easy fartlek","week":4,"exercises":[],"cardio":{"sport":"run","distanceKm":4,"intensity":"Zone 3","purpose":"Lighter week: keep some rhythm while your body absorbs the work.","steps":["10 min easy jog","6 × (1 min a little faster, 2 min easy)","10 min easy jog"]}},{"name":"W4 · Long run","week":4,"exercises":[],"cardio":{"sport":"run","distanceKm":6,"intensity":"Zone 2","purpose":"Teach your body to run for a long time: this is the key session of the week.","steps":["First 10 minutes very relaxed","Steady Zone 2 all the way, walking the hills if needed","5 min walk to finish"],"notes":"Take water if it is hot."}},{"name":"W5 · Easy run","week":5,"exercises":[],"cardio":{"sport":"run","distanceKm":5,"intensity":"Zone 2","purpose":"Build your aerobic base without piling up fatigue.","steps":["5 min very slow jog to get going","Steady run at a comfortable pace: you should be able to talk in full sentences","Gentle stretching of the calves and hamstrings"]}},{"name":"W5 · Long intervals","week":5,"exercises":[],"cardio":{"sport":"run","distanceKm":9,"intensity":"Zone 4","purpose":"Keep the speed you have built over longer efforts.","steps":["Warm-up: 15 min very easy jog, then 4 drills (high knees, butt kicks) over 20 m","4 × 1000 m strong, 2 min jog recovery","Cool-down: 10 min very slow jog, then gentle stretching"]}},{"name":"W5 · Long run","week":5,"exercises":[],"cardio":{"sport":"run","distanceKm":8,"intensity":"Zone 2","purpose":"Learn to hold race pace on tired legs.","steps":["6 km in Zone 2, steady","Last 2 km at 10K pace","5 min walk to finish"],"notes":"Take water if it is hot."}},{"name":"W6 · Easy run","week":6,"exercises":[],"cardio":{"sport":"run","distanceKm":5,"intensity":"Zone 2","purpose":"Build your aerobic base without piling up fatigue.","steps":["5 min very slow jog to get going","Steady run at a comfortable pace: you should be able to talk in full sentences","To finish: 5 × 80 m strides, building speed gradually, walk back"]}},{"name":"W6 · Race pace","week":6,"exercises":[],"cardio":{"sport":"run","distanceKm":9,"intensity":"Race pace","purpose":"Lock in your 10K pace so you can find it on race day without a watch.","steps":["Warm-up: 15 min very easy jog, then 4 drills (high knees, butt kicks) over 20 m","4 × 1 km at 10K pace, 2 min recovery","Cool-down: 10 min very slow jog, then gentle stretching"]}},{"name":"W6 · Long run","week":6,"exercises":[],"cardio":{"sport":"run","distanceKm":9,"intensity":"Zone 2","purpose":"Learn to hold race pace on tired legs.","steps":["6 km in Zone 2, steady","Last 3 km at 10K pace","5 min walk to finish"],"notes":"Take water if it is hot."}},{"name":"W7 · Easy run","week":7,"exercises":[],"cardio":{"sport":"run","distanceKm":4,"intensity":"Zone 2","purpose":"Build your aerobic base without piling up fatigue.","steps":["5 min very slow jog to get going","Steady run at a comfortable pace: you should be able to talk in full sentences","Gentle stretching of the calves and hamstrings"]}},{"name":"W7 · Pace reminder","week":7,"exercises":[],"cardio":{"sport":"run","distanceKm":4,"intensity":"Race pace","purpose":"Keep the feel for speed while cutting the volume.","steps":["Warm-up: 15 min very easy jog, then 4 drills (high knees, butt kicks) over 20 m","3 × 1 km at 10K pace, 2 min recovery","Cool-down: 10 min very slow jog, then gentle stretching"]}},{"name":"W7 · Long run","week":7,"exercises":[],"cardio":{"sport":"run","distanceKm":7,"intensity":"Zone 2","purpose":"Teach your body to run for a long time: this is the key session of the week.","steps":["First 10 minutes very relaxed","Steady Zone 2 all the way, walking the hills if needed","5 min walk to finish"],"notes":"Take water if it is hot."}},{"name":"W8 · Easy run","week":8,"exercises":[],"cardio":{"sport":"run","distanceKm":6,"intensity":"Zone 2","purpose":"Keep moving without dipping into your reserves.","steps":["Short, easy jog","3 × 80 m strides to wake the legs up"]}},{"name":"W8 · Sharpener","week":8,"exercises":[],"cardio":{"sport":"run","distanceKm":4,"intensity":"Zone 3","purpose":"Two or three days before the race: stay sharp without getting tired.","steps":["15 min easy jog","3 × 2 min at 10K pace, 2 min recovery","5 min slow jog"]}},{"name":"W8 · 10K","week":8,"exercises":[],"cardio":{"sport":"run","distanceKm":10,"intensity":"Race","purpose":"Race day: enjoy all the work you have put in.","steps":["The day before: your usual meal, rich in carbohydrates; kit ready, bib pinned","Warm-up: 10 min jog and 3 strides","First third: start at 10K pace, and no faster despite the excitement of the start","Second third: stay even and fuel as you did in training","Last third: relax your shoulders and pick up the pace if your legs allow"],"notes":"Have a great race!"}}]'::jsonb, true, 220, 'en'
WHERE NOT EXISTS (SELECT 1 FROM program_templates WHERE name = '10K in 8 weeks' AND locale = 'en');

INSERT INTO program_templates (name, description, goal, level, days_per_week, home_friendly, structure, is_published, sort_order, locale)
SELECT 'Start running: 5K', 'From zero to 5 km in 8 weeks, alternating running and walking. Each week stretches the running time a little; repeat a week if you need to. Check with a doctor before you start. Adjust to how you feel.', 'endurance', 'beginner', 3, false, '[{"name":"W1 · Session 1","week":1,"exercises":[],"cardio":{"sport":"run","durationMin":34,"intensity":"Zone 2","purpose":"Start gently: your body gets used to the impact of running.","steps":["Warm-up: 5 min brisk walk","8 × (1 min run, 2 min walk)","Cool-down: 5 min walk, then calf stretches"],"notes":"Run slowly: if you cannot talk, slow down."}},{"name":"W1 · Session 2","week":1,"exercises":[],"cardio":{"sport":"run","durationMin":34,"intensity":"Zone 2","purpose":"Start gently: your body gets used to the impact of running.","steps":["Warm-up: 5 min brisk walk","8 × (1 min run, 2 min walk)","Cool-down: 5 min walk, then calf stretches"],"notes":"Run slowly: if you cannot talk, slow down."}},{"name":"W1 · Session 3","week":1,"exercises":[],"cardio":{"sport":"run","durationMin":34,"intensity":"Zone 2","purpose":"Start gently: your body gets used to the impact of running.","steps":["Warm-up: 5 min brisk walk","8 × (1 min run, 2 min walk)","Cool-down: 5 min walk, then calf stretches"],"notes":"If this session felt too hard, repeat the week before moving on."}},{"name":"W2 · Session 1","week":2,"exercises":[],"cardio":{"sport":"run","durationMin":34,"intensity":"Zone 2","purpose":"Stretch the running time a little.","steps":["Warm-up: 5 min brisk walk","6 × (2 min run, 2 min walk)","Cool-down: 5 min walk, then calf stretches"],"notes":"Run slowly: if you cannot talk, slow down."}},{"name":"W2 · Session 2","week":2,"exercises":[],"cardio":{"sport":"run","durationMin":34,"intensity":"Zone 2","purpose":"Stretch the running time a little.","steps":["Warm-up: 5 min brisk walk","6 × (2 min run, 2 min walk)","Cool-down: 5 min walk, then calf stretches"],"notes":"Run slowly: if you cannot talk, slow down."}},{"name":"W2 · Session 3","week":2,"exercises":[],"cardio":{"sport":"run","durationMin":34,"intensity":"Zone 2","purpose":"Stretch the running time a little.","steps":["Warm-up: 5 min brisk walk","6 × (2 min run, 2 min walk)","Cool-down: 5 min walk, then calf stretches"],"notes":"If this session felt too hard, repeat the week before moving on."}},{"name":"W3 · Session 1","week":3,"exercises":[],"cardio":{"sport":"run","durationMin":35,"intensity":"Zone 2","purpose":"Your breathing settles: running 3 minutes starts to feel natural.","steps":["Warm-up: 5 min brisk walk","5 × (3 min run, 2 min walk)","Cool-down: 5 min walk, then calf stretches"],"notes":"Run slowly: if you cannot talk, slow down."}},{"name":"W3 · Session 2","week":3,"exercises":[],"cardio":{"sport":"run","durationMin":35,"intensity":"Zone 2","purpose":"Your breathing settles: running 3 minutes starts to feel natural.","steps":["Warm-up: 5 min brisk walk","5 × (3 min run, 2 min walk)","Cool-down: 5 min walk, then calf stretches"],"notes":"Run slowly: if you cannot talk, slow down."}},{"name":"W3 · Session 3","week":3,"exercises":[],"cardio":{"sport":"run","durationMin":35,"intensity":"Zone 2","purpose":"Your breathing settles: running 3 minutes starts to feel natural.","steps":["Warm-up: 5 min brisk walk","5 × (3 min run, 2 min walk)","Cool-down: 5 min walk, then calf stretches"],"notes":"If this session felt too hard, repeat the week before moving on."}},{"name":"W4 · Session 1","week":4,"exercises":[],"cardio":{"sport":"run","durationMin":36,"intensity":"Zone 2","purpose":"First real milestone: 5 minutes without stopping.","steps":["Warm-up: 5 min brisk walk","4 × (5 min run, 1 min 30 walk)","Cool-down: 5 min walk, then calf stretches"],"notes":"Run slowly: if you cannot talk, slow down."}},{"name":"W4 · Session 2","week":4,"exercises":[],"cardio":{"sport":"run","durationMin":36,"intensity":"Zone 2","purpose":"First real milestone: 5 minutes without stopping.","steps":["Warm-up: 5 min brisk walk","4 × (5 min run, 1 min 30 walk)","Cool-down: 5 min walk, then calf stretches"],"notes":"Run slowly: if you cannot talk, slow down."}},{"name":"W4 · Session 3","week":4,"exercises":[],"cardio":{"sport":"run","durationMin":36,"intensity":"Zone 2","purpose":"First real milestone: 5 minutes without stopping.","steps":["Warm-up: 5 min brisk walk","4 × (5 min run, 1 min 30 walk)","Cool-down: 5 min walk, then calf stretches"],"notes":"If this session felt too hard, repeat the week before moving on."}},{"name":"W5 · Session 1","week":5,"exercises":[],"cardio":{"sport":"run","durationMin":37,"intensity":"Zone 2","purpose":"Longer blocks, shorter breaks.","steps":["Warm-up: 5 min brisk walk","3 × (8 min run, 1 min 30 walk)","Cool-down: 5 min walk, then calf stretches"],"notes":"Run slowly: if you cannot talk, slow down."}},{"name":"W5 · Session 2","week":5,"exercises":[],"cardio":{"sport":"run","durationMin":37,"intensity":"Zone 2","purpose":"Longer blocks, shorter breaks.","steps":["Warm-up: 5 min brisk walk","3 × (8 min run, 1 min 30 walk)","Cool-down: 5 min walk, then calf stretches"],"notes":"Run slowly: if you cannot talk, slow down."}},{"name":"W5 · Session 3","week":5,"exercises":[],"cardio":{"sport":"run","durationMin":37,"intensity":"Zone 2","purpose":"Longer blocks, shorter breaks.","steps":["Warm-up: 5 min brisk walk","3 × (8 min run, 1 min 30 walk)","Cool-down: 5 min walk, then calf stretches"],"notes":"If this session felt too hard, repeat the week before moving on."}},{"name":"W6 · Session 1","week":6,"exercises":[],"cardio":{"sport":"run","durationMin":38,"intensity":"Zone 2","purpose":"Just two blocks: you are running almost 25 minutes.","steps":["Warm-up: 5 min brisk walk","2 × (12 min run, 1 min 30 walk)","Cool-down: 5 min walk, then calf stretches"],"notes":"Run slowly: if you cannot talk, slow down."}},{"name":"W6 · Session 2","week":6,"exercises":[],"cardio":{"sport":"run","durationMin":38,"intensity":"Zone 2","purpose":"Just two blocks: you are running almost 25 minutes.","steps":["Warm-up: 5 min brisk walk","2 × (12 min run, 1 min 30 walk)","Cool-down: 5 min walk, then calf stretches"],"notes":"Run slowly: if you cannot talk, slow down."}},{"name":"W6 · Session 3","week":6,"exercises":[],"cardio":{"sport":"run","durationMin":38,"intensity":"Zone 2","purpose":"Just two blocks: you are running almost 25 minutes.","steps":["Warm-up: 5 min brisk walk","2 × (12 min run, 1 min 30 walk)","Cool-down: 5 min walk, then calf stretches"],"notes":"If this session felt too hard, repeat the week before moving on."}},{"name":"W7 · Session 1","week":7,"exercises":[],"cardio":{"sport":"run","durationMin":40,"intensity":"Zone 2","purpose":"The big leap: 25 minutes non-stop.","steps":["Warm-up: 5 min brisk walk","25 min run without stopping","Cool-down: 5 min walk, then calf stretches"],"notes":"Run slowly: if you cannot talk, slow down."}},{"name":"W7 · Session 2","week":7,"exercises":[],"cardio":{"sport":"run","durationMin":40,"intensity":"Zone 2","purpose":"The big leap: 25 minutes non-stop.","steps":["Warm-up: 5 min brisk walk","25 min run without stopping","Cool-down: 5 min walk, then calf stretches"],"notes":"Run slowly: if you cannot talk, slow down."}},{"name":"W7 · Session 3","week":7,"exercises":[],"cardio":{"sport":"run","durationMin":40,"intensity":"Zone 2","purpose":"The big leap: 25 minutes non-stop.","steps":["Warm-up: 5 min brisk walk","25 min run without stopping","Cool-down: 5 min walk, then calf stretches"],"notes":"If this session felt too hard, repeat the week before moving on."}},{"name":"W8 · Session 1","week":8,"exercises":[],"cardio":{"sport":"run","durationMin":35,"intensity":"Zone 2","purpose":"Confirm it: 25 minutes of running, this time with more ease.","steps":["5 min brisk walk","25 min continuous run","5 min walk"]}},{"name":"W8 · Session 2","week":8,"exercises":[],"cardio":{"sport":"run","durationMin":25,"intensity":"Zone 2","purpose":"A short session so you arrive fresh.","steps":["5 min brisk walk","15 min easy run","5 min walk"]}},{"name":"W8 · 5K goal","week":8,"exercises":[],"cardio":{"sport":"run","distanceKm":5,"intensity":"Race","purpose":"Your first 5K: the goal is to finish, not the time.","steps":["5 min brisk walk and 2 min jog","First kilometre slower than you think","From the 4th km, speed up if you feel good"],"notes":"Well done, you are a runner!"}}]'::jsonb, true, 230, 'en'
WHERE NOT EXISTS (SELECT 1 FROM program_templates WHERE name = 'Start running: 5K' AND locale = 'en');

INSERT INTO program_templates (name, description, goal, level, days_per_week, home_friendly, structure, is_published, sort_order, locale)
SELECT 'Swimming endurance', 'For swimmers who can already swim 200 m of freestyle. Each week: a technique session with a new drill, a sets session and an endurance session. Lighter week 4, then a 400 m test and a continuous 1500 m in week 8. Check with a doctor before you start. Adjust to how you feel.', 'endurance', 'intermediate', 3, false, '[{"name":"W1 · Technique","week":1,"exercises":[],"cardio":{"sport":"swim","distanceKm":1.5,"intensity":"Zone 2","purpose":"Swim better before swimming more: a better glide is free speed.","steps":["Warm-up: 200 m easy freestyle, 100 m backstroke","Drill: 4 × 50 m catch-up (one hand waits for the other in front), 15 s rest","4 × 50 m kick with a board, 20 s rest","5 × 100 m full stroke applying the drill, 20 s rest","200 m with a pull buoy, focusing on the pull","Cool-down: 100 m backstroke or breaststroke, very easy"]}},{"name":"W1 · Sets","week":1,"exercises":[],"cardio":{"sport":"swim","distanceKm":1,"intensity":"Zone 4","purpose":"Get used to swimming fast with little rest.","steps":["Warm-up: 200 m easy freestyle, 4 × 25 m building speed","4 × 25 m fast, 30 s rest","8 × 50 m strong, 20 s rest","Cool-down: 200 m very easy, mixing strokes"]}},{"name":"W1 · Endurance","week":1,"exercises":[],"cardio":{"sport":"swim","distanceKm":0.9,"intensity":"Zone 2","purpose":"Keep going without stopping, at a pace you could hold for longer.","steps":["Warm-up: 200 m mixing strokes","600 m continuous, steady swimming, breathing every 3 strokes if you can","Cool-down: 100 m backstroke"]}},{"name":"W2 · Technique","week":2,"exercises":[],"cardio":{"sport":"swim","distanceKm":1.6,"intensity":"Zone 2","purpose":"Swim better before swimming more: a better glide is free speed.","steps":["Warm-up: 200 m easy freestyle, 100 m backstroke","Drill: 4 × 50 m closed fists (feel the forearm pull), 15 s rest","4 × 50 m kick with a board, 20 s rest","6 × 100 m full stroke applying the drill, 20 s rest","200 m with a pull buoy, focusing on the pull","Cool-down: 100 m backstroke or breaststroke, very easy"]}},{"name":"W2 · Sets","week":2,"exercises":[],"cardio":{"sport":"swim","distanceKm":1.2,"intensity":"Zone 4","purpose":"Get used to swimming fast with little rest.","steps":["Warm-up: 200 m easy freestyle, 4 × 25 m building speed","4 × 25 m fast, 30 s rest","6 × 100 m strong, 20 s rest","Cool-down: 200 m very easy, mixing strokes"]}},{"name":"W2 · Endurance","week":2,"exercises":[],"cardio":{"sport":"swim","distanceKm":1.1,"intensity":"Zone 2","purpose":"Keep going without stopping, at a pace you could hold for longer.","steps":["Warm-up: 200 m mixing strokes","800 m continuous, steady swimming, breathing every 3 strokes if you can","Cool-down: 100 m backstroke"]}},{"name":"W3 · Technique","week":3,"exercises":[],"cardio":{"sport":"swim","distanceKm":1.7,"intensity":"Zone 2","purpose":"Swim better before swimming more: a better glide is free speed.","steps":["Warm-up: 200 m easy freestyle, 100 m backstroke","Drill: 4 × 50 m 6 kicks on your side, then 1 stroke, 15 s rest","4 × 50 m kick with a board, 20 s rest","7 × 100 m full stroke applying the drill, 20 s rest","200 m with a pull buoy, focusing on the pull","Cool-down: 100 m backstroke or breaststroke, very easy"]}},{"name":"W3 · Sets","week":3,"exercises":[],"cardio":{"sport":"swim","distanceKm":1.4,"intensity":"Zone 4","purpose":"Get used to swimming fast with little rest.","steps":["Warm-up: 200 m easy freestyle, 4 × 25 m building speed","4 × 25 m fast, 30 s rest","Pyramid 50-100-150-200-150-100-50 m strong, 20 s rest","Cool-down: 200 m very easy, mixing strokes"]}},{"name":"W3 · Endurance","week":3,"exercises":[],"cardio":{"sport":"swim","distanceKm":1.3,"intensity":"Zone 2","purpose":"Keep going without stopping, at a pace you could hold for longer.","steps":["Warm-up: 200 m mixing strokes","1000 m continuous, steady swimming, breathing every 3 strokes if you can","Cool-down: 100 m backstroke"]}},{"name":"W4 · Technique","week":4,"exercises":[],"cardio":{"sport":"swim","distanceKm":1.4,"intensity":"Zone 2","purpose":"Swim better before swimming more: a better glide is free speed.","steps":["Warm-up: 200 m easy freestyle, 100 m backstroke","Drill: 4 × 50 m breathing every 3 strokes, 15 s rest","4 × 50 m kick with a board, 20 s rest","4 × 100 m full stroke applying the drill, 20 s rest","200 m with a pull buoy, focusing on the pull","Cool-down: 100 m backstroke or breaststroke, very easy"]}},{"name":"W4 · Sets","week":4,"exercises":[],"cardio":{"sport":"swim","distanceKm":0.9,"intensity":"Zone 2","purpose":"Get used to swimming fast with little rest.","steps":["Warm-up: 200 m easy freestyle, 4 × 25 m building speed","4 × 25 m fast, 30 s rest","6 × 50 m relaxed, 20 s rest","Cool-down: 200 m very easy, mixing strokes"]}},{"name":"W4 · Endurance","week":4,"exercises":[],"cardio":{"sport":"swim","distanceKm":0.9,"intensity":"Zone 2","purpose":"Keep going without stopping, at a pace you could hold for longer.","steps":["Warm-up: 200 m mixing strokes","600 m continuous, steady swimming, breathing every 3 strokes if you can","Cool-down: 100 m backstroke"]}},{"name":"W5 · Technique","week":5,"exercises":[],"cardio":{"sport":"swim","distanceKm":1.9,"intensity":"Zone 2","purpose":"Swim better before swimming more: a better glide is free speed.","steps":["Warm-up: 200 m easy freestyle, 100 m backstroke","Drill: 4 × 50 m front sculling (hands in front, small movements), 15 s rest","4 × 50 m kick with a board, 20 s rest","9 × 100 m full stroke applying the drill, 20 s rest","200 m with a pull buoy, focusing on the pull","Cool-down: 100 m backstroke or breaststroke, very easy"]}},{"name":"W5 · Sets","week":5,"exercises":[],"cardio":{"sport":"swim","distanceKm":1.4,"intensity":"Zone 4","purpose":"Get used to swimming fast with little rest.","steps":["Warm-up: 200 m easy freestyle, 4 × 25 m building speed","4 × 25 m fast, 30 s rest","8 × 100 m at threshold pace, 15 s rest","Cool-down: 200 m very easy, mixing strokes"]}},{"name":"W5 · Endurance","week":5,"exercises":[],"cardio":{"sport":"swim","distanceKm":1.5,"intensity":"Zone 2","purpose":"Keep going without stopping, at a pace you could hold for longer.","steps":["Warm-up: 200 m mixing strokes","1200 m continuous, steady swimming, breathing every 3 strokes if you can","Cool-down: 100 m backstroke"],"notes":"If you have to stop, start again after 20 s at the wall: the distance is what counts."}},{"name":"W6 · Technique","week":6,"exercises":[],"cardio":{"sport":"swim","distanceKm":2,"intensity":"Zone 2","purpose":"Swim better before swimming more: a better glide is free speed.","steps":["Warm-up: 200 m easy freestyle, 100 m backstroke","Drill: 4 × 50 m single arm (the other along your side), 15 s rest","4 × 50 m kick with a board, 20 s rest","10 × 100 m full stroke applying the drill, 20 s rest","200 m with a pull buoy, focusing on the pull","Cool-down: 100 m backstroke or breaststroke, very easy"]}},{"name":"W6 · Sets","week":6,"exercises":[],"cardio":{"sport":"swim","distanceKm":1.4,"intensity":"Zone 4","purpose":"Get used to swimming fast with little rest.","steps":["Warm-up: 200 m easy freestyle, 4 × 25 m building speed","4 × 25 m fast, 30 s rest","4 × 200 m at threshold pace, 30 s rest","Cool-down: 200 m very easy, mixing strokes"]}},{"name":"W6 · Endurance","week":6,"exercises":[],"cardio":{"sport":"swim","distanceKm":1.8,"intensity":"Zone 2","purpose":"Keep going without stopping, at a pace you could hold for longer.","steps":["Warm-up: 200 m mixing strokes","1500 m continuous, steady swimming, breathing every 3 strokes if you can","Cool-down: 100 m backstroke"],"notes":"If you have to stop, start again after 20 s at the wall: the distance is what counts."}},{"name":"W7 · Technique","week":7,"exercises":[],"cardio":{"sport":"swim","distanceKm":2,"intensity":"Zone 2","purpose":"Swim better before swimming more: a better glide is free speed.","steps":["Warm-up: 200 m easy freestyle, 100 m backstroke","Drill: 4 × 50 m catch-up, counting your strokes per length, 15 s rest","4 × 50 m kick with a board, 20 s rest","10 × 100 m full stroke applying the drill, 20 s rest","200 m with a pull buoy, focusing on the pull","Cool-down: 100 m backstroke or breaststroke, very easy"]}},{"name":"W7 · Sets","week":7,"exercises":[],"cardio":{"sport":"swim","distanceKm":1.6,"intensity":"Zone 4","purpose":"Get used to swimming fast with little rest.","steps":["Warm-up: 200 m easy freestyle, 4 × 25 m building speed","4 × 25 m fast, 30 s rest","10 × 100 m at threshold pace, 15 s rest","Cool-down: 200 m very easy, mixing strokes"]}},{"name":"W7 · Endurance","week":7,"exercises":[],"cardio":{"sport":"swim","distanceKm":2.1,"intensity":"Zone 2","purpose":"Keep going without stopping, at a pace you could hold for longer.","steps":["Warm-up: 200 m mixing strokes","1800 m continuous, steady swimming, breathing every 3 strokes if you can","Cool-down: 100 m backstroke"],"notes":"If you have to stop, start again after 20 s at the wall: the distance is what counts."}},{"name":"W8 · Technique","week":8,"exercises":[],"cardio":{"sport":"swim","distanceKm":2,"intensity":"Zone 2","purpose":"Swim better before swimming more: a better glide is free speed.","steps":["Warm-up: 200 m easy freestyle, 100 m backstroke","Drill: 4 × 50 m full stroke, aiming for one fewer stroke per length, 15 s rest","4 × 50 m kick with a board, 20 s rest","10 × 100 m full stroke applying the drill, 20 s rest","200 m with a pull buoy, focusing on the pull","Cool-down: 100 m backstroke or breaststroke, very easy"]}},{"name":"W8 · Test","week":8,"exercises":[],"cardio":{"sport":"swim","distanceKm":1,"intensity":"Zone 4","purpose":"Measure your progress: compare this 400 m with the one you will swim in a few months.","steps":["Warm-up: 200 m easy freestyle, 4 × 25 m building speed","4 × 25 m fast, 30 s rest","Test: 400 m timed, note your time","Cool-down: 200 m very easy, mixing strokes"]}},{"name":"W8 · 1500 m goal","week":8,"exercises":[],"cardio":{"sport":"swim","distanceKm":1.8,"intensity":"Zone 2","purpose":"The aim of the plan: 1500 m without stopping.","steps":["Warm-up: 200 m mixing strokes","1500 m continuous, steady swimming, breathing every 3 strokes if you can","Cool-down: 100 m backstroke"],"notes":"If you have to stop, start again after 20 s at the wall: the distance is what counts."}}]'::jsonb, true, 240, 'en'
WHERE NOT EXISTS (SELECT 1 FROM program_templates WHERE name = 'Swimming endurance' AND locale = 'en');

INSERT INTO program_templates (name, description, goal, level, days_per_week, home_friendly, structure, is_published, sort_order, locale)
SELECT 'Cycling endurance', 'Three rides a week: cadence work, intervals progressing from sweet spot to power, and a long ride up to 2 h 30. Lighter week 4. Works on a home trainer too. Check with a doctor before you start. Adjust to how you feel.', 'endurance', 'intermediate', 3, false, '[{"name":"W1 · Cadence","week":1,"exercises":[],"cardio":{"sport":"bike","durationMin":48,"intensity":"Zone 2","purpose":"Pedal rounder and smoother to save your legs on long rides.","steps":["10 min very easy, small gear","5 × 1 min at high cadence (100-110 rpm) without pushing, 2 min normal between each","The rest in Zone 2, cadence around 90 rpm","5 min very easy to finish"]}},{"name":"W1 · Intervals","week":1,"exercises":[],"cardio":{"sport":"bike","durationMin":61,"intensity":"Zone 3","purpose":"The sweet spot: plenty of benefit for reasonable fatigue.","steps":["Warm-up: 15 min progressive, including 3 × 15 s accelerations","3 × 8 min in Zone 3-4, 4 min recovery","Cool-down: 10 min very easy"],"notes":"On a home trainer this session is ideal: no traffic lights or descents to break the effort."}},{"name":"W1 · Long ride","week":1,"exercises":[],"cardio":{"sport":"bike","durationMin":60,"intensity":"Zone 2","purpose":"Build your endurance: the base for everything else.","steps":["15 min very easy warm-up","Steady Zone 2: on climbs, stay seated and shift to an easier gear","10 min very easy to finish"],"notes":"One bottle is enough; take a bar just in case."}},{"name":"W2 · Cadence","week":2,"exercises":[],"cardio":{"sport":"bike","durationMin":51,"intensity":"Zone 2","purpose":"Pedal rounder and smoother to save your legs on long rides.","steps":["10 min very easy, small gear","6 × 1 min at high cadence (100-110 rpm) without pushing, 2 min normal between each","The rest in Zone 2, cadence around 90 rpm","5 min very easy to finish"]}},{"name":"W2 · Intervals","week":2,"exercises":[],"cardio":{"sport":"bike","durationMin":67,"intensity":"Zone 3","purpose":"Longer blocks to hold a strong pace for longer.","steps":["Warm-up: 15 min progressive, including 3 × 15 s accelerations","3 × 10 min in Zone 3-4, 4 min recovery","Cool-down: 10 min very easy"],"notes":"On a home trainer this session is ideal: no traffic lights or descents to break the effort."}},{"name":"W2 · Long ride","week":2,"exercises":[],"cardio":{"sport":"bike","durationMin":75,"intensity":"Zone 2","purpose":"Build your endurance: the base for everything else.","steps":["15 min very easy warm-up","Steady Zone 2: on climbs, stay seated and shift to an easier gear","10 min very easy to finish"],"notes":"One bottle is enough; take a bar just in case."}},{"name":"W3 · Cadence","week":3,"exercises":[],"cardio":{"sport":"bike","durationMin":54,"intensity":"Zone 2","purpose":"Pedal rounder and smoother to save your legs on long rides.","steps":["10 min very easy, small gear","8 × 1 min at high cadence (100-110 rpm) without pushing, 2 min normal between each","The rest in Zone 2, cadence around 90 rpm","5 min very easy to finish"]}},{"name":"W3 · Intervals","week":3,"exercises":[],"cardio":{"sport":"bike","durationMin":60,"intensity":"Zone 4","purpose":"Threshold work: the effort that improves cycling the most.","steps":["Warm-up: 15 min progressive, including 3 × 15 s accelerations","2 × 15 min in Zone 4, 5 min recovery","Cool-down: 10 min very easy"],"notes":"On a home trainer this session is ideal: no traffic lights or descents to break the effort."}},{"name":"W3 · Long ride","week":3,"exercises":[],"cardio":{"sport":"bike","durationMin":90,"intensity":"Zone 2","purpose":"Build your endurance: the base for everything else.","steps":["15 min very easy warm-up","Steady Zone 2: on climbs, stay seated and shift to an easier gear","10 min very easy to finish"],"notes":"Drink every 15 min and eat every 30 to 40 min from the first hour."}},{"name":"W4 · Cadence","week":4,"exercises":[],"cardio":{"sport":"bike","durationMin":40,"intensity":"Zone 2","purpose":"Pedal rounder and smoother to save your legs on long rides.","steps":["10 min very easy, small gear","4 × 1 min at high cadence (100-110 rpm) without pushing, 2 min normal between each","The rest in Zone 2, cadence around 90 rpm","5 min very easy to finish"]}},{"name":"W4 · Intervals","week":4,"exercises":[],"cardio":{"sport":"bike","durationMin":37,"intensity":"Zone 3","purpose":"Lighter week: a little rhythm, no fatigue.","steps":["Warm-up: 15 min progressive, including 3 × 15 s accelerations","4 × 1 min brisk, 2 min recovery","Cool-down: 10 min very easy"],"notes":"On a home trainer this session is ideal: no traffic lights or descents to break the effort."}},{"name":"W4 · Long ride","week":4,"exercises":[],"cardio":{"sport":"bike","durationMin":60,"intensity":"Zone 2","purpose":"Build your endurance: the base for everything else.","steps":["15 min very easy warm-up","Steady Zone 2: on climbs, stay seated and shift to an easier gear","10 min very easy to finish"],"notes":"One bottle is enough; take a bar just in case."}},{"name":"W5 · Cadence","week":5,"exercises":[],"cardio":{"sport":"bike","durationMin":60,"intensity":"Zone 2","purpose":"Pedal rounder and smoother to save your legs on long rides.","steps":["10 min very easy, small gear","8 × 1 min at high cadence (100-110 rpm) without pushing, 2 min normal between each","The rest in Zone 2, cadence around 90 rpm","5 min very easy to finish"]}},{"name":"W5 · Intervals","week":5,"exercises":[],"cardio":{"sport":"bike","durationMin":55,"intensity":"Zone 5","purpose":"Build power for climbs and accelerations.","steps":["Warm-up: 15 min progressive, including 3 × 15 s accelerations","5 × 3 min in Zone 5, 3 min recovery","Cool-down: 10 min very easy"],"notes":"On a home trainer this session is ideal: no traffic lights or descents to break the effort."}},{"name":"W5 · Long ride","week":5,"exercises":[],"cardio":{"sport":"bike","durationMin":105,"intensity":"Zone 2","purpose":"Build your endurance: the base for everything else.","steps":["15 min very easy warm-up","Zone 2, with 2 × 10 min in Zone 3 in the last hour","10 min very easy to finish"],"notes":"Drink every 15 min and eat every 30 to 40 min from the first hour."}},{"name":"W6 · Cadence","week":6,"exercises":[],"cardio":{"sport":"bike","durationMin":60,"intensity":"Zone 2","purpose":"Pedal rounder and smoother to save your legs on long rides.","steps":["10 min very easy, small gear","10 × 1 min at high cadence (100-110 rpm) without pushing, 2 min normal between each","The rest in Zone 2, cadence around 90 rpm","5 min very easy to finish"]}},{"name":"W6 · Intervals","week":6,"exercises":[],"cardio":{"sport":"bike","durationMin":70,"intensity":"Zone 4","purpose":"Two long threshold blocks: the toughest session of the plan.","steps":["Warm-up: 15 min progressive, including 3 × 15 s accelerations","2 × 20 min in Zone 4, 5 min recovery","Cool-down: 10 min very easy"],"notes":"On a home trainer this session is ideal: no traffic lights or descents to break the effort."}},{"name":"W6 · Long ride","week":6,"exercises":[],"cardio":{"sport":"bike","durationMin":120,"intensity":"Zone 2","purpose":"Build your endurance: the base for everything else.","steps":["15 min very easy warm-up","Zone 2, with 2 × 10 min in Zone 3 in the last hour","10 min very easy to finish"],"notes":"Drink every 15 min and eat every 30 to 40 min from the first hour."}},{"name":"W7 · Cadence","week":7,"exercises":[],"cardio":{"sport":"bike","durationMin":60,"intensity":"Zone 2","purpose":"Pedal rounder and smoother to save your legs on long rides.","steps":["10 min very easy, small gear","10 × 1 min at high cadence (100-110 rpm) without pushing, 2 min normal between each","The rest in Zone 2, cadence around 90 rpm","5 min very easy to finish"]}},{"name":"W7 · Intervals","week":7,"exercises":[],"cardio":{"sport":"bike","durationMin":61,"intensity":"Zone 5","purpose":"Last hard block before easing off.","steps":["Warm-up: 15 min progressive, including 3 × 15 s accelerations","6 × 3 min in Zone 5, 3 min recovery","Cool-down: 10 min very easy"],"notes":"On a home trainer this session is ideal: no traffic lights or descents to break the effort."}},{"name":"W7 · Long ride","week":7,"exercises":[],"cardio":{"sport":"bike","durationMin":135,"intensity":"Zone 2","purpose":"Build your endurance: the base for everything else.","steps":["15 min very easy warm-up","Zone 2, with 2 × 10 min in Zone 3 in the last hour","10 min very easy to finish"],"notes":"Drink every 15 min and eat every 30 to 40 min from the first hour."}},{"name":"W8 · Cadence","week":8,"exercises":[],"cardio":{"sport":"bike","durationMin":40,"intensity":"Zone 2","purpose":"Pedal rounder and smoother to save your legs on long rides.","steps":["10 min very easy, small gear","4 × 1 min at high cadence (100-110 rpm) without pushing, 2 min normal between each","The rest in Zone 2, cadence around 90 rpm","5 min very easy to finish"]}},{"name":"W8 · Intervals","week":8,"exercises":[],"cardio":{"sport":"bike","durationMin":49,"intensity":"Zone 4","purpose":"Stay sharp before the goal ride.","steps":["Warm-up: 15 min progressive, including 3 × 15 s accelerations","3 × 5 min in Zone 4, 3 min recovery","Cool-down: 10 min very easy"],"notes":"On a home trainer this session is ideal: no traffic lights or descents to break the effort."}},{"name":"W8 · Goal ride","week":8,"exercises":[],"cardio":{"sport":"bike","durationMin":150,"intensity":"Zone 2","purpose":"The 2 h 30 ride you are aiming for: steady and well fuelled.","steps":["15 min very easy warm-up","Steady Zone 2: on climbs, stay seated and shift to an easier gear","10 min very easy to finish"],"notes":"Drink every 15 min and eat every 30 to 40 min from the first hour."}}]'::jsonb, true, 250, 'en'
WHERE NOT EXISTS (SELECT 1 FROM program_templates WHERE name = 'Cycling endurance' AND locale = 'en');

INSERT INTO program_templates (name, description, goal, level, days_per_week, home_friendly, structure, is_published, sort_order, locale)
SELECT 'Strength for runners', 'Hips, calves and core: two short sessions to run stronger.', 'endurance', 'beginner', 2, true, '[{"name":"Strength A","exercises":[{"exerciseName":"Bulgarian Split Squat","targetSets":3,"targetReps":"8-10","restSec":90},{"exerciseName":"Single-Leg Calf Raise","targetSets":3,"targetReps":"12-15","restSec":60},{"exerciseName":"Glute Bridge","targetSets":3,"targetReps":"12-15","restSec":60},{"exerciseName":"Side Plank","targetSets":3,"targetReps":"30-45s","restSec":60}]},{"name":"Strength B","exercises":[{"exerciseName":"Single-Leg Romanian Deadlift","targetSets":3,"targetReps":"8-10","restSec":90},{"exerciseName":"Step-up","targetSets":3,"targetReps":"10-12","restSec":60},{"exerciseName":"Dead Bug","targetSets":3,"targetReps":"10-12","restSec":60},{"exerciseName":"Plank","targetSets":3,"targetReps":"45-60s","restSec":60}]}]'::jsonb, true, 260, 'en'
WHERE NOT EXISTS (SELECT 1 FROM program_templates WHERE name = 'Strength for runners' AND locale = 'en');

INSERT INTO program_templates (name, description, goal, level, days_per_week, home_friendly, structure, is_published, sort_order, locale)
SELECT 'Strength for trail', 'Leg strength and stability to handle the climbs and descents.', 'endurance', 'intermediate', 2, false, '[{"name":"Climbs","exercises":[{"exerciseName":"Back Squat","targetSets":4,"targetReps":"6-8","restSec":150},{"exerciseName":"Step-up","targetSets":3,"targetReps":"10-12","restSec":90},{"exerciseName":"Single-Leg Calf Raise","targetSets":3,"targetReps":"15-20","restSec":60},{"exerciseName":"Side Plank","targetSets":3,"targetReps":"45-60s","restSec":60}]},{"name":"Descents","exercises":[{"exerciseName":"Walking Lunge","targetSets":4,"targetReps":"10-12","restSec":90},{"exerciseName":"Single-Leg Romanian Deadlift","targetSets":3,"targetReps":"8-10","restSec":90},{"exerciseName":"Leg Curl","targetSets":3,"targetReps":"10-12","restSec":60},{"exerciseName":"Bird Dog","targetSets":3,"targetReps":"10-12","restSec":60}]}]'::jsonb, true, 270, 'en'
WHERE NOT EXISTS (SELECT 1 FROM program_templates WHERE name = 'Strength for trail' AND locale = 'en');

INSERT INTO program_templates (name, description, goal, level, days_per_week, home_friendly, structure, is_published, sort_order, locale)
SELECT 'Strength for swimmers', 'Back, shoulders and core for a more powerful stroke and protected shoulders.', 'endurance', 'intermediate', 2, false, '[{"name":"Pull","exercises":[{"exerciseName":"Lat Pulldown","targetSets":4,"targetReps":"8-10","restSec":90},{"exerciseName":"Straight-Arm Pulldown","targetSets":3,"targetReps":"12-15","restSec":60},{"exerciseName":"Seated Cable Row","targetSets":3,"targetReps":"10-12","restSec":90},{"exerciseName":"External Shoulder Rotation","targetSets":3,"targetReps":"15-20","restSec":60}]},{"name":"Core","exercises":[{"exerciseName":"Pull-up","targetSets":3,"targetReps":"5-8","restSec":120},{"exerciseName":"Face Pull","targetSets":3,"targetReps":"15-20","restSec":60},{"exerciseName":"Dead Bug","targetSets":3,"targetReps":"10-12","restSec":60},{"exerciseName":"Side Plank","targetSets":3,"targetReps":"30-45s","restSec":60}]}]'::jsonb, true, 280, 'en'
WHERE NOT EXISTS (SELECT 1 FROM program_templates WHERE name = 'Strength for swimmers' AND locale = 'en');

INSERT INTO program_templates (name, description, goal, level, days_per_week, home_friendly, structure, is_published, sort_order, locale)
SELECT 'Strength for cyclists', 'Legs, glutes and lower back, to hold your position and accelerate harder.', 'endurance', 'intermediate', 2, false, '[{"name":"Strength","exercises":[{"exerciseName":"Back Squat","targetSets":4,"targetReps":"6-8","restSec":150},{"exerciseName":"Hip Thrust","targetSets":3,"targetReps":"8-10","restSec":90},{"exerciseName":"Standing Calf Raise","targetSets":3,"targetReps":"12-15","restSec":60}]},{"name":"Stability","exercises":[{"exerciseName":"Bulgarian Split Squat","targetSets":3,"targetReps":"8-10","restSec":90},{"exerciseName":"Romanian Deadlift","targetSets":3,"targetReps":"8-10","restSec":90},{"exerciseName":"Bird Dog","targetSets":3,"targetReps":"10-12","restSec":60},{"exerciseName":"Plank","targetSets":3,"targetReps":"45-60s","restSec":60}]}]'::jsonb, true, 290, 'en'
WHERE NOT EXISTS (SELECT 1 FROM program_templates WHERE name = 'Strength for cyclists' AND locale = 'en');

-- German
INSERT INTO program_templates (name, description, goal, level, days_per_week, home_friendly, structure, is_published, sort_order, locale)
SELECT 'Marathon in 16 Wochen', 'Für alle, die 10 km mühelos laufen und einen Marathon anpeilen. Vier Läufe pro Woche in vier Phasen: Grundlage, Aufbau, Marathontempo, Tapering. Langer Lauf bis 32 km. Vor dem Start ärztlichen Rat einholen. Nach Gefühl anpassen.', 'endurance', 'intermediate', 4, false, '[{"name":"W1 · Lockerer Lauf","week":1,"exercises":[],"cardio":{"sport":"run","distanceKm":7,"intensity":"Zone 2","purpose":"Die Grundlagenausdauer aufbauen, ohne Müdigkeit anzuhäufen.","steps":["5 min sehr langsam traben zum Einstieg","Gleichmäßiger Dauerlauf in angenehmem Tempo: Sie sollten in ganzen Sätzen sprechen können","Waden und Oberschenkelrückseite sanft dehnen"]}},{"name":"W1 · Bergläufe","week":1,"exercises":[],"cardio":{"sport":"run","distanceKm":6,"intensity":"Zone 4","purpose":"Beine und Laufschritt kräftigen, ohne die Härte von Intervallen in der Ebene.","steps":["Aufwärmen: 15 min sehr locker traben, dann 4 Lauf-ABC-Übungen (Kniehebelauf, Anfersen) über 20 m","6 × 45 s bergauf in zügigem Tempo, locker zurücktraben","Auslaufen: 10 min sehr langsam traben, dann sanft dehnen"]}},{"name":"W1 · Regeneration","week":1,"exercises":[],"cardio":{"sport":"run","distanceKm":5,"intensity":"Zone 1","purpose":"Die Durchblutung anregen, um besser zu regenerieren, ohne zusätzliche Ermüdung.","steps":["Sehr langsam traben, wenn möglich auf weichem Boden","5 min gehen, dann Hüft- und Sprunggelenksmobilisation"]}},{"name":"W1 · Langer Lauf","week":1,"exercises":[],"cardio":{"sport":"run","distanceKm":12,"intensity":"Zone 2","purpose":"Den Körper an lange Belastung gewöhnen: die wichtigste Einheit der Woche.","steps":["Die ersten 10 Minuten ganz ruhig","Gleichmäßig in Zone 2 bis zum Ende, an Steigungen notfalls gehen","Zum Abschluss 5 min gehen"],"notes":"Bei Hitze Wasser mitnehmen."}},{"name":"W2 · Lockerer Lauf","week":2,"exercises":[],"cardio":{"sport":"run","distanceKm":8,"intensity":"Zone 2","purpose":"Die Grundlagenausdauer aufbauen, ohne Müdigkeit anzuhäufen.","steps":["5 min sehr langsam traben zum Einstieg","Gleichmäßiger Dauerlauf in angenehmem Tempo: Sie sollten in ganzen Sätzen sprechen können","Zum Schluss: 5 Steigerungsläufe über 80 m, gehend zurück"]}},{"name":"W2 · Fahrtspiel","week":2,"exercises":[],"cardio":{"sport":"run","distanceKm":7,"intensity":"Zone 4","purpose":"Den Körper spielerisch an Tempowechsel gewöhnen.","steps":["Aufwärmen: 15 min sehr locker traben, dann 4 Lauf-ABC-Übungen (Kniehebelauf, Anfersen) über 20 m","8 × (1 min schnell, 1 min langsam), nach Gefühl","Auslaufen: 10 min sehr langsam traben, dann sanft dehnen"]}},{"name":"W2 · Regeneration","week":2,"exercises":[],"cardio":{"sport":"run","distanceKm":6,"intensity":"Zone 1","purpose":"Die Durchblutung anregen, um besser zu regenerieren, ohne zusätzliche Ermüdung.","steps":["Sehr langsam traben, wenn möglich auf weichem Boden","5 min gehen, dann Hüft- und Sprunggelenksmobilisation"]}},{"name":"W2 · Langer Lauf","week":2,"exercises":[],"cardio":{"sport":"run","distanceKm":14,"intensity":"Zone 2","purpose":"Den Körper an lange Belastung gewöhnen: die wichtigste Einheit der Woche.","steps":["Die ersten 10 Minuten ganz ruhig","Gleichmäßig in Zone 2 bis zum Ende, an Steigungen notfalls gehen","Zum Abschluss 5 min gehen"],"notes":"Bei Hitze Wasser mitnehmen."}},{"name":"W3 · Lockerer Lauf","week":3,"exercises":[],"cardio":{"sport":"run","distanceKm":8,"intensity":"Zone 2","purpose":"Die Grundlagenausdauer aufbauen, ohne Müdigkeit anzuhäufen.","steps":["5 min sehr langsam traben zum Einstieg","Gleichmäßiger Dauerlauf in angenehmem Tempo: Sie sollten in ganzen Sätzen sprechen können","Waden und Oberschenkelrückseite sanft dehnen"]}},{"name":"W3 · Bergläufe","week":3,"exercises":[],"cardio":{"sport":"run","distanceKm":6,"intensity":"Zone 4","purpose":"Beine und Laufschritt kräftigen, ohne die Härte von Intervallen in der Ebene.","steps":["Aufwärmen: 15 min sehr locker traben, dann 4 Lauf-ABC-Übungen (Kniehebelauf, Anfersen) über 20 m","8 × 45 s bergauf in zügigem Tempo, locker zurücktraben","Auslaufen: 10 min sehr langsam traben, dann sanft dehnen"]}},{"name":"W3 · Regeneration","week":3,"exercises":[],"cardio":{"sport":"run","distanceKm":6,"intensity":"Zone 1","purpose":"Die Durchblutung anregen, um besser zu regenerieren, ohne zusätzliche Ermüdung.","steps":["Sehr langsam traben, wenn möglich auf weichem Boden","5 min gehen, dann Hüft- und Sprunggelenksmobilisation"]}},{"name":"W3 · Langer Lauf","week":3,"exercises":[],"cardio":{"sport":"run","distanceKm":16,"intensity":"Zone 2","purpose":"Den Körper an lange Belastung gewöhnen: die wichtigste Einheit der Woche.","steps":["Die ersten 10 Minuten ganz ruhig","Gleichmäßig in Zone 2 bis zum Ende, an Steigungen notfalls gehen","Zum Abschluss 5 min gehen"],"notes":"Testen Sie Ihre Wettkampfverpflegung: alle 20 min trinken, alle 40 min ein Gel oder einen Riegel."}},{"name":"W4 · Lockerer Lauf","week":4,"exercises":[],"cardio":{"sport":"run","distanceKm":8,"intensity":"Zone 2","purpose":"Die Grundlagenausdauer aufbauen, ohne Müdigkeit anzuhäufen.","steps":["5 min sehr langsam traben zum Einstieg","Gleichmäßiger Dauerlauf in angenehmem Tempo: Sie sollten in ganzen Sätzen sprechen können","Zum Schluss: 5 Steigerungsläufe über 80 m, gehend zurück"]}},{"name":"W4 · Lockeres Fahrtspiel","week":4,"exercises":[],"cardio":{"sport":"run","distanceKm":8,"intensity":"Zone 3","purpose":"Entlastungswoche: im Rhythmus bleiben und den Körper verarbeiten lassen.","steps":["10 min locker traben","6 × (1 min etwas schneller, 2 min locker)","10 min locker traben"]}},{"name":"W4 · Regeneration","week":4,"exercises":[],"cardio":{"sport":"run","distanceKm":6,"intensity":"Zone 1","purpose":"Die Durchblutung anregen, um besser zu regenerieren, ohne zusätzliche Ermüdung.","steps":["Sehr langsam traben, wenn möglich auf weichem Boden","5 min gehen, dann Hüft- und Sprunggelenksmobilisation"]}},{"name":"W4 · Langer Lauf","week":4,"exercises":[],"cardio":{"sport":"run","distanceKm":13,"intensity":"Zone 2","purpose":"Den Körper an lange Belastung gewöhnen: die wichtigste Einheit der Woche.","steps":["Die ersten 10 Minuten ganz ruhig","Gleichmäßig in Zone 2 bis zum Ende, an Steigungen notfalls gehen","Zum Abschluss 5 min gehen"],"notes":"Bei Hitze Wasser mitnehmen."}},{"name":"W5 · Lockerer Lauf","week":5,"exercises":[],"cardio":{"sport":"run","distanceKm":9,"intensity":"Zone 2","purpose":"Die Grundlagenausdauer aufbauen, ohne Müdigkeit anzuhäufen.","steps":["5 min sehr langsam traben zum Einstieg","Gleichmäßiger Dauerlauf in angenehmem Tempo: Sie sollten in ganzen Sätzen sprechen können","Waden und Oberschenkelrückseite sanft dehnen"]}},{"name":"W5 · Kurze Intervalle","week":5,"exercises":[],"cardio":{"sport":"run","distanceKm":9,"intensity":"Zone 5","purpose":"Die maximale aerobe Geschwindigkeit steigern: schneller laufen fällt leichter.","steps":["Aufwärmen: 15 min sehr locker traben, dann 4 Lauf-ABC-Übungen (Kniehebelauf, Anfersen) über 20 m","8 × 400 m schnell, 1 min 30 Trabpause","Auslaufen: 10 min sehr langsam traben, dann sanft dehnen"]}},{"name":"W5 · Regeneration","week":5,"exercises":[],"cardio":{"sport":"run","distanceKm":7,"intensity":"Zone 1","purpose":"Die Durchblutung anregen, um besser zu regenerieren, ohne zusätzliche Ermüdung.","steps":["Sehr langsam traben, wenn möglich auf weichem Boden","5 min gehen, dann Hüft- und Sprunggelenksmobilisation"]}},{"name":"W5 · Langer Lauf","week":5,"exercises":[],"cardio":{"sport":"run","distanceKm":18,"intensity":"Zone 2","purpose":"Den Körper an lange Belastung gewöhnen: die wichtigste Einheit der Woche.","steps":["14 km in Zone 2","Die letzten 4 km etwas zügiger (Zone 3)","Zum Abschluss 5 min gehen"],"notes":"Testen Sie Ihre Wettkampfverpflegung: alle 20 min trinken, alle 40 min ein Gel oder einen Riegel."}},{"name":"W6 · Lockerer Lauf","week":6,"exercises":[],"cardio":{"sport":"run","distanceKm":9,"intensity":"Zone 2","purpose":"Die Grundlagenausdauer aufbauen, ohne Müdigkeit anzuhäufen.","steps":["5 min sehr langsam traben zum Einstieg","Gleichmäßiger Dauerlauf in angenehmem Tempo: Sie sollten in ganzen Sätzen sprechen können","Zum Schluss: 5 Steigerungsläufe über 80 m, gehend zurück"]}},{"name":"W6 · Schwelle","week":6,"exercises":[],"cardio":{"sport":"run","distanceKm":10,"intensity":"Zone 4","purpose":"Die Schwelle verschieben: ein zügiges Tempo lange halten, ohne außer Atem zu geraten.","steps":["Aufwärmen: 15 min sehr locker traben, dann 4 Lauf-ABC-Übungen (Kniehebelauf, Anfersen) über 20 m","3 × 8 min zügig, 2 min Pause","Auslaufen: 10 min sehr langsam traben, dann sanft dehnen"]}},{"name":"W6 · Regeneration","week":6,"exercises":[],"cardio":{"sport":"run","distanceKm":7,"intensity":"Zone 1","purpose":"Die Durchblutung anregen, um besser zu regenerieren, ohne zusätzliche Ermüdung.","steps":["Sehr langsam traben, wenn möglich auf weichem Boden","5 min gehen, dann Hüft- und Sprunggelenksmobilisation"]}},{"name":"W6 · Langer Lauf","week":6,"exercises":[],"cardio":{"sport":"run","distanceKm":20,"intensity":"Zone 2","purpose":"Den Körper an lange Belastung gewöhnen: die wichtigste Einheit der Woche.","steps":["15 km in Zone 2","Die letzten 5 km etwas zügiger (Zone 3)","Zum Abschluss 5 min gehen"],"notes":"Testen Sie Ihre Wettkampfverpflegung: alle 20 min trinken, alle 40 min ein Gel oder einen Riegel."}},{"name":"W7 · Lockerer Lauf","week":7,"exercises":[],"cardio":{"sport":"run","distanceKm":9,"intensity":"Zone 2","purpose":"Die Grundlagenausdauer aufbauen, ohne Müdigkeit anzuhäufen.","steps":["5 min sehr langsam traben zum Einstieg","Gleichmäßiger Dauerlauf in angenehmem Tempo: Sie sollten in ganzen Sätzen sprechen können","Waden und Oberschenkelrückseite sanft dehnen"]}},{"name":"W7 · Kurze Intervalle","week":7,"exercises":[],"cardio":{"sport":"run","distanceKm":10,"intensity":"Zone 5","purpose":"Die maximale aerobe Geschwindigkeit steigern: schneller laufen fällt leichter.","steps":["Aufwärmen: 15 min sehr locker traben, dann 4 Lauf-ABC-Übungen (Kniehebelauf, Anfersen) über 20 m","10 × 400 m schnell, 1 min 30 Trabpause","Auslaufen: 10 min sehr langsam traben, dann sanft dehnen"]}},{"name":"W7 · Regeneration","week":7,"exercises":[],"cardio":{"sport":"run","distanceKm":7,"intensity":"Zone 1","purpose":"Die Durchblutung anregen, um besser zu regenerieren, ohne zusätzliche Ermüdung.","steps":["Sehr langsam traben, wenn möglich auf weichem Boden","5 min gehen, dann Hüft- und Sprunggelenksmobilisation"]}},{"name":"W7 · Langer Lauf","week":7,"exercises":[],"cardio":{"sport":"run","distanceKm":22,"intensity":"Zone 2","purpose":"Den Körper an lange Belastung gewöhnen: die wichtigste Einheit der Woche.","steps":["17 km in Zone 2","Die letzten 5 km etwas zügiger (Zone 3)","Zum Abschluss 5 min gehen"],"notes":"Testen Sie Ihre Wettkampfverpflegung: alle 20 min trinken, alle 40 min ein Gel oder einen Riegel."}},{"name":"W8 · Lockerer Lauf","week":8,"exercises":[],"cardio":{"sport":"run","distanceKm":8,"intensity":"Zone 2","purpose":"Die Grundlagenausdauer aufbauen, ohne Müdigkeit anzuhäufen.","steps":["5 min sehr langsam traben zum Einstieg","Gleichmäßiger Dauerlauf in angenehmem Tempo: Sie sollten in ganzen Sätzen sprechen können","Zum Schluss: 5 Steigerungsläufe über 80 m, gehend zurück"]}},{"name":"W8 · Lockeres Fahrtspiel","week":8,"exercises":[],"cardio":{"sport":"run","distanceKm":8,"intensity":"Zone 3","purpose":"Entlastungswoche: im Rhythmus bleiben und den Körper verarbeiten lassen.","steps":["10 min locker traben","6 × (1 min etwas schneller, 2 min locker)","10 min locker traben"]}},{"name":"W8 · Regeneration","week":8,"exercises":[],"cardio":{"sport":"run","distanceKm":6,"intensity":"Zone 1","purpose":"Die Durchblutung anregen, um besser zu regenerieren, ohne zusätzliche Ermüdung.","steps":["Sehr langsam traben, wenn möglich auf weichem Boden","5 min gehen, dann Hüft- und Sprunggelenksmobilisation"]}},{"name":"W8 · Langer Lauf","week":8,"exercises":[],"cardio":{"sport":"run","distanceKm":16,"intensity":"Zone 2","purpose":"Den Körper an lange Belastung gewöhnen: die wichtigste Einheit der Woche.","steps":["Die ersten 10 Minuten ganz ruhig","Gleichmäßig in Zone 2 bis zum Ende, an Steigungen notfalls gehen","Zum Abschluss 5 min gehen"],"notes":"Testen Sie Ihre Wettkampfverpflegung: alle 20 min trinken, alle 40 min ein Gel oder einen Riegel."}},{"name":"W9 · Lockerer Lauf","week":9,"exercises":[],"cardio":{"sport":"run","distanceKm":10,"intensity":"Zone 2","purpose":"Die Grundlagenausdauer aufbauen, ohne Müdigkeit anzuhäufen.","steps":["5 min sehr langsam traben zum Einstieg","Gleichmäßiger Dauerlauf in angenehmem Tempo: Sie sollten in ganzen Sätzen sprechen können","Waden und Oberschenkelrückseite sanft dehnen"]}},{"name":"W9 · Lange Intervalle","week":9,"exercises":[],"cardio":{"sport":"run","distanceKm":11,"intensity":"Zone 4","purpose":"Die gewonnene Geschwindigkeit auf längeren Belastungen halten.","steps":["Aufwärmen: 15 min sehr locker traben, dann 4 Lauf-ABC-Übungen (Kniehebelauf, Anfersen) über 20 m","5 × 1000 m zügig, 2 min Trabpause","Auslaufen: 10 min sehr langsam traben, dann sanft dehnen"]}},{"name":"W9 · Regeneration","week":9,"exercises":[],"cardio":{"sport":"run","distanceKm":8,"intensity":"Zone 1","purpose":"Die Durchblutung anregen, um besser zu regenerieren, ohne zusätzliche Ermüdung.","steps":["Sehr langsam traben, wenn möglich auf weichem Boden","5 min gehen, dann Hüft- und Sprunggelenksmobilisation"]}},{"name":"W9 · Langer Lauf","week":9,"exercises":[],"cardio":{"sport":"run","distanceKm":24,"intensity":"Zone 2","purpose":"Lernen, das Wettkampftempo mit müden Beinen zu halten.","steps":["17 km in Zone 2, gleichmäßig","Die letzten 7 km im Marathontempo","Zum Abschluss 5 min gehen"],"notes":"Testen Sie Ihre Wettkampfverpflegung: alle 20 min trinken, alle 40 min ein Gel oder einen Riegel."}},{"name":"W10 · Lockerer Lauf","week":10,"exercises":[],"cardio":{"sport":"run","distanceKm":10,"intensity":"Zone 2","purpose":"Die Grundlagenausdauer aufbauen, ohne Müdigkeit anzuhäufen.","steps":["5 min sehr langsam traben zum Einstieg","Gleichmäßiger Dauerlauf in angenehmem Tempo: Sie sollten in ganzen Sätzen sprechen können","Zum Schluss: 5 Steigerungsläufe über 80 m, gehend zurück"]}},{"name":"W10 · Wettkampftempo","week":10,"exercises":[],"cardio":{"sport":"run","distanceKm":14,"intensity":"Wettkampftempo","purpose":"Das Marathontempo verinnerlichen, um es am Wettkampftag ohne Uhr zu finden.","steps":["Aufwärmen: 15 min sehr locker traben, dann 4 Lauf-ABC-Übungen (Kniehebelauf, Anfersen) über 20 m","3 × 3 km im Marathontempo, 2 min Pause","Auslaufen: 10 min sehr langsam traben, dann sanft dehnen"]}},{"name":"W10 · Regeneration","week":10,"exercises":[],"cardio":{"sport":"run","distanceKm":8,"intensity":"Zone 1","purpose":"Die Durchblutung anregen, um besser zu regenerieren, ohne zusätzliche Ermüdung.","steps":["Sehr langsam traben, wenn möglich auf weichem Boden","5 min gehen, dann Hüft- und Sprunggelenksmobilisation"]}},{"name":"W10 · Langer Lauf","week":10,"exercises":[],"cardio":{"sport":"run","distanceKm":26,"intensity":"Zone 2","purpose":"Lernen, das Wettkampftempo mit müden Beinen zu halten.","steps":["18 km in Zone 2, gleichmäßig","Die letzten 8 km im Marathontempo","Zum Abschluss 5 min gehen"],"notes":"Testen Sie Ihre Wettkampfverpflegung: alle 20 min trinken, alle 40 min ein Gel oder einen Riegel."}},{"name":"W11 · Lockerer Lauf","week":11,"exercises":[],"cardio":{"sport":"run","distanceKm":11,"intensity":"Zone 2","purpose":"Die Grundlagenausdauer aufbauen, ohne Müdigkeit anzuhäufen.","steps":["5 min sehr langsam traben zum Einstieg","Gleichmäßiger Dauerlauf in angenehmem Tempo: Sie sollten in ganzen Sätzen sprechen können","Waden und Oberschenkelrückseite sanft dehnen"]}},{"name":"W11 · Lange Intervalle","week":11,"exercises":[],"cardio":{"sport":"run","distanceKm":12,"intensity":"Zone 4","purpose":"Die gewonnene Geschwindigkeit auf längeren Belastungen halten.","steps":["Aufwärmen: 15 min sehr locker traben, dann 4 Lauf-ABC-Übungen (Kniehebelauf, Anfersen) über 20 m","6 × 1000 m zügig, 2 min Trabpause","Auslaufen: 10 min sehr langsam traben, dann sanft dehnen"]}},{"name":"W11 · Regeneration","week":11,"exercises":[],"cardio":{"sport":"run","distanceKm":9,"intensity":"Zone 1","purpose":"Die Durchblutung anregen, um besser zu regenerieren, ohne zusätzliche Ermüdung.","steps":["Sehr langsam traben, wenn möglich auf weichem Boden","5 min gehen, dann Hüft- und Sprunggelenksmobilisation"]}},{"name":"W11 · Langer Lauf","week":11,"exercises":[],"cardio":{"sport":"run","distanceKm":28,"intensity":"Zone 2","purpose":"Lernen, das Wettkampftempo mit müden Beinen zu halten.","steps":["20 km in Zone 2, gleichmäßig","Die letzten 8 km im Marathontempo","Zum Abschluss 5 min gehen"],"notes":"Testen Sie Ihre Wettkampfverpflegung: alle 20 min trinken, alle 40 min ein Gel oder einen Riegel."}},{"name":"W12 · Lockerer Lauf","week":12,"exercises":[],"cardio":{"sport":"run","distanceKm":9,"intensity":"Zone 2","purpose":"Die Grundlagenausdauer aufbauen, ohne Müdigkeit anzuhäufen.","steps":["5 min sehr langsam traben zum Einstieg","Gleichmäßiger Dauerlauf in angenehmem Tempo: Sie sollten in ganzen Sätzen sprechen können","Zum Schluss: 5 Steigerungsläufe über 80 m, gehend zurück"]}},{"name":"W12 · Lockeres Fahrtspiel","week":12,"exercises":[],"cardio":{"sport":"run","distanceKm":9,"intensity":"Zone 3","purpose":"Entlastungswoche: im Rhythmus bleiben und den Körper verarbeiten lassen.","steps":["10 min locker traben","6 × (1 min etwas schneller, 2 min locker)","10 min locker traben"]}},{"name":"W12 · Regeneration","week":12,"exercises":[],"cardio":{"sport":"run","distanceKm":7,"intensity":"Zone 1","purpose":"Die Durchblutung anregen, um besser zu regenerieren, ohne zusätzliche Ermüdung.","steps":["Sehr langsam traben, wenn möglich auf weichem Boden","5 min gehen, dann Hüft- und Sprunggelenksmobilisation"]}},{"name":"W12 · Langer Lauf","week":12,"exercises":[],"cardio":{"sport":"run","distanceKm":20,"intensity":"Zone 2","purpose":"Lernen, das Wettkampftempo mit müden Beinen zu halten.","steps":["Die ersten 10 Minuten ganz ruhig","Gleichmäßig in Zone 2 bis zum Ende, an Steigungen notfalls gehen","Zum Abschluss 5 min gehen"],"notes":"Testen Sie Ihre Wettkampfverpflegung: alle 20 min trinken, alle 40 min ein Gel oder einen Riegel."}},{"name":"W13 · Lockerer Lauf","week":13,"exercises":[],"cardio":{"sport":"run","distanceKm":11,"intensity":"Zone 2","purpose":"Die Grundlagenausdauer aufbauen, ohne Müdigkeit anzuhäufen.","steps":["5 min sehr langsam traben zum Einstieg","Gleichmäßiger Dauerlauf in angenehmem Tempo: Sie sollten in ganzen Sätzen sprechen können","Waden und Oberschenkelrückseite sanft dehnen"]}},{"name":"W13 · Wettkampftempo","week":13,"exercises":[],"cardio":{"sport":"run","distanceKm":17,"intensity":"Wettkampftempo","purpose":"Das Marathontempo verinnerlichen, um es am Wettkampftag ohne Uhr zu finden.","steps":["Aufwärmen: 15 min sehr locker traben, dann 4 Lauf-ABC-Übungen (Kniehebelauf, Anfersen) über 20 m","3 × 4 km im Marathontempo, 2 min Pause","Auslaufen: 10 min sehr langsam traben, dann sanft dehnen"]}},{"name":"W13 · Regeneration","week":13,"exercises":[],"cardio":{"sport":"run","distanceKm":9,"intensity":"Zone 1","purpose":"Die Durchblutung anregen, um besser zu regenerieren, ohne zusätzliche Ermüdung.","steps":["Sehr langsam traben, wenn möglich auf weichem Boden","5 min gehen, dann Hüft- und Sprunggelenksmobilisation"]}},{"name":"W13 · Langer Lauf","week":13,"exercises":[],"cardio":{"sport":"run","distanceKm":32,"intensity":"Zone 2","purpose":"Lernen, das Wettkampftempo mit müden Beinen zu halten.","steps":["22 km in Zone 2, gleichmäßig","Die letzten 10 km im Marathontempo","Zum Abschluss 5 min gehen"],"notes":"Testen Sie Ihre Wettkampfverpflegung: alle 20 min trinken, alle 40 min ein Gel oder einen Riegel."}},{"name":"W14 · Lockerer Lauf","week":14,"exercises":[],"cardio":{"sport":"run","distanceKm":10,"intensity":"Zone 2","purpose":"Die Grundlagenausdauer aufbauen, ohne Müdigkeit anzuhäufen.","steps":["5 min sehr langsam traben zum Einstieg","Gleichmäßiger Dauerlauf in angenehmem Tempo: Sie sollten in ganzen Sätzen sprechen können","Waden und Oberschenkelrückseite sanft dehnen"]}},{"name":"W14 · Tempo-Erinnerung","week":14,"exercises":[],"cardio":{"sport":"run","distanceKm":10,"intensity":"Wettkampftempo","purpose":"Das Gefühl für Tempo behalten und dabei den Umfang senken.","steps":["Aufwärmen: 15 min sehr locker traben, dann 4 Lauf-ABC-Übungen (Kniehebelauf, Anfersen) über 20 m","3 × 1 km im Marathontempo, 2 min Pause","Auslaufen: 10 min sehr langsam traben, dann sanft dehnen"]}},{"name":"W14 · Regeneration","week":14,"exercises":[],"cardio":{"sport":"run","distanceKm":8,"intensity":"Zone 1","purpose":"Die Durchblutung anregen, um besser zu regenerieren, ohne zusätzliche Ermüdung.","steps":["Sehr langsam traben, wenn möglich auf weichem Boden","5 min gehen, dann Hüft- und Sprunggelenksmobilisation"]}},{"name":"W14 · Langer Lauf","week":14,"exercises":[],"cardio":{"sport":"run","distanceKm":24,"intensity":"Zone 2","purpose":"Den Körper an lange Belastung gewöhnen: die wichtigste Einheit der Woche.","steps":["Die ersten 10 Minuten ganz ruhig","Gleichmäßig in Zone 2 bis zum Ende, an Steigungen notfalls gehen","Zum Abschluss 5 min gehen"],"notes":"Testen Sie Ihre Wettkampfverpflegung: alle 20 min trinken, alle 40 min ein Gel oder einen Riegel."}},{"name":"W15 · Lockerer Lauf","week":15,"exercises":[],"cardio":{"sport":"run","distanceKm":8,"intensity":"Zone 2","purpose":"Die Grundlagenausdauer aufbauen, ohne Müdigkeit anzuhäufen.","steps":["5 min sehr langsam traben zum Einstieg","Gleichmäßiger Dauerlauf in angenehmem Tempo: Sie sollten in ganzen Sätzen sprechen können","Waden und Oberschenkelrückseite sanft dehnen"]}},{"name":"W15 · Tempo-Erinnerung","week":15,"exercises":[],"cardio":{"sport":"run","distanceKm":8,"intensity":"Wettkampftempo","purpose":"Das Gefühl für Tempo behalten und dabei den Umfang senken.","steps":["Aufwärmen: 15 min sehr locker traben, dann 4 Lauf-ABC-Übungen (Kniehebelauf, Anfersen) über 20 m","3 × 1 km im Marathontempo, 2 min Pause","Auslaufen: 10 min sehr langsam traben, dann sanft dehnen"]}},{"name":"W15 · Regeneration","week":15,"exercises":[],"cardio":{"sport":"run","distanceKm":6,"intensity":"Zone 1","purpose":"Die Durchblutung anregen, um besser zu regenerieren, ohne zusätzliche Ermüdung.","steps":["Sehr langsam traben, wenn möglich auf weichem Boden","5 min gehen, dann Hüft- und Sprunggelenksmobilisation"]}},{"name":"W15 · Langer Lauf","week":15,"exercises":[],"cardio":{"sport":"run","distanceKm":16,"intensity":"Zone 2","purpose":"Den Körper an lange Belastung gewöhnen: die wichtigste Einheit der Woche.","steps":["Die ersten 10 Minuten ganz ruhig","Gleichmäßig in Zone 2 bis zum Ende, an Steigungen notfalls gehen","Zum Abschluss 5 min gehen"],"notes":"Testen Sie Ihre Wettkampfverpflegung: alle 20 min trinken, alle 40 min ein Gel oder einen Riegel."}},{"name":"W16 · Lockerer Lauf","week":16,"exercises":[],"cardio":{"sport":"run","distanceKm":6,"intensity":"Zone 2","purpose":"In Bewegung bleiben, ohne die Reserven anzugreifen.","steps":["Kurz und locker laufen","3 Steigerungsläufe über 80 m, um die Beine zu wecken"]}},{"name":"W16 · Aktivierung","week":16,"exercises":[],"cardio":{"sport":"run","distanceKm":4,"intensity":"Zone 3","purpose":"Zwei oder drei Tage vor dem Wettkampf: spritzig bleiben, ohne zu ermüden.","steps":["15 min locker traben","3 × 2 min im Marathontempo, 2 min Pause","5 min langsam traben"]}},{"name":"W16 · Marathon","week":16,"exercises":[],"cardio":{"sport":"run","distanceKm":42.2,"intensity":"Wettkampf","purpose":"Wettkampftag: die geleistete Arbeit genießen.","steps":["Am Vortag: gewohnte, kohlenhydratreiche Mahlzeit, Ausrüstung bereit, Startnummer angesteckt","Aufwärmen: 5 min traben genügen, sparen Sie Ihre Kraft","Erstes Drittel: im Marathontempo starten, trotz der Startaufregung keinesfalls schneller","Zweites Drittel: gleichmäßig bleiben und wie im Training verpflegen","Letztes Drittel: Schultern lockern und beschleunigen, wenn die Beine es zulassen"],"notes":"Viel Erfolg!"}}]'::jsonb, true, 200, 'de'
WHERE NOT EXISTS (SELECT 1 FROM program_templates WHERE name = 'Marathon in 16 Wochen' AND locale = 'de');

INSERT INTO program_templates (name, description, goal, level, days_per_week, home_friendly, structure, is_published, sort_order, locale)
SELECT 'Halbmarathon in 12 Wochen', 'Für alle, die bereits 10 km laufen. Drei Läufe pro Woche: ein lockerer Lauf, eine wechselnde Qualitätseinheit (Berg, Schwelle, Intervalle, Halbmarathontempo) und ein langer Lauf bis 18 km. Vor dem Start ärztlichen Rat einholen. Nach Gefühl anpassen.', 'endurance', 'intermediate', 3, false, '[{"name":"W1 · Lockerer Lauf","week":1,"exercises":[],"cardio":{"sport":"run","distanceKm":6,"intensity":"Zone 2","purpose":"Die Grundlagenausdauer aufbauen, ohne Müdigkeit anzuhäufen.","steps":["5 min sehr langsam traben zum Einstieg","Gleichmäßiger Dauerlauf in angenehmem Tempo: Sie sollten in ganzen Sätzen sprechen können","Waden und Oberschenkelrückseite sanft dehnen"]}},{"name":"W1 · Bergläufe","week":1,"exercises":[],"cardio":{"sport":"run","distanceKm":6,"intensity":"Zone 4","purpose":"Beine und Laufschritt kräftigen, ohne die Härte von Intervallen in der Ebene.","steps":["Aufwärmen: 15 min sehr locker traben, dann 4 Lauf-ABC-Übungen (Kniehebelauf, Anfersen) über 20 m","6 × 45 s bergauf in zügigem Tempo, locker zurücktraben","Auslaufen: 10 min sehr langsam traben, dann sanft dehnen"]}},{"name":"W1 · Langer Lauf","week":1,"exercises":[],"cardio":{"sport":"run","distanceKm":8,"intensity":"Zone 2","purpose":"Den Körper an lange Belastung gewöhnen: die wichtigste Einheit der Woche.","steps":["Die ersten 10 Minuten ganz ruhig","Gleichmäßig in Zone 2 bis zum Ende, an Steigungen notfalls gehen","Zum Abschluss 5 min gehen"],"notes":"Bei Hitze Wasser mitnehmen."}},{"name":"W2 · Lockerer Lauf","week":2,"exercises":[],"cardio":{"sport":"run","distanceKm":6,"intensity":"Zone 2","purpose":"Die Grundlagenausdauer aufbauen, ohne Müdigkeit anzuhäufen.","steps":["5 min sehr langsam traben zum Einstieg","Gleichmäßiger Dauerlauf in angenehmem Tempo: Sie sollten in ganzen Sätzen sprechen können","Zum Schluss: 5 Steigerungsläufe über 80 m, gehend zurück"]}},{"name":"W2 · Fahrtspiel","week":2,"exercises":[],"cardio":{"sport":"run","distanceKm":7,"intensity":"Zone 4","purpose":"Den Körper spielerisch an Tempowechsel gewöhnen.","steps":["Aufwärmen: 15 min sehr locker traben, dann 4 Lauf-ABC-Übungen (Kniehebelauf, Anfersen) über 20 m","8 × (1 min schnell, 1 min langsam), nach Gefühl","Auslaufen: 10 min sehr langsam traben, dann sanft dehnen"]}},{"name":"W2 · Langer Lauf","week":2,"exercises":[],"cardio":{"sport":"run","distanceKm":10,"intensity":"Zone 2","purpose":"Den Körper an lange Belastung gewöhnen: die wichtigste Einheit der Woche.","steps":["Die ersten 10 Minuten ganz ruhig","Gleichmäßig in Zone 2 bis zum Ende, an Steigungen notfalls gehen","Zum Abschluss 5 min gehen"],"notes":"Bei Hitze Wasser mitnehmen."}},{"name":"W3 · Lockerer Lauf","week":3,"exercises":[],"cardio":{"sport":"run","distanceKm":6,"intensity":"Zone 2","purpose":"Die Grundlagenausdauer aufbauen, ohne Müdigkeit anzuhäufen.","steps":["5 min sehr langsam traben zum Einstieg","Gleichmäßiger Dauerlauf in angenehmem Tempo: Sie sollten in ganzen Sätzen sprechen können","Waden und Oberschenkelrückseite sanft dehnen"]}},{"name":"W3 · Bergläufe","week":3,"exercises":[],"cardio":{"sport":"run","distanceKm":6,"intensity":"Zone 4","purpose":"Beine und Laufschritt kräftigen, ohne die Härte von Intervallen in der Ebene.","steps":["Aufwärmen: 15 min sehr locker traben, dann 4 Lauf-ABC-Übungen (Kniehebelauf, Anfersen) über 20 m","8 × 45 s bergauf in zügigem Tempo, locker zurücktraben","Auslaufen: 10 min sehr langsam traben, dann sanft dehnen"]}},{"name":"W3 · Langer Lauf","week":3,"exercises":[],"cardio":{"sport":"run","distanceKm":12,"intensity":"Zone 2","purpose":"Den Körper an lange Belastung gewöhnen: die wichtigste Einheit der Woche.","steps":["Die ersten 10 Minuten ganz ruhig","Gleichmäßig in Zone 2 bis zum Ende, an Steigungen notfalls gehen","Zum Abschluss 5 min gehen"],"notes":"Bei Hitze Wasser mitnehmen."}},{"name":"W4 · Lockerer Lauf","week":4,"exercises":[],"cardio":{"sport":"run","distanceKm":6,"intensity":"Zone 2","purpose":"Die Grundlagenausdauer aufbauen, ohne Müdigkeit anzuhäufen.","steps":["5 min sehr langsam traben zum Einstieg","Gleichmäßiger Dauerlauf in angenehmem Tempo: Sie sollten in ganzen Sätzen sprechen können","Zum Schluss: 5 Steigerungsläufe über 80 m, gehend zurück"]}},{"name":"W4 · Lockeres Fahrtspiel","week":4,"exercises":[],"cardio":{"sport":"run","distanceKm":6,"intensity":"Zone 3","purpose":"Entlastungswoche: im Rhythmus bleiben und den Körper verarbeiten lassen.","steps":["10 min locker traben","6 × (1 min etwas schneller, 2 min locker)","10 min locker traben"]}},{"name":"W4 · Langer Lauf","week":4,"exercises":[],"cardio":{"sport":"run","distanceKm":10,"intensity":"Zone 2","purpose":"Den Körper an lange Belastung gewöhnen: die wichtigste Einheit der Woche.","steps":["Die ersten 10 Minuten ganz ruhig","Gleichmäßig in Zone 2 bis zum Ende, an Steigungen notfalls gehen","Zum Abschluss 5 min gehen"],"notes":"Bei Hitze Wasser mitnehmen."}},{"name":"W5 · Lockerer Lauf","week":5,"exercises":[],"cardio":{"sport":"run","distanceKm":7,"intensity":"Zone 2","purpose":"Die Grundlagenausdauer aufbauen, ohne Müdigkeit anzuhäufen.","steps":["5 min sehr langsam traben zum Einstieg","Gleichmäßiger Dauerlauf in angenehmem Tempo: Sie sollten in ganzen Sätzen sprechen können","Waden und Oberschenkelrückseite sanft dehnen"]}},{"name":"W5 · Kurze Intervalle","week":5,"exercises":[],"cardio":{"sport":"run","distanceKm":9,"intensity":"Zone 5","purpose":"Die maximale aerobe Geschwindigkeit steigern: schneller laufen fällt leichter.","steps":["Aufwärmen: 15 min sehr locker traben, dann 4 Lauf-ABC-Übungen (Kniehebelauf, Anfersen) über 20 m","8 × 400 m schnell, 1 min 30 Trabpause","Auslaufen: 10 min sehr langsam traben, dann sanft dehnen"]}},{"name":"W5 · Langer Lauf","week":5,"exercises":[],"cardio":{"sport":"run","distanceKm":13,"intensity":"Zone 2","purpose":"Den Körper an lange Belastung gewöhnen: die wichtigste Einheit der Woche.","steps":["10 km in Zone 2","Die letzten 3 km etwas zügiger (Zone 3)","Zum Abschluss 5 min gehen"],"notes":"Bei Hitze Wasser mitnehmen."}},{"name":"W6 · Lockerer Lauf","week":6,"exercises":[],"cardio":{"sport":"run","distanceKm":7,"intensity":"Zone 2","purpose":"Die Grundlagenausdauer aufbauen, ohne Müdigkeit anzuhäufen.","steps":["5 min sehr langsam traben zum Einstieg","Gleichmäßiger Dauerlauf in angenehmem Tempo: Sie sollten in ganzen Sätzen sprechen können","Zum Schluss: 5 Steigerungsläufe über 80 m, gehend zurück"]}},{"name":"W6 · Schwelle","week":6,"exercises":[],"cardio":{"sport":"run","distanceKm":10,"intensity":"Zone 4","purpose":"Die Schwelle verschieben: ein zügiges Tempo lange halten, ohne außer Atem zu geraten.","steps":["Aufwärmen: 15 min sehr locker traben, dann 4 Lauf-ABC-Übungen (Kniehebelauf, Anfersen) über 20 m","3 × 8 min zügig, 2 min Pause","Auslaufen: 10 min sehr langsam traben, dann sanft dehnen"]}},{"name":"W6 · Langer Lauf","week":6,"exercises":[],"cardio":{"sport":"run","distanceKm":15,"intensity":"Zone 2","purpose":"Den Körper an lange Belastung gewöhnen: die wichtigste Einheit der Woche.","steps":["11 km in Zone 2","Die letzten 4 km etwas zügiger (Zone 3)","Zum Abschluss 5 min gehen"],"notes":"Bei Hitze Wasser mitnehmen."}},{"name":"W7 · Lockerer Lauf","week":7,"exercises":[],"cardio":{"sport":"run","distanceKm":7,"intensity":"Zone 2","purpose":"Die Grundlagenausdauer aufbauen, ohne Müdigkeit anzuhäufen.","steps":["5 min sehr langsam traben zum Einstieg","Gleichmäßiger Dauerlauf in angenehmem Tempo: Sie sollten in ganzen Sätzen sprechen können","Waden und Oberschenkelrückseite sanft dehnen"]}},{"name":"W7 · Lange Intervalle","week":7,"exercises":[],"cardio":{"sport":"run","distanceKm":11,"intensity":"Zone 4","purpose":"Die gewonnene Geschwindigkeit auf längeren Belastungen halten.","steps":["Aufwärmen: 15 min sehr locker traben, dann 4 Lauf-ABC-Übungen (Kniehebelauf, Anfersen) über 20 m","5 × 1000 m zügig, 2 min Trabpause","Auslaufen: 10 min sehr langsam traben, dann sanft dehnen"]}},{"name":"W7 · Langer Lauf","week":7,"exercises":[],"cardio":{"sport":"run","distanceKm":16,"intensity":"Zone 2","purpose":"Lernen, das Wettkampftempo mit müden Beinen zu halten.","steps":["11 km in Zone 2, gleichmäßig","Die letzten 5 km im Halbmarathontempo","Zum Abschluss 5 min gehen"],"notes":"Testen Sie Ihre Wettkampfverpflegung: alle 20 min trinken, alle 40 min ein Gel oder einen Riegel."}},{"name":"W8 · Lockerer Lauf","week":8,"exercises":[],"cardio":{"sport":"run","distanceKm":6,"intensity":"Zone 2","purpose":"Die Grundlagenausdauer aufbauen, ohne Müdigkeit anzuhäufen.","steps":["5 min sehr langsam traben zum Einstieg","Gleichmäßiger Dauerlauf in angenehmem Tempo: Sie sollten in ganzen Sätzen sprechen können","Zum Schluss: 5 Steigerungsläufe über 80 m, gehend zurück"]}},{"name":"W8 · Lockeres Fahrtspiel","week":8,"exercises":[],"cardio":{"sport":"run","distanceKm":6,"intensity":"Zone 3","purpose":"Entlastungswoche: im Rhythmus bleiben und den Körper verarbeiten lassen.","steps":["10 min locker traben","6 × (1 min etwas schneller, 2 min locker)","10 min locker traben"]}},{"name":"W8 · Langer Lauf","week":8,"exercises":[],"cardio":{"sport":"run","distanceKm":12,"intensity":"Zone 2","purpose":"Lernen, das Wettkampftempo mit müden Beinen zu halten.","steps":["Die ersten 10 Minuten ganz ruhig","Gleichmäßig in Zone 2 bis zum Ende, an Steigungen notfalls gehen","Zum Abschluss 5 min gehen"],"notes":"Bei Hitze Wasser mitnehmen."}},{"name":"W9 · Lockerer Lauf","week":9,"exercises":[],"cardio":{"sport":"run","distanceKm":8,"intensity":"Zone 2","purpose":"Die Grundlagenausdauer aufbauen, ohne Müdigkeit anzuhäufen.","steps":["5 min sehr langsam traben zum Einstieg","Gleichmäßiger Dauerlauf in angenehmem Tempo: Sie sollten in ganzen Sätzen sprechen können","Waden und Oberschenkelrückseite sanft dehnen"]}},{"name":"W9 · Wettkampftempo","week":9,"exercises":[],"cardio":{"sport":"run","distanceKm":11,"intensity":"Wettkampftempo","purpose":"Das Halbmarathontempo verinnerlichen, um es am Wettkampftag ohne Uhr zu finden.","steps":["Aufwärmen: 15 min sehr locker traben, dann 4 Lauf-ABC-Übungen (Kniehebelauf, Anfersen) über 20 m","3 × 2 km im Halbmarathontempo, 2 min Pause","Auslaufen: 10 min sehr langsam traben, dann sanft dehnen"]}},{"name":"W9 · Langer Lauf","week":9,"exercises":[],"cardio":{"sport":"run","distanceKm":18,"intensity":"Zone 2","purpose":"Lernen, das Wettkampftempo mit müden Beinen zu halten.","steps":["13 km in Zone 2, gleichmäßig","Die letzten 5 km im Halbmarathontempo","Zum Abschluss 5 min gehen"],"notes":"Testen Sie Ihre Wettkampfverpflegung: alle 20 min trinken, alle 40 min ein Gel oder einen Riegel."}},{"name":"W10 · Lockerer Lauf","week":10,"exercises":[],"cardio":{"sport":"run","distanceKm":7,"intensity":"Zone 2","purpose":"Die Grundlagenausdauer aufbauen, ohne Müdigkeit anzuhäufen.","steps":["5 min sehr langsam traben zum Einstieg","Gleichmäßiger Dauerlauf in angenehmem Tempo: Sie sollten in ganzen Sätzen sprechen können","Waden und Oberschenkelrückseite sanft dehnen"]}},{"name":"W10 · Tempo-Erinnerung","week":10,"exercises":[],"cardio":{"sport":"run","distanceKm":7,"intensity":"Wettkampftempo","purpose":"Das Gefühl für Tempo behalten und dabei den Umfang senken.","steps":["Aufwärmen: 15 min sehr locker traben, dann 4 Lauf-ABC-Übungen (Kniehebelauf, Anfersen) über 20 m","3 × 1 km im Halbmarathontempo, 2 min Pause","Auslaufen: 10 min sehr langsam traben, dann sanft dehnen"]}},{"name":"W10 · Langer Lauf","week":10,"exercises":[],"cardio":{"sport":"run","distanceKm":16,"intensity":"Zone 2","purpose":"Den Körper an lange Belastung gewöhnen: die wichtigste Einheit der Woche.","steps":["Die ersten 10 Minuten ganz ruhig","Gleichmäßig in Zone 2 bis zum Ende, an Steigungen notfalls gehen","Zum Abschluss 5 min gehen"],"notes":"Testen Sie Ihre Wettkampfverpflegung: alle 20 min trinken, alle 40 min ein Gel oder einen Riegel."}},{"name":"W11 · Lockerer Lauf","week":11,"exercises":[],"cardio":{"sport":"run","distanceKm":6,"intensity":"Zone 2","purpose":"Die Grundlagenausdauer aufbauen, ohne Müdigkeit anzuhäufen.","steps":["5 min sehr langsam traben zum Einstieg","Gleichmäßiger Dauerlauf in angenehmem Tempo: Sie sollten in ganzen Sätzen sprechen können","Waden und Oberschenkelrückseite sanft dehnen"]}},{"name":"W11 · Tempo-Erinnerung","week":11,"exercises":[],"cardio":{"sport":"run","distanceKm":6,"intensity":"Wettkampftempo","purpose":"Das Gefühl für Tempo behalten und dabei den Umfang senken.","steps":["Aufwärmen: 15 min sehr locker traben, dann 4 Lauf-ABC-Übungen (Kniehebelauf, Anfersen) über 20 m","3 × 1 km im Halbmarathontempo, 2 min Pause","Auslaufen: 10 min sehr langsam traben, dann sanft dehnen"]}},{"name":"W11 · Langer Lauf","week":11,"exercises":[],"cardio":{"sport":"run","distanceKm":12,"intensity":"Zone 2","purpose":"Den Körper an lange Belastung gewöhnen: die wichtigste Einheit der Woche.","steps":["Die ersten 10 Minuten ganz ruhig","Gleichmäßig in Zone 2 bis zum Ende, an Steigungen notfalls gehen","Zum Abschluss 5 min gehen"],"notes":"Bei Hitze Wasser mitnehmen."}},{"name":"W12 · Lockerer Lauf","week":12,"exercises":[],"cardio":{"sport":"run","distanceKm":6,"intensity":"Zone 2","purpose":"In Bewegung bleiben, ohne die Reserven anzugreifen.","steps":["Kurz und locker laufen","3 Steigerungsläufe über 80 m, um die Beine zu wecken"]}},{"name":"W12 · Aktivierung","week":12,"exercises":[],"cardio":{"sport":"run","distanceKm":4,"intensity":"Zone 3","purpose":"Zwei oder drei Tage vor dem Wettkampf: spritzig bleiben, ohne zu ermüden.","steps":["15 min locker traben","3 × 2 min im Halbmarathontempo, 2 min Pause","5 min langsam traben"]}},{"name":"W12 · Halbmarathon","week":12,"exercises":[],"cardio":{"sport":"run","distanceKm":21.1,"intensity":"Wettkampf","purpose":"Wettkampftag: die geleistete Arbeit genießen.","steps":["Am Vortag: gewohnte, kohlenhydratreiche Mahlzeit, Ausrüstung bereit, Startnummer angesteckt","Aufwärmen: 5 min traben genügen, sparen Sie Ihre Kraft","Erstes Drittel: im Halbmarathontempo starten, trotz der Startaufregung keinesfalls schneller","Zweites Drittel: gleichmäßig bleiben und wie im Training verpflegen","Letztes Drittel: Schultern lockern und beschleunigen, wenn die Beine es zulassen"],"notes":"Viel Erfolg!"}}]'::jsonb, true, 210, 'de'
WHERE NOT EXISTS (SELECT 1 FROM program_templates WHERE name = 'Halbmarathon in 12 Wochen' AND locale = 'de');

INSERT INTO program_templates (name, description, goal, level, days_per_week, home_friendly, structure, is_published, sort_order, locale)
SELECT '10 km in 8 Wochen', 'Für alle, die 30 Minuten ohne Pause laufen. Drei Läufe pro Woche, von Bergläufen bis zu Intervallen, für einen erfolgreichen 10-km-Lauf. Vor dem Start ärztlichen Rat einholen. Nach Gefühl anpassen.', 'endurance', 'beginner', 3, false, '[{"name":"W1 · Lockerer Lauf","week":1,"exercises":[],"cardio":{"sport":"run","distanceKm":4,"intensity":"Zone 2","purpose":"Die Grundlagenausdauer aufbauen, ohne Müdigkeit anzuhäufen.","steps":["5 min sehr langsam traben zum Einstieg","Gleichmäßiger Dauerlauf in angenehmem Tempo: Sie sollten in ganzen Sätzen sprechen können","Waden und Oberschenkelrückseite sanft dehnen"]}},{"name":"W1 · Bergläufe","week":1,"exercises":[],"cardio":{"sport":"run","distanceKm":6,"intensity":"Zone 4","purpose":"Beine und Laufschritt kräftigen, ohne die Härte von Intervallen in der Ebene.","steps":["Aufwärmen: 15 min sehr locker traben, dann 4 Lauf-ABC-Übungen (Kniehebelauf, Anfersen) über 20 m","5 × 45 s bergauf in zügigem Tempo, locker zurücktraben","Auslaufen: 10 min sehr langsam traben, dann sanft dehnen"]}},{"name":"W1 · Langer Lauf","week":1,"exercises":[],"cardio":{"sport":"run","distanceKm":5,"intensity":"Zone 2","purpose":"Den Körper an lange Belastung gewöhnen: die wichtigste Einheit der Woche.","steps":["Die ersten 10 Minuten ganz ruhig","Gleichmäßig in Zone 2 bis zum Ende, an Steigungen notfalls gehen","Zum Abschluss 5 min gehen"],"notes":"Bei Hitze Wasser mitnehmen."}},{"name":"W2 · Lockerer Lauf","week":2,"exercises":[],"cardio":{"sport":"run","distanceKm":4,"intensity":"Zone 2","purpose":"Die Grundlagenausdauer aufbauen, ohne Müdigkeit anzuhäufen.","steps":["5 min sehr langsam traben zum Einstieg","Gleichmäßiger Dauerlauf in angenehmem Tempo: Sie sollten in ganzen Sätzen sprechen können","Zum Schluss: 5 Steigerungsläufe über 80 m, gehend zurück"]}},{"name":"W2 · Fahrtspiel","week":2,"exercises":[],"cardio":{"sport":"run","distanceKm":6,"intensity":"Zone 4","purpose":"Den Körper spielerisch an Tempowechsel gewöhnen.","steps":["Aufwärmen: 15 min sehr locker traben, dann 4 Lauf-ABC-Übungen (Kniehebelauf, Anfersen) über 20 m","6 × (1 min schnell, 1 min langsam), nach Gefühl","Auslaufen: 10 min sehr langsam traben, dann sanft dehnen"]}},{"name":"W2 · Langer Lauf","week":2,"exercises":[],"cardio":{"sport":"run","distanceKm":6,"intensity":"Zone 2","purpose":"Den Körper an lange Belastung gewöhnen: die wichtigste Einheit der Woche.","steps":["Die ersten 10 Minuten ganz ruhig","Gleichmäßig in Zone 2 bis zum Ende, an Steigungen notfalls gehen","Zum Abschluss 5 min gehen"],"notes":"Bei Hitze Wasser mitnehmen."}},{"name":"W3 · Lockerer Lauf","week":3,"exercises":[],"cardio":{"sport":"run","distanceKm":4,"intensity":"Zone 2","purpose":"Die Grundlagenausdauer aufbauen, ohne Müdigkeit anzuhäufen.","steps":["5 min sehr langsam traben zum Einstieg","Gleichmäßiger Dauerlauf in angenehmem Tempo: Sie sollten in ganzen Sätzen sprechen können","Waden und Oberschenkelrückseite sanft dehnen"]}},{"name":"W3 · Kurze Intervalle","week":3,"exercises":[],"cardio":{"sport":"run","distanceKm":8,"intensity":"Zone 5","purpose":"Die maximale aerobe Geschwindigkeit steigern: schneller laufen fällt leichter.","steps":["Aufwärmen: 15 min sehr locker traben, dann 4 Lauf-ABC-Übungen (Kniehebelauf, Anfersen) über 20 m","6 × 400 m schnell, 1 min 30 Trabpause","Auslaufen: 10 min sehr langsam traben, dann sanft dehnen"]}},{"name":"W3 · Langer Lauf","week":3,"exercises":[],"cardio":{"sport":"run","distanceKm":7,"intensity":"Zone 2","purpose":"Den Körper an lange Belastung gewöhnen: die wichtigste Einheit der Woche.","steps":["5 km in Zone 2","Die letzten 2 km etwas zügiger (Zone 3)","Zum Abschluss 5 min gehen"],"notes":"Bei Hitze Wasser mitnehmen."}},{"name":"W4 · Lockerer Lauf","week":4,"exercises":[],"cardio":{"sport":"run","distanceKm":4,"intensity":"Zone 2","purpose":"Die Grundlagenausdauer aufbauen, ohne Müdigkeit anzuhäufen.","steps":["5 min sehr langsam traben zum Einstieg","Gleichmäßiger Dauerlauf in angenehmem Tempo: Sie sollten in ganzen Sätzen sprechen können","Zum Schluss: 5 Steigerungsläufe über 80 m, gehend zurück"]}},{"name":"W4 · Lockeres Fahrtspiel","week":4,"exercises":[],"cardio":{"sport":"run","distanceKm":4,"intensity":"Zone 3","purpose":"Entlastungswoche: im Rhythmus bleiben und den Körper verarbeiten lassen.","steps":["10 min locker traben","6 × (1 min etwas schneller, 2 min locker)","10 min locker traben"]}},{"name":"W4 · Langer Lauf","week":4,"exercises":[],"cardio":{"sport":"run","distanceKm":6,"intensity":"Zone 2","purpose":"Den Körper an lange Belastung gewöhnen: die wichtigste Einheit der Woche.","steps":["Die ersten 10 Minuten ganz ruhig","Gleichmäßig in Zone 2 bis zum Ende, an Steigungen notfalls gehen","Zum Abschluss 5 min gehen"],"notes":"Bei Hitze Wasser mitnehmen."}},{"name":"W5 · Lockerer Lauf","week":5,"exercises":[],"cardio":{"sport":"run","distanceKm":5,"intensity":"Zone 2","purpose":"Die Grundlagenausdauer aufbauen, ohne Müdigkeit anzuhäufen.","steps":["5 min sehr langsam traben zum Einstieg","Gleichmäßiger Dauerlauf in angenehmem Tempo: Sie sollten in ganzen Sätzen sprechen können","Waden und Oberschenkelrückseite sanft dehnen"]}},{"name":"W5 · Lange Intervalle","week":5,"exercises":[],"cardio":{"sport":"run","distanceKm":9,"intensity":"Zone 4","purpose":"Die gewonnene Geschwindigkeit auf längeren Belastungen halten.","steps":["Aufwärmen: 15 min sehr locker traben, dann 4 Lauf-ABC-Übungen (Kniehebelauf, Anfersen) über 20 m","4 × 1000 m zügig, 2 min Trabpause","Auslaufen: 10 min sehr langsam traben, dann sanft dehnen"]}},{"name":"W5 · Langer Lauf","week":5,"exercises":[],"cardio":{"sport":"run","distanceKm":8,"intensity":"Zone 2","purpose":"Lernen, das Wettkampftempo mit müden Beinen zu halten.","steps":["6 km in Zone 2, gleichmäßig","Die letzten 2 km im 10-km-Tempo","Zum Abschluss 5 min gehen"],"notes":"Bei Hitze Wasser mitnehmen."}},{"name":"W6 · Lockerer Lauf","week":6,"exercises":[],"cardio":{"sport":"run","distanceKm":5,"intensity":"Zone 2","purpose":"Die Grundlagenausdauer aufbauen, ohne Müdigkeit anzuhäufen.","steps":["5 min sehr langsam traben zum Einstieg","Gleichmäßiger Dauerlauf in angenehmem Tempo: Sie sollten in ganzen Sätzen sprechen können","Zum Schluss: 5 Steigerungsläufe über 80 m, gehend zurück"]}},{"name":"W6 · Wettkampftempo","week":6,"exercises":[],"cardio":{"sport":"run","distanceKm":9,"intensity":"Wettkampftempo","purpose":"Das 10-km-Tempo verinnerlichen, um es am Wettkampftag ohne Uhr zu finden.","steps":["Aufwärmen: 15 min sehr locker traben, dann 4 Lauf-ABC-Übungen (Kniehebelauf, Anfersen) über 20 m","4 × 1 km im 10-km-Tempo, 2 min Pause","Auslaufen: 10 min sehr langsam traben, dann sanft dehnen"]}},{"name":"W6 · Langer Lauf","week":6,"exercises":[],"cardio":{"sport":"run","distanceKm":9,"intensity":"Zone 2","purpose":"Lernen, das Wettkampftempo mit müden Beinen zu halten.","steps":["6 km in Zone 2, gleichmäßig","Die letzten 3 km im 10-km-Tempo","Zum Abschluss 5 min gehen"],"notes":"Bei Hitze Wasser mitnehmen."}},{"name":"W7 · Lockerer Lauf","week":7,"exercises":[],"cardio":{"sport":"run","distanceKm":4,"intensity":"Zone 2","purpose":"Die Grundlagenausdauer aufbauen, ohne Müdigkeit anzuhäufen.","steps":["5 min sehr langsam traben zum Einstieg","Gleichmäßiger Dauerlauf in angenehmem Tempo: Sie sollten in ganzen Sätzen sprechen können","Waden und Oberschenkelrückseite sanft dehnen"]}},{"name":"W7 · Tempo-Erinnerung","week":7,"exercises":[],"cardio":{"sport":"run","distanceKm":4,"intensity":"Wettkampftempo","purpose":"Das Gefühl für Tempo behalten und dabei den Umfang senken.","steps":["Aufwärmen: 15 min sehr locker traben, dann 4 Lauf-ABC-Übungen (Kniehebelauf, Anfersen) über 20 m","3 × 1 km im 10-km-Tempo, 2 min Pause","Auslaufen: 10 min sehr langsam traben, dann sanft dehnen"]}},{"name":"W7 · Langer Lauf","week":7,"exercises":[],"cardio":{"sport":"run","distanceKm":7,"intensity":"Zone 2","purpose":"Den Körper an lange Belastung gewöhnen: die wichtigste Einheit der Woche.","steps":["Die ersten 10 Minuten ganz ruhig","Gleichmäßig in Zone 2 bis zum Ende, an Steigungen notfalls gehen","Zum Abschluss 5 min gehen"],"notes":"Bei Hitze Wasser mitnehmen."}},{"name":"W8 · Lockerer Lauf","week":8,"exercises":[],"cardio":{"sport":"run","distanceKm":6,"intensity":"Zone 2","purpose":"In Bewegung bleiben, ohne die Reserven anzugreifen.","steps":["Kurz und locker laufen","3 Steigerungsläufe über 80 m, um die Beine zu wecken"]}},{"name":"W8 · Aktivierung","week":8,"exercises":[],"cardio":{"sport":"run","distanceKm":4,"intensity":"Zone 3","purpose":"Zwei oder drei Tage vor dem Wettkampf: spritzig bleiben, ohne zu ermüden.","steps":["15 min locker traben","3 × 2 min im 10-km-Tempo, 2 min Pause","5 min langsam traben"]}},{"name":"W8 · 10 km","week":8,"exercises":[],"cardio":{"sport":"run","distanceKm":10,"intensity":"Wettkampf","purpose":"Wettkampftag: die geleistete Arbeit genießen.","steps":["Am Vortag: gewohnte, kohlenhydratreiche Mahlzeit, Ausrüstung bereit, Startnummer angesteckt","Aufwärmen: 10 min traben und 3 Steigerungsläufe","Erstes Drittel: im 10-km-Tempo starten, trotz der Startaufregung keinesfalls schneller","Zweites Drittel: gleichmäßig bleiben und wie im Training verpflegen","Letztes Drittel: Schultern lockern und beschleunigen, wenn die Beine es zulassen"],"notes":"Viel Erfolg!"}}]'::jsonb, true, 220, 'de'
WHERE NOT EXISTS (SELECT 1 FROM program_templates WHERE name = '10 km in 8 Wochen' AND locale = 'de');

INSERT INTO program_templates (name, description, goal, level, days_per_week, home_friendly, structure, is_published, sort_order, locale)
SELECT 'Laufeinstieg: 5 km', 'Von null auf 5 km in 8 Wochen, im Wechsel von Laufen und Gehen. Jede Woche werden die Laufzeiten etwas länger; wiederholen Sie bei Bedarf eine Woche. Vor dem Start ärztlichen Rat einholen. Nach Gefühl anpassen.', 'endurance', 'beginner', 3, false, '[{"name":"W1 · Einheit 1","week":1,"exercises":[],"cardio":{"sport":"run","durationMin":34,"intensity":"Zone 2","purpose":"Sanft beginnen: der Körper gewöhnt sich an die Belastung des Laufens.","steps":["Aufwärmen: 5 min zügig gehen","8 × (1 min laufen, 2 min gehen)","Abwärmen: 5 min gehen, dann Waden dehnen"],"notes":"Laufen Sie langsam: wenn Sie nicht sprechen können, werden Sie langsamer."}},{"name":"W1 · Einheit 2","week":1,"exercises":[],"cardio":{"sport":"run","durationMin":34,"intensity":"Zone 2","purpose":"Sanft beginnen: der Körper gewöhnt sich an die Belastung des Laufens.","steps":["Aufwärmen: 5 min zügig gehen","8 × (1 min laufen, 2 min gehen)","Abwärmen: 5 min gehen, dann Waden dehnen"],"notes":"Laufen Sie langsam: wenn Sie nicht sprechen können, werden Sie langsamer."}},{"name":"W1 · Einheit 3","week":1,"exercises":[],"cardio":{"sport":"run","durationMin":34,"intensity":"Zone 2","purpose":"Sanft beginnen: der Körper gewöhnt sich an die Belastung des Laufens.","steps":["Aufwärmen: 5 min zügig gehen","8 × (1 min laufen, 2 min gehen)","Abwärmen: 5 min gehen, dann Waden dehnen"],"notes":"War die Einheit zu hart, wiederholen Sie die Woche, bevor Sie weitergehen."}},{"name":"W2 · Einheit 1","week":2,"exercises":[],"cardio":{"sport":"run","durationMin":34,"intensity":"Zone 2","purpose":"Die Laufzeiten etwas verlängern.","steps":["Aufwärmen: 5 min zügig gehen","6 × (2 min laufen, 2 min gehen)","Abwärmen: 5 min gehen, dann Waden dehnen"],"notes":"Laufen Sie langsam: wenn Sie nicht sprechen können, werden Sie langsamer."}},{"name":"W2 · Einheit 2","week":2,"exercises":[],"cardio":{"sport":"run","durationMin":34,"intensity":"Zone 2","purpose":"Die Laufzeiten etwas verlängern.","steps":["Aufwärmen: 5 min zügig gehen","6 × (2 min laufen, 2 min gehen)","Abwärmen: 5 min gehen, dann Waden dehnen"],"notes":"Laufen Sie langsam: wenn Sie nicht sprechen können, werden Sie langsamer."}},{"name":"W2 · Einheit 3","week":2,"exercises":[],"cardio":{"sport":"run","durationMin":34,"intensity":"Zone 2","purpose":"Die Laufzeiten etwas verlängern.","steps":["Aufwärmen: 5 min zügig gehen","6 × (2 min laufen, 2 min gehen)","Abwärmen: 5 min gehen, dann Waden dehnen"],"notes":"War die Einheit zu hart, wiederholen Sie die Woche, bevor Sie weitergehen."}},{"name":"W3 · Einheit 1","week":3,"exercises":[],"cardio":{"sport":"run","durationMin":35,"intensity":"Zone 2","purpose":"Die Atmung findet ihren Rhythmus: 3 Minuten laufen wird selbstverständlich.","steps":["Aufwärmen: 5 min zügig gehen","5 × (3 min laufen, 2 min gehen)","Abwärmen: 5 min gehen, dann Waden dehnen"],"notes":"Laufen Sie langsam: wenn Sie nicht sprechen können, werden Sie langsamer."}},{"name":"W3 · Einheit 2","week":3,"exercises":[],"cardio":{"sport":"run","durationMin":35,"intensity":"Zone 2","purpose":"Die Atmung findet ihren Rhythmus: 3 Minuten laufen wird selbstverständlich.","steps":["Aufwärmen: 5 min zügig gehen","5 × (3 min laufen, 2 min gehen)","Abwärmen: 5 min gehen, dann Waden dehnen"],"notes":"Laufen Sie langsam: wenn Sie nicht sprechen können, werden Sie langsamer."}},{"name":"W3 · Einheit 3","week":3,"exercises":[],"cardio":{"sport":"run","durationMin":35,"intensity":"Zone 2","purpose":"Die Atmung findet ihren Rhythmus: 3 Minuten laufen wird selbstverständlich.","steps":["Aufwärmen: 5 min zügig gehen","5 × (3 min laufen, 2 min gehen)","Abwärmen: 5 min gehen, dann Waden dehnen"],"notes":"War die Einheit zu hart, wiederholen Sie die Woche, bevor Sie weitergehen."}},{"name":"W4 · Einheit 1","week":4,"exercises":[],"cardio":{"sport":"run","durationMin":36,"intensity":"Zone 2","purpose":"Erster echter Meilenstein: 5 Minuten ohne Pause.","steps":["Aufwärmen: 5 min zügig gehen","4 × (5 min laufen, 1 min 30 gehen)","Abwärmen: 5 min gehen, dann Waden dehnen"],"notes":"Laufen Sie langsam: wenn Sie nicht sprechen können, werden Sie langsamer."}},{"name":"W4 · Einheit 2","week":4,"exercises":[],"cardio":{"sport":"run","durationMin":36,"intensity":"Zone 2","purpose":"Erster echter Meilenstein: 5 Minuten ohne Pause.","steps":["Aufwärmen: 5 min zügig gehen","4 × (5 min laufen, 1 min 30 gehen)","Abwärmen: 5 min gehen, dann Waden dehnen"],"notes":"Laufen Sie langsam: wenn Sie nicht sprechen können, werden Sie langsamer."}},{"name":"W4 · Einheit 3","week":4,"exercises":[],"cardio":{"sport":"run","durationMin":36,"intensity":"Zone 2","purpose":"Erster echter Meilenstein: 5 Minuten ohne Pause.","steps":["Aufwärmen: 5 min zügig gehen","4 × (5 min laufen, 1 min 30 gehen)","Abwärmen: 5 min gehen, dann Waden dehnen"],"notes":"War die Einheit zu hart, wiederholen Sie die Woche, bevor Sie weitergehen."}},{"name":"W5 · Einheit 1","week":5,"exercises":[],"cardio":{"sport":"run","durationMin":37,"intensity":"Zone 2","purpose":"Die Blöcke werden länger, die Pausen kürzer.","steps":["Aufwärmen: 5 min zügig gehen","3 × (8 min laufen, 1 min 30 gehen)","Abwärmen: 5 min gehen, dann Waden dehnen"],"notes":"Laufen Sie langsam: wenn Sie nicht sprechen können, werden Sie langsamer."}},{"name":"W5 · Einheit 2","week":5,"exercises":[],"cardio":{"sport":"run","durationMin":37,"intensity":"Zone 2","purpose":"Die Blöcke werden länger, die Pausen kürzer.","steps":["Aufwärmen: 5 min zügig gehen","3 × (8 min laufen, 1 min 30 gehen)","Abwärmen: 5 min gehen, dann Waden dehnen"],"notes":"Laufen Sie langsam: wenn Sie nicht sprechen können, werden Sie langsamer."}},{"name":"W5 · Einheit 3","week":5,"exercises":[],"cardio":{"sport":"run","durationMin":37,"intensity":"Zone 2","purpose":"Die Blöcke werden länger, die Pausen kürzer.","steps":["Aufwärmen: 5 min zügig gehen","3 × (8 min laufen, 1 min 30 gehen)","Abwärmen: 5 min gehen, dann Waden dehnen"],"notes":"War die Einheit zu hart, wiederholen Sie die Woche, bevor Sie weitergehen."}},{"name":"W6 · Einheit 1","week":6,"exercises":[],"cardio":{"sport":"run","durationMin":38,"intensity":"Zone 2","purpose":"Nur noch zwei Blöcke: Sie laufen fast 25 Minuten.","steps":["Aufwärmen: 5 min zügig gehen","2 × (12 min laufen, 1 min 30 gehen)","Abwärmen: 5 min gehen, dann Waden dehnen"],"notes":"Laufen Sie langsam: wenn Sie nicht sprechen können, werden Sie langsamer."}},{"name":"W6 · Einheit 2","week":6,"exercises":[],"cardio":{"sport":"run","durationMin":38,"intensity":"Zone 2","purpose":"Nur noch zwei Blöcke: Sie laufen fast 25 Minuten.","steps":["Aufwärmen: 5 min zügig gehen","2 × (12 min laufen, 1 min 30 gehen)","Abwärmen: 5 min gehen, dann Waden dehnen"],"notes":"Laufen Sie langsam: wenn Sie nicht sprechen können, werden Sie langsamer."}},{"name":"W6 · Einheit 3","week":6,"exercises":[],"cardio":{"sport":"run","durationMin":38,"intensity":"Zone 2","purpose":"Nur noch zwei Blöcke: Sie laufen fast 25 Minuten.","steps":["Aufwärmen: 5 min zügig gehen","2 × (12 min laufen, 1 min 30 gehen)","Abwärmen: 5 min gehen, dann Waden dehnen"],"notes":"War die Einheit zu hart, wiederholen Sie die Woche, bevor Sie weitergehen."}},{"name":"W7 · Einheit 1","week":7,"exercises":[],"cardio":{"sport":"run","durationMin":40,"intensity":"Zone 2","purpose":"Der große Schritt: 25 Minuten am Stück.","steps":["Aufwärmen: 5 min zügig gehen","25 min laufen ohne Pause","Abwärmen: 5 min gehen, dann Waden dehnen"],"notes":"Laufen Sie langsam: wenn Sie nicht sprechen können, werden Sie langsamer."}},{"name":"W7 · Einheit 2","week":7,"exercises":[],"cardio":{"sport":"run","durationMin":40,"intensity":"Zone 2","purpose":"Der große Schritt: 25 Minuten am Stück.","steps":["Aufwärmen: 5 min zügig gehen","25 min laufen ohne Pause","Abwärmen: 5 min gehen, dann Waden dehnen"],"notes":"Laufen Sie langsam: wenn Sie nicht sprechen können, werden Sie langsamer."}},{"name":"W7 · Einheit 3","week":7,"exercises":[],"cardio":{"sport":"run","durationMin":40,"intensity":"Zone 2","purpose":"Der große Schritt: 25 Minuten am Stück.","steps":["Aufwärmen: 5 min zügig gehen","25 min laufen ohne Pause","Abwärmen: 5 min gehen, dann Waden dehnen"],"notes":"War die Einheit zu hart, wiederholen Sie die Woche, bevor Sie weitergehen."}},{"name":"W8 · Einheit 1","week":8,"exercises":[],"cardio":{"sport":"run","durationMin":35,"intensity":"Zone 2","purpose":"Bestätigen: 25 Minuten laufen, diesmal mit mehr Leichtigkeit.","steps":["5 min zügig gehen","25 min Dauerlauf","5 min gehen"]}},{"name":"W8 · Einheit 2","week":8,"exercises":[],"cardio":{"sport":"run","durationMin":25,"intensity":"Zone 2","purpose":"Eine kurze Einheit, um frisch anzukommen.","steps":["5 min zügig gehen","15 min locker laufen","5 min gehen"]}},{"name":"W8 · Ziel 5 km","week":8,"exercises":[],"cardio":{"sport":"run","distanceKm":5,"intensity":"Wettkampf","purpose":"Ihre ersten 5 km: Ziel ist das Ankommen, nicht die Zeit.","steps":["5 min zügig gehen und 2 min traben","Den ersten Kilometer langsamer als gedacht","Ab Kilometer 4 schneller werden, wenn Sie sich gut fühlen"],"notes":"Glückwunsch, Sie sind Läufer!"}}]'::jsonb, true, 230, 'de'
WHERE NOT EXISTS (SELECT 1 FROM program_templates WHERE name = 'Laufeinstieg: 5 km' AND locale = 'de');

INSERT INTO program_templates (name, description, goal, level, days_per_week, home_friendly, structure, is_published, sort_order, locale)
SELECT 'Schwimmausdauer', 'Für alle, die bereits 200 m Kraul schwimmen. Jede Woche: eine Technikeinheit mit neuer Übung, eine Serieneinheit, eine Ausdauereinheit. Entlastungswoche 4, in Woche 8 ein 400-m-Test und 1500 m am Stück. Vor dem Start ärztlichen Rat einholen. Nach Gefühl anpassen.', 'endurance', 'intermediate', 3, false, '[{"name":"W1 · Technik","week":1,"exercises":[],"cardio":{"sport":"swim","distanceKm":1.5,"intensity":"Zone 2","purpose":"Besser schwimmen, bevor Sie mehr schwimmen: bessere Gleitphase ist geschenkte Geschwindigkeit.","steps":["Einschwimmen: 200 m locker Kraul, 100 m Rücken","Technikübung: 4 × 50 m Abschlagschwimmen (eine Hand wartet vorne auf die andere), 15 s Pause","4 × 50 m Beinschlag mit Brett, 20 s Pause","5 × 100 m Gesamtbewegung mit der Technikübung im Kopf, 20 s Pause","200 m mit Pull-Buoy, Fokus auf den Armzug","Ausschwimmen: 100 m Rücken oder Brust, ganz locker"]}},{"name":"W1 · Serien","week":1,"exercises":[],"cardio":{"sport":"swim","distanceKm":1,"intensity":"Zone 4","purpose":"Den Körper daran gewöhnen, mit kurzen Pausen schnell zu schwimmen.","steps":["Einschwimmen: 200 m locker Kraul, 4 × 25 m steigernd","4 × 25 m schnell, 30 s Pause","8 × 50 m zügig, 20 s Pause","Ausschwimmen: 200 m ganz locker, Lagen wechseln"]}},{"name":"W1 · Ausdauer","week":1,"exercises":[],"cardio":{"sport":"swim","distanceKm":0.9,"intensity":"Zone 2","purpose":"Lange ohne Pause schwimmen, in einem Tempo, das Sie noch halten könnten.","steps":["Einschwimmen: 200 m mit wechselnden Lagen","600 m durchgehend und gleichmäßig schwimmen, wenn möglich mit Dreier-Atmung","Ausschwimmen: 100 m Rücken"]}},{"name":"W2 · Technik","week":2,"exercises":[],"cardio":{"sport":"swim","distanceKm":1.6,"intensity":"Zone 2","purpose":"Besser schwimmen, bevor Sie mehr schwimmen: bessere Gleitphase ist geschenkte Geschwindigkeit.","steps":["Einschwimmen: 200 m locker Kraul, 100 m Rücken","Technikübung: 4 × 50 m Fäuste (den Druck des Unterarms spüren), 15 s Pause","4 × 50 m Beinschlag mit Brett, 20 s Pause","6 × 100 m Gesamtbewegung mit der Technikübung im Kopf, 20 s Pause","200 m mit Pull-Buoy, Fokus auf den Armzug","Ausschwimmen: 100 m Rücken oder Brust, ganz locker"]}},{"name":"W2 · Serien","week":2,"exercises":[],"cardio":{"sport":"swim","distanceKm":1.2,"intensity":"Zone 4","purpose":"Den Körper daran gewöhnen, mit kurzen Pausen schnell zu schwimmen.","steps":["Einschwimmen: 200 m locker Kraul, 4 × 25 m steigernd","4 × 25 m schnell, 30 s Pause","6 × 100 m zügig, 20 s Pause","Ausschwimmen: 200 m ganz locker, Lagen wechseln"]}},{"name":"W2 · Ausdauer","week":2,"exercises":[],"cardio":{"sport":"swim","distanceKm":1.1,"intensity":"Zone 2","purpose":"Lange ohne Pause schwimmen, in einem Tempo, das Sie noch halten könnten.","steps":["Einschwimmen: 200 m mit wechselnden Lagen","800 m durchgehend und gleichmäßig schwimmen, wenn möglich mit Dreier-Atmung","Ausschwimmen: 100 m Rücken"]}},{"name":"W3 · Technik","week":3,"exercises":[],"cardio":{"sport":"swim","distanceKm":1.7,"intensity":"Zone 2","purpose":"Besser schwimmen, bevor Sie mehr schwimmen: bessere Gleitphase ist geschenkte Geschwindigkeit.","steps":["Einschwimmen: 200 m locker Kraul, 100 m Rücken","Technikübung: 4 × 50 m 6 Beinschläge in Seitenlage, dann 1 Armzug, 15 s Pause","4 × 50 m Beinschlag mit Brett, 20 s Pause","7 × 100 m Gesamtbewegung mit der Technikübung im Kopf, 20 s Pause","200 m mit Pull-Buoy, Fokus auf den Armzug","Ausschwimmen: 100 m Rücken oder Brust, ganz locker"]}},{"name":"W3 · Serien","week":3,"exercises":[],"cardio":{"sport":"swim","distanceKm":1.4,"intensity":"Zone 4","purpose":"Den Körper daran gewöhnen, mit kurzen Pausen schnell zu schwimmen.","steps":["Einschwimmen: 200 m locker Kraul, 4 × 25 m steigernd","4 × 25 m schnell, 30 s Pause","Pyramide 50-100-150-200-150-100-50 m zügig, 20 s Pause","Ausschwimmen: 200 m ganz locker, Lagen wechseln"]}},{"name":"W3 · Ausdauer","week":3,"exercises":[],"cardio":{"sport":"swim","distanceKm":1.3,"intensity":"Zone 2","purpose":"Lange ohne Pause schwimmen, in einem Tempo, das Sie noch halten könnten.","steps":["Einschwimmen: 200 m mit wechselnden Lagen","1000 m durchgehend und gleichmäßig schwimmen, wenn möglich mit Dreier-Atmung","Ausschwimmen: 100 m Rücken"]}},{"name":"W4 · Technik","week":4,"exercises":[],"cardio":{"sport":"swim","distanceKm":1.4,"intensity":"Zone 2","purpose":"Besser schwimmen, bevor Sie mehr schwimmen: bessere Gleitphase ist geschenkte Geschwindigkeit.","steps":["Einschwimmen: 200 m locker Kraul, 100 m Rücken","Technikübung: 4 × 50 m Dreier-Atmung, 15 s Pause","4 × 50 m Beinschlag mit Brett, 20 s Pause","4 × 100 m Gesamtbewegung mit der Technikübung im Kopf, 20 s Pause","200 m mit Pull-Buoy, Fokus auf den Armzug","Ausschwimmen: 100 m Rücken oder Brust, ganz locker"]}},{"name":"W4 · Serien","week":4,"exercises":[],"cardio":{"sport":"swim","distanceKm":0.9,"intensity":"Zone 2","purpose":"Den Körper daran gewöhnen, mit kurzen Pausen schnell zu schwimmen.","steps":["Einschwimmen: 200 m locker Kraul, 4 × 25 m steigernd","4 × 25 m schnell, 30 s Pause","6 × 50 m locker, 20 s Pause","Ausschwimmen: 200 m ganz locker, Lagen wechseln"]}},{"name":"W4 · Ausdauer","week":4,"exercises":[],"cardio":{"sport":"swim","distanceKm":0.9,"intensity":"Zone 2","purpose":"Lange ohne Pause schwimmen, in einem Tempo, das Sie noch halten könnten.","steps":["Einschwimmen: 200 m mit wechselnden Lagen","600 m durchgehend und gleichmäßig schwimmen, wenn möglich mit Dreier-Atmung","Ausschwimmen: 100 m Rücken"]}},{"name":"W5 · Technik","week":5,"exercises":[],"cardio":{"sport":"swim","distanceKm":1.9,"intensity":"Zone 2","purpose":"Besser schwimmen, bevor Sie mehr schwimmen: bessere Gleitphase ist geschenkte Geschwindigkeit.","steps":["Einschwimmen: 200 m locker Kraul, 100 m Rücken","Technikübung: 4 × 50 m Wriggen vorne (Hände vorne, kleine Bewegungen), 15 s Pause","4 × 50 m Beinschlag mit Brett, 20 s Pause","9 × 100 m Gesamtbewegung mit der Technikübung im Kopf, 20 s Pause","200 m mit Pull-Buoy, Fokus auf den Armzug","Ausschwimmen: 100 m Rücken oder Brust, ganz locker"]}},{"name":"W5 · Serien","week":5,"exercises":[],"cardio":{"sport":"swim","distanceKm":1.4,"intensity":"Zone 4","purpose":"Den Körper daran gewöhnen, mit kurzen Pausen schnell zu schwimmen.","steps":["Einschwimmen: 200 m locker Kraul, 4 × 25 m steigernd","4 × 25 m schnell, 30 s Pause","8 × 100 m im Schwellentempo, 15 s Pause","Ausschwimmen: 200 m ganz locker, Lagen wechseln"]}},{"name":"W5 · Ausdauer","week":5,"exercises":[],"cardio":{"sport":"swim","distanceKm":1.5,"intensity":"Zone 2","purpose":"Lange ohne Pause schwimmen, in einem Tempo, das Sie noch halten könnten.","steps":["Einschwimmen: 200 m mit wechselnden Lagen","1200 m durchgehend und gleichmäßig schwimmen, wenn möglich mit Dreier-Atmung","Ausschwimmen: 100 m Rücken"],"notes":"Wenn Sie anhalten müssen, nach 20 s am Rand weiterschwimmen: es zählt die Distanz."}},{"name":"W6 · Technik","week":6,"exercises":[],"cardio":{"sport":"swim","distanceKm":2,"intensity":"Zone 2","purpose":"Besser schwimmen, bevor Sie mehr schwimmen: bessere Gleitphase ist geschenkte Geschwindigkeit.","steps":["Einschwimmen: 200 m locker Kraul, 100 m Rücken","Technikübung: 4 × 50 m einarmig (der andere Arm am Körper), 15 s Pause","4 × 50 m Beinschlag mit Brett, 20 s Pause","10 × 100 m Gesamtbewegung mit der Technikübung im Kopf, 20 s Pause","200 m mit Pull-Buoy, Fokus auf den Armzug","Ausschwimmen: 100 m Rücken oder Brust, ganz locker"]}},{"name":"W6 · Serien","week":6,"exercises":[],"cardio":{"sport":"swim","distanceKm":1.4,"intensity":"Zone 4","purpose":"Den Körper daran gewöhnen, mit kurzen Pausen schnell zu schwimmen.","steps":["Einschwimmen: 200 m locker Kraul, 4 × 25 m steigernd","4 × 25 m schnell, 30 s Pause","4 × 200 m im Schwellentempo, 30 s Pause","Ausschwimmen: 200 m ganz locker, Lagen wechseln"]}},{"name":"W6 · Ausdauer","week":6,"exercises":[],"cardio":{"sport":"swim","distanceKm":1.8,"intensity":"Zone 2","purpose":"Lange ohne Pause schwimmen, in einem Tempo, das Sie noch halten könnten.","steps":["Einschwimmen: 200 m mit wechselnden Lagen","1500 m durchgehend und gleichmäßig schwimmen, wenn möglich mit Dreier-Atmung","Ausschwimmen: 100 m Rücken"],"notes":"Wenn Sie anhalten müssen, nach 20 s am Rand weiterschwimmen: es zählt die Distanz."}},{"name":"W7 · Technik","week":7,"exercises":[],"cardio":{"sport":"swim","distanceKm":2,"intensity":"Zone 2","purpose":"Besser schwimmen, bevor Sie mehr schwimmen: bessere Gleitphase ist geschenkte Geschwindigkeit.","steps":["Einschwimmen: 200 m locker Kraul, 100 m Rücken","Technikübung: 4 × 50 m Abschlagschwimmen, Armzüge pro Bahn zählen, 15 s Pause","4 × 50 m Beinschlag mit Brett, 20 s Pause","10 × 100 m Gesamtbewegung mit der Technikübung im Kopf, 20 s Pause","200 m mit Pull-Buoy, Fokus auf den Armzug","Ausschwimmen: 100 m Rücken oder Brust, ganz locker"]}},{"name":"W7 · Serien","week":7,"exercises":[],"cardio":{"sport":"swim","distanceKm":1.6,"intensity":"Zone 4","purpose":"Den Körper daran gewöhnen, mit kurzen Pausen schnell zu schwimmen.","steps":["Einschwimmen: 200 m locker Kraul, 4 × 25 m steigernd","4 × 25 m schnell, 30 s Pause","10 × 100 m im Schwellentempo, 15 s Pause","Ausschwimmen: 200 m ganz locker, Lagen wechseln"]}},{"name":"W7 · Ausdauer","week":7,"exercises":[],"cardio":{"sport":"swim","distanceKm":2.1,"intensity":"Zone 2","purpose":"Lange ohne Pause schwimmen, in einem Tempo, das Sie noch halten könnten.","steps":["Einschwimmen: 200 m mit wechselnden Lagen","1800 m durchgehend und gleichmäßig schwimmen, wenn möglich mit Dreier-Atmung","Ausschwimmen: 100 m Rücken"],"notes":"Wenn Sie anhalten müssen, nach 20 s am Rand weiterschwimmen: es zählt die Distanz."}},{"name":"W8 · Technik","week":8,"exercises":[],"cardio":{"sport":"swim","distanceKm":2,"intensity":"Zone 2","purpose":"Besser schwimmen, bevor Sie mehr schwimmen: bessere Gleitphase ist geschenkte Geschwindigkeit.","steps":["Einschwimmen: 200 m locker Kraul, 100 m Rücken","Technikübung: 4 × 50 m Gesamtbewegung, mit einem Armzug weniger pro Bahn, 15 s Pause","4 × 50 m Beinschlag mit Brett, 20 s Pause","10 × 100 m Gesamtbewegung mit der Technikübung im Kopf, 20 s Pause","200 m mit Pull-Buoy, Fokus auf den Armzug","Ausschwimmen: 100 m Rücken oder Brust, ganz locker"]}},{"name":"W8 · Test","week":8,"exercises":[],"cardio":{"sport":"swim","distanceKm":1,"intensity":"Zone 4","purpose":"Fortschritt messen: vergleichen Sie diese 400 m mit denen in einigen Monaten.","steps":["Einschwimmen: 200 m locker Kraul, 4 × 25 m steigernd","4 × 25 m schnell, 30 s Pause","Test: 400 m auf Zeit, notieren Sie Ihre Zeit","Ausschwimmen: 200 m ganz locker, Lagen wechseln"]}},{"name":"W8 · Ziel 1500 m","week":8,"exercises":[],"cardio":{"sport":"swim","distanceKm":1.8,"intensity":"Zone 2","purpose":"Das Ziel des Plans: 1500 m ohne Pause.","steps":["Einschwimmen: 200 m mit wechselnden Lagen","1500 m durchgehend und gleichmäßig schwimmen, wenn möglich mit Dreier-Atmung","Ausschwimmen: 100 m Rücken"],"notes":"Wenn Sie anhalten müssen, nach 20 s am Rand weiterschwimmen: es zählt die Distanz."}}]'::jsonb, true, 240, 'de'
WHERE NOT EXISTS (SELECT 1 FROM program_templates WHERE name = 'Schwimmausdauer' AND locale = 'de');

INSERT INTO program_templates (name, description, goal, level, days_per_week, home_friendly, structure, is_published, sort_order, locale)
SELECT 'Radausdauer', 'Drei Ausfahrten pro Woche: Trittfrequenz, Intervalle vom Sweet Spot bis zur Kraft und eine lange Ausfahrt bis 2 h 30. Entlastungswoche 4. Auch auf dem Rollentrainer möglich. Vor dem Start ärztlichen Rat einholen. Nach Gefühl anpassen.', 'endurance', 'intermediate', 3, false, '[{"name":"W1 · Trittfrequenz","week":1,"exercises":[],"cardio":{"sport":"bike","durationMin":48,"intensity":"Zone 2","purpose":"Runder und lockerer treten, um die Beine auf langen Ausfahrten zu schonen.","steps":["10 min sehr locker, kleiner Gang","5 × 1 min mit hoher Trittfrequenz (100-110 U/min) ohne Druck, dazwischen 2 min normal","Der Rest in Zone 2, Trittfrequenz um 90 U/min","Zum Schluss 5 min sehr locker"]}},{"name":"W1 · Intervalle","week":1,"exercises":[],"cardio":{"sport":"bike","durationMin":61,"intensity":"Zone 3","purpose":"Der Sweet Spot: viel Wirkung bei vertretbarer Ermüdung.","steps":["Aufwärmen: 15 min steigernd, mit 3 Antritten von 15 s","3 × 8 min in Zone 3-4, 4 min Pause","Ausfahren: 10 min sehr locker"],"notes":"Auf dem Rollentrainer ideal: keine Ampeln oder Abfahrten, die die Belastung unterbrechen."}},{"name":"W1 · Lange Ausfahrt","week":1,"exercises":[],"cardio":{"sport":"bike","durationMin":60,"intensity":"Zone 2","purpose":"Die Grundlage aufbauen: die Basis für alles andere.","steps":["15 min sehr locker einrollen","Gleichmäßig in Zone 2: an Anstiegen sitzen bleiben und leichter schalten","Zum Schluss 10 min sehr locker"],"notes":"Eine Trinkflasche genügt, für alle Fälle einen Riegel mitnehmen."}},{"name":"W2 · Trittfrequenz","week":2,"exercises":[],"cardio":{"sport":"bike","durationMin":51,"intensity":"Zone 2","purpose":"Runder und lockerer treten, um die Beine auf langen Ausfahrten zu schonen.","steps":["10 min sehr locker, kleiner Gang","6 × 1 min mit hoher Trittfrequenz (100-110 U/min) ohne Druck, dazwischen 2 min normal","Der Rest in Zone 2, Trittfrequenz um 90 U/min","Zum Schluss 5 min sehr locker"]}},{"name":"W2 · Intervalle","week":2,"exercises":[],"cardio":{"sport":"bike","durationMin":67,"intensity":"Zone 3","purpose":"Längere Blöcke, um ein zügiges Tempo länger zu halten.","steps":["Aufwärmen: 15 min steigernd, mit 3 Antritten von 15 s","3 × 10 min in Zone 3-4, 4 min Pause","Ausfahren: 10 min sehr locker"],"notes":"Auf dem Rollentrainer ideal: keine Ampeln oder Abfahrten, die die Belastung unterbrechen."}},{"name":"W2 · Lange Ausfahrt","week":2,"exercises":[],"cardio":{"sport":"bike","durationMin":75,"intensity":"Zone 2","purpose":"Die Grundlage aufbauen: die Basis für alles andere.","steps":["15 min sehr locker einrollen","Gleichmäßig in Zone 2: an Anstiegen sitzen bleiben und leichter schalten","Zum Schluss 10 min sehr locker"],"notes":"Eine Trinkflasche genügt, für alle Fälle einen Riegel mitnehmen."}},{"name":"W3 · Trittfrequenz","week":3,"exercises":[],"cardio":{"sport":"bike","durationMin":54,"intensity":"Zone 2","purpose":"Runder und lockerer treten, um die Beine auf langen Ausfahrten zu schonen.","steps":["10 min sehr locker, kleiner Gang","8 × 1 min mit hoher Trittfrequenz (100-110 U/min) ohne Druck, dazwischen 2 min normal","Der Rest in Zone 2, Trittfrequenz um 90 U/min","Zum Schluss 5 min sehr locker"]}},{"name":"W3 · Intervalle","week":3,"exercises":[],"cardio":{"sport":"bike","durationMin":60,"intensity":"Zone 4","purpose":"Schwellentraining: die Belastung, die auf dem Rad am meisten bringt.","steps":["Aufwärmen: 15 min steigernd, mit 3 Antritten von 15 s","2 × 15 min in Zone 4, 5 min Pause","Ausfahren: 10 min sehr locker"],"notes":"Auf dem Rollentrainer ideal: keine Ampeln oder Abfahrten, die die Belastung unterbrechen."}},{"name":"W3 · Lange Ausfahrt","week":3,"exercises":[],"cardio":{"sport":"bike","durationMin":90,"intensity":"Zone 2","purpose":"Die Grundlage aufbauen: die Basis für alles andere.","steps":["15 min sehr locker einrollen","Gleichmäßig in Zone 2: an Anstiegen sitzen bleiben und leichter schalten","Zum Schluss 10 min sehr locker"],"notes":"Ab der ersten Stunde alle 15 min trinken und alle 30 bis 40 min essen."}},{"name":"W4 · Trittfrequenz","week":4,"exercises":[],"cardio":{"sport":"bike","durationMin":40,"intensity":"Zone 2","purpose":"Runder und lockerer treten, um die Beine auf langen Ausfahrten zu schonen.","steps":["10 min sehr locker, kleiner Gang","4 × 1 min mit hoher Trittfrequenz (100-110 U/min) ohne Druck, dazwischen 2 min normal","Der Rest in Zone 2, Trittfrequenz um 90 U/min","Zum Schluss 5 min sehr locker"]}},{"name":"W4 · Intervalle","week":4,"exercises":[],"cardio":{"sport":"bike","durationMin":37,"intensity":"Zone 3","purpose":"Entlastungswoche: etwas Rhythmus, ohne Ermüdung.","steps":["Aufwärmen: 15 min steigernd, mit 3 Antritten von 15 s","4 × 1 min flott, 2 min Pause","Ausfahren: 10 min sehr locker"],"notes":"Auf dem Rollentrainer ideal: keine Ampeln oder Abfahrten, die die Belastung unterbrechen."}},{"name":"W4 · Lange Ausfahrt","week":4,"exercises":[],"cardio":{"sport":"bike","durationMin":60,"intensity":"Zone 2","purpose":"Die Grundlage aufbauen: die Basis für alles andere.","steps":["15 min sehr locker einrollen","Gleichmäßig in Zone 2: an Anstiegen sitzen bleiben und leichter schalten","Zum Schluss 10 min sehr locker"],"notes":"Eine Trinkflasche genügt, für alle Fälle einen Riegel mitnehmen."}},{"name":"W5 · Trittfrequenz","week":5,"exercises":[],"cardio":{"sport":"bike","durationMin":60,"intensity":"Zone 2","purpose":"Runder und lockerer treten, um die Beine auf langen Ausfahrten zu schonen.","steps":["10 min sehr locker, kleiner Gang","8 × 1 min mit hoher Trittfrequenz (100-110 U/min) ohne Druck, dazwischen 2 min normal","Der Rest in Zone 2, Trittfrequenz um 90 U/min","Zum Schluss 5 min sehr locker"]}},{"name":"W5 · Intervalle","week":5,"exercises":[],"cardio":{"sport":"bike","durationMin":55,"intensity":"Zone 5","purpose":"Kraft für Anstiege und Antritte aufbauen.","steps":["Aufwärmen: 15 min steigernd, mit 3 Antritten von 15 s","5 × 3 min in Zone 5, 3 min Pause","Ausfahren: 10 min sehr locker"],"notes":"Auf dem Rollentrainer ideal: keine Ampeln oder Abfahrten, die die Belastung unterbrechen."}},{"name":"W5 · Lange Ausfahrt","week":5,"exercises":[],"cardio":{"sport":"bike","durationMin":105,"intensity":"Zone 2","purpose":"Die Grundlage aufbauen: die Basis für alles andere.","steps":["15 min sehr locker einrollen","Zone 2, mit 2 × 10 min in Zone 3 in der letzten Stunde","Zum Schluss 10 min sehr locker"],"notes":"Ab der ersten Stunde alle 15 min trinken und alle 30 bis 40 min essen."}},{"name":"W6 · Trittfrequenz","week":6,"exercises":[],"cardio":{"sport":"bike","durationMin":60,"intensity":"Zone 2","purpose":"Runder und lockerer treten, um die Beine auf langen Ausfahrten zu schonen.","steps":["10 min sehr locker, kleiner Gang","10 × 1 min mit hoher Trittfrequenz (100-110 U/min) ohne Druck, dazwischen 2 min normal","Der Rest in Zone 2, Trittfrequenz um 90 U/min","Zum Schluss 5 min sehr locker"]}},{"name":"W6 · Intervalle","week":6,"exercises":[],"cardio":{"sport":"bike","durationMin":70,"intensity":"Zone 4","purpose":"Zwei lange Schwellenblöcke: die härteste Einheit des Plans.","steps":["Aufwärmen: 15 min steigernd, mit 3 Antritten von 15 s","2 × 20 min in Zone 4, 5 min Pause","Ausfahren: 10 min sehr locker"],"notes":"Auf dem Rollentrainer ideal: keine Ampeln oder Abfahrten, die die Belastung unterbrechen."}},{"name":"W6 · Lange Ausfahrt","week":6,"exercises":[],"cardio":{"sport":"bike","durationMin":120,"intensity":"Zone 2","purpose":"Die Grundlage aufbauen: die Basis für alles andere.","steps":["15 min sehr locker einrollen","Zone 2, mit 2 × 10 min in Zone 3 in der letzten Stunde","Zum Schluss 10 min sehr locker"],"notes":"Ab der ersten Stunde alle 15 min trinken und alle 30 bis 40 min essen."}},{"name":"W7 · Trittfrequenz","week":7,"exercises":[],"cardio":{"sport":"bike","durationMin":60,"intensity":"Zone 2","purpose":"Runder und lockerer treten, um die Beine auf langen Ausfahrten zu schonen.","steps":["10 min sehr locker, kleiner Gang","10 × 1 min mit hoher Trittfrequenz (100-110 U/min) ohne Druck, dazwischen 2 min normal","Der Rest in Zone 2, Trittfrequenz um 90 U/min","Zum Schluss 5 min sehr locker"]}},{"name":"W7 · Intervalle","week":7,"exercises":[],"cardio":{"sport":"bike","durationMin":61,"intensity":"Zone 5","purpose":"Letzter intensiver Block vor der Entlastung.","steps":["Aufwärmen: 15 min steigernd, mit 3 Antritten von 15 s","6 × 3 min in Zone 5, 3 min Pause","Ausfahren: 10 min sehr locker"],"notes":"Auf dem Rollentrainer ideal: keine Ampeln oder Abfahrten, die die Belastung unterbrechen."}},{"name":"W7 · Lange Ausfahrt","week":7,"exercises":[],"cardio":{"sport":"bike","durationMin":135,"intensity":"Zone 2","purpose":"Die Grundlage aufbauen: die Basis für alles andere.","steps":["15 min sehr locker einrollen","Zone 2, mit 2 × 10 min in Zone 3 in der letzten Stunde","Zum Schluss 10 min sehr locker"],"notes":"Ab der ersten Stunde alle 15 min trinken und alle 30 bis 40 min essen."}},{"name":"W8 · Trittfrequenz","week":8,"exercises":[],"cardio":{"sport":"bike","durationMin":40,"intensity":"Zone 2","purpose":"Runder und lockerer treten, um die Beine auf langen Ausfahrten zu schonen.","steps":["10 min sehr locker, kleiner Gang","4 × 1 min mit hoher Trittfrequenz (100-110 U/min) ohne Druck, dazwischen 2 min normal","Der Rest in Zone 2, Trittfrequenz um 90 U/min","Zum Schluss 5 min sehr locker"]}},{"name":"W8 · Intervalle","week":8,"exercises":[],"cardio":{"sport":"bike","durationMin":49,"intensity":"Zone 4","purpose":"Spritzig bleiben vor der Zielausfahrt.","steps":["Aufwärmen: 15 min steigernd, mit 3 Antritten von 15 s","3 × 5 min in Zone 4, 3 min Pause","Ausfahren: 10 min sehr locker"],"notes":"Auf dem Rollentrainer ideal: keine Ampeln oder Abfahrten, die die Belastung unterbrechen."}},{"name":"W8 · Zielausfahrt","week":8,"exercises":[],"cardio":{"sport":"bike","durationMin":150,"intensity":"Zone 2","purpose":"Die angestrebte Ausfahrt von 2 h 30: gleichmäßig und gut verpflegt.","steps":["15 min sehr locker einrollen","Gleichmäßig in Zone 2: an Anstiegen sitzen bleiben und leichter schalten","Zum Schluss 10 min sehr locker"],"notes":"Ab der ersten Stunde alle 15 min trinken und alle 30 bis 40 min essen."}}]'::jsonb, true, 250, 'de'
WHERE NOT EXISTS (SELECT 1 FROM program_templates WHERE name = 'Radausdauer' AND locale = 'de');

INSERT INTO program_templates (name, description, goal, level, days_per_week, home_friendly, structure, is_published, sort_order, locale)
SELECT 'Kraft für Läufer', 'Hüfte, Waden und Rumpf: zwei kurze Einheiten für einen stabileren Laufstil.', 'endurance', 'beginner', 2, true, '[{"name":"Kraft A","exercises":[{"exerciseName":"Bulgarian Split Squat","targetSets":3,"targetReps":"8-10","restSec":90},{"exerciseName":"Single-Leg Calf Raise","targetSets":3,"targetReps":"12-15","restSec":60},{"exerciseName":"Glute Bridge","targetSets":3,"targetReps":"12-15","restSec":60},{"exerciseName":"Side Plank","targetSets":3,"targetReps":"30-45s","restSec":60}]},{"name":"Kraft B","exercises":[{"exerciseName":"Single-Leg Romanian Deadlift","targetSets":3,"targetReps":"8-10","restSec":90},{"exerciseName":"Step-up","targetSets":3,"targetReps":"10-12","restSec":60},{"exerciseName":"Dead Bug","targetSets":3,"targetReps":"10-12","restSec":60},{"exerciseName":"Plank","targetSets":3,"targetReps":"45-60s","restSec":60}]}]'::jsonb, true, 260, 'de'
WHERE NOT EXISTS (SELECT 1 FROM program_templates WHERE name = 'Kraft für Läufer' AND locale = 'de');

INSERT INTO program_templates (name, description, goal, level, days_per_week, home_friendly, structure, is_published, sort_order, locale)
SELECT 'Kraft für Trail', 'Beinkraft und Stabilität für Anstiege und Abfahrten.', 'endurance', 'intermediate', 2, false, '[{"name":"Bergauf","exercises":[{"exerciseName":"Back Squat","targetSets":4,"targetReps":"6-8","restSec":150},{"exerciseName":"Step-up","targetSets":3,"targetReps":"10-12","restSec":90},{"exerciseName":"Single-Leg Calf Raise","targetSets":3,"targetReps":"15-20","restSec":60},{"exerciseName":"Side Plank","targetSets":3,"targetReps":"45-60s","restSec":60}]},{"name":"Bergab","exercises":[{"exerciseName":"Walking Lunge","targetSets":4,"targetReps":"10-12","restSec":90},{"exerciseName":"Single-Leg Romanian Deadlift","targetSets":3,"targetReps":"8-10","restSec":90},{"exerciseName":"Leg Curl","targetSets":3,"targetReps":"10-12","restSec":60},{"exerciseName":"Bird Dog","targetSets":3,"targetReps":"10-12","restSec":60}]}]'::jsonb, true, 270, 'de'
WHERE NOT EXISTS (SELECT 1 FROM program_templates WHERE name = 'Kraft für Trail' AND locale = 'de');

INSERT INTO program_templates (name, description, goal, level, days_per_week, home_friendly, structure, is_published, sort_order, locale)
SELECT 'Kraft für Schwimmer', 'Rücken, Schultern und Rumpf für einen kräftigeren Zug und geschützte Schultern.', 'endurance', 'intermediate', 2, false, '[{"name":"Zug","exercises":[{"exerciseName":"Lat Pulldown","targetSets":4,"targetReps":"8-10","restSec":90},{"exerciseName":"Straight-Arm Pulldown","targetSets":3,"targetReps":"12-15","restSec":60},{"exerciseName":"Seated Cable Row","targetSets":3,"targetReps":"10-12","restSec":90},{"exerciseName":"External Shoulder Rotation","targetSets":3,"targetReps":"15-20","restSec":60}]},{"name":"Rumpf","exercises":[{"exerciseName":"Pull-up","targetSets":3,"targetReps":"5-8","restSec":120},{"exerciseName":"Face Pull","targetSets":3,"targetReps":"15-20","restSec":60},{"exerciseName":"Dead Bug","targetSets":3,"targetReps":"10-12","restSec":60},{"exerciseName":"Side Plank","targetSets":3,"targetReps":"30-45s","restSec":60}]}]'::jsonb, true, 280, 'de'
WHERE NOT EXISTS (SELECT 1 FROM program_templates WHERE name = 'Kraft für Schwimmer' AND locale = 'de');

INSERT INTO program_templates (name, description, goal, level, days_per_week, home_friendly, structure, is_published, sort_order, locale)
SELECT 'Kraft für Radfahrer', 'Beine, Gesäß und unterer Rücken, um die Position zu halten und kräftiger anzutreten.', 'endurance', 'intermediate', 2, false, '[{"name":"Kraft","exercises":[{"exerciseName":"Back Squat","targetSets":4,"targetReps":"6-8","restSec":150},{"exerciseName":"Hip Thrust","targetSets":3,"targetReps":"8-10","restSec":90},{"exerciseName":"Standing Calf Raise","targetSets":3,"targetReps":"12-15","restSec":60}]},{"name":"Stabilität","exercises":[{"exerciseName":"Bulgarian Split Squat","targetSets":3,"targetReps":"8-10","restSec":90},{"exerciseName":"Romanian Deadlift","targetSets":3,"targetReps":"8-10","restSec":90},{"exerciseName":"Bird Dog","targetSets":3,"targetReps":"10-12","restSec":60},{"exerciseName":"Plank","targetSets":3,"targetReps":"45-60s","restSec":60}]}]'::jsonb, true, 290, 'de'
WHERE NOT EXISTS (SELECT 1 FROM program_templates WHERE name = 'Kraft für Radfahrer' AND locale = 'de');

COMMIT;

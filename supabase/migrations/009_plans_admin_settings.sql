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
  LEFT JOIN plans pl ON pl.id = COALESCE(p.plan_id, (SELECT id FROM plans WHERE is_default LIMIT 1))
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

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

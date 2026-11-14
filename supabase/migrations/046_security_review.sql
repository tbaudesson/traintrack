-- 046_security_review.sql
-- Fixes from the security review of 038-045. Nothing let a user write another
-- user's rows; these close abuse and availability holes:
-- 1. Push subscriptions: https endpoints of sane length, small preferences,
--    at most 10 devices per user — a member could otherwise stall the
--    reminder sender for everyone with a flood of dead endpoints.
-- 2. get_shared_program: signed-in, active accounts only (the default grant
--    to anon let it run signed out), and not for shares of inactive owners.
--    get_all_compliance_alerts loses the same default grant.
-- 3. Size limits: a shared program's structure, a timed session's plan, the
--    injuries of a profile; at most 100 shares per user.
--
-- Deploy: apply this file, then the code (the sender reads subscriptions in
-- pages). Existing rows are not checked again (NOT VALID); new ones are.
--
-- Safe to re-run. All-or-nothing: wrapped in one transaction.

BEGIN;

-- ─── 1. Push subscriptions ──────────────────────────────────────────
ALTER TABLE push_subscriptions DROP CONSTRAINT IF EXISTS push_subscriptions_endpoint_check;
ALTER TABLE push_subscriptions ADD CONSTRAINT push_subscriptions_endpoint_check CHECK (
  endpoint LIKE 'https://%' AND char_length(endpoint) <= 1000
  AND char_length(p256dh) <= 200 AND char_length(auth) <= 100
  AND (user_agent IS NULL OR char_length(user_agent) <= 500)
  AND (notify_prefs IS NULL OR octet_length(notify_prefs::text) <= 500)
) NOT VALID;

CREATE OR REPLACE FUNCTION limit_push_subscriptions()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF (SELECT count(*) FROM push_subscriptions WHERE user_id = NEW.user_id) >= 10 THEN
    RAISE EXCEPTION 'TOO_MANY_DEVICES';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_limit_push_subscriptions ON push_subscriptions;
CREATE TRIGGER trg_limit_push_subscriptions BEFORE INSERT ON push_subscriptions
  FOR EACH ROW EXECUTE FUNCTION limit_push_subscriptions();

-- ─── 2. Shared programs: signed in, active, active owner ────────────
CREATE OR REPLACE FUNCTION get_shared_program(p_id UUID)
RETURNS TABLE (name TEXT, description TEXT, structure JSONB, shared_by TEXT, created_at TIMESTAMPTZ)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT s.name, s.description, s.structure, COALESCE(p.display_name, 'TrainTrack'), s.created_at
  FROM shared_programs s
  LEFT JOIN profiles p ON p.user_id = s.user_id
  WHERE s.id = p_id
    AND auth.uid() IS NOT NULL
    AND is_active_account()
    AND COALESCE(p.status, 'active') = 'active';
$$;
REVOKE ALL ON FUNCTION get_shared_program(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION get_shared_program(UUID) TO authenticated;

REVOKE ALL ON FUNCTION get_all_compliance_alerts(INT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION get_all_compliance_alerts(INT) TO service_role;

-- ─── 3. Sizes ───────────────────────────────────────────────────────
ALTER TABLE shared_programs DROP CONSTRAINT IF EXISTS shared_programs_size_check;
ALTER TABLE shared_programs ADD CONSTRAINT shared_programs_size_check
  CHECK (octet_length(structure::text) <= 300000) NOT VALID;

ALTER TABLE workouts DROP CONSTRAINT IF EXISTS workouts_interval_plan_size_check;
ALTER TABLE workouts ADD CONSTRAINT workouts_interval_plan_size_check
  CHECK (interval_plan IS NULL OR (jsonb_typeof(interval_plan) = 'object' AND octet_length(interval_plan::text) <= 1000)) NOT VALID;

ALTER TABLE athlete_profiles DROP CONSTRAINT IF EXISTS athlete_profiles_injury_areas_size_check;
ALTER TABLE athlete_profiles ADD CONSTRAINT athlete_profiles_injury_areas_size_check
  CHECK (injury_areas IS NULL OR octet_length(injury_areas::text) <= 2000) NOT VALID;

CREATE OR REPLACE FUNCTION limit_shared_programs()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF (SELECT count(*) FROM shared_programs WHERE user_id = NEW.user_id) >= 100 THEN
    RAISE EXCEPTION 'TOO_MANY_SHARES';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_limit_shared_programs ON shared_programs;
CREATE TRIGGER trg_limit_shared_programs BEFORE INSERT ON shared_programs
  FOR EACH ROW EXECUTE FUNCTION limit_shared_programs();

COMMIT;

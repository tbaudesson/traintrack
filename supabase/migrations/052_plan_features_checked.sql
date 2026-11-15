-- 052_plan_features_checked.sql
-- Licences: more features to tick, and the server checks them on what is saved.
--
-- New features: running, meal_plans, level_tests, planning, reports,
-- excel_import, challenges, vaulting. Every licence that exists gets them
-- all, so no one loses anything: untick them afterwards on the admin page.
--
-- Checked by the server (refused with PLAN_REQUIRED without the feature):
-- - readiness_checkins: readiness
-- - nutrition_entries, hydration_logs: nutrition
-- - competition_results, horses, horse_sessions: vaulting
-- - athlete_profiles: run_paces (running), meal_prefs (meal_plans),
--   schedule_moves (planning), when they change
-- - create_challenge: challenges
-- Deleting stays possible, and what was saved before stays readable.
-- The rest (level tests, reports, Excel import) is worked out on the device.
--
-- Deploy: apply this file first, then the code.
--
-- Safe to re-run. All-or-nothing: wrapped in one transaction.

BEGIN;

-- ─── The new features, on every licence ──────────────────────────

UPDATE plans
SET features = (
  SELECT COALESCE(jsonb_agg(DISTINCT f ORDER BY f), '[]'::jsonb)
  FROM jsonb_array_elements_text(
    COALESCE(features, '[]'::jsonb)
    || '["running","meal_plans","level_tests","planning","reports","excel_import","challenges","vaulting"]'::jsonb
  ) AS f
);

-- ─── The check ───────────────────────────────────────────────────

-- The caller’s licence must include the feature. A call without a user
-- (the service itself, scheduled jobs) passes.
CREATE OR REPLACE FUNCTION require_plan_feature(p_feature TEXT)
RETURNS VOID LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT has_plan_feature(auth.uid(), p_feature) THEN
    RAISE EXCEPTION 'PLAN_REQUIRED: %', p_feature USING ERRCODE = '42501';
  END IF;
END;
$$;

-- Rows of a feature: written only with it, deleted (deleted_at) always.
-- An upsert of a row that exists is checked as the update that follows.
CREATE OR REPLACE FUNCTION enforce_plan_feature_rows()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_exists BOOLEAN;
BEGIN
  IF NEW.deleted_at IS NOT NULL THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'INSERT' THEN
    v_exists := CASE TG_TABLE_NAME
      WHEN 'readiness_checkins' THEN EXISTS (SELECT 1 FROM readiness_checkins r WHERE r.id = NEW.id)
      WHEN 'nutrition_entries' THEN EXISTS (SELECT 1 FROM nutrition_entries r WHERE r.id = NEW.id)
      WHEN 'hydration_logs' THEN EXISTS (SELECT 1 FROM hydration_logs r WHERE r.id = NEW.id)
      WHEN 'competition_results' THEN EXISTS (SELECT 1 FROM competition_results r WHERE r.id = NEW.id)
      WHEN 'horses' THEN EXISTS (SELECT 1 FROM horses r WHERE r.id = NEW.id)
      WHEN 'horse_sessions' THEN EXISTS (SELECT 1 FROM horse_sessions r WHERE r.id = NEW.id)
      ELSE false
    END;
    IF v_exists THEN
      RETURN NEW;
    END IF;
  END IF;
  PERFORM require_plan_feature(TG_ARGV[0]);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS readiness_checkins_plan ON readiness_checkins;
CREATE TRIGGER readiness_checkins_plan BEFORE INSERT OR UPDATE ON readiness_checkins
  FOR EACH ROW EXECUTE FUNCTION enforce_plan_feature_rows('readiness');

DROP TRIGGER IF EXISTS nutrition_entries_plan ON nutrition_entries;
CREATE TRIGGER nutrition_entries_plan BEFORE INSERT OR UPDATE ON nutrition_entries
  FOR EACH ROW EXECUTE FUNCTION enforce_plan_feature_rows('nutrition');

DROP TRIGGER IF EXISTS hydration_logs_plan ON hydration_logs;
CREATE TRIGGER hydration_logs_plan BEFORE INSERT OR UPDATE ON hydration_logs
  FOR EACH ROW EXECUTE FUNCTION enforce_plan_feature_rows('nutrition');

DROP TRIGGER IF EXISTS competition_results_plan ON competition_results;
CREATE TRIGGER competition_results_plan BEFORE INSERT OR UPDATE ON competition_results
  FOR EACH ROW EXECUTE FUNCTION enforce_plan_feature_rows('vaulting');

DROP TRIGGER IF EXISTS horses_plan ON horses;
CREATE TRIGGER horses_plan BEFORE INSERT OR UPDATE ON horses
  FOR EACH ROW EXECUTE FUNCTION enforce_plan_feature_rows('vaulting');

DROP TRIGGER IF EXISTS horse_sessions_plan ON horse_sessions;
CREATE TRIGGER horse_sessions_plan BEFORE INSERT OR UPDATE ON horse_sessions
  FOR EACH ROW EXECUTE FUNCTION enforce_plan_feature_rows('vaulting');

-- The profile: some of its columns belong to a feature. Checked when they
-- change to something (clearing them stays possible).
CREATE OR REPLACE FUNCTION enforce_plan_feature_profile()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_old athlete_profiles%ROWTYPE;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF EXISTS (SELECT 1 FROM athlete_profiles a WHERE a.id = NEW.id) THEN
      RETURN NEW;
    END IF;
  ELSE
    v_old := OLD;
  END IF;
  IF NEW.run_paces IS NOT NULL AND NEW.run_paces IS DISTINCT FROM v_old.run_paces THEN
    PERFORM require_plan_feature('running');
  END IF;
  IF NEW.meal_prefs IS NOT NULL AND NEW.meal_prefs IS DISTINCT FROM v_old.meal_prefs THEN
    PERFORM require_plan_feature('meal_plans');
  END IF;
  IF NEW.schedule_moves IS NOT NULL AND jsonb_typeof(NEW.schedule_moves) = 'array'
     AND jsonb_array_length(NEW.schedule_moves) > 0
     AND NEW.schedule_moves IS DISTINCT FROM v_old.schedule_moves THEN
    PERFORM require_plan_feature('planning');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS athlete_profiles_plan ON athlete_profiles;
CREATE TRIGGER athlete_profiles_plan BEFORE INSERT OR UPDATE ON athlete_profiles
  FOR EACH ROW EXECUTE FUNCTION enforce_plan_feature_profile();

-- ─── Challenges: created with the feature ────────────────────────

CREATE OR REPLACE FUNCTION create_challenge(
  p_group_id UUID, p_name TEXT, p_type TEXT, p_start DATE, p_end DATE
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id UUID;
BEGIN
  IF NOT is_group_owner_or_manager(p_group_id) THEN
    RAISE EXCEPTION 'Unauthorized: not the team trainer';
  END IF;
  PERFORM require_plan_feature('challenges');
  IF p_type NOT IN ('volume', 'sessions', 'consistency') THEN
    RAISE EXCEPTION 'Invalid challenge type';
  END IF;
  INSERT INTO challenges (group_id, created_by, name, type, start_date, end_date)
  VALUES (p_group_id, auth.uid(), p_name, p_type, p_start, p_end)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION require_plan_feature(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION require_plan_feature(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION create_challenge(UUID, TEXT, TEXT, DATE, DATE) TO authenticated;

COMMIT;

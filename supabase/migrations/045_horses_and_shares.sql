-- 045_horses_and_shares.sql
-- 1. Horse workload, for vaulting: the horses one lunges or rides, each with
--    a weekly limit, and the minutes each session put on them at walk, trot
--    and canter. Kept by whoever logs them (the lunger, a vaulter); read by
--    their coach.
-- 2. Programs shared by link: a copy of a program, readable by anyone who has
--    its link (through get_shared_program), never listed.
--
-- Deploy: apply this file first, then the code. The app syncs the new tables
-- and calls the new functions.
--
-- Safe to re-run. All-or-nothing: wrapped in one transaction.

BEGIN;

-- ─── Horses ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS horses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  weekly_limit_min INT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT horses_check CHECK (
    char_length(name) BETWEEN 1 AND 60
    AND (weekly_limit_min IS NULL OR weekly_limit_min BETWEEN 10 AND 1500)
    AND (notes IS NULL OR char_length(notes) <= 1000)
  )
);
CREATE INDEX IF NOT EXISTS idx_horses_user ON horses(user_id, updated_at);

CREATE TABLE IF NOT EXISTS horse_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  horse_id UUID REFERENCES horses(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  walk_min INT NOT NULL DEFAULT 0,
  trot_min INT NOT NULL DEFAULT 0,
  canter_min INT NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT horse_sessions_check CHECK (
    walk_min BETWEEN 0 AND 300 AND trot_min BETWEEN 0 AND 300 AND canter_min BETWEEN 0 AND 300
    AND (notes IS NULL OR char_length(notes) <= 1000)
  )
);
CREATE INDEX IF NOT EXISTS idx_horse_sessions_user ON horse_sessions(user_id, updated_at);

DROP TRIGGER IF EXISTS trg_horses_updated ON horses;
CREATE TRIGGER trg_horses_updated BEFORE UPDATE ON horses FOR EACH ROW EXECUTE FUNCTION update_updated_at();
DROP TRIGGER IF EXISTS trg_horse_sessions_updated ON horse_sessions;
CREATE TRIGGER trg_horse_sessions_updated BEFORE UPDATE ON horse_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE horses ENABLE ROW LEVEL SECURITY;
ALTER TABLE horse_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "horses_own_all" ON horses;
CREATE POLICY "horses_own_all" ON horses
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "horses_trainer_read" ON horses;
CREATE POLICY "horses_trainer_read" ON horses FOR SELECT USING (is_my_client(user_id));

-- A session goes on one of one's own horses only.
DROP POLICY IF EXISTS "horse_sessions_own_all" ON horse_sessions;
CREATE POLICY "horse_sessions_own_all" ON horse_sessions
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND (horse_id IS NULL OR EXISTS (SELECT 1 FROM horses h WHERE h.id = horse_id AND h.user_id = auth.uid()))
  );
DROP POLICY IF EXISTS "horse_sessions_trainer_read" ON horse_sessions;
CREATE POLICY "horse_sessions_trainer_read" ON horse_sessions FOR SELECT USING (is_my_client(user_id));

-- ─── Programs shared by link ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS shared_programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  structure JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT shared_programs_check CHECK (
    char_length(name) BETWEEN 1 AND 120
    AND (description IS NULL OR char_length(description) <= 2000)
    AND jsonb_typeof(structure) = 'array'
    AND jsonb_array_length(structure) BETWEEN 1 AND 200
  )
);
CREATE INDEX IF NOT EXISTS idx_shared_programs_user ON shared_programs(user_id);

ALTER TABLE shared_programs ENABLE ROW LEVEL SECURITY;
-- One sees and removes one's own shares; others reach a share only by its id.
DROP POLICY IF EXISTS "shared_programs_own" ON shared_programs;
CREATE POLICY "shared_programs_own" ON shared_programs
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION get_shared_program(p_id UUID)
RETURNS TABLE (name TEXT, description TEXT, structure JSONB, shared_by TEXT, created_at TIMESTAMPTZ)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT s.name, s.description, s.structure, COALESCE(p.display_name, 'TrainTrack'), s.created_at
  FROM shared_programs s
  LEFT JOIN profiles p ON p.user_id = s.user_id
  WHERE s.id = p_id AND is_active_account();
$$;
REVOKE ALL ON FUNCTION get_shared_program(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_shared_program(UUID) TO authenticated;

-- ─── Like every table a member's app reads or writes ────────────────
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['horses', 'horse_sessions', 'shared_programs'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "active_account_only" ON %I', t);
    EXECUTE format(
      'CREATE POLICY "active_account_only" ON %I AS RESTRICTIVE FOR ALL TO authenticated
         USING ((SELECT is_active_account())) WITH CHECK ((SELECT is_active_account()))', t);
  END LOOP;
END $$;

COMMIT;

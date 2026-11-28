-- 090_tennis_groups_view.sql
-- Reading or writing the teams' table directly hits a loop in its rules (a
-- team's rule reads the members, whose rule reads the teams: "infinite
-- recursion detected in policy for relation groups"). The app always went
-- through server functions, which skip it; the tennis groups of migration 089
-- are synced directly and fell into it.
-- Without touching the teams' rules, a view gives each coach his own tennis
-- groups only (user_id = the caller, kind = 'tennis'), to read, add and
-- change; a row written through it must stay one of his tennis groups. The
-- tennis lessons' rule checks its group through the same view.
-- Apply this file first, then the code (it syncs through the view).
-- Plain quotes only; safe to run again. All-or-nothing: one transaction.

BEGIN;

CREATE OR REPLACE VIEW tennis_groups AS
  SELECT id, user_id, name, description, kind, age_band, level, slots, players, archived_at, created_at, updated_at, deleted_at
  FROM groups
  WHERE kind = 'tennis' AND user_id = auth.uid() AND is_active_account()
WITH CASCADED CHECK OPTION;

REVOKE ALL ON tennis_groups FROM PUBLIC;
REVOKE ALL ON tennis_groups FROM anon;
GRANT SELECT, INSERT, UPDATE ON tennis_groups TO authenticated;

DROP POLICY IF EXISTS "tennis_lessons_own_all" ON tennis_lessons;
CREATE POLICY "tennis_lessons_own_all" ON tennis_lessons
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND (group_id IS NULL OR EXISTS (SELECT 1 FROM tennis_groups g WHERE g.id = group_id))
  );

COMMIT;

-- 042_competition_results.sql
-- Vaulting competition results: the event, the horse, the scores of each
-- test (compulsory, technical, freestyle, out of 10) and the ranking. The
-- athlete keeps them; their coach reads them. Deleting an account removes
-- them with it (ON DELETE CASCADE).
--
-- Deploy: apply this file first, then the code. The app syncs the new table.
--
-- Safe to re-run. All-or-nothing: wrapped in one transaction.

BEGIN;

CREATE TABLE IF NOT EXISTS competition_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  event TEXT NOT NULL,
  category TEXT,
  horse TEXT,
  compulsory NUMERIC,
  technical NUMERIC,
  freestyle NUMERIC,
  rank INT,
  participants INT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT competition_results_scores_check CHECK (
    (compulsory IS NULL OR compulsory BETWEEN 0 AND 10)
    AND (technical IS NULL OR technical BETWEEN 0 AND 10)
    AND (freestyle IS NULL OR freestyle BETWEEN 0 AND 10)
  ),
  CONSTRAINT competition_results_rank_check CHECK (
    (rank IS NULL OR rank >= 1) AND (participants IS NULL OR participants >= 1)
  ),
  CONSTRAINT competition_results_text_check CHECK (
    char_length(event) BETWEEN 1 AND 120
    AND (category IS NULL OR char_length(category) <= 80)
    AND (horse IS NULL OR char_length(horse) <= 80)
    AND (notes IS NULL OR char_length(notes) <= 2000)
  )
);
CREATE INDEX IF NOT EXISTS idx_competition_results_user ON competition_results(user_id, updated_at);

DROP TRIGGER IF EXISTS trg_competition_results_updated ON competition_results;
CREATE TRIGGER trg_competition_results_updated BEFORE UPDATE ON competition_results
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE competition_results ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cr_own_all" ON competition_results;
CREATE POLICY "cr_own_all" ON competition_results
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "cr_trainer_read" ON competition_results;
CREATE POLICY "cr_trainer_read" ON competition_results
  FOR SELECT USING (is_my_client(user_id));

-- Like every table a member's app reads or writes: refused to pending or
-- deactivated accounts.
DROP POLICY IF EXISTS "active_account_only" ON competition_results;
CREATE POLICY "active_account_only" ON competition_results AS RESTRICTIVE FOR ALL TO authenticated
  USING ((SELECT is_active_account())) WITH CHECK ((SELECT is_active_account()));

COMMIT;

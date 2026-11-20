-- 061_swim_plan_techniques.sql
-- The 8-week swim plan ("Natation endurance") joins the technique sheets:
-- each of its 24 sessions gets the list of techniques it uses (keys of
-- app_settings.swim_techniques), shown as links. Only that list is added,
-- session by session: the rest of each session, an admin's changes
-- included, is left as it is.
--
-- Deploy: after migration 060, in any order with the code.
--
-- Safe to re-run: a plan that already lists its techniques is left alone.

UPDATE program_templates p
SET structure = (
  SELECT jsonb_agg(
    CASE WHEN e.d -> 'cardio' IS NOT NULL AND jsonb_typeof(k.keys -> (e.i::int - 1)) = 'array'
      THEN jsonb_set(e.d, '{cardio,techniques}', k.keys -> (e.i::int - 1))
      ELSE e.d END
    ORDER BY e.i)
  FROM jsonb_array_elements(p.structure) WITH ORDINALITY AS e(d, i)
),
    updated_at = now()
FROM (SELECT '[["crawl","catch-up","kickboard","pull-buoy"],["crawl","streamline"],["crawl","breathing-3"],["crawl","fist","kickboard","pull-buoy"],["crawl","streamline"],["crawl","breathing-3"],["crawl","side-kick","kickboard","pull-buoy"],["crawl","streamline"],["crawl","breathing-3"],["crawl","breathing-3","kickboard","pull-buoy"],["crawl","streamline"],["crawl","breathing-3"],["crawl","sculling","kickboard","pull-buoy"],["crawl","streamline"],["crawl","breathing-3"],["crawl","one-arm","kickboard","pull-buoy"],["crawl","streamline"],["crawl","breathing-3"],["crawl","catch-up","kickboard","pull-buoy"],["crawl","streamline"],["crawl","breathing-3"],["crawl","kickboard","pull-buoy"],["crawl","streamline"],["crawl","breathing-3"]]'::jsonb AS keys) k
WHERE (p.name, p.locale) IN (('Natation endurance', 'fr'), ('Swimming endurance', 'en'), ('Schwimmausdauer', 'de'))
  AND jsonb_array_length(p.structure) = 24
  AND p.structure::text NOT LIKE '%"techniques"%';

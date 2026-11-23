-- 082_display_modes.sql
-- How much of the app one sees: essential, complete or expert.
--   - athlete_profiles.display_mode: one's mode, kept with the profile so it
--     follows the athlete from one device to another; NULL when never chosen
--     (the app then shows everything, as before);
--   - app_settings.display_modes: for each part of the app that can wait,
--     the first mode that shows it (a part left out shows in every mode),
--     editable in Admin > Display modes. Display only: the licence still
--     decides what one may use, and what keeps an athlete safe (injuries, a
--     low form, a load rising too fast) shows in every mode.
-- Plain quotes only; safe to run again (an existing value is kept).

ALTER TABLE athlete_profiles ADD COLUMN IF NOT EXISTS display_mode TEXT;
ALTER TABLE athlete_profiles DROP CONSTRAINT IF EXISTS athlete_profiles_display_mode_check;
ALTER TABLE athlete_profiles ADD CONSTRAINT athlete_profiles_display_mode_check
  CHECK (display_mode IS NULL OR display_mode IN ('essential', 'complete', 'expert')) NOT VALID;

INSERT INTO app_settings (key, value) VALUES ('display_modes', '
{
  "nav.exercises": "complete",
  "nav.sports": "complete",
  "nav.import": "complete",
  "nav.assistant": "complete",
  "nav.readiness": "complete",
  "nav.nutrition": "complete",
  "nav.challenges": "complete",
  "nav.layouts": "complete",
  "homeLoad": "expert",
  "homePlanB": "complete",
  "homeCalendar": "complete",
  "homeConflict": "complete",
  "homeDeload": "complete",
  "homeReport": "complete",
  "homeTests": "complete",
  "homeInsights": "complete",
  "homeAdvice": "complete",
  "homeSportHint": "complete",
  "progressMoreInsights": "complete",
  "progressAssistant": "complete",
  "progressRecommendations": "complete",
  "progressLoad": "expert",
  "progressLoadHistory": "expert",
  "progressEnduranceTrend": "expert",
  "progressWeeklyReport": "complete",
  "progressReport": "complete",
  "progressVolume": "complete",
  "progressByExercise": "complete",
  "progressMuscles": "expert",
  "progressRecords": "complete",
  "logMoreDetails": "complete",
  "logTrimp": "expert"
}
')
ON CONFLICT (key) DO NOTHING;

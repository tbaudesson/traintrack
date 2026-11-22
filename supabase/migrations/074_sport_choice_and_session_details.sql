-- 074_sport_choice_and_session_details.sql
-- The favourite sport follows the athlete from one device to another: it was
-- kept on the device only. favorite_sport holds a sport of the app's registry,
-- 'all' (all sports, nothing put first) or 'none' (chosen: none); NULL means
-- never chosen on any device yet. second_sport is the one practised alongside.
-- The values are checked by the app (its list of sports grows without a
-- migration); here only their length.
-- A session also gets the time it started ('HH:MM', local time) and its goal
-- in a sentence, both optional, under "More details".
-- Safe to run again.

ALTER TABLE athlete_profiles ADD COLUMN IF NOT EXISTS favorite_sport TEXT;
ALTER TABLE athlete_profiles ADD COLUMN IF NOT EXISTS second_sport TEXT;

ALTER TABLE athlete_profiles DROP CONSTRAINT IF EXISTS athlete_profiles_favorite_sport_check;
ALTER TABLE athlete_profiles ADD CONSTRAINT athlete_profiles_favorite_sport_check
  CHECK (favorite_sport IS NULL OR char_length(favorite_sport) BETWEEN 1 AND 40) NOT VALID;
ALTER TABLE athlete_profiles DROP CONSTRAINT IF EXISTS athlete_profiles_second_sport_check;
ALTER TABLE athlete_profiles ADD CONSTRAINT athlete_profiles_second_sport_check
  CHECK (second_sport IS NULL OR char_length(second_sport) BETWEEN 1 AND 40) NOT VALID;

ALTER TABLE workouts ADD COLUMN IF NOT EXISTS start_time TEXT;
ALTER TABLE workouts ADD COLUMN IF NOT EXISTS session_goal TEXT;

ALTER TABLE workouts DROP CONSTRAINT IF EXISTS workouts_start_time_check;
ALTER TABLE workouts ADD CONSTRAINT workouts_start_time_check
  CHECK (start_time IS NULL OR start_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$') NOT VALID;
ALTER TABLE workouts DROP CONSTRAINT IF EXISTS workouts_session_goal_check;
ALTER TABLE workouts ADD CONSTRAINT workouts_session_goal_check
  CHECK (session_goal IS NULL OR char_length(session_goal) <= 200) NOT VALID;

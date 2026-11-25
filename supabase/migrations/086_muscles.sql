-- 086_muscles.sql
-- The body map: the muscles each exercise works, finer than its groups.
--   exercises.target_muscles  the muscles it works mainly
--   exercises.assist_muscles  those it works too
-- Among 17 muscles, each belonging to one of the groups the app already
-- uses (chest; front, side and rear delts; biceps, triceps, forearms; abs,
-- obliques; traps, lats, lower back; glutes, quads, hamstrings, adductors,
-- calves). The library's 151 exercises get theirs; a row an admin already
-- filled is left as it is. An admin edits them in Exercises (edit an exercise);
-- an exercise without them (a custom one) is read from its groups.
-- The code before it ignores both columns: apply this file first, then the code.
-- Plain quotes only; safe to run again. All-or-nothing: one transaction.

BEGIN;

ALTER TABLE exercises ADD COLUMN IF NOT EXISTS target_muscles JSONB;
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS assist_muscles JSONB;

ALTER TABLE exercises DROP CONSTRAINT IF EXISTS exercises_muscles_check;
ALTER TABLE exercises ADD CONSTRAINT exercises_muscles_check CHECK (
  (target_muscles IS NULL OR (jsonb_typeof(target_muscles) = 'array' AND jsonb_array_length(target_muscles) BETWEEN 1 AND 8
       AND target_muscles <@ '["chest", "front_delts", "side_delts", "rear_delts", "biceps", "triceps", "forearms", "abs", "obliques", "traps", "lats", "lower_back", "glutes", "quads", "hamstrings", "adductors", "calves"]'::jsonb))
  AND (assist_muscles IS NULL OR (jsonb_typeof(assist_muscles) = 'array' AND jsonb_array_length(assist_muscles) <= 10
       AND assist_muscles <@ '["chest", "front_delts", "side_delts", "rear_delts", "biceps", "triceps", "forearms", "abs", "obliques", "traps", "lats", "lower_back", "glutes", "quads", "hamstrings", "adductors", "calves"]'::jsonb))
) NOT VALID;

-- Admin: the muscles of any exercise, the library's included. The table's
-- check refuses what does not fit; an empty list clears it.
CREATE OR REPLACE FUNCTION admin_set_exercise_muscles(p_uuid TEXT, p_target JSONB, p_assist JSONB)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS '
BEGIN
  IF NOT is_app_admin() THEN
    RAISE EXCEPTION ''Unauthorized: admin access required'';
  END IF;
  UPDATE exercises
     SET target_muscles = CASE WHEN p_target IS NULL OR p_target = ''[]''::jsonb THEN NULL ELSE p_target END,
         assist_muscles = CASE WHEN p_assist IS NULL OR p_assist = ''[]''::jsonb THEN NULL ELSE p_assist END,
         updated_at = now()
   WHERE id = p_uuid::uuid;
END;
';
REVOKE ALL ON FUNCTION admin_set_exercise_muscles(TEXT, JSONB, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION admin_set_exercise_muscles(TEXT, JSONB, JSONB) TO authenticated;

-- The library, muscle by muscle.

UPDATE exercises SET target_muscles = '["chest"]'::jsonb, assist_muscles = '["front_delts", "triceps"]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Barbell Bench Press' AND target_muscles IS NULL;
UPDATE exercises SET target_muscles = '["chest", "front_delts"]'::jsonb, assist_muscles = '["triceps"]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Incline Barbell Bench Press' AND target_muscles IS NULL;
UPDATE exercises SET target_muscles = '["chest"]'::jsonb, assist_muscles = '["front_delts", "triceps"]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Dumbbell Bench Press' AND target_muscles IS NULL;
UPDATE exercises SET target_muscles = '["chest", "front_delts"]'::jsonb, assist_muscles = '["triceps"]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Incline Dumbbell Press' AND target_muscles IS NULL;
UPDATE exercises SET target_muscles = '["chest"]'::jsonb, assist_muscles = '["front_delts"]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Cable Fly' AND target_muscles IS NULL;
UPDATE exercises SET target_muscles = '["chest"]'::jsonb, assist_muscles = '["front_delts", "triceps", "abs"]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Push-up' AND target_muscles IS NULL;
UPDATE exercises SET target_muscles = '["chest", "triceps"]'::jsonb, assist_muscles = '["front_delts"]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Chest Dip' AND target_muscles IS NULL;
UPDATE exercises SET target_muscles = '["hamstrings", "glutes", "lower_back"]'::jsonb, assist_muscles = '["traps", "quads", "forearms", "lats"]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Deadlift' AND target_muscles IS NULL;
UPDATE exercises SET target_muscles = '["lats", "traps"]'::jsonb, assist_muscles = '["rear_delts", "biceps", "lower_back"]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Barbell Row' AND target_muscles IS NULL;
UPDATE exercises SET target_muscles = '["lats"]'::jsonb, assist_muscles = '["biceps", "rear_delts", "traps", "forearms"]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Pull-up' AND target_muscles IS NULL;
UPDATE exercises SET target_muscles = '["lats", "biceps"]'::jsonb, assist_muscles = '["traps", "forearms"]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Chin-up' AND target_muscles IS NULL;
UPDATE exercises SET target_muscles = '["lats"]'::jsonb, assist_muscles = '["biceps", "rear_delts"]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Lat Pulldown' AND target_muscles IS NULL;
UPDATE exercises SET target_muscles = '["lats", "traps"]'::jsonb, assist_muscles = '["rear_delts", "biceps"]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Seated Cable Row' AND target_muscles IS NULL;
UPDATE exercises SET target_muscles = '["lats", "traps"]'::jsonb, assist_muscles = '["rear_delts", "biceps"]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Dumbbell Row' AND target_muscles IS NULL;
UPDATE exercises SET target_muscles = '["lats", "traps"]'::jsonb, assist_muscles = '["rear_delts", "biceps", "lower_back"]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'T-Bar Row' AND target_muscles IS NULL;
UPDATE exercises SET target_muscles = '["quads", "glutes"]'::jsonb, assist_muscles = '["adductors", "hamstrings", "lower_back", "abs"]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Back Squat' AND target_muscles IS NULL;
UPDATE exercises SET target_muscles = '["quads"]'::jsonb, assist_muscles = '["glutes", "adductors", "abs", "traps"]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Front Squat' AND target_muscles IS NULL;
UPDATE exercises SET target_muscles = '["hamstrings", "glutes"]'::jsonb, assist_muscles = '["lower_back", "forearms"]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Romanian Deadlift' AND target_muscles IS NULL;
UPDATE exercises SET target_muscles = '["quads", "glutes"]'::jsonb, assist_muscles = '["adductors"]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Leg Press' AND target_muscles IS NULL;
UPDATE exercises SET target_muscles = '["quads"]'::jsonb, assist_muscles = NULL, updated_at = now() WHERE user_id IS NULL AND name = 'Leg Extension' AND target_muscles IS NULL;
UPDATE exercises SET target_muscles = '["hamstrings"]'::jsonb, assist_muscles = '["calves"]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Leg Curl' AND target_muscles IS NULL;
UPDATE exercises SET target_muscles = '["quads", "glutes"]'::jsonb, assist_muscles = '["adductors", "hamstrings", "calves"]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Walking Lunge' AND target_muscles IS NULL;
UPDATE exercises SET target_muscles = '["quads", "glutes"]'::jsonb, assist_muscles = '["adductors", "hamstrings"]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Bulgarian Split Squat' AND target_muscles IS NULL;
UPDATE exercises SET target_muscles = '["calves"]'::jsonb, assist_muscles = NULL, updated_at = now() WHERE user_id IS NULL AND name = 'Standing Calf Raise' AND target_muscles IS NULL;
UPDATE exercises SET target_muscles = '["glutes"]'::jsonb, assist_muscles = '["hamstrings"]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Hip Thrust' AND target_muscles IS NULL;
UPDATE exercises SET target_muscles = '["front_delts", "side_delts"]'::jsonb, assist_muscles = '["triceps", "traps", "abs"]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Overhead Press' AND target_muscles IS NULL;
UPDATE exercises SET target_muscles = '["front_delts", "side_delts"]'::jsonb, assist_muscles = '["triceps"]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Seated Dumbbell Press' AND target_muscles IS NULL;
UPDATE exercises SET target_muscles = '["side_delts"]'::jsonb, assist_muscles = '["traps"]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Lateral Raise' AND target_muscles IS NULL;
UPDATE exercises SET target_muscles = '["rear_delts"]'::jsonb, assist_muscles = '["traps"]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Rear Delt Fly' AND target_muscles IS NULL;
UPDATE exercises SET target_muscles = '["rear_delts", "traps"]'::jsonb, assist_muscles = '["side_delts"]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Face Pull' AND target_muscles IS NULL;
UPDATE exercises SET target_muscles = '["biceps"]'::jsonb, assist_muscles = '["forearms"]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Barbell Curl' AND target_muscles IS NULL;
UPDATE exercises SET target_muscles = '["biceps"]'::jsonb, assist_muscles = '["forearms"]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Dumbbell Curl' AND target_muscles IS NULL;
UPDATE exercises SET target_muscles = '["biceps", "forearms"]'::jsonb, assist_muscles = NULL, updated_at = now() WHERE user_id IS NULL AND name = 'Hammer Curl' AND target_muscles IS NULL;
UPDATE exercises SET target_muscles = '["triceps"]'::jsonb, assist_muscles = NULL, updated_at = now() WHERE user_id IS NULL AND name = 'Triceps Pushdown' AND target_muscles IS NULL;
UPDATE exercises SET target_muscles = '["triceps"]'::jsonb, assist_muscles = NULL, updated_at = now() WHERE user_id IS NULL AND name = 'Skull Crusher' AND target_muscles IS NULL;
UPDATE exercises SET target_muscles = '["triceps"]'::jsonb, assist_muscles = NULL, updated_at = now() WHERE user_id IS NULL AND name = 'Overhead Triceps Extension' AND target_muscles IS NULL;
UPDATE exercises SET target_muscles = '["abs"]'::jsonb, assist_muscles = '["obliques", "front_delts", "glutes"]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Plank' AND target_muscles IS NULL;
UPDATE exercises SET target_muscles = '["abs"]'::jsonb, assist_muscles = '["obliques", "forearms"]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Hanging Leg Raise' AND target_muscles IS NULL;
UPDATE exercises SET target_muscles = '["abs"]'::jsonb, assist_muscles = '["obliques"]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Cable Crunch' AND target_muscles IS NULL;
UPDATE exercises SET target_muscles = '["obliques"]'::jsonb, assist_muscles = '["abs"]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Russian Twist' AND target_muscles IS NULL;
UPDATE exercises SET target_muscles = '["obliques"]'::jsonb, assist_muscles = '["abs", "side_delts", "glutes"]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Side Plank' AND target_muscles IS NULL;
UPDATE exercises SET target_muscles = '["abs"]'::jsonb, assist_muscles = '["obliques"]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Dead Bug' AND target_muscles IS NULL;
UPDATE exercises SET target_muscles = '["abs", "lower_back"]'::jsonb, assist_muscles = '["glutes", "rear_delts"]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Bird Dog' AND target_muscles IS NULL;
UPDATE exercises SET target_muscles = '["glutes"]'::jsonb, assist_muscles = '["hamstrings", "lower_back"]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Glute Bridge' AND target_muscles IS NULL;
UPDATE exercises SET target_muscles = '["calves"]'::jsonb, assist_muscles = NULL, updated_at = now() WHERE user_id IS NULL AND name = 'Single-Leg Calf Raise' AND target_muscles IS NULL;
UPDATE exercises SET target_muscles = '["quads", "glutes"]'::jsonb, assist_muscles = '["hamstrings", "calves"]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Step-up' AND target_muscles IS NULL;
UPDATE exercises SET target_muscles = '["hamstrings", "glutes"]'::jsonb, assist_muscles = '["lower_back", "abs"]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Single-Leg Romanian Deadlift' AND target_muscles IS NULL;
UPDATE exercises SET target_muscles = '["rear_delts"]'::jsonb, assist_muscles = NULL, updated_at = now() WHERE user_id IS NULL AND name = 'External Shoulder Rotation' AND target_muscles IS NULL;
UPDATE exercises SET target_muscles = '["lats"]'::jsonb, assist_muscles = '["triceps", "abs"]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Straight-Arm Pulldown' AND target_muscles IS NULL;
UPDATE exercises SET target_muscles = '["quads", "chest"]'::jsonb, assist_muscles = '["glutes", "front_delts", "triceps", "abs", "calves"]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Burpee' AND target_muscles IS NULL;
UPDATE exercises SET target_muscles = '["quads", "glutes"]'::jsonb, assist_muscles = '["adductors"]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Bodyweight Squat' AND target_muscles IS NULL;
UPDATE exercises SET target_muscles = '["quads", "glutes"]'::jsonb, assist_muscles = '["calves", "hamstrings"]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Jump Squat' AND target_muscles IS NULL;
UPDATE exercises SET target_muscles = '["abs"]'::jsonb, assist_muscles = '["front_delts", "quads", "obliques"]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Mountain Climber' AND target_muscles IS NULL;
UPDATE exercises SET target_muscles = '["calves"]'::jsonb, assist_muscles = '["side_delts", "glutes", "adductors"]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Jumping Jack' AND target_muscles IS NULL;
UPDATE exercises SET target_muscles = '["quads", "calves"]'::jsonb, assist_muscles = '["abs", "glutes"]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'High Knees' AND target_muscles IS NULL;
UPDATE exercises SET target_muscles = '["quads", "glutes"]'::jsonb, assist_muscles = '["hamstrings", "adductors"]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Reverse Lunge' AND target_muscles IS NULL;
UPDATE exercises SET target_muscles = '["quads", "glutes"]'::jsonb, assist_muscles = '["calves", "hamstrings"]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Jumping Lunge' AND target_muscles IS NULL;
UPDATE exercises SET target_muscles = '["glutes", "quads"]'::jsonb, assist_muscles = '["adductors", "calves"]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Skater Jump' AND target_muscles IS NULL;
UPDATE exercises SET target_muscles = '["quads"]'::jsonb, assist_muscles = '["glutes"]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Wall Sit' AND target_muscles IS NULL;
UPDATE exercises SET target_muscles = '["hamstrings", "abs"]'::jsonb, assist_muscles = '["front_delts", "chest"]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Inchworm' AND target_muscles IS NULL;
UPDATE exercises SET target_muscles = '["abs", "obliques"]'::jsonb, assist_muscles = '["front_delts"]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Plank Shoulder Tap' AND target_muscles IS NULL;
UPDATE exercises SET target_muscles = '["obliques", "abs"]'::jsonb, assist_muscles = NULL, updated_at = now() WHERE user_id IS NULL AND name = 'Bicycle Crunch' AND target_muscles IS NULL;
UPDATE exercises SET target_muscles = '["abs"]'::jsonb, assist_muscles = '["quads"]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Flutter Kicks' AND target_muscles IS NULL;
UPDATE exercises SET target_muscles = '["abs"]'::jsonb, assist_muscles = NULL, updated_at = now() WHERE user_id IS NULL AND name = 'Crunch' AND target_muscles IS NULL;
UPDATE exercises SET target_muscles = '["abs"]'::jsonb, assist_muscles = '["quads"]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Lying Leg Raise' AND target_muscles IS NULL;
UPDATE exercises SET target_muscles = '["abs"]'::jsonb, assist_muscles = NULL, updated_at = now() WHERE user_id IS NULL AND name = 'Hollow Hold' AND target_muscles IS NULL;
UPDATE exercises SET target_muscles = '["quads", "glutes"]'::jsonb, assist_muscles = '["adductors", "abs"]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Goblet Squat' AND target_muscles IS NULL;
UPDATE exercises SET target_muscles = '["quads", "front_delts"]'::jsonb, assist_muscles = '["glutes", "triceps", "abs"]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Dumbbell Thruster' AND target_muscles IS NULL;
UPDATE exercises SET target_muscles = '["glutes", "hamstrings"]'::jsonb, assist_muscles = '["lower_back", "front_delts"]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Dumbbell Swing' AND target_muscles IS NULL;
UPDATE exercises SET target_muscles = '["lats", "abs"]'::jsonb, assist_muscles = '["obliques", "traps", "biceps"]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Renegade Row' AND target_muscles IS NULL;
UPDATE exercises SET target_muscles = '["hamstrings", "glutes"]'::jsonb, assist_muscles = '["lower_back"]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Dumbbell Romanian Deadlift' AND target_muscles IS NULL;
UPDATE exercises SET target_muscles = '["quads", "glutes"]'::jsonb, assist_muscles = '["hamstrings"]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Dumbbell Reverse Lunge' AND target_muscles IS NULL;
UPDATE exercises SET target_muscles = '["quads", "adductors", "glutes"]'::jsonb, assist_muscles = NULL, updated_at = now() WHERE user_id IS NULL AND name = 'Dumbbell Sumo Squat' AND target_muscles IS NULL;
UPDATE exercises SET target_muscles = '["front_delts", "side_delts"]'::jsonb, assist_muscles = '["triceps", "quads"]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Dumbbell Push Press' AND target_muscles IS NULL;
UPDATE exercises SET target_muscles = '["obliques"]'::jsonb, assist_muscles = '["front_delts", "abs"]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Dumbbell Woodchop' AND target_muscles IS NULL;
UPDATE exercises SET target_muscles = '["front_delts", "side_delts"]'::jsonb, assist_muscles = '["triceps", "traps", "abs"]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Handstand Hold' AND target_muscles IS NULL;
UPDATE exercises SET target_muscles = '["calves", "glutes"]'::jsonb, assist_muscles = '["abs"]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Single-Leg Balance' AND target_muscles IS NULL;
UPDATE exercises SET target_muscles = '["glutes", "hamstrings"]'::jsonb, assist_muscles = '["lower_back", "calves"]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Arabesque Hold' AND target_muscles IS NULL;
UPDATE exercises SET target_muscles = '["lower_back"]'::jsonb, assist_muscles = '["glutes", "rear_delts"]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Superman Hold' AND target_muscles IS NULL;
UPDATE exercises SET target_muscles = '["quads", "calves"]'::jsonb, assist_muscles = '["abs", "glutes"]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Tuck Jump' AND target_muscles IS NULL;
UPDATE exercises SET target_muscles = '["lower_back", "glutes"]'::jsonb, assist_muscles = '["triceps", "front_delts"]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Bridge Hold' AND target_muscles IS NULL;
UPDATE exercises SET target_muscles = '["hamstrings"]'::jsonb, assist_muscles = '["quads"]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Front Split Stretch' AND target_muscles IS NULL;
UPDATE exercises SET target_muscles = '["hamstrings"]'::jsonb, assist_muscles = '["lower_back"]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Pike Stretch' AND target_muscles IS NULL;
UPDATE exercises SET target_muscles = '["hamstrings", "calves"]'::jsonb, assist_muscles = NULL, updated_at = now() WHERE user_id IS NULL AND name = 'Butt Kicks' AND target_muscles IS NULL;
UPDATE exercises SET target_muscles = '["calves", "quads"]'::jsonb, assist_muscles = NULL, updated_at = now() WHERE user_id IS NULL AND name = 'Fast Feet' AND target_muscles IS NULL;
UPDATE exercises SET target_muscles = '["adductors", "quads"]'::jsonb, assist_muscles = '["glutes", "calves"]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Lateral Shuffle' AND target_muscles IS NULL;
UPDATE exercises SET target_muscles = '["calves"]'::jsonb, assist_muscles = '["side_delts", "glutes"]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Step Jack' AND target_muscles IS NULL;
UPDATE exercises SET target_muscles = '["abs", "quads"]'::jsonb, assist_muscles = NULL, updated_at = now() WHERE user_id IS NULL AND name = 'Standing Knee Drive' AND target_muscles IS NULL;
UPDATE exercises SET target_muscles = '["quads", "calves"]'::jsonb, assist_muscles = '["glutes", "side_delts"]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Star Jump' AND target_muscles IS NULL;
UPDATE exercises SET target_muscles = '["quads", "glutes"]'::jsonb, assist_muscles = '["hamstrings", "calves"]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Broad Jump' AND target_muscles IS NULL;
UPDATE exercises SET target_muscles = '["front_delts", "side_delts"]'::jsonb, assist_muscles = '["obliques", "calves"]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Shadow Boxing' AND target_muscles IS NULL;
UPDATE exercises SET target_muscles = '["quads", "abs"]'::jsonb, assist_muscles = '["front_delts"]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Squat Thrust' AND target_muscles IS NULL;
UPDATE exercises SET target_muscles = '["abs"]'::jsonb, assist_muscles = '["front_delts", "adductors"]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Plank Jack' AND target_muscles IS NULL;
UPDATE exercises SET target_muscles = '["front_delts", "abs"]'::jsonb, assist_muscles = '["quads", "triceps"]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Bear Crawl' AND target_muscles IS NULL;
UPDATE exercises SET target_muscles = '["quads", "adductors", "glutes"]'::jsonb, assist_muscles = NULL, updated_at = now() WHERE user_id IS NULL AND name = 'Sumo Squat' AND target_muscles IS NULL;
UPDATE exercises SET target_muscles = '["quads"]'::jsonb, assist_muscles = '["glutes"]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Squat Pulse' AND target_muscles IS NULL;
UPDATE exercises SET target_muscles = '["adductors", "quads", "glutes"]'::jsonb, assist_muscles = NULL, updated_at = now() WHERE user_id IS NULL AND name = 'Lateral Lunge' AND target_muscles IS NULL;
UPDATE exercises SET target_muscles = '["glutes", "quads"]'::jsonb, assist_muscles = '["adductors"]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Curtsy Lunge' AND target_muscles IS NULL;
UPDATE exercises SET target_muscles = '["quads", "glutes"]'::jsonb, assist_muscles = '["hamstrings"]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Split Squat' AND target_muscles IS NULL;
UPDATE exercises SET target_muscles = '["adductors", "quads"]'::jsonb, assist_muscles = '["glutes"]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Cossack Squat' AND target_muscles IS NULL;
UPDATE exercises SET target_muscles = '["glutes"]'::jsonb, assist_muscles = '["hamstrings"]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Single-Leg Glute Bridge' AND target_muscles IS NULL;
UPDATE exercises SET target_muscles = '["calves"]'::jsonb, assist_muscles = NULL, updated_at = now() WHERE user_id IS NULL AND name = 'Bodyweight Calf Raise' AND target_muscles IS NULL;
UPDATE exercises SET target_muscles = '["hamstrings", "lower_back"]'::jsonb, assist_muscles = '["glutes"]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Good Morning' AND target_muscles IS NULL;
UPDATE exercises SET target_muscles = '["glutes"]'::jsonb, assist_muscles = '["hamstrings"]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Donkey Kick' AND target_muscles IS NULL;
UPDATE exercises SET target_muscles = '["glutes"]'::jsonb, assist_muscles = NULL, updated_at = now() WHERE user_id IS NULL AND name = 'Fire Hydrant' AND target_muscles IS NULL;
UPDATE exercises SET target_muscles = '["chest"]'::jsonb, assist_muscles = '["front_delts", "triceps"]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Knee Push-up' AND target_muscles IS NULL;
UPDATE exercises SET target_muscles = '["chest"]'::jsonb, assist_muscles = '["front_delts", "triceps"]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Incline Push-up' AND target_muscles IS NULL;
UPDATE exercises SET target_muscles = '["triceps", "chest"]'::jsonb, assist_muscles = '["front_delts"]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Diamond Push-up' AND target_muscles IS NULL;
UPDATE exercises SET target_muscles = '["front_delts", "side_delts"]'::jsonb, assist_muscles = '["triceps"]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Pike Push-up' AND target_muscles IS NULL;
UPDATE exercises SET target_muscles = '["triceps"]'::jsonb, assist_muscles = '["front_delts"]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Bench Dip' AND target_muscles IS NULL;
UPDATE exercises SET target_muscles = '["obliques"]'::jsonb, assist_muscles = '["abs"]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Heel Taps' AND target_muscles IS NULL;
UPDATE exercises SET target_muscles = '["abs"]'::jsonb, assist_muscles = NULL, updated_at = now() WHERE user_id IS NULL AND name = 'Reverse Crunch' AND target_muscles IS NULL;
UPDATE exercises SET target_muscles = '["abs"]'::jsonb, assist_muscles = '["adductors"]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Scissor Kicks' AND target_muscles IS NULL;
UPDATE exercises SET target_muscles = '["abs"]'::jsonb, assist_muscles = NULL, updated_at = now() WHERE user_id IS NULL AND name = 'V-up' AND target_muscles IS NULL;
UPDATE exercises SET target_muscles = '["abs"]'::jsonb, assist_muscles = NULL, updated_at = now() WHERE user_id IS NULL AND name = 'Sit-up' AND target_muscles IS NULL;
UPDATE exercises SET target_muscles = '["obliques"]'::jsonb, assist_muscles = NULL, updated_at = now() WHERE user_id IS NULL AND name = 'Standing Oblique Crunch' AND target_muscles IS NULL;
UPDATE exercises SET target_muscles = '["glutes", "abs"]'::jsonb, assist_muscles = '["hamstrings"]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Glute Bridge Hold' AND target_muscles IS NULL;
UPDATE exercises SET target_muscles = '["obliques"]'::jsonb, assist_muscles = '["abs"]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Side Plank Hip Dip' AND target_muscles IS NULL;
UPDATE exercises SET target_muscles = '["lats", "traps"]'::jsonb, assist_muscles = '["rear_delts", "biceps", "lower_back"]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Dumbbell Bent-Over Row' AND target_muscles IS NULL;
UPDATE exercises SET target_muscles = '["chest"]'::jsonb, assist_muscles = '["triceps", "front_delts"]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Dumbbell Floor Press' AND target_muscles IS NULL;
UPDATE exercises SET target_muscles = '["biceps", "front_delts"]'::jsonb, assist_muscles = '["side_delts", "triceps"]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Dumbbell Curl to Press' AND target_muscles IS NULL;
UPDATE exercises SET target_muscles = '["adductors", "quads", "glutes"]'::jsonb, assist_muscles = NULL, updated_at = now() WHERE user_id IS NULL AND name = 'Dumbbell Lateral Lunge' AND target_muscles IS NULL;
UPDATE exercises SET target_muscles = '["glutes"]'::jsonb, assist_muscles = '["hamstrings"]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Dumbbell Glute Bridge' AND target_muscles IS NULL;
UPDATE exercises SET target_muscles = '["biceps", "forearms"]'::jsonb, assist_muscles = NULL, updated_at = now() WHERE user_id IS NULL AND name = 'Dumbbell Hammer Curl' AND target_muscles IS NULL;
UPDATE exercises SET target_muscles = '["lats", "traps"]'::jsonb, assist_muscles = '["biceps", "rear_delts", "abs"]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'TRX Row' AND target_muscles IS NULL;
UPDATE exercises SET target_muscles = '["chest"]'::jsonb, assist_muscles = '["front_delts", "triceps", "abs"]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'TRX Chest Press' AND target_muscles IS NULL;
UPDATE exercises SET target_muscles = '["quads", "glutes"]'::jsonb, assist_muscles = NULL, updated_at = now() WHERE user_id IS NULL AND name = 'TRX Squat' AND target_muscles IS NULL;
UPDATE exercises SET target_muscles = '["quads", "glutes"]'::jsonb, assist_muscles = '["hamstrings"]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'TRX Suspended Lunge' AND target_muscles IS NULL;
UPDATE exercises SET target_muscles = '["hamstrings"]'::jsonb, assist_muscles = '["glutes"]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'TRX Hamstring Curl' AND target_muscles IS NULL;
UPDATE exercises SET target_muscles = '["abs"]'::jsonb, assist_muscles = '["front_delts"]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'TRX Pike' AND target_muscles IS NULL;
UPDATE exercises SET target_muscles = '["abs"]'::jsonb, assist_muscles = '["front_delts"]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'TRX Knee Tuck' AND target_muscles IS NULL;
UPDATE exercises SET target_muscles = '["abs"]'::jsonb, assist_muscles = '["front_delts", "quads"]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'TRX Mountain Climber' AND target_muscles IS NULL;
UPDATE exercises SET target_muscles = '["abs"]'::jsonb, assist_muscles = '["front_delts"]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'TRX Plank' AND target_muscles IS NULL;
UPDATE exercises SET target_muscles = '["obliques"]'::jsonb, assist_muscles = '["abs"]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'TRX Side Plank' AND target_muscles IS NULL;
UPDATE exercises SET target_muscles = '["biceps"]'::jsonb, assist_muscles = NULL, updated_at = now() WHERE user_id IS NULL AND name = 'TRX Biceps Curl' AND target_muscles IS NULL;
UPDATE exercises SET target_muscles = '["triceps"]'::jsonb, assist_muscles = NULL, updated_at = now() WHERE user_id IS NULL AND name = 'TRX Triceps Extension' AND target_muscles IS NULL;
UPDATE exercises SET target_muscles = '["rear_delts", "traps"]'::jsonb, assist_muscles = '["side_delts"]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'TRX Y-Fly' AND target_muscles IS NULL;
UPDATE exercises SET target_muscles = '["quads", "glutes"]'::jsonb, assist_muscles = '["calves"]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'TRX Jump Squat' AND target_muscles IS NULL;
UPDATE exercises SET target_muscles = '["chest", "abs"]'::jsonb, assist_muscles = '["front_delts", "triceps"]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'TRX Atomic Push-up' AND target_muscles IS NULL;
UPDATE exercises SET target_muscles = '["quads", "glutes"]'::jsonb, assist_muscles = NULL, updated_at = now() WHERE user_id IS NULL AND name = 'TRX Single-Leg Squat' AND target_muscles IS NULL;
UPDATE exercises SET target_muscles = '["quads", "glutes"]'::jsonb, assist_muscles = '["calves"]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'TRX Sprinter Start' AND target_muscles IS NULL;
UPDATE exercises SET target_muscles = '["front_delts", "side_delts"]'::jsonb, assist_muscles = '["triceps", "obliques"]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Shadow Boxing Jab-Cross' AND target_muscles IS NULL;
UPDATE exercises SET target_muscles = '["front_delts", "side_delts"]'::jsonb, assist_muscles = '["triceps", "obliques"]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Shadow Boxing Double Jab-Cross' AND target_muscles IS NULL;
UPDATE exercises SET target_muscles = '["front_delts", "side_delts"]'::jsonb, assist_muscles = '["obliques", "triceps"]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Shadow Boxing Jab-Cross-Hook' AND target_muscles IS NULL;
UPDATE exercises SET target_muscles = '["front_delts", "side_delts"]'::jsonb, assist_muscles = '["obliques", "triceps"]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Shadow Boxing Jab-Cross-Hook-Cross' AND target_muscles IS NULL;
UPDATE exercises SET target_muscles = '["front_delts", "biceps"]'::jsonb, assist_muscles = '["obliques"]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Shadow Boxing Uppercuts' AND target_muscles IS NULL;
UPDATE exercises SET target_muscles = '["obliques", "abs"]'::jsonb, assist_muscles = '["front_delts"]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Shadow Boxing Body Shots' AND target_muscles IS NULL;
UPDATE exercises SET target_muscles = '["obliques"]'::jsonb, assist_muscles = '["quads", "front_delts"]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Shadow Boxing Slip and Counter' AND target_muscles IS NULL;
UPDATE exercises SET target_muscles = '["quads", "glutes"]'::jsonb, assist_muscles = '["obliques"]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Shadow Boxing Bob and Weave' AND target_muscles IS NULL;
UPDATE exercises SET target_muscles = '["calves", "quads"]'::jsonb, assist_muscles = NULL, updated_at = now() WHERE user_id IS NULL AND name = 'Shadow Boxing Footwork' AND target_muscles IS NULL;
UPDATE exercises SET target_muscles = '["front_delts", "side_delts"]'::jsonb, assist_muscles = '["triceps"]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Shadow Boxing Speed Punches' AND target_muscles IS NULL;

COMMIT;

-- 076_exercise_details_and_restrictions.sql
-- The library says more about each exercise, and the athlete can rule some out.
--   exercises.level              beginner / intermediate / advanced
--   exercises.movements          what it asks of the body (squat, hinge, lunge, push or
--                                pull, overhead, hanging, jumps, core...), several at once
--   exercises.secondary_muscles  the muscle groups it works besides its main one
--   exercises.cues / mistakes    the key points and the usual faults, by language
--                                ({"fr": [...], "en": [...], "de": [...]}), filled by an admin
--   exercises.variant_of         the exercise it is a variant of
--   athlete_profiles.restrictions what the athlete rules out besides an injured joint:
--                                a muscle group, a movement or an exercise, to avoid or to
--                                do with caution, maybe until a date
--                                ([{"kind": "muscle"|"movement"|"exercise", "value": ...,
--                                   "level": "avoid"|"caution", "until": "YYYY-MM-DD"}])
-- The library's 141 exercises get their level, movements and secondary muscles;
-- a row an admin already filled is left as it is.
-- Deploy: apply this file first, then the code.
-- Safe to run again. All-or-nothing: one transaction.

BEGIN;

ALTER TABLE exercises ADD COLUMN IF NOT EXISTS level TEXT;
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS movements JSONB;
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS secondary_muscles JSONB;
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS cues JSONB;
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS mistakes JSONB;
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS variant_of UUID;

ALTER TABLE exercises DROP CONSTRAINT IF EXISTS exercises_details_check;
ALTER TABLE exercises ADD CONSTRAINT exercises_details_check CHECK (
  (level IS NULL OR level IN ('beginner', 'intermediate', 'advanced'))
  AND (movements IS NULL OR (jsonb_typeof(movements) = 'array' AND jsonb_array_length(movements) <= 6
       AND movements <@ '["squat", "hinge", "lunge", "push_horizontal", "push_vertical", "pull_horizontal", "pull_vertical", "overhead", "hanging", "isolation", "core_flexion", "core_stability", "rotation", "jump", "conditioning", "mobility"]'::jsonb))
  AND (secondary_muscles IS NULL OR (jsonb_typeof(secondary_muscles) = 'array' AND jsonb_array_length(secondary_muscles) <= 6
       AND secondary_muscles <@ '["chest", "back", "legs", "shoulders", "arms", "core", "full_body", "other"]'::jsonb))
  AND (cues IS NULL OR (jsonb_typeof(cues) = 'object' AND char_length(cues::text) <= 6000))
  AND (mistakes IS NULL OR (jsonb_typeof(mistakes) = 'object' AND char_length(mistakes::text) <= 6000))
) NOT VALID;

ALTER TABLE athlete_profiles ADD COLUMN IF NOT EXISTS restrictions JSONB;
ALTER TABLE athlete_profiles DROP CONSTRAINT IF EXISTS athlete_profiles_restrictions_check;
ALTER TABLE athlete_profiles ADD CONSTRAINT athlete_profiles_restrictions_check CHECK (
  restrictions IS NULL OR (jsonb_typeof(restrictions) = 'array' AND jsonb_array_length(restrictions) <= 30
    AND char_length(restrictions::text) <= 8000)
) NOT VALID;

-- Admin: the details of any exercise, the library's included. The table's
-- check refuses what does not fit; an empty value clears it.
CREATE OR REPLACE FUNCTION admin_set_exercise_details(
  p_uuid TEXT, p_level TEXT, p_movements JSONB, p_secondary JSONB, p_cues JSONB, p_mistakes JSONB, p_variant_of TEXT
)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS '
BEGIN
  IF NOT is_app_admin() THEN
    RAISE EXCEPTION ''Unauthorized: admin access required'';
  END IF;
  UPDATE exercises
     SET level = NULLIF(p_level, ''''),
         movements = CASE WHEN p_movements IS NULL OR p_movements = ''[]''::jsonb THEN NULL ELSE p_movements END,
         secondary_muscles = CASE WHEN p_secondary IS NULL OR p_secondary = ''[]''::jsonb THEN NULL ELSE p_secondary END,
         cues = CASE WHEN p_cues IS NULL OR p_cues = ''{}''::jsonb THEN NULL ELSE p_cues END,
         mistakes = CASE WHEN p_mistakes IS NULL OR p_mistakes = ''{}''::jsonb THEN NULL ELSE p_mistakes END,
         variant_of = NULLIF(p_variant_of, '''')::uuid,
         updated_at = now()
   WHERE id = p_uuid::uuid;
END;
';
REVOKE ALL ON FUNCTION admin_set_exercise_details(TEXT, TEXT, JSONB, JSONB, JSONB, JSONB, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION admin_set_exercise_details(TEXT, TEXT, JSONB, JSONB, JSONB, JSONB, TEXT) TO authenticated;

-- The library, described.
UPDATE exercises SET movements = '["push_horizontal"]'::jsonb, level = 'intermediate', secondary_muscles = '["arms", "shoulders"]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Barbell Bench Press' AND movements IS NULL;
UPDATE exercises SET movements = '["push_horizontal"]'::jsonb, level = 'intermediate', secondary_muscles = '["shoulders", "arms"]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Incline Barbell Bench Press' AND movements IS NULL;
UPDATE exercises SET movements = '["push_horizontal"]'::jsonb, level = 'beginner', secondary_muscles = '["shoulders", "arms"]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Dumbbell Bench Press' AND movements IS NULL;
UPDATE exercises SET movements = '["push_horizontal"]'::jsonb, level = 'beginner', secondary_muscles = '["shoulders", "arms"]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Incline Dumbbell Press' AND movements IS NULL;
UPDATE exercises SET movements = '["isolation"]'::jsonb, level = 'beginner', secondary_muscles = '["shoulders"]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Cable Fly' AND movements IS NULL;
UPDATE exercises SET movements = '["push_horizontal"]'::jsonb, level = 'beginner', secondary_muscles = '["arms", "shoulders", "core"]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Push-up' AND movements IS NULL;
UPDATE exercises SET movements = '["push_vertical"]'::jsonb, level = 'intermediate', secondary_muscles = '["arms", "shoulders"]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Chest Dip' AND movements IS NULL;
UPDATE exercises SET movements = '["hinge"]'::jsonb, level = 'advanced', secondary_muscles = '["legs", "core"]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Deadlift' AND movements IS NULL;
UPDATE exercises SET movements = '["pull_horizontal", "hinge"]'::jsonb, level = 'intermediate', secondary_muscles = '["arms"]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Barbell Row' AND movements IS NULL;
UPDATE exercises SET movements = '["pull_vertical", "hanging", "overhead"]'::jsonb, level = 'intermediate', secondary_muscles = '["arms", "shoulders"]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Pull-up' AND movements IS NULL;
UPDATE exercises SET movements = '["pull_vertical", "hanging", "overhead"]'::jsonb, level = 'intermediate', secondary_muscles = '["arms"]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Chin-up' AND movements IS NULL;
UPDATE exercises SET movements = '["pull_vertical", "overhead"]'::jsonb, level = 'beginner', secondary_muscles = '["arms"]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Lat Pulldown' AND movements IS NULL;
UPDATE exercises SET movements = '["pull_horizontal"]'::jsonb, level = 'beginner', secondary_muscles = '["arms"]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Seated Cable Row' AND movements IS NULL;
UPDATE exercises SET movements = '["pull_horizontal"]'::jsonb, level = 'beginner', secondary_muscles = '["arms"]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Dumbbell Row' AND movements IS NULL;
UPDATE exercises SET movements = '["pull_horizontal", "hinge"]'::jsonb, level = 'intermediate', secondary_muscles = '["arms"]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'T-Bar Row' AND movements IS NULL;
UPDATE exercises SET movements = '["squat"]'::jsonb, level = 'intermediate', secondary_muscles = '["core", "back"]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Back Squat' AND movements IS NULL;
UPDATE exercises SET movements = '["squat"]'::jsonb, level = 'advanced', secondary_muscles = '["core"]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Front Squat' AND movements IS NULL;
UPDATE exercises SET movements = '["hinge"]'::jsonb, level = 'intermediate', secondary_muscles = '["back"]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Romanian Deadlift' AND movements IS NULL;
UPDATE exercises SET movements = '["squat"]'::jsonb, level = 'beginner', secondary_muscles = '[]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Leg Press' AND movements IS NULL;
UPDATE exercises SET movements = '["isolation"]'::jsonb, level = 'beginner', secondary_muscles = '[]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Leg Extension' AND movements IS NULL;
UPDATE exercises SET movements = '["isolation"]'::jsonb, level = 'beginner', secondary_muscles = '[]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Leg Curl' AND movements IS NULL;
UPDATE exercises SET movements = '["lunge"]'::jsonb, level = 'beginner', secondary_muscles = '["core"]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Walking Lunge' AND movements IS NULL;
UPDATE exercises SET movements = '["lunge"]'::jsonb, level = 'intermediate', secondary_muscles = '["core"]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Bulgarian Split Squat' AND movements IS NULL;
UPDATE exercises SET movements = '["isolation"]'::jsonb, level = 'beginner', secondary_muscles = '[]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Standing Calf Raise' AND movements IS NULL;
UPDATE exercises SET movements = '["hinge"]'::jsonb, level = 'beginner', secondary_muscles = '["core"]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Hip Thrust' AND movements IS NULL;
UPDATE exercises SET movements = '["push_vertical", "overhead"]'::jsonb, level = 'intermediate', secondary_muscles = '["arms", "core"]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Overhead Press' AND movements IS NULL;
UPDATE exercises SET movements = '["push_vertical", "overhead"]'::jsonb, level = 'beginner', secondary_muscles = '["arms"]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Seated Dumbbell Press' AND movements IS NULL;
UPDATE exercises SET movements = '["isolation"]'::jsonb, level = 'beginner', secondary_muscles = '[]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Lateral Raise' AND movements IS NULL;
UPDATE exercises SET movements = '["isolation"]'::jsonb, level = 'beginner', secondary_muscles = '["back"]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Rear Delt Fly' AND movements IS NULL;
UPDATE exercises SET movements = '["pull_horizontal"]'::jsonb, level = 'beginner', secondary_muscles = '["back"]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Face Pull' AND movements IS NULL;
UPDATE exercises SET movements = '["isolation"]'::jsonb, level = 'beginner', secondary_muscles = '[]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Barbell Curl' AND movements IS NULL;
UPDATE exercises SET movements = '["isolation"]'::jsonb, level = 'beginner', secondary_muscles = '[]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Dumbbell Curl' AND movements IS NULL;
UPDATE exercises SET movements = '["isolation"]'::jsonb, level = 'beginner', secondary_muscles = '[]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Hammer Curl' AND movements IS NULL;
UPDATE exercises SET movements = '["isolation"]'::jsonb, level = 'beginner', secondary_muscles = '[]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Triceps Pushdown' AND movements IS NULL;
UPDATE exercises SET movements = '["isolation"]'::jsonb, level = 'intermediate', secondary_muscles = '[]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Skull Crusher' AND movements IS NULL;
UPDATE exercises SET movements = '["isolation", "overhead"]'::jsonb, level = 'beginner', secondary_muscles = '[]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Overhead Triceps Extension' AND movements IS NULL;
UPDATE exercises SET movements = '["core_stability"]'::jsonb, level = 'beginner', secondary_muscles = '["shoulders"]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Plank' AND movements IS NULL;
UPDATE exercises SET movements = '["core_flexion", "hanging"]'::jsonb, level = 'intermediate', secondary_muscles = '["arms"]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Hanging Leg Raise' AND movements IS NULL;
UPDATE exercises SET movements = '["core_flexion"]'::jsonb, level = 'beginner', secondary_muscles = '[]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Cable Crunch' AND movements IS NULL;
UPDATE exercises SET movements = '["rotation"]'::jsonb, level = 'beginner', secondary_muscles = '[]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Russian Twist' AND movements IS NULL;
UPDATE exercises SET movements = '["core_stability"]'::jsonb, level = 'beginner', secondary_muscles = '["shoulders"]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Side Plank' AND movements IS NULL;
UPDATE exercises SET movements = '["core_stability"]'::jsonb, level = 'beginner', secondary_muscles = '[]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Dead Bug' AND movements IS NULL;
UPDATE exercises SET movements = '["core_stability"]'::jsonb, level = 'beginner', secondary_muscles = '["back"]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Bird Dog' AND movements IS NULL;
UPDATE exercises SET movements = '["hinge"]'::jsonb, level = 'beginner', secondary_muscles = '["core"]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Glute Bridge' AND movements IS NULL;
UPDATE exercises SET movements = '["isolation"]'::jsonb, level = 'beginner', secondary_muscles = '[]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Single-Leg Calf Raise' AND movements IS NULL;
UPDATE exercises SET movements = '["lunge"]'::jsonb, level = 'beginner', secondary_muscles = '["core"]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Step-up' AND movements IS NULL;
UPDATE exercises SET movements = '["hinge"]'::jsonb, level = 'intermediate', secondary_muscles = '["core"]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Single-Leg Romanian Deadlift' AND movements IS NULL;
UPDATE exercises SET movements = '["isolation"]'::jsonb, level = 'beginner', secondary_muscles = '[]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'External Shoulder Rotation' AND movements IS NULL;
UPDATE exercises SET movements = '["pull_vertical"]'::jsonb, level = 'beginner', secondary_muscles = '["core"]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Straight-Arm Pulldown' AND movements IS NULL;
UPDATE exercises SET movements = '["jump", "push_horizontal", "conditioning"]'::jsonb, level = 'intermediate', secondary_muscles = '["chest", "legs"]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Burpee' AND movements IS NULL;
UPDATE exercises SET movements = '["squat"]'::jsonb, level = 'beginner', secondary_muscles = '[]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Bodyweight Squat' AND movements IS NULL;
UPDATE exercises SET movements = '["squat", "jump"]'::jsonb, level = 'intermediate', secondary_muscles = '[]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Jump Squat' AND movements IS NULL;
UPDATE exercises SET movements = '["core_stability", "conditioning"]'::jsonb, level = 'beginner', secondary_muscles = '["shoulders", "legs"]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Mountain Climber' AND movements IS NULL;
UPDATE exercises SET movements = '["jump", "conditioning"]'::jsonb, level = 'beginner', secondary_muscles = '[]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Jumping Jack' AND movements IS NULL;
UPDATE exercises SET movements = '["conditioning"]'::jsonb, level = 'beginner', secondary_muscles = '["core"]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'High Knees' AND movements IS NULL;
UPDATE exercises SET movements = '["lunge"]'::jsonb, level = 'beginner', secondary_muscles = '[]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Reverse Lunge' AND movements IS NULL;
UPDATE exercises SET movements = '["lunge", "jump"]'::jsonb, level = 'intermediate', secondary_muscles = '[]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Jumping Lunge' AND movements IS NULL;
UPDATE exercises SET movements = '["jump"]'::jsonb, level = 'intermediate', secondary_muscles = '[]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Skater Jump' AND movements IS NULL;
UPDATE exercises SET movements = '["squat"]'::jsonb, level = 'beginner', secondary_muscles = '[]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Wall Sit' AND movements IS NULL;
UPDATE exercises SET movements = '["core_stability"]'::jsonb, level = 'beginner', secondary_muscles = '["shoulders", "legs"]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Inchworm' AND movements IS NULL;
UPDATE exercises SET movements = '["core_stability"]'::jsonb, level = 'beginner', secondary_muscles = '["shoulders"]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Plank Shoulder Tap' AND movements IS NULL;
UPDATE exercises SET movements = '["core_flexion", "rotation"]'::jsonb, level = 'beginner', secondary_muscles = '[]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Bicycle Crunch' AND movements IS NULL;
UPDATE exercises SET movements = '["core_flexion"]'::jsonb, level = 'beginner', secondary_muscles = '[]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Flutter Kicks' AND movements IS NULL;
UPDATE exercises SET movements = '["core_flexion"]'::jsonb, level = 'beginner', secondary_muscles = '[]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Crunch' AND movements IS NULL;
UPDATE exercises SET movements = '["core_flexion"]'::jsonb, level = 'beginner', secondary_muscles = '[]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Lying Leg Raise' AND movements IS NULL;
UPDATE exercises SET movements = '["core_stability"]'::jsonb, level = 'intermediate', secondary_muscles = '[]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Hollow Hold' AND movements IS NULL;
UPDATE exercises SET movements = '["squat"]'::jsonb, level = 'beginner', secondary_muscles = '["core"]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Goblet Squat' AND movements IS NULL;
UPDATE exercises SET movements = '["squat", "push_vertical", "overhead"]'::jsonb, level = 'intermediate', secondary_muscles = '["legs", "shoulders"]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Dumbbell Thruster' AND movements IS NULL;
UPDATE exercises SET movements = '["hinge"]'::jsonb, level = 'intermediate', secondary_muscles = '["legs", "back"]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Dumbbell Swing' AND movements IS NULL;
UPDATE exercises SET movements = '["pull_horizontal", "core_stability"]'::jsonb, level = 'intermediate', secondary_muscles = '["core"]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Renegade Row' AND movements IS NULL;
UPDATE exercises SET movements = '["hinge"]'::jsonb, level = 'beginner', secondary_muscles = '["back"]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Dumbbell Romanian Deadlift' AND movements IS NULL;
UPDATE exercises SET movements = '["lunge"]'::jsonb, level = 'beginner', secondary_muscles = '[]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Dumbbell Reverse Lunge' AND movements IS NULL;
UPDATE exercises SET movements = '["squat"]'::jsonb, level = 'beginner', secondary_muscles = '[]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Dumbbell Sumo Squat' AND movements IS NULL;
UPDATE exercises SET movements = '["push_vertical", "overhead"]'::jsonb, level = 'intermediate', secondary_muscles = '["legs", "arms"]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Dumbbell Push Press' AND movements IS NULL;
UPDATE exercises SET movements = '["rotation"]'::jsonb, level = 'beginner', secondary_muscles = '["shoulders"]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Dumbbell Woodchop' AND movements IS NULL;
UPDATE exercises SET movements = '["push_vertical", "overhead"]'::jsonb, level = 'advanced', secondary_muscles = '["arms", "core"]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Handstand Hold' AND movements IS NULL;
UPDATE exercises SET movements = '["core_stability"]'::jsonb, level = 'beginner', secondary_muscles = '[]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Single-Leg Balance' AND movements IS NULL;
UPDATE exercises SET movements = '["core_stability"]'::jsonb, level = 'beginner', secondary_muscles = '["back"]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Arabesque Hold' AND movements IS NULL;
UPDATE exercises SET movements = '["core_stability"]'::jsonb, level = 'beginner', secondary_muscles = '[]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Superman Hold' AND movements IS NULL;
UPDATE exercises SET movements = '["jump"]'::jsonb, level = 'intermediate', secondary_muscles = '["core"]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Tuck Jump' AND movements IS NULL;
UPDATE exercises SET movements = '["core_stability"]'::jsonb, level = 'intermediate', secondary_muscles = '["shoulders"]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Bridge Hold' AND movements IS NULL;
UPDATE exercises SET movements = '["mobility"]'::jsonb, level = 'intermediate', secondary_muscles = '[]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Front Split Stretch' AND movements IS NULL;
UPDATE exercises SET movements = '["mobility"]'::jsonb, level = 'beginner', secondary_muscles = '[]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Pike Stretch' AND movements IS NULL;
UPDATE exercises SET movements = '["conditioning"]'::jsonb, level = 'beginner', secondary_muscles = '[]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Butt Kicks' AND movements IS NULL;
UPDATE exercises SET movements = '["conditioning"]'::jsonb, level = 'beginner', secondary_muscles = '[]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Fast Feet' AND movements IS NULL;
UPDATE exercises SET movements = '["conditioning"]'::jsonb, level = 'beginner', secondary_muscles = '[]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Lateral Shuffle' AND movements IS NULL;
UPDATE exercises SET movements = '["conditioning"]'::jsonb, level = 'beginner', secondary_muscles = '[]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Step Jack' AND movements IS NULL;
UPDATE exercises SET movements = '["core_flexion", "conditioning"]'::jsonb, level = 'beginner', secondary_muscles = '[]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Standing Knee Drive' AND movements IS NULL;
UPDATE exercises SET movements = '["jump", "conditioning"]'::jsonb, level = 'intermediate', secondary_muscles = '[]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Star Jump' AND movements IS NULL;
UPDATE exercises SET movements = '["jump"]'::jsonb, level = 'intermediate', secondary_muscles = '[]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Broad Jump' AND movements IS NULL;
UPDATE exercises SET movements = '["conditioning", "rotation"]'::jsonb, level = 'beginner', secondary_muscles = '["shoulders"]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Shadow Boxing' AND movements IS NULL;
UPDATE exercises SET movements = '["conditioning", "core_stability"]'::jsonb, level = 'beginner', secondary_muscles = '[]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Squat Thrust' AND movements IS NULL;
UPDATE exercises SET movements = '["core_stability", "jump"]'::jsonb, level = 'beginner', secondary_muscles = '[]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Plank Jack' AND movements IS NULL;
UPDATE exercises SET movements = '["core_stability", "conditioning"]'::jsonb, level = 'beginner', secondary_muscles = '["shoulders"]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Bear Crawl' AND movements IS NULL;
UPDATE exercises SET movements = '["squat"]'::jsonb, level = 'beginner', secondary_muscles = '[]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Sumo Squat' AND movements IS NULL;
UPDATE exercises SET movements = '["squat"]'::jsonb, level = 'beginner', secondary_muscles = '[]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Squat Pulse' AND movements IS NULL;
UPDATE exercises SET movements = '["lunge"]'::jsonb, level = 'beginner', secondary_muscles = '[]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Lateral Lunge' AND movements IS NULL;
UPDATE exercises SET movements = '["lunge"]'::jsonb, level = 'beginner', secondary_muscles = '[]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Curtsy Lunge' AND movements IS NULL;
UPDATE exercises SET movements = '["lunge"]'::jsonb, level = 'beginner', secondary_muscles = '[]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Split Squat' AND movements IS NULL;
UPDATE exercises SET movements = '["lunge"]'::jsonb, level = 'intermediate', secondary_muscles = '[]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Cossack Squat' AND movements IS NULL;
UPDATE exercises SET movements = '["hinge"]'::jsonb, level = 'beginner', secondary_muscles = '["core"]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Single-Leg Glute Bridge' AND movements IS NULL;
UPDATE exercises SET movements = '["isolation"]'::jsonb, level = 'beginner', secondary_muscles = '[]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Bodyweight Calf Raise' AND movements IS NULL;
UPDATE exercises SET movements = '["hinge"]'::jsonb, level = 'beginner', secondary_muscles = '["back"]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Good Morning' AND movements IS NULL;
UPDATE exercises SET movements = '["isolation"]'::jsonb, level = 'beginner', secondary_muscles = '[]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Donkey Kick' AND movements IS NULL;
UPDATE exercises SET movements = '["isolation"]'::jsonb, level = 'beginner', secondary_muscles = '[]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Fire Hydrant' AND movements IS NULL;
UPDATE exercises SET movements = '["push_horizontal"]'::jsonb, level = 'beginner', secondary_muscles = '["arms"]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Knee Push-up' AND movements IS NULL;
UPDATE exercises SET movements = '["push_horizontal"]'::jsonb, level = 'beginner', secondary_muscles = '["arms"]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Incline Push-up' AND movements IS NULL;
UPDATE exercises SET movements = '["push_horizontal"]'::jsonb, level = 'intermediate', secondary_muscles = '["chest"]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Diamond Push-up' AND movements IS NULL;
UPDATE exercises SET movements = '["push_vertical", "overhead"]'::jsonb, level = 'intermediate', secondary_muscles = '["arms"]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Pike Push-up' AND movements IS NULL;
UPDATE exercises SET movements = '["push_vertical"]'::jsonb, level = 'beginner', secondary_muscles = '["chest", "shoulders"]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Bench Dip' AND movements IS NULL;
UPDATE exercises SET movements = '["core_flexion"]'::jsonb, level = 'beginner', secondary_muscles = '[]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Heel Taps' AND movements IS NULL;
UPDATE exercises SET movements = '["core_flexion"]'::jsonb, level = 'beginner', secondary_muscles = '[]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Reverse Crunch' AND movements IS NULL;
UPDATE exercises SET movements = '["core_flexion"]'::jsonb, level = 'beginner', secondary_muscles = '[]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Scissor Kicks' AND movements IS NULL;
UPDATE exercises SET movements = '["core_flexion"]'::jsonb, level = 'intermediate', secondary_muscles = '[]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'V-up' AND movements IS NULL;
UPDATE exercises SET movements = '["core_flexion"]'::jsonb, level = 'beginner', secondary_muscles = '[]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Sit-up' AND movements IS NULL;
UPDATE exercises SET movements = '["core_flexion"]'::jsonb, level = 'beginner', secondary_muscles = '[]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Standing Oblique Crunch' AND movements IS NULL;
UPDATE exercises SET movements = '["hinge", "core_stability"]'::jsonb, level = 'beginner', secondary_muscles = '["legs"]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Glute Bridge Hold' AND movements IS NULL;
UPDATE exercises SET movements = '["core_stability", "rotation"]'::jsonb, level = 'beginner', secondary_muscles = '[]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Side Plank Hip Dip' AND movements IS NULL;
UPDATE exercises SET movements = '["pull_horizontal", "hinge"]'::jsonb, level = 'beginner', secondary_muscles = '["arms"]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Dumbbell Bent-Over Row' AND movements IS NULL;
UPDATE exercises SET movements = '["push_horizontal"]'::jsonb, level = 'beginner', secondary_muscles = '["arms"]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Dumbbell Floor Press' AND movements IS NULL;
UPDATE exercises SET movements = '["isolation", "push_vertical", "overhead"]'::jsonb, level = 'beginner', secondary_muscles = '["arms"]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Dumbbell Curl to Press' AND movements IS NULL;
UPDATE exercises SET movements = '["lunge"]'::jsonb, level = 'beginner', secondary_muscles = '[]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Dumbbell Lateral Lunge' AND movements IS NULL;
UPDATE exercises SET movements = '["hinge"]'::jsonb, level = 'beginner', secondary_muscles = '[]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Dumbbell Glute Bridge' AND movements IS NULL;
UPDATE exercises SET movements = '["isolation"]'::jsonb, level = 'beginner', secondary_muscles = '[]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Dumbbell Hammer Curl' AND movements IS NULL;
UPDATE exercises SET movements = '["pull_horizontal"]'::jsonb, level = 'beginner', secondary_muscles = '["arms"]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'TRX Row' AND movements IS NULL;
UPDATE exercises SET movements = '["push_horizontal"]'::jsonb, level = 'beginner', secondary_muscles = '["arms", "core"]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'TRX Chest Press' AND movements IS NULL;
UPDATE exercises SET movements = '["squat"]'::jsonb, level = 'beginner', secondary_muscles = '[]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'TRX Squat' AND movements IS NULL;
UPDATE exercises SET movements = '["lunge"]'::jsonb, level = 'intermediate', secondary_muscles = '["core"]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'TRX Suspended Lunge' AND movements IS NULL;
UPDATE exercises SET movements = '["isolation"]'::jsonb, level = 'intermediate', secondary_muscles = '["core"]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'TRX Hamstring Curl' AND movements IS NULL;
UPDATE exercises SET movements = '["core_flexion"]'::jsonb, level = 'advanced', secondary_muscles = '["shoulders"]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'TRX Pike' AND movements IS NULL;
UPDATE exercises SET movements = '["core_flexion"]'::jsonb, level = 'intermediate', secondary_muscles = '["shoulders"]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'TRX Knee Tuck' AND movements IS NULL;
UPDATE exercises SET movements = '["core_stability", "conditioning"]'::jsonb, level = 'intermediate', secondary_muscles = '["shoulders"]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'TRX Mountain Climber' AND movements IS NULL;
UPDATE exercises SET movements = '["core_stability"]'::jsonb, level = 'intermediate', secondary_muscles = '["shoulders"]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'TRX Plank' AND movements IS NULL;
UPDATE exercises SET movements = '["core_stability"]'::jsonb, level = 'intermediate', secondary_muscles = '[]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'TRX Side Plank' AND movements IS NULL;
UPDATE exercises SET movements = '["isolation"]'::jsonb, level = 'beginner', secondary_muscles = '[]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'TRX Biceps Curl' AND movements IS NULL;
UPDATE exercises SET movements = '["isolation"]'::jsonb, level = 'intermediate', secondary_muscles = '[]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'TRX Triceps Extension' AND movements IS NULL;
UPDATE exercises SET movements = '["isolation", "overhead"]'::jsonb, level = 'beginner', secondary_muscles = '["back"]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'TRX Y-Fly' AND movements IS NULL;
UPDATE exercises SET movements = '["squat", "jump"]'::jsonb, level = 'intermediate', secondary_muscles = '[]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'TRX Jump Squat' AND movements IS NULL;
UPDATE exercises SET movements = '["push_horizontal", "core_flexion"]'::jsonb, level = 'advanced', secondary_muscles = '["core"]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'TRX Atomic Push-up' AND movements IS NULL;
UPDATE exercises SET movements = '["squat"]'::jsonb, level = 'advanced', secondary_muscles = '["core"]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'TRX Single-Leg Squat' AND movements IS NULL;
UPDATE exercises SET movements = '["lunge", "jump"]'::jsonb, level = 'intermediate', secondary_muscles = '["core"]'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'TRX Sprinter Start' AND movements IS NULL;

COMMIT;

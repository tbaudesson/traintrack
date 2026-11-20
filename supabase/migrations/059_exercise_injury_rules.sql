-- 059_exercise_injury_rules.sql
-- Which areas each exercise loads, and how much ("avoid": better left out
-- while the area is injured; "caution": possible, lighter and without pain),
-- become data instead of a table in the app's code:
--   - exercises.injury_rules, filled for the library from the former table,
--     edited by an admin on each exercise (Exercises, Edit);
--   - the warm-up and stretch moves' rules join the injury references
--     (app_settings.injury_guidance, Admin > Injuries).
--
-- Deploy: apply this file BEFORE the code. Until the devices have synced the
-- exercises again (done on its own once online), no exercise is flagged.
--
-- Safe to re-run: filled only where empty, an admin's changes kept.

BEGIN;

ALTER TABLE exercises ADD COLUMN IF NOT EXISTS injury_rules JSONB;

UPDATE exercises SET injury_rules = '{"shoulder":"caution","elbow":"caution","wrist":"caution"}'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Barbell Bench Press' AND injury_rules IS NULL;
UPDATE exercises SET injury_rules = '{"shoulder":"caution","elbow":"caution","wrist":"caution"}'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Incline Barbell Bench Press' AND injury_rules IS NULL;
UPDATE exercises SET injury_rules = '{"shoulder":"caution","elbow":"caution"}'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Dumbbell Bench Press' AND injury_rules IS NULL;
UPDATE exercises SET injury_rules = '{"shoulder":"caution","elbow":"caution"}'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Incline Dumbbell Press' AND injury_rules IS NULL;
UPDATE exercises SET injury_rules = '{"shoulder":"caution"}'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Cable Fly' AND injury_rules IS NULL;
UPDATE exercises SET injury_rules = '{"shoulder":"avoid","wrist":"caution","elbow":"caution"}'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Push-up' AND injury_rules IS NULL;
UPDATE exercises SET injury_rules = '{"shoulder":"avoid","elbow":"caution","wrist":"caution"}'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Chest Dip' AND injury_rules IS NULL;
UPDATE exercises SET injury_rules = '{"lower_back":"avoid","shoulder":"avoid","upper_back":"caution","hip":"caution","knee":"caution"}'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Deadlift' AND injury_rules IS NULL;
UPDATE exercises SET injury_rules = '{"lower_back":"avoid","upper_back":"caution","shoulder":"caution","elbow":"caution"}'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Barbell Row' AND injury_rules IS NULL;
UPDATE exercises SET injury_rules = '{"shoulder":"avoid","elbow":"caution","wrist":"caution"}'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Pull-up' AND injury_rules IS NULL;
UPDATE exercises SET injury_rules = '{"shoulder":"avoid","elbow":"caution","wrist":"caution"}'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Chin-up' AND injury_rules IS NULL;
UPDATE exercises SET injury_rules = '{"shoulder":"caution","elbow":"caution"}'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Lat Pulldown' AND injury_rules IS NULL;
UPDATE exercises SET injury_rules = '{"lower_back":"caution","shoulder":"caution"}'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Seated Cable Row' AND injury_rules IS NULL;
UPDATE exercises SET injury_rules = '{"lower_back":"caution","shoulder":"caution"}'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Dumbbell Row' AND injury_rules IS NULL;
UPDATE exercises SET injury_rules = '{"lower_back":"avoid","upper_back":"caution","shoulder":"caution"}'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'T-Bar Row' AND injury_rules IS NULL;
UPDATE exercises SET injury_rules = '{"shoulder":"caution"}'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Straight-Arm Pulldown' AND injury_rules IS NULL;
UPDATE exercises SET injury_rules = '{"knee":"avoid","lower_back":"avoid","shoulder":"caution","neck":"caution","hip":"caution","ankle":"caution"}'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Back Squat' AND injury_rules IS NULL;
UPDATE exercises SET injury_rules = '{"knee":"avoid","lower_back":"caution","wrist":"caution","hip":"caution","ankle":"caution"}'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Front Squat' AND injury_rules IS NULL;
UPDATE exercises SET injury_rules = '{"lower_back":"avoid","shoulder":"caution","hip":"caution"}'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Romanian Deadlift' AND injury_rules IS NULL;
UPDATE exercises SET injury_rules = '{"knee":"caution","lower_back":"caution","hip":"caution"}'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Leg Press' AND injury_rules IS NULL;
UPDATE exercises SET injury_rules = '{"knee":"avoid"}'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Leg Extension' AND injury_rules IS NULL;
UPDATE exercises SET injury_rules = '{"knee":"caution"}'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Leg Curl' AND injury_rules IS NULL;
UPDATE exercises SET injury_rules = '{"knee":"avoid","hip":"caution","ankle":"caution"}'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Walking Lunge' AND injury_rules IS NULL;
UPDATE exercises SET injury_rules = '{"knee":"avoid","hip":"caution","ankle":"caution"}'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Bulgarian Split Squat' AND injury_rules IS NULL;
UPDATE exercises SET injury_rules = '{"ankle":"caution","lower_back":"caution"}'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Standing Calf Raise' AND injury_rules IS NULL;
UPDATE exercises SET injury_rules = '{"hip":"caution","lower_back":"caution"}'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Hip Thrust' AND injury_rules IS NULL;
UPDATE exercises SET injury_rules = '{"ankle":"caution"}'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Single-Leg Calf Raise' AND injury_rules IS NULL;
UPDATE exercises SET injury_rules = '{"knee":"caution","ankle":"caution"}'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Step-up' AND injury_rules IS NULL;
UPDATE exercises SET injury_rules = '{"lower_back":"caution","hip":"caution","ankle":"caution"}'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Single-Leg Romanian Deadlift' AND injury_rules IS NULL;
UPDATE exercises SET injury_rules = '{"hip":"caution"}'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Glute Bridge' AND injury_rules IS NULL;
UPDATE exercises SET injury_rules = '{"shoulder":"avoid","lower_back":"caution","neck":"caution","elbow":"caution","wrist":"caution"}'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Overhead Press' AND injury_rules IS NULL;
UPDATE exercises SET injury_rules = '{"shoulder":"avoid","elbow":"caution"}'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Seated Dumbbell Press' AND injury_rules IS NULL;
UPDATE exercises SET injury_rules = '{"shoulder":"caution"}'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Lateral Raise' AND injury_rules IS NULL;
UPDATE exercises SET injury_rules = '{"shoulder":"caution","lower_back":"caution"}'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Rear Delt Fly' AND injury_rules IS NULL;
UPDATE exercises SET injury_rules = '{"shoulder":"caution"}'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Face Pull' AND injury_rules IS NULL;
UPDATE exercises SET injury_rules = '{"elbow":"caution","wrist":"caution"}'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Barbell Curl' AND injury_rules IS NULL;
UPDATE exercises SET injury_rules = '{"elbow":"caution"}'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Dumbbell Curl' AND injury_rules IS NULL;
UPDATE exercises SET injury_rules = '{"elbow":"caution"}'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Hammer Curl' AND injury_rules IS NULL;
UPDATE exercises SET injury_rules = '{"elbow":"caution"}'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Triceps Pushdown' AND injury_rules IS NULL;
UPDATE exercises SET injury_rules = '{"elbow":"avoid","shoulder":"caution"}'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Skull Crusher' AND injury_rules IS NULL;
UPDATE exercises SET injury_rules = '{"elbow":"caution","shoulder":"avoid"}'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Overhead Triceps Extension' AND injury_rules IS NULL;
UPDATE exercises SET injury_rules = '{"shoulder":"avoid","elbow":"caution","lower_back":"caution"}'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Plank' AND injury_rules IS NULL;
UPDATE exercises SET injury_rules = '{"shoulder":"avoid","lower_back":"caution","elbow":"caution","wrist":"caution"}'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Hanging Leg Raise' AND injury_rules IS NULL;
UPDATE exercises SET injury_rules = '{"lower_back":"caution","neck":"caution"}'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Cable Crunch' AND injury_rules IS NULL;
UPDATE exercises SET injury_rules = '{"lower_back":"avoid"}'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Russian Twist' AND injury_rules IS NULL;
UPDATE exercises SET injury_rules = '{"shoulder":"avoid","elbow":"caution"}'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Side Plank' AND injury_rules IS NULL;
UPDATE exercises SET injury_rules = '{"wrist":"caution","shoulder":"caution"}'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Bird Dog' AND injury_rules IS NULL;
UPDATE exercises SET injury_rules = '{"shoulder":"avoid","wrist":"avoid","knee":"caution","ankle":"caution","lower_back":"caution"}'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Burpee' AND injury_rules IS NULL;
UPDATE exercises SET injury_rules = '{"knee":"caution"}'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Bodyweight Squat' AND injury_rules IS NULL;
UPDATE exercises SET injury_rules = '{"knee":"avoid","ankle":"avoid","hip":"caution","lower_back":"caution"}'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Jump Squat' AND injury_rules IS NULL;
UPDATE exercises SET injury_rules = '{"shoulder":"avoid","wrist":"avoid","hip":"caution"}'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Mountain Climber' AND injury_rules IS NULL;
UPDATE exercises SET injury_rules = '{"knee":"caution","ankle":"caution","shoulder":"avoid"}'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Jumping Jack' AND injury_rules IS NULL;
UPDATE exercises SET injury_rules = '{"knee":"caution","ankle":"caution","hip":"caution"}'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'High Knees' AND injury_rules IS NULL;
UPDATE exercises SET injury_rules = '{"knee":"caution","hip":"caution"}'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Reverse Lunge' AND injury_rules IS NULL;
UPDATE exercises SET injury_rules = '{"knee":"avoid","ankle":"avoid","hip":"caution"}'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Jumping Lunge' AND injury_rules IS NULL;
UPDATE exercises SET injury_rules = '{"knee":"avoid","ankle":"avoid","hip":"caution"}'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Skater Jump' AND injury_rules IS NULL;
UPDATE exercises SET injury_rules = '{"knee":"caution"}'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Wall Sit' AND injury_rules IS NULL;
UPDATE exercises SET injury_rules = '{"shoulder":"avoid","wrist":"avoid","lower_back":"caution"}'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Inchworm' AND injury_rules IS NULL;
UPDATE exercises SET injury_rules = '{"shoulder":"avoid","wrist":"avoid"}'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Plank Shoulder Tap' AND injury_rules IS NULL;
UPDATE exercises SET injury_rules = '{"neck":"caution","lower_back":"caution"}'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Bicycle Crunch' AND injury_rules IS NULL;
UPDATE exercises SET injury_rules = '{"lower_back":"caution","hip":"caution"}'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Flutter Kicks' AND injury_rules IS NULL;
UPDATE exercises SET injury_rules = '{"neck":"caution"}'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Crunch' AND injury_rules IS NULL;
UPDATE exercises SET injury_rules = '{"lower_back":"caution","hip":"caution"}'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Lying Leg Raise' AND injury_rules IS NULL;
UPDATE exercises SET injury_rules = '{"lower_back":"caution"}'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Hollow Hold' AND injury_rules IS NULL;
UPDATE exercises SET injury_rules = '{"knee":"caution","lower_back":"caution"}'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Goblet Squat' AND injury_rules IS NULL;
UPDATE exercises SET injury_rules = '{"shoulder":"avoid","knee":"caution","lower_back":"caution","wrist":"caution"}'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Dumbbell Thruster' AND injury_rules IS NULL;
UPDATE exercises SET injury_rules = '{"lower_back":"avoid","shoulder":"caution"}'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Dumbbell Swing' AND injury_rules IS NULL;
UPDATE exercises SET injury_rules = '{"shoulder":"avoid","wrist":"avoid","lower_back":"caution"}'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Renegade Row' AND injury_rules IS NULL;
UPDATE exercises SET injury_rules = '{"lower_back":"avoid","hip":"caution"}'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Dumbbell Romanian Deadlift' AND injury_rules IS NULL;
UPDATE exercises SET injury_rules = '{"knee":"caution","hip":"caution"}'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Dumbbell Reverse Lunge' AND injury_rules IS NULL;
UPDATE exercises SET injury_rules = '{"knee":"caution","hip":"caution"}'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Dumbbell Sumo Squat' AND injury_rules IS NULL;
UPDATE exercises SET injury_rules = '{"shoulder":"avoid","lower_back":"caution","wrist":"caution"}'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Dumbbell Push Press' AND injury_rules IS NULL;
UPDATE exercises SET injury_rules = '{"lower_back":"caution","shoulder":"avoid"}'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Dumbbell Woodchop' AND injury_rules IS NULL;
UPDATE exercises SET injury_rules = '{"knee":"caution","ankle":"caution"}'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Butt Kicks' AND injury_rules IS NULL;
UPDATE exercises SET injury_rules = '{"ankle":"caution"}'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Fast Feet' AND injury_rules IS NULL;
UPDATE exercises SET injury_rules = '{"knee":"caution","ankle":"caution"}'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Lateral Shuffle' AND injury_rules IS NULL;
UPDATE exercises SET injury_rules = '{"hip":"caution"}'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Standing Knee Drive' AND injury_rules IS NULL;
UPDATE exercises SET injury_rules = '{"knee":"avoid","ankle":"avoid","shoulder":"avoid"}'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Star Jump' AND injury_rules IS NULL;
UPDATE exercises SET injury_rules = '{"knee":"avoid","ankle":"avoid","lower_back":"caution"}'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Broad Jump' AND injury_rules IS NULL;
UPDATE exercises SET injury_rules = '{"shoulder":"avoid","elbow":"caution","wrist":"caution"}'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Shadow Boxing' AND injury_rules IS NULL;
UPDATE exercises SET injury_rules = '{"shoulder":"avoid","wrist":"avoid","knee":"caution","lower_back":"caution"}'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Squat Thrust' AND injury_rules IS NULL;
UPDATE exercises SET injury_rules = '{"shoulder":"avoid","wrist":"avoid","lower_back":"caution"}'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Plank Jack' AND injury_rules IS NULL;
UPDATE exercises SET injury_rules = '{"shoulder":"avoid","wrist":"avoid","knee":"caution"}'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Bear Crawl' AND injury_rules IS NULL;
UPDATE exercises SET injury_rules = '{"knee":"caution","hip":"caution"}'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Sumo Squat' AND injury_rules IS NULL;
UPDATE exercises SET injury_rules = '{"knee":"caution"}'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Squat Pulse' AND injury_rules IS NULL;
UPDATE exercises SET injury_rules = '{"knee":"caution","hip":"caution","ankle":"caution"}'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Lateral Lunge' AND injury_rules IS NULL;
UPDATE exercises SET injury_rules = '{"knee":"caution","hip":"caution"}'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Curtsy Lunge' AND injury_rules IS NULL;
UPDATE exercises SET injury_rules = '{"knee":"caution","hip":"caution"}'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Split Squat' AND injury_rules IS NULL;
UPDATE exercises SET injury_rules = '{"knee":"avoid","hip":"caution","ankle":"caution"}'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Cossack Squat' AND injury_rules IS NULL;
UPDATE exercises SET injury_rules = '{"hip":"caution","lower_back":"caution"}'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Single-Leg Glute Bridge' AND injury_rules IS NULL;
UPDATE exercises SET injury_rules = '{"ankle":"caution"}'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Bodyweight Calf Raise' AND injury_rules IS NULL;
UPDATE exercises SET injury_rules = '{"lower_back":"caution","hip":"caution"}'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Good Morning' AND injury_rules IS NULL;
UPDATE exercises SET injury_rules = '{"wrist":"caution","shoulder":"caution","knee":"caution"}'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Donkey Kick' AND injury_rules IS NULL;
UPDATE exercises SET injury_rules = '{"wrist":"caution","shoulder":"caution","hip":"caution"}'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Fire Hydrant' AND injury_rules IS NULL;
UPDATE exercises SET injury_rules = '{"shoulder":"avoid","wrist":"caution","elbow":"caution"}'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Knee Push-up' AND injury_rules IS NULL;
UPDATE exercises SET injury_rules = '{"shoulder":"avoid","wrist":"caution","elbow":"caution"}'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Incline Push-up' AND injury_rules IS NULL;
UPDATE exercises SET injury_rules = '{"shoulder":"avoid","wrist":"avoid","elbow":"avoid"}'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Diamond Push-up' AND injury_rules IS NULL;
UPDATE exercises SET injury_rules = '{"shoulder":"avoid","wrist":"avoid","elbow":"caution","neck":"caution"}'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Pike Push-up' AND injury_rules IS NULL;
UPDATE exercises SET injury_rules = '{"shoulder":"avoid","elbow":"caution","wrist":"caution"}'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Bench Dip' AND injury_rules IS NULL;
UPDATE exercises SET injury_rules = '{"neck":"caution"}'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Heel Taps' AND injury_rules IS NULL;
UPDATE exercises SET injury_rules = '{"lower_back":"caution"}'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Reverse Crunch' AND injury_rules IS NULL;
UPDATE exercises SET injury_rules = '{"lower_back":"caution","hip":"caution"}'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Scissor Kicks' AND injury_rules IS NULL;
UPDATE exercises SET injury_rules = '{"lower_back":"caution","hip":"caution","neck":"caution"}'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'V-up' AND injury_rules IS NULL;
UPDATE exercises SET injury_rules = '{"lower_back":"caution","neck":"caution"}'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Sit-up' AND injury_rules IS NULL;
UPDATE exercises SET injury_rules = '{"hip":"caution","shoulder":"caution"}'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Standing Oblique Crunch' AND injury_rules IS NULL;
UPDATE exercises SET injury_rules = '{"hip":"caution","lower_back":"caution"}'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Glute Bridge Hold' AND injury_rules IS NULL;
UPDATE exercises SET injury_rules = '{"shoulder":"avoid","elbow":"caution","lower_back":"caution"}'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Side Plank Hip Dip' AND injury_rules IS NULL;
UPDATE exercises SET injury_rules = '{"lower_back":"caution","shoulder":"caution","elbow":"caution"}'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Dumbbell Bent-Over Row' AND injury_rules IS NULL;
UPDATE exercises SET injury_rules = '{"shoulder":"caution","elbow":"caution","wrist":"caution"}'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Dumbbell Floor Press' AND injury_rules IS NULL;
UPDATE exercises SET injury_rules = '{"shoulder":"avoid","elbow":"caution","wrist":"caution"}'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Dumbbell Curl to Press' AND injury_rules IS NULL;
UPDATE exercises SET injury_rules = '{"knee":"caution","hip":"caution","ankle":"caution"}'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Dumbbell Lateral Lunge' AND injury_rules IS NULL;
UPDATE exercises SET injury_rules = '{"hip":"caution","lower_back":"caution"}'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Dumbbell Glute Bridge' AND injury_rules IS NULL;
UPDATE exercises SET injury_rules = '{"elbow":"caution","wrist":"caution"}'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Dumbbell Hammer Curl' AND injury_rules IS NULL;
UPDATE exercises SET injury_rules = '{"shoulder":"avoid","wrist":"avoid","elbow":"caution","neck":"caution"}'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Handstand Hold' AND injury_rules IS NULL;
UPDATE exercises SET injury_rules = '{"ankle":"caution","knee":"caution"}'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Single-Leg Balance' AND injury_rules IS NULL;
UPDATE exercises SET injury_rules = '{"ankle":"caution","hip":"caution","lower_back":"caution"}'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Arabesque Hold' AND injury_rules IS NULL;
UPDATE exercises SET injury_rules = '{"lower_back":"caution","neck":"caution","shoulder":"caution"}'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Superman Hold' AND injury_rules IS NULL;
UPDATE exercises SET injury_rules = '{"knee":"avoid","ankle":"avoid","lower_back":"caution"}'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Tuck Jump' AND injury_rules IS NULL;
UPDATE exercises SET injury_rules = '{"lower_back":"avoid","wrist":"caution","shoulder":"caution","neck":"caution"}'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Bridge Hold' AND injury_rules IS NULL;
UPDATE exercises SET injury_rules = '{"hip":"caution","knee":"caution"}'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Front Split Stretch' AND injury_rules IS NULL;
UPDATE exercises SET injury_rules = '{"lower_back":"caution"}'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'Pike Stretch' AND injury_rules IS NULL;
UPDATE exercises SET injury_rules = '{"shoulder":"caution","elbow":"caution","wrist":"caution"}'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'TRX Row' AND injury_rules IS NULL;
UPDATE exercises SET injury_rules = '{"shoulder":"avoid","elbow":"caution","wrist":"caution"}'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'TRX Chest Press' AND injury_rules IS NULL;
UPDATE exercises SET injury_rules = '{"knee":"caution","hip":"caution"}'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'TRX Squat' AND injury_rules IS NULL;
UPDATE exercises SET injury_rules = '{"knee":"avoid","hip":"caution","ankle":"caution"}'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'TRX Suspended Lunge' AND injury_rules IS NULL;
UPDATE exercises SET injury_rules = '{"knee":"caution","hip":"caution","lower_back":"caution"}'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'TRX Hamstring Curl' AND injury_rules IS NULL;
UPDATE exercises SET injury_rules = '{"shoulder":"avoid","wrist":"avoid","lower_back":"caution"}'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'TRX Pike' AND injury_rules IS NULL;
UPDATE exercises SET injury_rules = '{"shoulder":"avoid","wrist":"avoid","hip":"caution"}'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'TRX Knee Tuck' AND injury_rules IS NULL;
UPDATE exercises SET injury_rules = '{"shoulder":"avoid","wrist":"avoid","hip":"caution"}'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'TRX Mountain Climber' AND injury_rules IS NULL;
UPDATE exercises SET injury_rules = '{"shoulder":"avoid","elbow":"caution","lower_back":"caution"}'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'TRX Plank' AND injury_rules IS NULL;
UPDATE exercises SET injury_rules = '{"shoulder":"avoid","elbow":"caution","lower_back":"caution"}'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'TRX Side Plank' AND injury_rules IS NULL;
UPDATE exercises SET injury_rules = '{"elbow":"caution","shoulder":"caution"}'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'TRX Biceps Curl' AND injury_rules IS NULL;
UPDATE exercises SET injury_rules = '{"elbow":"avoid","shoulder":"avoid"}'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'TRX Triceps Extension' AND injury_rules IS NULL;
UPDATE exercises SET injury_rules = '{"shoulder":"avoid"}'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'TRX Y-Fly' AND injury_rules IS NULL;
UPDATE exercises SET injury_rules = '{"knee":"avoid","ankle":"avoid","hip":"caution"}'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'TRX Jump Squat' AND injury_rules IS NULL;
UPDATE exercises SET injury_rules = '{"shoulder":"avoid","wrist":"avoid","elbow":"caution","lower_back":"caution"}'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'TRX Atomic Push-up' AND injury_rules IS NULL;
UPDATE exercises SET injury_rules = '{"knee":"avoid","hip":"caution","ankle":"caution"}'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'TRX Single-Leg Squat' AND injury_rules IS NULL;
UPDATE exercises SET injury_rules = '{"knee":"caution","hip":"caution","ankle":"caution"}'::jsonb, updated_at = now() WHERE user_id IS NULL AND name = 'TRX Sprinter Start' AND injury_rules IS NULL;

-- Admin: the areas an exercise loads, for any exercise, the library's included.
CREATE OR REPLACE FUNCTION admin_set_exercise_injury_rules(p_uuid TEXT, p_rules JSONB)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
BEGIN
  IF NOT is_app_admin() THEN
    RAISE EXCEPTION 'Unauthorized: admin access required';
  END IF;
  IF p_rules IS NOT NULL AND (
    jsonb_typeof(p_rules) <> 'object'
    OR EXISTS (
      SELECT 1 FROM jsonb_each_text(p_rules) r
      WHERE r.key NOT IN ('shoulder','elbow','wrist','neck','upper_back','lower_back','hip','knee','ankle')
         OR r.value NOT IN ('avoid','caution')
    )
  ) THEN
    RAISE EXCEPTION 'Rules must map areas to avoid or caution';
  END IF;
  UPDATE exercises
     SET injury_rules = CASE WHEN p_rules = '{}'::jsonb THEN NULL ELSE p_rules END,
         updated_at = now()
   WHERE id = p_uuid::uuid;
END;
$fn$;
GRANT EXECUTE ON FUNCTION admin_set_exercise_injury_rules(TEXT, JSONB) TO authenticated;

UPDATE app_settings
SET value = (value::jsonb || '
{
  "mobility": {
    "jumping-jack": {
      "knee": "caution",
      "ankle": "caution",
      "shoulder": "caution"
    },
    "high-knees": {
      "knee": "caution",
      "ankle": "caution",
      "hip": "caution"
    },
    "arm-circles": {
      "shoulder": "caution"
    },
    "arm-swings": {
      "shoulder": "caution"
    },
    "torso-twists": {
      "lower_back": "caution"
    },
    "hip-circles": {
      "hip": "caution",
      "lower_back": "caution"
    },
    "leg-swings": {
      "hip": "caution"
    },
    "knee-hug": {
      "knee": "caution",
      "hip": "caution"
    },
    "squat": {
      "knee": "caution"
    },
    "lunge-rotation": {
      "knee": "avoid",
      "lower_back": "caution"
    },
    "inchworm": {
      "wrist": "caution",
      "shoulder": "caution",
      "lower_back": "caution"
    },
    "worlds-greatest": {
      "knee": "caution",
      "hip": "caution",
      "shoulder": "caution"
    },
    "scapular-pushup": {
      "shoulder": "caution",
      "wrist": "avoid",
      "elbow": "caution"
    },
    "cat-cow": {
      "wrist": "caution"
    },
    "glute-bridge": {
      "hip": "caution"
    },
    "neck-side": {
      "neck": "avoid"
    },
    "chest-doorway": {
      "shoulder": "avoid",
      "elbow": "caution"
    },
    "cross-shoulder": {
      "shoulder": "avoid"
    },
    "triceps": {
      "shoulder": "avoid",
      "elbow": "caution"
    },
    "biceps-wall": {
      "shoulder": "caution",
      "elbow": "avoid",
      "wrist": "caution"
    },
    "side-bend": {
      "lower_back": "caution",
      "shoulder": "caution"
    },
    "quad": {
      "knee": "avoid",
      "ankle": "caution"
    },
    "calf": {
      "ankle": "caution"
    },
    "hip-flexor": {
      "knee": "caution",
      "hip": "caution"
    },
    "hamstring": {
      "lower_back": "caution"
    },
    "butterfly": {
      "hip": "caution",
      "knee": "caution"
    },
    "pigeon": {
      "knee": "avoid",
      "hip": "avoid"
    },
    "spinal-twist": {
      "lower_back": "caution"
    },
    "cobra": {
      "lower_back": "caution",
      "wrist": "caution"
    },
    "childs-pose": {
      "knee": "caution"
    }
  }
}
'::jsonb)::text,
    updated_at = now()
WHERE key = 'injury_guidance'
  AND value::jsonb -> 'mobility' IS NULL;

COMMIT;

-- 066_program_equipment.sql
-- What the ready-made programs need becomes a reference an admin keeps
-- (Admin > Equipment) instead of a list in the app's code:
--   - needs: the equipment each exercise needs beyond the body (those hung
--     from a pull-up bar are filed "bodyweight" in the library but need one);
--   - alternatives: what stands in for an exercise without its equipment,
--     best first (used to adapt a program to the athlete's equipment);
--   - standIns: equipment that does what another does (kettlebells for
--     dumbbells);
--   - gym: the equipment of a gym; an athlete with none of it is offered
--     programs for home.
-- The TRX and vaulting exercises need nothing new here: their names,
-- descriptions and videos are in the library (migrations 040, 055, 064),
-- their place in timed sessions in app_settings.timed_sessions (065).
-- Plain quotes only; safe to run again (an existing value is kept).

INSERT INTO app_settings (key, value) VALUES ('program_equipment', '
{
  "needs": {
    "Back Squat": "barbell",
    "Barbell Bench Press": "barbell",
    "Barbell Curl": "barbell",
    "Barbell Row": "barbell",
    "Bulgarian Split Squat": "dumbbell",
    "Cable Crunch": "cable",
    "Cable Fly": "cable",
    "Chin-up": "pullup_bar",
    "Deadlift": "barbell",
    "Dumbbell Bench Press": "dumbbell",
    "Dumbbell Curl": "dumbbell",
    "Dumbbell Floor Press": "dumbbell",
    "Dumbbell Glute Bridge": "dumbbell",
    "Dumbbell Romanian Deadlift": "dumbbell",
    "Dumbbell Row": "dumbbell",
    "External Shoulder Rotation": "cable",
    "Face Pull": "cable",
    "Front Squat": "barbell",
    "Goblet Squat": "dumbbell",
    "Hammer Curl": "dumbbell",
    "Hanging Leg Raise": "pullup_bar",
    "Hip Thrust": "barbell",
    "Incline Barbell Bench Press": "barbell",
    "Incline Dumbbell Press": "dumbbell",
    "Lat Pulldown": "cable",
    "Lateral Raise": "dumbbell",
    "Leg Curl": "machine",
    "Leg Extension": "machine",
    "Leg Press": "machine",
    "Overhead Press": "barbell",
    "Overhead Triceps Extension": "dumbbell",
    "Pull-up": "pullup_bar",
    "Rear Delt Fly": "dumbbell",
    "Romanian Deadlift": "barbell",
    "Seated Cable Row": "cable",
    "Seated Dumbbell Press": "dumbbell",
    "Single-Leg Romanian Deadlift": "dumbbell",
    "Skull Crusher": "barbell",
    "Standing Calf Raise": "machine",
    "Step-up": "dumbbell",
    "Straight-Arm Pulldown": "cable",
    "T-Bar Row": "barbell",
    "TRX Atomic Push-up": "suspension",
    "TRX Biceps Curl": "suspension",
    "TRX Chest Press": "suspension",
    "TRX Hamstring Curl": "suspension",
    "TRX Jump Squat": "suspension",
    "TRX Knee Tuck": "suspension",
    "TRX Mountain Climber": "suspension",
    "TRX Pike": "suspension",
    "TRX Plank": "suspension",
    "TRX Row": "suspension",
    "TRX Side Plank": "suspension",
    "TRX Single-Leg Squat": "suspension",
    "TRX Sprinter Start": "suspension",
    "TRX Squat": "suspension",
    "TRX Suspended Lunge": "suspension",
    "TRX Triceps Extension": "suspension",
    "TRX Y-Fly": "suspension",
    "Triceps Pushdown": "cable",
    "Walking Lunge": "dumbbell"
  },
  "alternatives": {
    "Back Squat": [
      "Goblet Squat",
      "Bodyweight Squat"
    ],
    "Barbell Bench Press": [
      "Dumbbell Bench Press",
      "Dumbbell Floor Press",
      "Push-up"
    ],
    "Barbell Curl": [
      "Dumbbell Curl",
      "Hammer Curl"
    ],
    "Barbell Row": [
      "Dumbbell Row",
      "Seated Cable Row",
      "Superman Hold"
    ],
    "Bulgarian Split Squat": [
      "Split Squat"
    ],
    "Cable Crunch": [
      "Crunch"
    ],
    "Cable Fly": [
      "Dumbbell Bench Press",
      "Push-up"
    ],
    "Chin-up": [
      "Lat Pulldown",
      "Dumbbell Row",
      "Superman Hold"
    ],
    "Deadlift": [
      "Dumbbell Romanian Deadlift",
      "Single-Leg Glute Bridge"
    ],
    "Dumbbell Bench Press": [
      "Push-up"
    ],
    "Dumbbell Row": [
      "Seated Cable Row",
      "Superman Hold"
    ],
    "Face Pull": [
      "Rear Delt Fly",
      "Superman Hold"
    ],
    "Front Squat": [
      "Goblet Squat",
      "Bodyweight Squat"
    ],
    "Goblet Squat": [
      "Bodyweight Squat"
    ],
    "Hanging Leg Raise": [
      "Lying Leg Raise"
    ],
    "Hip Thrust": [
      "Dumbbell Glute Bridge",
      "Glute Bridge"
    ],
    "Incline Barbell Bench Press": [
      "Incline Dumbbell Press",
      "Push-up"
    ],
    "Incline Dumbbell Press": [
      "Push-up"
    ],
    "Lat Pulldown": [
      "Pull-up",
      "Dumbbell Row",
      "Superman Hold"
    ],
    "Lateral Raise": [
      "Pike Push-up"
    ],
    "Leg Curl": [
      "Dumbbell Romanian Deadlift",
      "Single-Leg Glute Bridge"
    ],
    "Leg Extension": [
      "Split Squat",
      "Wall Sit"
    ],
    "Leg Press": [
      "Goblet Squat",
      "Bodyweight Squat"
    ],
    "Overhead Press": [
      "Seated Dumbbell Press",
      "Pike Push-up"
    ],
    "Overhead Triceps Extension": [
      "Triceps Pushdown",
      "Bench Dip"
    ],
    "Pull-up": [
      "Lat Pulldown",
      "Dumbbell Row",
      "Superman Hold"
    ],
    "Rear Delt Fly": [
      "Face Pull",
      "Superman Hold"
    ],
    "Romanian Deadlift": [
      "Dumbbell Romanian Deadlift",
      "Single-Leg Glute Bridge"
    ],
    "Seated Cable Row": [
      "Dumbbell Row",
      "Superman Hold"
    ],
    "Seated Dumbbell Press": [
      "Overhead Press",
      "Pike Push-up"
    ],
    "Single-Leg Romanian Deadlift": [
      "Single-Leg Glute Bridge"
    ],
    "Skull Crusher": [
      "Overhead Triceps Extension",
      "Triceps Pushdown",
      "Bench Dip"
    ],
    "Standing Calf Raise": [
      "Single-Leg Calf Raise"
    ],
    "Step-up": [
      "Reverse Lunge"
    ],
    "Straight-Arm Pulldown": [
      "Dumbbell Row",
      "Superman Hold"
    ],
    "T-Bar Row": [
      "Dumbbell Row",
      "Seated Cable Row",
      "Superman Hold"
    ],
    "TRX Atomic Push-up": [
      "Push-up"
    ],
    "TRX Biceps Curl": [
      "Dumbbell Curl"
    ],
    "TRX Chest Press": [
      "Push-up"
    ],
    "TRX Hamstring Curl": [
      "Single-Leg Glute Bridge"
    ],
    "TRX Jump Squat": [
      "Jump Squat"
    ],
    "TRX Knee Tuck": [
      "Mountain Climber"
    ],
    "TRX Mountain Climber": [
      "Mountain Climber"
    ],
    "TRX Pike": [
      "Hollow Hold"
    ],
    "TRX Plank": [
      "Plank"
    ],
    "TRX Row": [
      "Dumbbell Row",
      "Superman Hold"
    ],
    "TRX Side Plank": [
      "Side Plank"
    ],
    "TRX Single-Leg Squat": [
      "Split Squat"
    ],
    "TRX Sprinter Start": [
      "High Knees"
    ],
    "TRX Squat": [
      "Bodyweight Squat"
    ],
    "TRX Suspended Lunge": [
      "Split Squat"
    ],
    "TRX Triceps Extension": [
      "Overhead Triceps Extension",
      "Bench Dip"
    ],
    "TRX Y-Fly": [
      "Rear Delt Fly",
      "Superman Hold"
    ],
    "Triceps Pushdown": [
      "Overhead Triceps Extension",
      "Bench Dip"
    ],
    "Walking Lunge": [
      "Reverse Lunge"
    ]
  },
  "standIns": {
    "dumbbell": [
      "kettlebell"
    ]
  },
  "gym": [
    "barbell",
    "machine",
    "cable"
  ]
}
')
ON CONFLICT (key) DO NOTHING;

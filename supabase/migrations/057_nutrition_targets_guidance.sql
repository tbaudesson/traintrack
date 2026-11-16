-- 057_nutrition_targets_guidance.sql
-- The rest of the nutrition figures join the references an admin keeps
-- (Admin, Nutrition tab): the calculator of daily targets (activity by
-- training days, calories and protein by goal, water by the kilo) and the
-- meal ideas (each meal's share of the day, what makes a big day, how far a
-- portion may be scaled). They were the app's former fixed values.
--
-- Deploy: apply this file BEFORE the code: the new code needs these values,
-- and the app keeps using what it last read until then.
--
-- Safe to re-run: added only where they are missing, an admin's changes kept.

UPDATE app_settings
SET value = (value::jsonb || '
{
  "targets": {
    "activity": [
      {
        "upToDays": 0,
        "factor": 1.2
      },
      {
        "upToDays": 2,
        "factor": 1.375
      },
      {
        "upToDays": 4,
        "factor": 1.55
      },
      {
        "upToDays": 6,
        "factor": 1.725
      },
      {
        "upToDays": 7,
        "factor": 1.9
      }
    ],
    "goalAdjustment": {
      "fat_loss": -0.2,
      "hypertrophy": 0.1,
      "strength": 0.05,
      "endurance": 0.05,
      "general_fitness": 0
    },
    "proteinPerKg": {
      "fat_loss": 2,
      "hypertrophy": 1.8,
      "strength": 1.8,
      "endurance": 1.4,
      "general_fitness": 1.6
    },
    "waterMlPerKg": 35,
    "defaultTrainingDays": 3
  },
  "meals": {
    "split": {
      "3": [
        [
          "breakfast",
          0.3
        ],
        [
          "lunch",
          0.4
        ],
        [
          "dinner",
          0.3
        ]
      ],
      "4": [
        [
          "breakfast",
          0.25
        ],
        [
          "lunch",
          0.35
        ],
        [
          "snack",
          0.12
        ],
        [
          "dinner",
          0.28
        ]
      ]
    },
    "longDay": {
      "distanceKm": 15,
      "minutes": 90
    },
    "proteinShareMax": 0.4,
    "proteinShareDefault": 0.25,
    "portionScale": [
      0.5,
      2.2
    ]
  }
}
'::jsonb)::text,
    updated_at = now()
WHERE key = 'nutrition_guidance'
  AND value::jsonb -> 'targets' IS NULL;

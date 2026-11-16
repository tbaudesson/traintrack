-- 056_nutrition_guidance.sql
-- The references of nutrition by sport, kept as data an admin can change
-- (Admin, Nutrition tab): protein and carbohydrates by the kilo for each
-- family of sports and kind of day, the day's energy against the calories
-- saved, the fat floor, and what to eat around a session. From the usual
-- sports-nutrition guidance (ACSM, IOC consensus).
--
-- Deploy: apply this file, in any order with the code. Until it is applied,
-- the app shares nothing out by sport.
--
-- Safe to re-run: an admin's changes are kept.

INSERT INTO app_settings (key, value) VALUES ('nutrition_guidance', $guidance$
{
  "sports": {
    "bodybuilding": "strength",
    "strength": "strength",
    "fitness": "strength",
    "callisthenics": "strength",
    "running": "endurance",
    "swimming": "endurance",
    "cycling": "cycling",
    "vaulting": "vaulting"
  },
  "families": {
    "strength": {
      "protein": 1.8,
      "endurance": false,
      "carbs": {
        "rest": [
          2,
          3
        ],
        "training": [
          3,
          5
        ],
        "long": [
          4,
          6
        ]
      },
      "energy": {
        "rest": 0.92,
        "training": 1,
        "long": 1.1
      }
    },
    "endurance": {
      "protein": 1.5,
      "endurance": true,
      "carbs": {
        "rest": [
          3,
          5
        ],
        "training": [
          5,
          7
        ],
        "long": [
          6,
          10
        ]
      },
      "energy": {
        "rest": 0.9,
        "training": 1,
        "long": 1.2
      }
    },
    "cycling": {
      "protein": 1.5,
      "endurance": true,
      "carbs": {
        "rest": [
          3,
          5
        ],
        "training": [
          5,
          7
        ],
        "long": [
          7,
          10
        ]
      },
      "energy": {
        "rest": 0.9,
        "training": 1,
        "long": 1.25
      }
    },
    "vaulting": {
      "protein": 1.6,
      "endurance": false,
      "carbs": {
        "rest": [
          3,
          4
        ],
        "training": [
          4,
          6
        ],
        "long": [
          5,
          7
        ]
      },
      "energy": {
        "rest": 0.92,
        "training": 1,
        "long": 1.1
      }
    },
    "general": {
      "protein": 1.6,
      "endurance": false,
      "carbs": {
        "rest": [
          3,
          4
        ],
        "training": [
          4,
          5
        ],
        "long": [
          5,
          7
        ]
      },
      "energy": {
        "rest": 0.92,
        "training": 1,
        "long": 1.12
      }
    }
  },
  "proteinForGoal": {
    "fat_loss": 2,
    "hypertrophy": 1.8
  },
  "fat": {
    "floorPerKg": 0.8,
    "share": 0.25
  },
  "fuelling": {
    "sessionMinutes": 60,
    "mealBefore": 150,
    "snackBefore": 45,
    "recoveryAfter": 30,
    "mealCarbsPerKg": [
      1,
      1.5
    ],
    "mealCarbsPerKgLong": [
      1,
      2
    ],
    "snackCarbs": [
      20,
      40
    ],
    "duringFrom": 75,
    "duringHighFrom": 150,
    "duringCarbsPerHour": [
      30,
      60
    ],
    "duringCarbsPerHourHigh": [
      60,
      90
    ],
    "waterFrom": 90,
    "waterPerHour": [
      400,
      800
    ],
    "recoveryProteinPerKg": [
      0.25,
      0.4
    ],
    "recoveryProteinBounds": [
      20,
      40
    ],
    "recoveryCarbsPerKgLong": [
      1,
      1.2
    ],
    "recoveryCarbsPerKg": [
      0.5,
      1
    ]
  }
}
')
ON CONFLICT (key) DO NOTHING;

-- 099_levels.sql
-- The three levels (beginner, intermediate, advanced), kept by an admin
-- rather than fixed in the code (Admin > Levels): app_settings.levels holds
-- each level's name in French, English and German and what the app starts
-- someone at that level with: the reps and the effort (RPE) of a set nobody
-- filled in, and a VMA (km/h) until they give theirs; then the first loads
-- (kg) for each level, by equipment and muscle group, an empty muscle being
-- the load for the equipment's other groups. The three levels themselves
-- stay fixed: programs, run sessions and timed formats are written for each.
-- The values are those the app had.
-- Apply this file first, then the code.
-- Plain quotes only; safe to run again (an existing value is kept).

BEGIN;

INSERT INTO app_settings (key, value) VALUES ('levels', '{
  "levels": [
    {
      "id": "beginner",
      "fr": "Débutant",
      "en": "Beginner",
      "de": "Anfänger",
      "reps": 12,
      "rpe": 7,
      "vma": 11
    },
    {
      "id": "intermediate",
      "fr": "Intermédiaire",
      "en": "Intermediate",
      "de": "Fortgeschritten",
      "reps": 10,
      "rpe": 8,
      "vma": 14
    },
    {
      "id": "advanced",
      "fr": "Avancé",
      "en": "Advanced",
      "de": "Profi",
      "reps": 8,
      "rpe": 8,
      "vma": 17
    }
  ],
  "startKg": [
    {
      "equipment": "barbell",
      "muscle": "legs",
      "kg": {
        "beginner": 40,
        "intermediate": 60,
        "advanced": 80
      }
    },
    {
      "equipment": "barbell",
      "muscle": "back",
      "kg": {
        "beginner": 40,
        "intermediate": 60,
        "advanced": 80
      }
    },
    {
      "equipment": "barbell",
      "muscle": "chest",
      "kg": {
        "beginner": 30,
        "intermediate": 50,
        "advanced": 70
      }
    },
    {
      "equipment": "barbell",
      "muscle": "shoulders",
      "kg": {
        "beginner": 20,
        "intermediate": 35,
        "advanced": 50
      }
    },
    {
      "equipment": "barbell",
      "muscle": "arms",
      "kg": {
        "beginner": 15,
        "intermediate": 25,
        "advanced": 35
      }
    },
    {
      "equipment": "barbell",
      "muscle": "",
      "kg": {
        "beginner": 30,
        "intermediate": 50,
        "advanced": 70
      }
    },
    {
      "equipment": "dumbbell",
      "muscle": "legs",
      "kg": {
        "beginner": 10,
        "intermediate": 16,
        "advanced": 24
      }
    },
    {
      "equipment": "dumbbell",
      "muscle": "back",
      "kg": {
        "beginner": 10,
        "intermediate": 18,
        "advanced": 26
      }
    },
    {
      "equipment": "dumbbell",
      "muscle": "chest",
      "kg": {
        "beginner": 10,
        "intermediate": 16,
        "advanced": 24
      }
    },
    {
      "equipment": "dumbbell",
      "muscle": "shoulders",
      "kg": {
        "beginner": 6,
        "intermediate": 10,
        "advanced": 14
      }
    },
    {
      "equipment": "dumbbell",
      "muscle": "arms",
      "kg": {
        "beginner": 6,
        "intermediate": 10,
        "advanced": 14
      }
    },
    {
      "equipment": "dumbbell",
      "muscle": "",
      "kg": {
        "beginner": 8,
        "intermediate": 12,
        "advanced": 18
      }
    },
    {
      "equipment": "machine",
      "muscle": "legs",
      "kg": {
        "beginner": 40,
        "intermediate": 70,
        "advanced": 100
      }
    },
    {
      "equipment": "machine",
      "muscle": "back",
      "kg": {
        "beginner": 25,
        "intermediate": 40,
        "advanced": 55
      }
    },
    {
      "equipment": "machine",
      "muscle": "chest",
      "kg": {
        "beginner": 25,
        "intermediate": 40,
        "advanced": 55
      }
    },
    {
      "equipment": "machine",
      "muscle": "shoulders",
      "kg": {
        "beginner": 15,
        "intermediate": 25,
        "advanced": 35
      }
    },
    {
      "equipment": "machine",
      "muscle": "arms",
      "kg": {
        "beginner": 12,
        "intermediate": 20,
        "advanced": 30
      }
    },
    {
      "equipment": "machine",
      "muscle": "core",
      "kg": {
        "beginner": 10,
        "intermediate": 20,
        "advanced": 30
      }
    },
    {
      "equipment": "machine",
      "muscle": "",
      "kg": {
        "beginner": 20,
        "intermediate": 35,
        "advanced": 50
      }
    },
    {
      "equipment": "cable",
      "muscle": "legs",
      "kg": {
        "beginner": 20,
        "intermediate": 30,
        "advanced": 40
      }
    },
    {
      "equipment": "cable",
      "muscle": "back",
      "kg": {
        "beginner": 25,
        "intermediate": 40,
        "advanced": 55
      }
    },
    {
      "equipment": "cable",
      "muscle": "chest",
      "kg": {
        "beginner": 15,
        "intermediate": 25,
        "advanced": 35
      }
    },
    {
      "equipment": "cable",
      "muscle": "shoulders",
      "kg": {
        "beginner": 7.5,
        "intermediate": 12.5,
        "advanced": 17.5
      }
    },
    {
      "equipment": "cable",
      "muscle": "arms",
      "kg": {
        "beginner": 12.5,
        "intermediate": 20,
        "advanced": 27.5
      }
    },
    {
      "equipment": "cable",
      "muscle": "core",
      "kg": {
        "beginner": 15,
        "intermediate": 25,
        "advanced": 35
      }
    },
    {
      "equipment": "cable",
      "muscle": "",
      "kg": {
        "beginner": 15,
        "intermediate": 25,
        "advanced": 35
      }
    },
    {
      "equipment": "kettlebell",
      "muscle": "",
      "kg": {
        "beginner": 8,
        "intermediate": 12,
        "advanced": 16
      }
    }
  ]
}') ON CONFLICT (key) DO NOTHING;

COMMIT;

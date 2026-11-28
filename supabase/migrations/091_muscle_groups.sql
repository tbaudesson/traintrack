-- 091_muscle_groups.sql
-- The muscle groups of the exercises, kept by an admin rather than fixed in
-- the code: app_settings.muscle_groups, in the order shown everywhere
-- (filters, cards, generated sessions), each named in French, English and
-- German (Admin > Muscle groups), with their roles, ticked in the list:
--   wholeBody    works every muscle (the body map, the stretches)
--   unspecified  the group of an exercise nobody sorted (an import)
--   noRecovery   left out of "the same muscles two days running"
--   endurance    worked by an outing (what to stretch after a run)
-- The groups' ids in the rows (exercises.muscle_group, secondary_muscles,
-- the references of timed sessions, boxing and mobility) do not change;
-- the database never checked them against a list.
-- Apply this file first, then the code.
-- Plain quotes only; safe to run again (an existing value is kept).

INSERT INTO app_settings (key, value) VALUES ('muscle_groups', '[
  {
    "id": "chest",
    "fr": "Pectoraux",
    "en": "Chest",
    "de": "Brust",
    "wholeBody": false,
    "unspecified": false,
    "noRecovery": false,
    "endurance": false
  },
  {
    "id": "back",
    "fr": "Dos",
    "en": "Back",
    "de": "Rücken",
    "wholeBody": false,
    "unspecified": false,
    "noRecovery": false,
    "endurance": false
  },
  {
    "id": "legs",
    "fr": "Jambes",
    "en": "Legs",
    "de": "Beine",
    "wholeBody": false,
    "unspecified": false,
    "noRecovery": false,
    "endurance": true
  },
  {
    "id": "shoulders",
    "fr": "Épaules",
    "en": "Shoulders",
    "de": "Schultern",
    "wholeBody": false,
    "unspecified": false,
    "noRecovery": false,
    "endurance": false
  },
  {
    "id": "arms",
    "fr": "Bras",
    "en": "Arms",
    "de": "Arme",
    "wholeBody": false,
    "unspecified": false,
    "noRecovery": false,
    "endurance": false
  },
  {
    "id": "core",
    "fr": "Gainage",
    "en": "Core",
    "de": "Rumpf",
    "wholeBody": false,
    "unspecified": false,
    "noRecovery": true,
    "endurance": true
  },
  {
    "id": "full_body",
    "fr": "Corps entier",
    "en": "Full body",
    "de": "Ganzkörper",
    "wholeBody": true,
    "unspecified": false,
    "noRecovery": true,
    "endurance": false
  },
  {
    "id": "other",
    "fr": "Autre",
    "en": "Other",
    "de": "Andere",
    "wholeBody": false,
    "unspecified": true,
    "noRecovery": true,
    "endurance": false
  }
]') ON CONFLICT (key) DO NOTHING;

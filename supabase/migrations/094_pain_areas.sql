-- 094_pain_areas.sql
-- The body's areas a pain or an injury is on, kept by an admin rather than
-- fixed in the code: app_settings.pain_areas (Admin > Lists), in the order
-- offered, each named in French, English and German; the unsorted one
-- ("elsewhere") is reported but never declared as an injury nor ruled out
-- on an exercise. The body map marks an injury with a circle where its
-- drawing knows the joint; an area added later shows everywhere else.
-- A pain's area (workout_notes.pain_area) is checked for its form, no longer
-- against a fixed list.
-- Apply this file first, then the code.
-- Plain quotes only; safe to run again (an existing value is kept).

BEGIN;

INSERT INTO app_settings (key, value) VALUES ('pain_areas', '[
  {
    "id": "shoulder",
    "fr": "Épaule",
    "en": "Shoulder",
    "de": "Schulter",
    "unspecified": false
  },
  {
    "id": "elbow",
    "fr": "Coude",
    "en": "Elbow",
    "de": "Ellbogen",
    "unspecified": false
  },
  {
    "id": "wrist",
    "fr": "Poignet",
    "en": "Wrist",
    "de": "Handgelenk",
    "unspecified": false
  },
  {
    "id": "neck",
    "fr": "Nuque",
    "en": "Neck",
    "de": "Nacken",
    "unspecified": false
  },
  {
    "id": "upper_back",
    "fr": "Haut du dos",
    "en": "Upper back",
    "de": "Oberer Rücken",
    "unspecified": false
  },
  {
    "id": "lower_back",
    "fr": "Bas du dos",
    "en": "Lower back",
    "de": "Unterer Rücken",
    "unspecified": false
  },
  {
    "id": "hip",
    "fr": "Hanche",
    "en": "Hip",
    "de": "Hüfte",
    "unspecified": false
  },
  {
    "id": "knee",
    "fr": "Genou",
    "en": "Knee",
    "de": "Knie",
    "unspecified": false
  },
  {
    "id": "ankle",
    "fr": "Cheville",
    "en": "Ankle",
    "de": "Knöchel",
    "unspecified": false
  },
  {
    "id": "other",
    "fr": "Autre",
    "en": "Other",
    "de": "Sonstiges",
    "unspecified": true
  }
]') ON CONFLICT (key) DO NOTHING;

ALTER TABLE workout_notes DROP CONSTRAINT IF EXISTS workout_notes_pain_check;
ALTER TABLE workout_notes ADD CONSTRAINT workout_notes_pain_check CHECK (
  (pain_area IS NULL AND pain_level IS NULL)
  OR (pain_area IS NOT NULL AND pain_level IS NOT NULL
      AND pain_area ~ '^[a-z0-9_-]{1,30}$'
      AND pain_level BETWEEN 1 AND 10)
) NOT VALID;

COMMIT;

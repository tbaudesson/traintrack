-- 093_lists.sql
-- More lists kept by an admin rather than fixed in the code (Admin > Lists),
-- each named in French, English and German:
--   app_settings.equipment     the exercises' equipment, with the roles the
--                              code reads: no gear needed, no warm-up sets,
--                              unsorted, ticked for a gym, ticked at home;
--                              and its load step and bar (2 kg for dumbbells,
--                              2.5 kg otherwise; a 20 kg bar for a barbell)
--   app_settings.movements     the movements an exercise asks of the body
--                              (and the words for them inside a sentence)
--   app_settings.swim_strokes  the strokes of a swim
--   app_settings.choices       the values offered: rest times after a set
--                              and a warm-up set, pool lengths, an outing's
--                              minutes (plan B), a session's intensity steps
-- The database no longer freezes those ids (an exercise's movements and its
-- secondary muscle groups, a swim's stroke): it checks their form.
-- Apply this file first, then the code.
-- Plain quotes only; safe to run again (an existing value is kept).

BEGIN;

INSERT INTO app_settings (key, value) VALUES ('equipment', '[
  {
    "id": "barbell",
    "fr": "Barre de musculation",
    "en": "Barbell",
    "de": "Langhantel",
    "noGear": false,
    "noWarmup": false,
    "unspecified": false,
    "gym": true,
    "home": false,
    "stepKg": 2.5,
    "barKg": 20
  },
  {
    "id": "dumbbell",
    "fr": "Haltères",
    "en": "Dumbbells",
    "de": "Kurzhanteln",
    "noGear": false,
    "noWarmup": false,
    "unspecified": false,
    "gym": true,
    "home": true,
    "stepKg": 2,
    "barKg": 0
  },
  {
    "id": "machine",
    "fr": "Machines",
    "en": "Machines",
    "de": "Maschinen",
    "noGear": false,
    "noWarmup": false,
    "unspecified": false,
    "gym": true,
    "home": false,
    "stepKg": 2.5,
    "barKg": 0
  },
  {
    "id": "cable",
    "fr": "Poulies",
    "en": "Cables",
    "de": "Kabelzug",
    "noGear": false,
    "noWarmup": false,
    "unspecified": false,
    "gym": true,
    "home": false,
    "stepKg": 2.5,
    "barKg": 0
  },
  {
    "id": "pullup_bar",
    "fr": "Barre de traction",
    "en": "Pull-up bar",
    "de": "Klimmzugstange",
    "noGear": false,
    "noWarmup": false,
    "unspecified": false,
    "gym": true,
    "home": false,
    "stepKg": 2.5,
    "barKg": 0
  },
  {
    "id": "bodyweight",
    "fr": "Poids du corps",
    "en": "Bodyweight",
    "de": "Körpergewicht",
    "noGear": true,
    "noWarmup": true,
    "unspecified": false,
    "gym": true,
    "home": true,
    "stepKg": 2.5,
    "barKg": 0
  },
  {
    "id": "kettlebell",
    "fr": "Kettlebells",
    "en": "Kettlebells",
    "de": "Kettlebells",
    "noGear": false,
    "noWarmup": false,
    "unspecified": false,
    "gym": false,
    "home": false,
    "stepKg": 2,
    "barKg": 0
  },
  {
    "id": "bands",
    "fr": "Élastiques",
    "en": "Bands",
    "de": "Bänder",
    "noGear": false,
    "noWarmup": true,
    "unspecified": false,
    "gym": false,
    "home": true,
    "stepKg": 2.5,
    "barKg": 0
  },
  {
    "id": "suspension",
    "fr": "Sangles TRX",
    "en": "TRX straps",
    "de": "TRX-Bänder",
    "noGear": false,
    "noWarmup": false,
    "unspecified": false,
    "gym": false,
    "home": false,
    "stepKg": 2.5,
    "barKg": 0
  },
  {
    "id": "other",
    "fr": "Autre",
    "en": "Other",
    "de": "Andere",
    "noGear": false,
    "noWarmup": false,
    "unspecified": true,
    "gym": false,
    "home": false,
    "stepKg": 2.5,
    "barKg": 0
  }
]') ON CONFLICT (key) DO NOTHING;

INSERT INTO app_settings (key, value) VALUES ('movements', '[
  {
    "id": "squat",
    "fr": "Squat",
    "en": "Squat",
    "de": "Kniebeuge",
    "shortFr": "squats",
    "shortEn": "squats",
    "shortDe": "Kniebeugen"
  },
  {
    "id": "hinge",
    "fr": "Charnière de hanche",
    "en": "Hip hinge",
    "de": "Hüftbeuge",
    "shortFr": "charnières de hanche",
    "shortEn": "hip hinges",
    "shortDe": "Hüftbeugen"
  },
  {
    "id": "lunge",
    "fr": "Fente",
    "en": "Lunge",
    "de": "Ausfallschritt",
    "shortFr": "fentes",
    "shortEn": "lunges",
    "shortDe": "Ausfallschritte"
  },
  {
    "id": "push_horizontal",
    "fr": "Poussée horizontale",
    "en": "Horizontal push",
    "de": "Horizontales Drücken",
    "shortFr": "poussées horizontales",
    "shortEn": "horizontal pushes",
    "shortDe": "horizontales Drücken"
  },
  {
    "id": "push_vertical",
    "fr": "Poussée verticale",
    "en": "Vertical push",
    "de": "Vertikales Drücken",
    "shortFr": "poussées verticales",
    "shortEn": "vertical pushes",
    "shortDe": "vertikales Drücken"
  },
  {
    "id": "pull_horizontal",
    "fr": "Tirage horizontal",
    "en": "Horizontal pull",
    "de": "Horizontales Ziehen",
    "shortFr": "tirages horizontaux",
    "shortEn": "horizontal pulls",
    "shortDe": "horizontales Ziehen"
  },
  {
    "id": "pull_vertical",
    "fr": "Tirage vertical",
    "en": "Vertical pull",
    "de": "Vertikales Ziehen",
    "shortFr": "tirages verticaux",
    "shortEn": "vertical pulls",
    "shortDe": "vertikales Ziehen"
  },
  {
    "id": "overhead",
    "fr": "Bras au-dessus de la tête",
    "en": "Arms overhead",
    "de": "Arme über Kopf",
    "shortFr": "bras au-dessus de la tête",
    "shortEn": "arms overhead",
    "shortDe": "Arme über Kopf"
  },
  {
    "id": "hanging",
    "fr": "Suspension",
    "en": "Hanging",
    "de": "Hängen",
    "shortFr": "suspensions",
    "shortEn": "hanging",
    "shortDe": "Hängen"
  },
  {
    "id": "isolation",
    "fr": "Isolation",
    "en": "Isolation",
    "de": "Isolation",
    "shortFr": "isolation",
    "shortEn": "isolation",
    "shortDe": "Isolation"
  },
  {
    "id": "core_flexion",
    "fr": "Flexion du tronc",
    "en": "Trunk flexion",
    "de": "Rumpfbeugung",
    "shortFr": "flexions du tronc",
    "shortEn": "trunk flexion",
    "shortDe": "Rumpfbeugung"
  },
  {
    "id": "core_stability",
    "fr": "Gainage",
    "en": "Core stability",
    "de": "Rumpfstabilität",
    "shortFr": "gainage",
    "shortEn": "core stability",
    "shortDe": "Rumpfstabilität"
  },
  {
    "id": "rotation",
    "fr": "Rotation",
    "en": "Rotation",
    "de": "Rotation",
    "shortFr": "rotations",
    "shortEn": "rotations",
    "shortDe": "Rotationen"
  },
  {
    "id": "jump",
    "fr": "Sauts et impacts",
    "en": "Jumps and impacts",
    "de": "Sprünge und Stöße",
    "shortFr": "sauts",
    "shortEn": "jumps",
    "shortDe": "Sprünge"
  },
  {
    "id": "conditioning",
    "fr": "Cardio au poids du corps",
    "en": "Bodyweight cardio",
    "de": "Cardio mit Körpergewicht",
    "shortFr": "cardio au poids du corps",
    "shortEn": "bodyweight cardio",
    "shortDe": "Cardio mit Körpergewicht"
  },
  {
    "id": "mobility",
    "fr": "Souplesse",
    "en": "Flexibility",
    "de": "Beweglichkeit",
    "shortFr": "souplesse",
    "shortEn": "flexibility",
    "shortDe": "Beweglichkeit"
  }
]') ON CONFLICT (key) DO NOTHING;

INSERT INTO app_settings (key, value) VALUES ('swim_strokes', '[
  {
    "id": "free",
    "fr": "Crawl",
    "en": "Freestyle",
    "de": "Kraul"
  },
  {
    "id": "breast",
    "fr": "Brasse",
    "en": "Breaststroke",
    "de": "Brust"
  },
  {
    "id": "back",
    "fr": "Dos",
    "en": "Backstroke",
    "de": "Rücken"
  },
  {
    "id": "fly",
    "fr": "Papillon",
    "en": "Butterfly",
    "de": "Schmetterling"
  },
  {
    "id": "mixed",
    "fr": "Mélangé",
    "en": "Mixed",
    "de": "Gemischt"
  }
]') ON CONFLICT (key) DO NOTHING;

INSERT INTO app_settings (key, value) VALUES ('choices', '{
  "restDefaults": [
    60,
    90,
    120,
    180
  ],
  "restWarmups": [
    30,
    45,
    60,
    90
  ],
  "poolLengths": [
    25,
    50
  ],
  "cardioMinutes": [
    15,
    20,
    30,
    45
  ],
  "intensitySteps": [
    -20,
    0,
    10,
    20,
    30
  ]
}') ON CONFLICT (key) DO NOTHING;

ALTER TABLE exercises DROP CONSTRAINT IF EXISTS exercises_details_check;
ALTER TABLE exercises ADD CONSTRAINT exercises_details_check CHECK (
  (level IS NULL OR level IN ('beginner', 'intermediate', 'advanced'))
  AND (movements IS NULL OR (jsonb_typeof(movements) = 'array' AND jsonb_array_length(movements) <= 6
       AND jsonb_array_length(movements) = jsonb_array_length(jsonb_path_query_array(movements, '$[*] ? (@ like_regex "^[a-z0-9_-]{1,30}$")'))))
  AND (secondary_muscles IS NULL OR (jsonb_typeof(secondary_muscles) = 'array' AND jsonb_array_length(secondary_muscles) <= 6
       AND jsonb_array_length(secondary_muscles) = jsonb_array_length(jsonb_path_query_array(secondary_muscles, '$[*] ? (@ like_regex "^[a-z0-9_-]{1,30}$")'))))
  AND (cues IS NULL OR (jsonb_typeof(cues) = 'object' AND char_length(cues::text) <= 6000))
  AND (mistakes IS NULL OR (jsonb_typeof(mistakes) = 'object' AND char_length(mistakes::text) <= 6000))
) NOT VALID;

ALTER TABLE workouts DROP CONSTRAINT IF EXISTS workouts_sport_fields_check;
ALTER TABLE workouts ADD CONSTRAINT workouts_sport_fields_check CHECK (
  (avg_cadence IS NULL OR avg_cadence BETWEEN 1 AND 260)
  AND (avg_power_w IS NULL OR avg_power_w BETWEEN 0 AND 2500)
  AND (max_power_w IS NULL OR max_power_w BETWEEN 0 AND 3000)
  AND (swim_stroke IS NULL OR swim_stroke ~ '^[a-z0-9_-]{1,30}$')
  AND (pool_length_m IS NULL OR pool_length_m = 0 OR pool_length_m BETWEEN 10 AND 100)
  AND (strokes_per_length IS NULL OR strokes_per_length BETWEEN 1 AND 200)
) NOT VALID;

COMMIT;

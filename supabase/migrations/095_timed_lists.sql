-- 095_timed_lists.sql
-- The lists timed sessions are built from, kept by an admin rather than fixed
-- in the code, in the two references Admin already edits:
--   - app_settings.timed_sessions gains what a circuit can work (focuses),
--     the kinds of effort (kinds) and the equipment (equipment), each named
--     in French, English and German; one equipment is the base (the body),
--     always allowed, the others chosen by the athlete.
--   - app_settings.boxing_rounds gains the kinds of combination (kinds);
--     one closes each round (finisher), one fills a round when another kind
--     has nothing left (main).
-- The ids are those the exercises and combinations already carry. A list
-- already there is kept (the admin may have changed it).
-- Apply this file first, then the code.
-- Plain quotes only; safe to run again.

BEGIN;

UPDATE app_settings
SET value = (value::jsonb || '{
  "focuses": [
    {"id": "full", "fr": "Full body", "en": "Full body", "de": "Ganzkörper"},
    {"id": "abs", "fr": "Abdos", "en": "Abs", "de": "Bauch"},
    {"id": "lower", "fr": "Bas du corps", "en": "Lower body", "de": "Unterkörper"}
  ],
  "kinds": [
    {"id": "cardio", "fr": "Cardio", "en": "Cardio", "de": "Cardio"},
    {"id": "strength", "fr": "Renfo", "en": "Strength", "de": "Kraft"},
    {"id": "core", "fr": "Gainage", "en": "Core", "de": "Rumpf"}
  ],
  "equipment": [
    {"id": "bodyweight", "fr": "Poids du corps", "en": "Bodyweight", "de": "Körpergewicht", "base": true},
    {"id": "dumbbell", "fr": "Haltères", "en": "Dumbbells", "de": "Kurzhanteln", "base": false},
    {"id": "suspension", "fr": "Sangles TRX", "en": "TRX straps", "de": "TRX-Bänder", "base": false}
  ]
}'::jsonb)::text
WHERE key = 'timed_sessions'
  AND NOT (value::jsonb ? 'focuses');

UPDATE app_settings
SET value = (value::jsonb || '{
  "kinds": [
    {"id": "attack", "fr": "Attaque", "en": "Attack", "de": "Angriff", "main": true},
    {"id": "defense", "fr": "Défense", "en": "Defense", "de": "Verteidigung"},
    {"id": "footwork", "fr": "Jeu de jambes", "en": "Footwork", "de": "Beinarbeit"},
    {"id": "finisher", "fr": "Rafale de fin de round", "en": "End-of-round burst", "de": "Schlaghagel zum Rundenende", "finisher": true}
  ]
}'::jsonb)::text
WHERE key = 'boxing_rounds'
  AND NOT (value::jsonb ? 'kinds');

COMMIT;

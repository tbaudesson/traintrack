-- 036_exercise_translations.sql
-- The library's exercises in French and German, editable by an admin:
-- name_fr, name_de, description_fr, description_de. The English name stays
-- the key the programs and sessions use. Filled here with the translations the
-- app shipped with, only where empty, so an admin's edits are kept.
-- Also lets an admin add an exercise to the shared library.
--
-- Deploy: apply this file first, then the code. The app reads the new
-- columns and calls the new functions.
--
-- Safe to re-run. All-or-nothing: wrapped in one transaction.

BEGIN;

ALTER TABLE exercises ADD COLUMN IF NOT EXISTS name_fr TEXT;
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS name_de TEXT;
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS description_fr TEXT;
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS description_de TEXT;

UPDATE exercises e
SET name_fr = COALESCE(e.name_fr, v.name_fr),
    name_de = COALESCE(e.name_de, v.name_de),
    description_fr = COALESCE(e.description_fr, v.description_fr),
    description_de = COALESCE(e.description_de, v.description_de),
    updated_at = now()
FROM (VALUES
  ('Barbell Bench Press', 'Développé couché à la barre', 'Bankdrücken mit Langhantel', NULL, NULL),
  ('Incline Barbell Bench Press', 'Développé incliné à la barre', 'Schrägbankdrücken mit Langhantel', NULL, NULL),
  ('Dumbbell Bench Press', 'Développé couché aux haltères', 'Kurzhantel-Bankdrücken', NULL, NULL),
  ('Incline Dumbbell Press', 'Développé incliné aux haltères', 'Schrägbankdrücken mit Kurzhanteln', NULL, NULL),
  ('Cable Fly', 'Écarté à la poulie', 'Kabelfliegende', NULL, NULL),
  ('Push-up', 'Pompes', 'Liegestütze', NULL, NULL),
  ('Chest Dip', 'Dips (pectoraux)', 'Dips (Brust)', NULL, NULL),
  ('Deadlift', 'Soulevé de terre', 'Kreuzheben', NULL, NULL),
  ('Barbell Row', 'Rowing à la barre', 'Langhantelrudern', NULL, NULL),
  ('Pull-up', 'Tractions pronation', 'Klimmzüge', NULL, NULL),
  ('Chin-up', 'Tractions supination', 'Klimmzüge im Untergriff', NULL, NULL),
  ('Lat Pulldown', 'Tirage vertical', 'Latzug', NULL, NULL),
  ('Seated Cable Row', 'Tirage horizontal à la poulie', 'Rudern am Kabelzug sitzend', NULL, NULL),
  ('Dumbbell Row', 'Rowing à un bras avec haltère', 'Einarmiges Kurzhantelrudern', NULL, NULL),
  ('T-Bar Row', 'Rowing T-bar', 'T-Bar-Rudern', NULL, NULL),
  ('Back Squat', 'Squat arrière', 'Kniebeuge', NULL, NULL),
  ('Front Squat', 'Squat avant', 'Frontkniebeuge', NULL, NULL),
  ('Romanian Deadlift', 'Soulevé de terre roumain', 'Rumänisches Kreuzheben', NULL, NULL),
  ('Leg Press', 'Presse à cuisses', 'Beinpresse', NULL, NULL),
  ('Leg Extension', 'Leg extension', 'Beinstrecker', NULL, NULL),
  ('Leg Curl', 'Leg curl', 'Beinbeuger', NULL, NULL),
  ('Walking Lunge', 'Fentes marchées', 'Ausfallschritte gehend', NULL, NULL),
  ('Bulgarian Split Squat', 'Squat bulgare', 'Bulgarische Kniebeuge', NULL, NULL),
  ('Standing Calf Raise', 'Mollets debout', 'Wadenheben stehend', NULL, NULL),
  ('Hip Thrust', 'Hip thrust', 'Hip Thrust', NULL, NULL),
  ('Overhead Press', 'Développé militaire', 'Schulterdrücken stehend', NULL, NULL),
  ('Seated Dumbbell Press', 'Développé épaules assis aux haltères', 'Kurzhantel-Schulterdrücken sitzend', NULL, NULL),
  ('Lateral Raise', 'Élévations latérales', 'Seitheben', NULL, NULL),
  ('Rear Delt Fly', 'Oiseau (deltoïdes postérieurs)', 'Reverse Flys', NULL, NULL),
  ('Face Pull', 'Face pull', 'Face Pull', NULL, NULL),
  ('Barbell Curl', 'Curl à la barre', 'Langhantel-Curl', NULL, NULL),
  ('Dumbbell Curl', 'Curl aux haltères', 'Kurzhantel-Curl', NULL, NULL),
  ('Hammer Curl', 'Curl marteau', 'Hammer-Curl', NULL, NULL),
  ('Triceps Pushdown', 'Extension triceps à la poulie', 'Trizepsdrücken am Kabel', NULL, NULL),
  ('Skull Crusher', 'Barre au front', 'French Press liegend', NULL, NULL),
  ('Overhead Triceps Extension', 'Extension triceps au-dessus de la tête', 'Trizepsstrecken über Kopf', NULL, NULL),
  ('Plank', 'Gainage (planche)', 'Unterarmstütz (Plank)', NULL, NULL),
  ('Hanging Leg Raise', 'Relevés de jambes suspendu', 'Beinheben hängend', NULL, NULL),
  ('Cable Crunch', 'Crunch à la poulie', 'Kabel-Crunch', NULL, NULL),
  ('Russian Twist', 'Rotations russes', 'Russian Twist', NULL, NULL),
  ('Side Plank', 'Gainage latéral', 'Seitstütz', 'Sur un avant-bras, le corps aligné, les hanches hautes. Tenir sans s''affaisser.', 'Auf einem Unterarm, Körper in einer Linie, Hüfte hoch. Halten, ohne durchzuhängen.'),
  ('Dead Bug', 'Dead bug', 'Dead Bug', 'Sur le dos, descendre lentement le bras et la jambe opposés en gardant le bas du dos plaqué au sol.', 'In Rückenlage den gegenüberliegenden Arm und das Bein langsam absenken, der untere Rücken bleibt am Boden.'),
  ('Bird Dog', 'Bird dog (quadrupédie)', 'Vierfüßlerstand diagonal', 'À quatre pattes, tendre le bras et la jambe opposés, marquer une pause, revenir sans tourner le buste.', 'Im Vierfüßlerstand den gegenüberliegenden Arm und das Bein strecken, kurz halten, ohne Verdrehen zurück.'),
  ('Glute Bridge', 'Pont fessier', 'Glute Bridge', 'Sur le dos, genoux fléchis, pousser les hanches vers le haut en serrant les fessiers.', 'In Rückenlage mit gebeugten Knien die Hüfte nach oben drücken und das Gesäß anspannen.'),
  ('Single-Leg Calf Raise', 'Mollets sur une jambe', 'Einbeiniges Wadenheben', 'Sur un pied, monter le plus haut possible, puis redescendre lentement en trois secondes.', 'Auf einem Fuß so hoch wie möglich steigen, dann in drei Sekunden langsam absenken.'),
  ('Step-up', 'Montée sur banc', 'Step-up', 'Monter sur un banc en poussant sur le talon avant, redescendre en contrôlant.', 'Auf eine Box steigen, über die vordere Ferse drücken, kontrolliert absenken.'),
  ('Single-Leg Romanian Deadlift', 'Soulevé de terre roumain sur une jambe', 'Einbeiniges rumänisches Kreuzheben', 'En équilibre sur une jambe, basculer à partir des hanches dos plat, remonter en serrant le fessier.', 'Auf einem Bein balancieren, mit geradem Rücken aus der Hüfte beugen, mit angespanntem Gesäß zurück.'),
  ('External Shoulder Rotation', 'Rotation externe de l''épaule', 'Schulter-Außenrotation', 'Coude collé au corps, tourner lentement l''avant-bras vers l''extérieur. Charge légère.', 'Ellbogen am Körper, den Unterarm langsam nach außen drehen. Leichtes Gewicht.'),
  ('Straight-Arm Pulldown', 'Pull-over à la poulie, bras tendus', 'Latziehen mit gestreckten Armen', 'Bras presque tendus, tirer la barre jusqu''aux cuisses avec les dorsaux.', 'Mit fast gestreckten Armen die Stange mit dem Latissimus zu den Oberschenkeln ziehen.')
) AS v(name, name_fr, name_de, description_fr, description_de)
WHERE e.user_id IS NULL AND e.name = v.name
  AND (e.name_fr IS NULL OR e.name_de IS NULL OR (v.description_fr IS NOT NULL AND e.description_fr IS NULL));

-- Admin: the translations of any exercise, the library's included.
CREATE OR REPLACE FUNCTION admin_update_exercise_i18n(
  p_uuid TEXT, p_name_fr TEXT, p_name_de TEXT, p_description_fr TEXT, p_description_de TEXT
) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT is_app_admin() THEN
    RAISE EXCEPTION 'Unauthorized: admin access required';
  END IF;
  UPDATE exercises
     SET name_fr        = NULLIF(btrim(p_name_fr), ''),
         name_de        = NULLIF(btrim(p_name_de), ''),
         description_fr = NULLIF(btrim(p_description_fr), ''),
         description_de = NULLIF(btrim(p_description_de), ''),
         updated_at     = now()
   WHERE id = p_uuid::uuid;
END;
$$;
GRANT EXECUTE ON FUNCTION admin_update_exercise_i18n(TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;

-- Admin: add an exercise to the shared library (no owner, not custom).
CREATE OR REPLACE FUNCTION admin_create_library_exercise(
  p_name TEXT, p_muscle_group TEXT, p_equipment TEXT, p_description TEXT, p_video_url TEXT,
  p_name_fr TEXT, p_name_de TEXT
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_id UUID;
BEGIN
  IF NOT is_app_admin() THEN
    RAISE EXCEPTION 'Unauthorized: admin access required';
  END IF;
  IF NULLIF(btrim(p_name), '') IS NULL THEN
    RAISE EXCEPTION 'A name is required';
  END IF;
  IF EXISTS (SELECT 1 FROM exercises WHERE user_id IS NULL AND lower(name) = lower(btrim(p_name))) THEN
    RAISE EXCEPTION 'This exercise is already in the library';
  END IF;
  INSERT INTO exercises (user_id, name, muscle_group, equipment, is_custom, description, video_url, name_fr, name_de)
  VALUES (NULL, btrim(p_name), p_muscle_group, p_equipment, false,
          NULLIF(btrim(p_description), ''), NULLIF(btrim(p_video_url), ''),
          NULLIF(btrim(p_name_fr), ''), NULLIF(btrim(p_name_de), ''))
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;
GRANT EXECUTE ON FUNCTION admin_create_library_exercise(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;

COMMIT;

-- 092_group_lessons.sql
-- One library of exercises, for individuals and groups alike; the tennis
-- notebook becomes the group lessons' notebook, for tennis and vaulting.
-- 1. The exercises can be used in a group lesson: their sport, their theme
--    in a lesson, their suggested minutes, the ages they suit and the kit
--    they need. The tennis drills of migration 088 become exercises of the
--    library (same ids: the lessons keep pointing at them), a coach's own
--    drills his own exercises; tennis_drills goes. 25 vaulting exercises
--    join them (French, English, German), for a vaulting coach to review.
--    An admin sets those fields on a library exercise (Exercises > edit).
-- 2. A lesson group (groups.kind = 'lessons', was 'tennis') has its sport;
--    the lessons (tennis_lessons, renamed group_lessons) may say on which
--    horse a vaulting lesson was given and the horse's work it logged.
-- 3. The reference: app_settings.group_lessons, the sports of the lessons
--    with, for each, its themes, age bands, levels and equipment, and
--    whether its lessons are given on a horse (Admin > Group lessons). The
--    tennis lists an admin kept (tennis_reference) carry over.
-- 4. The feature "tennis" becomes "group_lessons", on the licences that had it.
-- The teams' rules do not change. Apply this file first, then the code.
-- Plain quotes only; safe to run again. All-or-nothing: one transaction.

BEGIN;

-- ─── 1. The exercises, for lessons too ───────────────────────────

ALTER TABLE exercises ADD COLUMN IF NOT EXISTS sport TEXT;
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS theme TEXT;
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS minutes INT;
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS ages JSONB;
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS gear JSONB;
ALTER TABLE exercises DROP CONSTRAINT IF EXISTS exercises_lesson_check;
ALTER TABLE exercises ADD CONSTRAINT exercises_lesson_check CHECK (
  (sport IS NULL OR sport ~ '^[a-z0-9_-]{1,30}$')
  AND (theme IS NULL OR theme ~ '^[a-z0-9_-]{1,30}$')
  AND (minutes IS NULL OR minutes BETWEEN 1 AND 60)
  AND (ages IS NULL OR (jsonb_typeof(ages) = 'array' AND jsonb_array_length(ages) <= 20
       AND jsonb_array_length(ages) = jsonb_array_length(jsonb_path_query_array(ages, '$[*] ? (@ like_regex "^[a-z0-9_-]{1,30}$")'))))
  AND (gear IS NULL OR (jsonb_typeof(gear) = 'array' AND jsonb_array_length(gear) <= 20
       AND jsonb_array_length(gear) = jsonb_array_length(jsonb_path_query_array(gear, '$[*] ? (@ like_regex "^[a-z0-9_-]{1,30}$")'))))
) NOT VALID;

DO '
BEGIN
  IF to_regclass(''public.tennis_drills'') IS NOT NULL THEN
    INSERT INTO exercises (id, user_id, name, name_fr, name_de, description, description_fr, description_de, muscle_group, is_custom, sport, theme, minutes, ages, gear, created_at, updated_at, deleted_at)
    SELECT id, user_id, name, name_fr, name_de, description, description_fr, description_de, ''other'', user_id IS NOT NULL, ''tennis'', category, minutes, ages, equipment, created_at, now(), deleted_at
    FROM tennis_drills
    ON CONFLICT (id) DO NOTHING;
    DROP TABLE tennis_drills;
  END IF;
END
';
DROP FUNCTION IF EXISTS admin_save_tennis_drill(TEXT, JSONB);

INSERT INTO exercises (user_id, name, name_fr, name_de, description, description_fr, description_de, muscle_group, is_custom, sport, theme, minutes, ages, gear) SELECT NULL, 'Running round the circle', 'Course dans le cercle', 'Laufen im Zirkel', 'Jog round the circle, then side steps and skips, arms swinging.', 'Petites foulées dans le cercle, puis pas chassés et sautillés, bras en mouvement.', 'Im Zirkel traben, dann Sidesteps und Hopserlauf, Arme kreisen.', 'other', false, 'vaulting', 'warmup', 5, '["8-10", "11-13", "14-16", "adult"]'::jsonb, '[]'::jsonb WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE user_id IS NULL AND name = 'Running round the circle');
INSERT INTO exercises (user_id, name, name_fr, name_de, description, description_fr, description_de, muscle_group, is_custom, sport, theme, minutes, ages, gear) SELECT NULL, 'Vaulter''s warm-up', 'Échauffement du voltigeur', 'Aufwärmen für Voltigierer', 'Joints one by one, from the neck to the ankles, then a few jumps.', 'Les articulations une à une, du cou aux chevilles, puis quelques sauts.', 'Gelenke einzeln vom Hals bis zu den Knöcheln, dann ein paar Sprünge.', 'other', false, 'vaulting', 'warmup', 6, '["8-10", "11-13", "14-16", "adult"]'::jsonb, '[]'::jsonb WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE user_id IS NULL AND name = 'Vaulter''s warm-up');
INSERT INTO exercises (user_id, name, name_fr, name_de, description, description_fr, description_de, muscle_group, is_custom, sport, theme, minutes, ages, gear) SELECT NULL, 'Splits and straddle', 'Grand écart et écart facial', 'Spagat und Grätsche', 'Held without bouncing, each side then facing, a little lower each week.', 'Tenus sans à-coups, chaque côté puis de face, un peu plus bas chaque semaine.', 'Ohne Wippen gehalten, jede Seite und frontal, jede Woche etwas tiefer.', 'other', false, 'vaulting', 'gymnastics', 8, '["8-10", "11-13", "14-16", "adult"]'::jsonb, '["mats"]'::jsonb WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE user_id IS NULL AND name = 'Splits and straddle');
INSERT INTO exercises (user_id, name, name_fr, name_de, description, description_fr, description_de, muscle_group, is_custom, sport, theme, minutes, ages, gear) SELECT NULL, 'Bridge and back suppleness', 'Pont et souplesse du dos', 'Brücke und Rückenbeweglichkeit', 'From lying, push up into a bridge, hold, come down slowly.', 'Depuis le dos, monter en pont, tenir, redescendre lentement.', 'Aus der Rückenlage in die Brücke drücken, halten, langsam absenken.', 'other', false, 'vaulting', 'gymnastics', 6, '["8-10", "11-13", "14-16", "adult"]'::jsonb, '["mats"]'::jsonb WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE user_id IS NULL AND name = 'Bridge and back suppleness');
INSERT INTO exercises (user_id, name, name_fr, name_de, description, description_fr, description_de, muscle_group, is_custom, sport, theme, minutes, ages, gear) SELECT NULL, 'Forward and backward rolls', 'Roulades avant et arrière', 'Rolle vorwärts und rückwärts', 'Chin tucked, round back, hands placed: forward, then backward.', 'Menton rentré, dos rond, mains bien placées : avant, puis arrière.', 'Kinn zur Brust, runder Rücken, Hände richtig: vorwärts, dann rückwärts.', 'other', false, 'vaulting', 'gymnastics', 6, '["8-10", "11-13"]'::jsonb, '["mats"]'::jsonb WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE user_id IS NULL AND name = 'Forward and backward rolls');
INSERT INTO exercises (user_id, name, name_fr, name_de, description, description_fr, description_de, muscle_group, is_custom, sport, theme, minutes, ages, gear) SELECT NULL, 'Handstand against the wall', 'Équilibre sur les mains au mur', 'Handstand an der Wand', 'Kick up to the wall, body straight, shoulders open; come down with control.', 'Monter au mur, corps gainé, épaules ouvertes ; redescendre en contrôle.', 'An die Wand aufschwingen, Körper gestreckt, Schultern offen; kontrolliert ab.', 'other', false, 'vaulting', 'gymnastics', 6, '["11-13", "14-16", "adult"]'::jsonb, '["mats"]'::jsonb WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE user_id IS NULL AND name = 'Handstand against the wall');
INSERT INTO exercises (user_id, name, name_fr, name_de, description, description_fr, description_de, muscle_group, is_custom, sport, theme, minutes, ages, gear) SELECT NULL, 'Vault-on on the barrel', 'Montée au tonneau', 'Aufsprung am Holzpferd', 'Run in, grip the handles, swing the right leg high and land soft in the basic seat.', 'Course d’élan, saisir les poignées, lancer la jambe droite haute, arriver souple en assise.', 'Anlauf, Griffe fassen, rechtes Bein hoch schwingen, weich im Grundsitz landen.', 'other', false, 'vaulting', 'barrel', 8, '["8-10", "11-13", "14-16", "adult"]'::jsonb, '["barrel", "surcingle", "mats"]'::jsonb WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE user_id IS NULL AND name = 'Vault-on on the barrel');
INSERT INTO exercises (user_id, name, name_fr, name_de, description, description_fr, description_de, muscle_group, is_custom, sport, theme, minutes, ages, gear) SELECT NULL, 'Basic seat on the barrel', 'Assise de base au tonneau', 'Grundsitz am Holzpferd', 'Seated tall, arms out to the side at eye level, legs long; hold four counts.', 'Assis grand, bras à l’horizontale à hauteur des yeux, jambes longues ; tenir quatre temps.', 'Aufrecht sitzen, Arme seitlich auf Augenhöhe, Beine lang; vier Takte halten.', 'other', false, 'vaulting', 'barrel', 8, '["8-10", "11-13", "14-16", "adult"]'::jsonb, '["barrel", "surcingle"]'::jsonb WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE user_id IS NULL AND name = 'Basic seat on the barrel');
INSERT INTO exercises (user_id, name, name_fr, name_de, description, description_fr, description_de, muscle_group, is_custom, sport, theme, minutes, ages, gear) SELECT NULL, 'Flag on the barrel', 'Drapeau au tonneau', 'Fahne am Holzpferd', 'On knee and hand, the other arm and leg stretched in one line; hold four counts.', 'Sur un genou et une main, l’autre bras et la jambe tendus en ligne ; tenir quatre temps.', 'Auf Knie und Hand, anderer Arm und Bein in einer Linie gestreckt; vier Takte halten.', 'other', false, 'vaulting', 'barrel', 8, '["8-10", "11-13", "14-16", "adult"]'::jsonb, '["barrel", "surcingle", "mats"]'::jsonb WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE user_id IS NULL AND name = 'Flag on the barrel');
INSERT INTO exercises (user_id, name, name_fr, name_de, description, description_fr, description_de, muscle_group, is_custom, sport, theme, minutes, ages, gear) SELECT NULL, 'Mill on the barrel', 'Moulin au tonneau', 'Mühle am Holzpferd', 'Four leg passes, four counts each, the leg high and straight.', 'Quatre passages de jambe, quatre temps chacun, jambe haute et tendue.', 'Vier Beinüberschläge zu je vier Takten, Bein hoch und gestreckt.', 'other', false, 'vaulting', 'barrel', 8, '["8-10", "11-13", "14-16", "adult"]'::jsonb, '["barrel", "surcingle", "mats"]'::jsonb WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE user_id IS NULL AND name = 'Mill on the barrel');
INSERT INTO exercises (user_id, name, name_fr, name_de, description, description_fr, description_de, muscle_group, is_custom, sport, theme, minutes, ages, gear) SELECT NULL, 'Scissors on the barrel', 'Ciseaux au tonneau', 'Schere am Holzpferd', 'Swing up, cross the legs at the top, land facing backward; then the way back.', 'Élan, croiser les jambes en haut, arriver face arrière ; puis le retour.', 'Aufschwingen, Beine oben kreuzen, rückwärts landen; dann zurück.', 'other', false, 'vaulting', 'barrel', 10, '["11-13", "14-16", "adult"]'::jsonb, '["barrel", "surcingle", "mats"]'::jsonb WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE user_id IS NULL AND name = 'Scissors on the barrel');
INSERT INTO exercises (user_id, name, name_fr, name_de, description, description_fr, description_de, muscle_group, is_custom, sport, theme, minutes, ages, gear) SELECT NULL, 'Stand on the barrel', 'Debout au tonneau', 'Stehen am Holzpferd', 'From kneeling, stand up in one move, knees soft, arms out; hold four counts.', 'Depuis à genoux, se lever d’un trait, genoux souples, bras ouverts ; tenir quatre temps.', 'Aus dem Knien in einem Zug aufstehen, Knie weich, Arme seitlich; vier Takte halten.', 'other', false, 'vaulting', 'barrel', 8, '["8-10", "11-13", "14-16", "adult"]'::jsonb, '["barrel", "surcingle", "mats"]'::jsonb WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE user_id IS NULL AND name = 'Stand on the barrel');
INSERT INTO exercises (user_id, name, name_fr, name_de, description, description_fr, description_de, muscle_group, is_custom, sport, theme, minutes, ages, gear) SELECT NULL, 'Flank on the barrel', 'Sortie en flanc au tonneau', 'Flanke am Holzpferd', 'Swing up, hips high, then flank off and land on both feet facing forward.', 'Élan, bassin haut, puis sortie en flanc et réception sur les deux pieds face avant.', 'Aufschwingen, Hüfte hoch, dann Flanke ab und auf beiden Füßen vorwärts landen.', 'other', false, 'vaulting', 'barrel', 10, '["11-13", "14-16", "adult"]'::jsonb, '["barrel", "surcingle", "mats"]'::jsonb WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE user_id IS NULL AND name = 'Flank on the barrel');
INSERT INTO exercises (user_id, name, name_fr, name_de, description, description_fr, description_de, muscle_group, is_custom, sport, theme, minutes, ages, gear) SELECT NULL, 'Compulsories at walk', 'Imposés au pas', 'Pflicht im Schritt', 'The compulsory exercises on the horse at walk, one vaulter after the other.', 'Les exercices imposés sur le cheval au pas, un voltigeur après l’autre.', 'Die Pflichtübungen auf dem Pferd im Schritt, ein Voltigierer nach dem anderen.', 'other', false, 'vaulting', 'compulsory', 15, '["8-10", "11-13", "14-16", "adult"]'::jsonb, '["horse", "surcingle", "lunge_line", "lunge_whip"]'::jsonb WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE user_id IS NULL AND name = 'Compulsories at walk');
INSERT INTO exercises (user_id, name, name_fr, name_de, description, description_fr, description_de, muscle_group, is_custom, sport, theme, minutes, ages, gear) SELECT NULL, 'Compulsories at canter', 'Imposés au galop', 'Pflicht im Galopp', 'The compulsory test at canter, as in competition, with the coach''s marks.', 'Le test des imposés au galop, comme en compétition, avec les notes du coach.', 'Die Pflicht im Galopp wie im Wettkampf, mit den Noten des Trainers.', 'other', false, 'vaulting', 'compulsory', 15, '["11-13", "14-16", "adult"]'::jsonb, '["horse", "surcingle", "lunge_line", "lunge_whip"]'::jsonb WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE user_id IS NULL AND name = 'Compulsories at canter');
INSERT INTO exercises (user_id, name, name_fr, name_de, description, description_fr, description_de, muscle_group, is_custom, sport, theme, minutes, ages, gear) SELECT NULL, 'Freestyle figures on the barrel', 'Figures libres au tonneau', 'Kürübungen am Holzpferd', 'New figures learnt on the barrel first: how to get in, hold, get out.', 'Les nouvelles figures apprises d’abord au tonneau : l’entrée, la tenue, la sortie.', 'Neue Übungen zuerst am Holzpferd: hinein, halten, heraus.', 'other', false, 'vaulting', 'freestyle', 15, '["8-10", "11-13", "14-16", "adult"]'::jsonb, '["barrel", "surcingle", "mats"]'::jsonb WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE user_id IS NULL AND name = 'Freestyle figures on the barrel');
INSERT INTO exercises (user_id, name, name_fr, name_de, description, description_fr, description_de, muscle_group, is_custom, sport, theme, minutes, ages, gear) SELECT NULL, 'Freestyle run-through', 'Enchaînement du programme libre', 'Kür-Durchlauf', 'The whole freestyle on the horse, timed, then what to tidy up.', 'Le programme libre en entier sur le cheval, chronométré, puis ce qu’il faut reprendre.', 'Die ganze Kür auf dem Pferd, mit Zeit, dann was nachzubessern ist.', 'other', false, 'vaulting', 'freestyle', 15, '["14-16", "adult"]'::jsonb, '["horse", "surcingle", "lunge_line", "lunge_whip"]'::jsonb WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE user_id IS NULL AND name = 'Freestyle run-through');
INSERT INTO exercises (user_id, name, name_fr, name_de, description, description_fr, description_de, muscle_group, is_custom, sport, theme, minutes, ages, gear) SELECT NULL, 'Pair figures on the barrel', 'Figures en duo au tonneau', 'Doppelübungen am Holzpferd', 'Base and flyer: the grips, the holds and getting down safely.', 'Porteur et voltigeur porté : les prises, les tenues et la descente en sécurité.', 'Unten- und Obermann: Griffe, Halten und sicheres Abgehen.', 'other', false, 'vaulting', 'pairs', 10, '["11-13", "14-16", "adult"]'::jsonb, '["barrel", "surcingle", "mats"]'::jsonb WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE user_id IS NULL AND name = 'Pair figures on the barrel');
INSERT INTO exercises (user_id, name, name_fr, name_de, description, description_fr, description_de, muscle_group, is_custom, sport, theme, minutes, ages, gear) SELECT NULL, 'Turns on the horse at walk', 'Passages à cheval au pas', 'Durchgänge auf dem Pferd im Schritt', 'Each vaulter in turn: vault-on, a few figures, getting off; the horse calm and regular.', 'Chaque voltigeur à son tour : montée, quelques figures, descente ; le cheval calme et régulier.', 'Jeder der Reihe nach: Aufsprung, ein paar Übungen, Abgang; das Pferd ruhig und gleichmäßig.', 'other', false, 'vaulting', 'horse', 15, '["8-10", "11-13", "14-16", "adult"]'::jsonb, '["horse", "surcingle", "lunge_line", "lunge_whip"]'::jsonb WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE user_id IS NULL AND name = 'Turns on the horse at walk');
INSERT INTO exercises (user_id, name, name_fr, name_de, description, description_fr, description_de, muscle_group, is_custom, sport, theme, minutes, ages, gear) SELECT NULL, 'Running in to the horse', 'Course d’approche au cheval', 'Anlaufen zum Pferd', 'Running alongside at canter, in step with the horse, before the vault-on.', 'Course à côté du cheval au galop, dans sa cadence, avant la montée.', 'Neben dem Pferd im Galopp mitlaufen, im Takt, vor dem Aufsprung.', 'other', false, 'vaulting', 'horse', 10, '["11-13", "14-16", "adult"]'::jsonb, '["horse", "surcingle", "lunge_line", "lunge_whip"]'::jsonb WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE user_id IS NULL AND name = 'Running in to the horse');
INSERT INTO exercises (user_id, name, name_fr, name_de, description, description_fr, description_de, muscle_group, is_custom, sport, theme, minutes, ages, gear) SELECT NULL, 'Vaulter''s core holds', 'Gainage du voltigeur', 'Rumpfhalten für Voltigierer', 'Plank, side planks and hollow hold, the body in one line.', 'Planche, gainages latéraux et position creuse, le corps aligné.', 'Unterarmstütz, Seitstütz und Hohlkörper, der Körper in einer Linie.', 'core', false, 'vaulting', 'physical', 6, '["8-10", "11-13", "14-16", "adult"]'::jsonb, '["mats"]'::jsonb WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE user_id IS NULL AND name = 'Vaulter''s core holds');
INSERT INTO exercises (user_id, name, name_fr, name_de, description, description_fr, description_de, muscle_group, is_custom, sport, theme, minutes, ages, gear) SELECT NULL, 'Push-ups and dips', 'Pompes et dips', 'Liegestütze und Dips', 'The arms that carry the figures: push-ups, then dips on a bench.', 'Les bras qui portent les figures : pompes, puis dips sur un banc.', 'Die Arme, die die Übungen tragen: Liegestütze, dann Dips an einer Bank.', 'arms', false, 'vaulting', 'physical', 6, '["11-13", "14-16", "adult"]'::jsonb, '["mats"]'::jsonb WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE user_id IS NULL AND name = 'Push-ups and dips');
INSERT INTO exercises (user_id, name, name_fr, name_de, description, description_fr, description_de, muscle_group, is_custom, sport, theme, minutes, ages, gear) SELECT NULL, 'Vaulter''s stretches', 'Étirements du voltigeur', 'Dehnen für Voltigierer', 'Hips, back, shoulders and wrists, held without bouncing.', 'Hanches, dos, épaules et poignets, tenus sans à-coups.', 'Hüften, Rücken, Schultern und Handgelenke, ohne Wippen gehalten.', 'other', false, 'vaulting', 'cooldown', 5, '["8-10", "11-13", "14-16", "adult"]'::jsonb, '["mats"]'::jsonb WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE user_id IS NULL AND name = 'Vaulter''s stretches');
INSERT INTO exercises (user_id, name, name_fr, name_de, description, description_fr, description_de, muscle_group, is_custom, sport, theme, minutes, ages, gear) SELECT NULL, 'Thanking the horse', 'Remercier le cheval', 'Dem Pferd danken', 'Pats and a treat, then walking the horse to cool it down.', 'Caresses et friandise, puis marcher le cheval pour qu’il récupère.', 'Klopfen und ein Leckerli, dann das Pferd trockenführen.', 'other', false, 'vaulting', 'cooldown', 5, '["8-10", "11-13", "14-16", "adult"]'::jsonb, '["horse"]'::jsonb WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE user_id IS NULL AND name = 'Thanking the horse');
INSERT INTO exercises (user_id, name, name_fr, name_de, description, description_fr, description_de, muscle_group, is_custom, sport, theme, minutes, ages, gear) SELECT NULL, 'Vaulting wrap-up', 'Retour sur la séance de voltige', 'Nachbesprechung Voltigieren', 'Each vaulter says what went well and what to work on next time.', 'Chacun dit ce qui a bien marché et ce qu’il veut travailler la prochaine fois.', 'Jeder sagt, was gut lief und woran er nächstes Mal arbeiten will.', 'other', false, 'vaulting', 'cooldown', 3, '["8-10", "11-13", "14-16", "adult"]'::jsonb, '[]'::jsonb WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE user_id IS NULL AND name = 'Vaulting wrap-up');

-- An admin sets an exercise of the library for lessons (all null: not for lessons).
CREATE OR REPLACE FUNCTION admin_set_exercise_lesson(p_uuid TEXT, p_sport TEXT, p_theme TEXT, p_minutes INT, p_ages JSONB, p_gear JSONB)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS '
BEGIN
  IF NOT is_app_admin() THEN
    RAISE EXCEPTION ''Unauthorized: admin access required'';
  END IF;
  UPDATE exercises
     SET sport = NULLIF(p_sport, ''''),
         theme = NULLIF(p_theme, ''''),
         minutes = p_minutes,
         ages = CASE WHEN p_ages IS NULL OR p_ages = ''[]''::jsonb THEN NULL ELSE p_ages END,
         gear = CASE WHEN p_gear IS NULL OR p_gear = ''[]''::jsonb THEN NULL ELSE p_gear END,
         updated_at = now()
   WHERE id = p_uuid::uuid AND user_id IS NULL;
END;
';
REVOKE ALL ON FUNCTION admin_set_exercise_lesson(TEXT, TEXT, TEXT, INT, JSONB, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION admin_set_exercise_lesson(TEXT, TEXT, TEXT, INT, JSONB, JSONB) TO authenticated;

-- ─── 2. Lesson groups and their lessons ──────────────────────────

ALTER TABLE groups ADD COLUMN IF NOT EXISTS sport TEXT;
ALTER TABLE groups DROP CONSTRAINT IF EXISTS groups_kind_check;
UPDATE groups SET kind = 'lessons', sport = COALESCE(sport, 'tennis') WHERE kind = 'tennis';
ALTER TABLE groups ADD CONSTRAINT groups_kind_check CHECK (
  kind IN ('team', 'lessons')
  AND (sport IS NULL OR sport ~ '^[a-z0-9_-]{1,30}$')
  AND (age_band IS NULL OR age_band ~ '^[a-z0-9_-]{1,30}$')
  AND (level IS NULL OR level ~ '^[a-z0-9_-]{1,30}$')
  AND jsonb_typeof(slots) = 'array' AND jsonb_array_length(slots) <= 7
  AND (players IS NULL OR players BETWEEN 1 AND 40)
);

DO '
BEGIN
  IF to_regclass(''public.tennis_lessons'') IS NOT NULL AND to_regclass(''public.group_lessons'') IS NULL THEN
    ALTER TABLE tennis_lessons RENAME TO group_lessons;
  END IF;
END
';
ALTER TABLE group_lessons ADD COLUMN IF NOT EXISTS horse_id UUID REFERENCES horses(id) ON DELETE SET NULL;
ALTER TABLE group_lessons ADD COLUMN IF NOT EXISTS horse_session_id UUID REFERENCES horse_sessions(id) ON DELETE SET NULL;

-- The feature: "tennis" becomes "group_lessons"; a lesson group and its lessons need it.
UPDATE plans
SET features = (
  SELECT COALESCE(jsonb_agg(DISTINCT CASE WHEN f = 'tennis' THEN 'group_lessons' ELSE f END ORDER BY CASE WHEN f = 'tennis' THEN 'group_lessons' ELSE f END), '[]'::jsonb)
  FROM jsonb_array_elements_text(features) AS f
)
WHERE features ? 'tennis';

CREATE OR REPLACE FUNCTION enforce_group_lesson_rows()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS '
BEGIN
  IF NEW.deleted_at IS NOT NULL OR NEW.user_id IS NULL THEN
    RETURN NEW;
  END IF;
  PERFORM require_plan_feature(''group_lessons'');
  RETURN NEW;
END;
';
DROP TRIGGER IF EXISTS groups_tennis_plan ON groups;
DROP TRIGGER IF EXISTS groups_lessons_plan ON groups;
CREATE TRIGGER groups_lessons_plan BEFORE INSERT OR UPDATE ON groups
  FOR EACH ROW WHEN (NEW.kind = 'lessons') EXECUTE FUNCTION enforce_group_lesson_rows();
DROP TRIGGER IF EXISTS tennis_lessons_plan ON group_lessons;
DROP TRIGGER IF EXISTS group_lessons_plan ON group_lessons;
CREATE TRIGGER group_lessons_plan BEFORE INSERT OR UPDATE ON group_lessons FOR EACH ROW EXECUTE FUNCTION enforce_group_lesson_rows();
DROP FUNCTION IF EXISTS enforce_tennis_rows();

-- One's own lesson groups through a view (the teams' own rules loop when read directly, see 090).
DROP POLICY IF EXISTS "tennis_lessons_own_all" ON group_lessons;
DROP POLICY IF EXISTS "group_lessons_own_all" ON group_lessons;
DROP VIEW IF EXISTS tennis_groups;
CREATE OR REPLACE VIEW lesson_groups AS
  SELECT id, user_id, name, description, kind, sport, age_band, level, slots, players, archived_at, created_at, updated_at, deleted_at
  FROM groups
  WHERE kind = 'lessons' AND user_id = auth.uid() AND is_active_account()
WITH CASCADED CHECK OPTION;
REVOKE ALL ON lesson_groups FROM PUBLIC;
REVOKE ALL ON lesson_groups FROM anon;
GRANT SELECT, INSERT, UPDATE ON lesson_groups TO authenticated;

CREATE POLICY "group_lessons_own_all" ON group_lessons
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND (group_id IS NULL OR EXISTS (SELECT 1 FROM lesson_groups g WHERE g.id = group_id))
    AND (horse_id IS NULL OR EXISTS (SELECT 1 FROM horses h WHERE h.id = horse_id AND h.user_id = auth.uid()))
    AND (horse_session_id IS NULL OR EXISTS (SELECT 1 FROM horse_sessions s WHERE s.id = horse_session_id AND s.user_id = auth.uid()))
  );

-- ─── 3. The reference ───────────────────────────────────────────

INSERT INTO app_settings (key, value)
SELECT 'group_lessons', jsonb_build_object('sports', jsonb_build_array(
  '{"id": "tennis", "fr": "Tennis", "en": "Tennis", "de": "Tennis", "horses": false, "themes": [{"id": "warmup", "fr": "Échauffement", "en": "Warm-up", "de": "Aufwärmen", "core": false}, {"id": "footwork", "fr": "Jeu de jambes", "en": "Footwork", "de": "Beinarbeit", "core": true}, {"id": "forehand", "fr": "Coup droit", "en": "Forehand", "de": "Vorhand", "core": true}, {"id": "backhand", "fr": "Revers", "en": "Backhand", "de": "Rückhand", "core": true}, {"id": "serve", "fr": "Service", "en": "Serve", "de": "Aufschlag", "core": true}, {"id": "return", "fr": "Retour", "en": "Return", "de": "Return", "core": true}, {"id": "volley", "fr": "Volée et smash", "en": "Volley and overhead", "de": "Volley und Schmetterball", "core": true}, {"id": "play", "fr": "Jeu et points", "en": "Play and points", "de": "Spiel und Punkte", "core": false}, {"id": "games", "fr": "Jeux", "en": "Games", "de": "Spiele", "core": false}, {"id": "physical", "fr": "Physique", "en": "Physical", "de": "Athletik", "core": false}, {"id": "cooldown", "fr": "Retour au calme", "en": "Cool-down", "de": "Cool-down", "core": false}], "ageBands": [{"id": "8-10", "fr": "8-10 ans", "en": "Ages 8-10", "de": "8-10 Jahre"}, {"id": "11-13", "fr": "11-13 ans", "en": "Ages 11-13", "de": "11-13 Jahre"}, {"id": "14-16", "fr": "14-16 ans", "en": "Ages 14-16", "de": "14-16 Jahre"}, {"id": "adult", "fr": "Adultes", "en": "Adults", "de": "Erwachsene"}], "levels": [{"id": "beginner", "fr": "Débutant", "en": "Beginner", "de": "Anfänger"}, {"id": "intermediate", "fr": "Intermédiaire", "en": "Intermediate", "de": "Fortgeschritten"}, {"id": "competition", "fr": "Compétition", "en": "Competition", "de": "Wettkampf"}], "equipment": [{"id": "balls", "fr": "Balles", "en": "Balls", "de": "Bälle"}, {"id": "bands", "fr": "Élastiques", "en": "Bands", "de": "Bänder"}, {"id": "cones", "fr": "Plots", "en": "Cones", "de": "Hütchen"}, {"id": "hoops", "fr": "Cerceaux", "en": "Hoops", "de": "Reifen"}, {"id": "ladder", "fr": "Échelle de rythme", "en": "Agility ladder", "de": "Koordinationsleiter"}, {"id": "medicine_ball", "fr": "Médecine-ball", "en": "Medicine ball", "de": "Medizinball"}, {"id": "rope", "fr": "Corde à sauter", "en": "Jump rope", "de": "Springseil"}, {"id": "targets", "fr": "Cibles", "en": "Targets", "de": "Ziele"}]}'::jsonb || COALESCE((SELECT value::jsonb FROM app_settings WHERE key = 'tennis_reference'), '{}'::jsonb),
  '{"id": "vaulting", "fr": "Voltige", "en": "Vaulting", "de": "Voltigieren", "horses": true, "themes": [{"id": "warmup", "fr": "Échauffement", "en": "Warm-up", "de": "Aufwärmen", "core": false}, {"id": "gymnastics", "fr": "Gym et souplesse", "en": "Gymnastics and suppleness", "de": "Turnen und Beweglichkeit", "core": true}, {"id": "barrel", "fr": "Tonneau", "en": "Barrel", "de": "Holzpferd", "core": true}, {"id": "compulsory", "fr": "Imposés", "en": "Compulsories", "de": "Pflicht", "core": true}, {"id": "freestyle", "fr": "Programme libre", "en": "Freestyle", "de": "Kür", "core": true}, {"id": "pairs", "fr": "Duos", "en": "Pairs", "de": "Doppel", "core": false}, {"id": "horse", "fr": "Travail à cheval", "en": "On the horse", "de": "Auf dem Pferd", "core": true}, {"id": "physical", "fr": "Physique", "en": "Physical", "de": "Athletik", "core": false}, {"id": "cooldown", "fr": "Retour au calme", "en": "Cool-down", "de": "Cool-down", "core": false}], "ageBands": [{"id": "8-10", "fr": "8-10 ans", "en": "Ages 8-10", "de": "8-10 Jahre"}, {"id": "11-13", "fr": "11-13 ans", "en": "Ages 11-13", "de": "11-13 Jahre"}, {"id": "14-16", "fr": "14-16 ans", "en": "Ages 14-16", "de": "14-16 Jahre"}, {"id": "adult", "fr": "Adultes", "en": "Adults", "de": "Erwachsene"}], "levels": [{"id": "beginner", "fr": "Débutant", "en": "Beginner", "de": "Anfänger"}, {"id": "intermediate", "fr": "Intermédiaire", "en": "Intermediate", "de": "Fortgeschritten"}, {"id": "competition", "fr": "Compétition", "en": "Competition", "de": "Wettkampf"}], "equipment": [{"id": "barrel", "fr": "Tonneau", "en": "Barrel", "de": "Holzpferd"}, {"id": "mats", "fr": "Tapis", "en": "Mats", "de": "Matten"}, {"id": "surcingle", "fr": "Surfaix", "en": "Surcingle", "de": "Voltigiergurt"}, {"id": "lunge_line", "fr": "Longe", "en": "Lunge line", "de": "Longe"}, {"id": "lunge_whip", "fr": "Chambrière", "en": "Lunge whip", "de": "Longierpeitsche"}, {"id": "horse", "fr": "Cheval", "en": "Horse", "de": "Pferd"}]}'::jsonb
))::text
ON CONFLICT (key) DO NOTHING;
DELETE FROM app_settings WHERE key = 'tennis_reference';

COMMIT;

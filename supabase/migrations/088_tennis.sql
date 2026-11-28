-- 088_tennis.sql
-- A tennis coach's notebook: one's groups, a library of drills, and the
-- lessons prepared then given, week after week. Nothing about the players
-- themselves: a group says its age band and how many play in it, never who.
--   tennis_groups   a coach's groups: name, age band, level, weekly slots
--   tennis_drills   the drills: the library (user_id NULL, kept by an admin)
--                   and a coach's own
--   tennis_lessons  a lesson of a group on a day: its theme and drills with
--                   their minutes; once given, how many came, how hard it
--                   was (1 to 5) and a note
-- A feature of its own, "tennis", given to every licence (untick it on the
-- admin page) and checked by the server on what is saved.
-- The library's 35 drills, in English, French and German, for the coach to
-- review; an admin edits them in the app (Tennis > Drills).
-- Apply this file first, then the code.
-- Plain quotes only; safe to run again. All-or-nothing: one transaction.

BEGIN;

CREATE TABLE IF NOT EXISTS tennis_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  age_band TEXT,
  level TEXT,
  slots JSONB NOT NULL DEFAULT '[]'::jsonb,
  players INT,
  notes TEXT,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT tennis_groups_check CHECK (
    char_length(name) BETWEEN 1 AND 60
    AND (age_band IS NULL OR age_band IN ('8-10', '11-13', '14-16', 'adult'))
    AND (level IS NULL OR level IN ('beginner', 'intermediate', 'competition'))
    AND jsonb_typeof(slots) = 'array' AND jsonb_array_length(slots) <= 7
    AND (players IS NULL OR players BETWEEN 1 AND 40)
    AND (notes IS NULL OR char_length(notes) <= 1000)
  )
);
CREATE INDEX IF NOT EXISTS idx_tennis_groups_user ON tennis_groups(user_id, updated_at);

CREATE TABLE IF NOT EXISTS tennis_drills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  name_fr TEXT,
  name_de TEXT,
  description TEXT,
  description_fr TEXT,
  description_de TEXT,
  category TEXT NOT NULL,
  minutes INT NOT NULL DEFAULT 10,
  ages JSONB NOT NULL DEFAULT '[]'::jsonb,
  equipment JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT tennis_drills_check CHECK (
    char_length(name) BETWEEN 1 AND 80
    AND (name_fr IS NULL OR char_length(name_fr) <= 80)
    AND (name_de IS NULL OR char_length(name_de) <= 80)
    AND (description IS NULL OR char_length(description) <= 500)
    AND (description_fr IS NULL OR char_length(description_fr) <= 500)
    AND (description_de IS NULL OR char_length(description_de) <= 500)
    AND category IN ('warmup', 'footwork', 'forehand', 'backhand', 'serve', 'return', 'volley', 'play', 'games', 'physical', 'cooldown')
    AND minutes BETWEEN 1 AND 60
    AND jsonb_typeof(ages) = 'array' AND ages <@ '["8-10", "11-13", "14-16", "adult"]'::jsonb
    AND jsonb_typeof(equipment) = 'array' AND equipment <@ '["balls", "bands", "cones", "hoops", "ladder", "medicine_ball", "rope", "targets"]'::jsonb
  )
);
CREATE INDEX IF NOT EXISTS idx_tennis_drills_user ON tennis_drills(user_id, updated_at);
CREATE UNIQUE INDEX IF NOT EXISTS tennis_drills_library_name ON tennis_drills(name) WHERE user_id IS NULL;

CREATE TABLE IF NOT EXISTS tennis_lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  group_id UUID REFERENCES tennis_groups(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  theme TEXT,
  plan JSONB NOT NULL DEFAULT '[]'::jsonb,
  given_at TIMESTAMPTZ,
  present INT,
  intensity SMALLINT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT tennis_lessons_check CHECK (
    (theme IS NULL OR char_length(theme) <= 120)
    AND jsonb_typeof(plan) = 'array' AND jsonb_array_length(plan) <= 40
    AND (present IS NULL OR present BETWEEN 0 AND 40)
    AND (intensity IS NULL OR intensity BETWEEN 1 AND 5)
    AND (notes IS NULL OR char_length(notes) <= 2000)
  )
);
CREATE INDEX IF NOT EXISTS idx_tennis_lessons_user ON tennis_lessons(user_id, updated_at);

DROP TRIGGER IF EXISTS trg_tennis_groups_updated ON tennis_groups;
CREATE TRIGGER trg_tennis_groups_updated BEFORE UPDATE ON tennis_groups FOR EACH ROW EXECUTE FUNCTION update_updated_at();
DROP TRIGGER IF EXISTS trg_tennis_drills_updated ON tennis_drills;
CREATE TRIGGER trg_tennis_drills_updated BEFORE UPDATE ON tennis_drills FOR EACH ROW EXECUTE FUNCTION update_updated_at();
DROP TRIGGER IF EXISTS trg_tennis_lessons_updated ON tennis_lessons;
CREATE TRIGGER trg_tennis_lessons_updated BEFORE UPDATE ON tennis_lessons FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Who sees what: one's own groups, lessons and drills; the library for all.
ALTER TABLE tennis_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE tennis_drills ENABLE ROW LEVEL SECURITY;
ALTER TABLE tennis_lessons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tennis_groups_own_all" ON tennis_groups;
CREATE POLICY "tennis_groups_own_all" ON tennis_groups
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "tennis_lessons_own_all" ON tennis_lessons;
CREATE POLICY "tennis_lessons_own_all" ON tennis_lessons
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND (group_id IS NULL OR EXISTS (SELECT 1 FROM tennis_groups g WHERE g.id = group_id AND g.user_id = auth.uid()))
  );

DROP POLICY IF EXISTS "tennis_drills_read" ON tennis_drills;
CREATE POLICY "tennis_drills_read" ON tennis_drills FOR SELECT USING (user_id IS NULL OR auth.uid() = user_id);
DROP POLICY IF EXISTS "tennis_drills_insert_own" ON tennis_drills;
CREATE POLICY "tennis_drills_insert_own" ON tennis_drills FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "tennis_drills_update_own" ON tennis_drills;
CREATE POLICY "tennis_drills_update_own" ON tennis_drills FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "tennis_drills_delete_own" ON tennis_drills;
CREATE POLICY "tennis_drills_delete_own" ON tennis_drills FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "active_account_only" ON tennis_groups;
CREATE POLICY "active_account_only" ON tennis_groups AS RESTRICTIVE FOR ALL TO authenticated
  USING ((SELECT is_active_account())) WITH CHECK ((SELECT is_active_account()));
DROP POLICY IF EXISTS "active_account_only" ON tennis_drills;
CREATE POLICY "active_account_only" ON tennis_drills AS RESTRICTIVE FOR ALL TO authenticated
  USING ((SELECT is_active_account())) WITH CHECK ((SELECT is_active_account()));
DROP POLICY IF EXISTS "active_account_only" ON tennis_lessons;
CREATE POLICY "active_account_only" ON tennis_lessons AS RESTRICTIVE FOR ALL TO authenticated
  USING ((SELECT is_active_account())) WITH CHECK ((SELECT is_active_account()));

-- The feature: on every licence, checked on what is saved (deleting stays possible).
UPDATE plans
SET features = (
  SELECT COALESCE(jsonb_agg(DISTINCT f ORDER BY f), '[]'::jsonb)
  FROM jsonb_array_elements_text(COALESCE(features, '[]'::jsonb) || '["tennis"]'::jsonb) AS f
)
WHERE NOT (COALESCE(features, '[]'::jsonb) ? 'tennis');

CREATE OR REPLACE FUNCTION enforce_tennis_rows()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS '
BEGIN
  -- Deleted, or the library (an admin, through admin_save_tennis_drill): no licence needed.
  IF NEW.deleted_at IS NOT NULL OR NEW.user_id IS NULL THEN
    RETURN NEW;
  END IF;
  PERFORM require_plan_feature(''tennis'');
  RETURN NEW;
END;
';

DROP TRIGGER IF EXISTS tennis_groups_plan ON tennis_groups;
CREATE TRIGGER tennis_groups_plan BEFORE INSERT OR UPDATE ON tennis_groups FOR EACH ROW EXECUTE FUNCTION enforce_tennis_rows();
DROP TRIGGER IF EXISTS tennis_drills_plan ON tennis_drills;
CREATE TRIGGER tennis_drills_plan BEFORE INSERT OR UPDATE ON tennis_drills FOR EACH ROW EXECUTE FUNCTION enforce_tennis_rows();
DROP TRIGGER IF EXISTS tennis_lessons_plan ON tennis_lessons;
CREATE TRIGGER tennis_lessons_plan BEFORE INSERT OR UPDATE ON tennis_lessons FOR EACH ROW EXECUTE FUNCTION enforce_tennis_rows();

-- An admin keeps the library: adds a drill (no id), changes one, or removes it.
CREATE OR REPLACE FUNCTION admin_save_tennis_drill(p_uuid TEXT, p_drill JSONB)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS '
DECLARE v_id UUID;
BEGIN
  IF NOT is_app_admin() THEN
    RAISE EXCEPTION ''Unauthorized: admin access required'';
  END IF;
  IF p_uuid IS NULL THEN
    INSERT INTO tennis_drills (user_id, name, name_fr, name_de, description, description_fr, description_de, category, minutes, ages, equipment)
    VALUES (NULL, p_drill->>''name'', NULLIF(p_drill->>''name_fr'', ''''), NULLIF(p_drill->>''name_de'', ''''),
            NULLIF(p_drill->>''description'', ''''), NULLIF(p_drill->>''description_fr'', ''''), NULLIF(p_drill->>''description_de'', ''''),
            p_drill->>''category'', COALESCE((p_drill->>''minutes'')::int, 10),
            COALESCE(p_drill->''ages'', ''[]''::jsonb), COALESCE(p_drill->''equipment'', ''[]''::jsonb))
    RETURNING id INTO v_id;
    RETURN v_id;
  END IF;
  UPDATE tennis_drills SET
    name = p_drill->>''name'',
    name_fr = NULLIF(p_drill->>''name_fr'', ''''),
    name_de = NULLIF(p_drill->>''name_de'', ''''),
    description = NULLIF(p_drill->>''description'', ''''),
    description_fr = NULLIF(p_drill->>''description_fr'', ''''),
    description_de = NULLIF(p_drill->>''description_de'', ''''),
    category = p_drill->>''category'',
    minutes = COALESCE((p_drill->>''minutes'')::int, 10),
    ages = COALESCE(p_drill->''ages'', ''[]''::jsonb),
    equipment = COALESCE(p_drill->''equipment'', ''[]''::jsonb),
    deleted_at = CASE WHEN (p_drill->>''deleted'')::boolean THEN now() ELSE NULL END
  WHERE id = p_uuid::uuid AND user_id IS NULL
  RETURNING id INTO v_id;
  RETURN v_id;
END;
';
REVOKE ALL ON FUNCTION admin_save_tennis_drill(TEXT, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION admin_save_tennis_drill(TEXT, JSONB) TO authenticated;

-- The library.
INSERT INTO tennis_drills (user_id, name, name_fr, name_de, description, description_fr, description_de, category, minutes, ages, equipment) VALUES (NULL, 'Dynamic warm-up', 'Échauffement dynamique', 'Dynamisches Aufwärmen', 'Jog, side steps, high knees, heel kicks and arm circles, a lap of each.', 'Footing, pas chassés, montées de genoux, talons-fesses et moulinets de bras, un tour de chaque.', 'Laufen, Sidesteps, Kniehebelauf, Anfersen und Armkreisen, je eine Runde.', 'warmup', 8, '["8-10", "11-13", "14-16", "adult"]'::jsonb, '[]'::jsonb) ON CONFLICT (name) WHERE user_id IS NULL DO NOTHING;
INSERT INTO tennis_drills (user_id, name, name_fr, name_de, description, description_fr, description_de, category, minutes, ages, equipment) VALUES (NULL, 'Mini-tennis', 'Mini-tennis', 'Kleinfeld-Tennis', 'Soft rallies inside the service boxes, ball under control.', 'Échanges doux dans les carrés de service, la balle sous contrôle.', 'Ruhige Ballwechsel in den Aufschlagfeldern, Ball unter Kontrolle.', 'warmup', 10, '["8-10", "11-13", "14-16", "adult"]'::jsonb, '["balls"]'::jsonb) ON CONFLICT (name) WHERE user_id IS NULL DO NOTHING;
INSERT INTO tennis_drills (user_id, name, name_fr, name_de, description, description_fr, description_de, category, minutes, ages, equipment) VALUES (NULL, 'Throw and catch', 'Lancer-attraper', 'Werfen und Fangen', 'In pairs, throw the ball with a bounce and catch it, one hand then the other.', 'En binôme, lancer la balle avec un rebond et l’attraper, une main puis l’autre.', 'Zu zweit den Ball mit Aufsprung zuwerfen und fangen, erst mit einer, dann mit der anderen Hand.', 'warmup', 6, '["8-10", "11-13"]'::jsonb, '["balls"]'::jsonb) ON CONFLICT (name) WHERE user_id IS NULL DO NOTHING;
INSERT INTO tennis_drills (user_id, name, name_fr, name_de, description, description_fr, description_de, category, minutes, ages, equipment) VALUES (NULL, 'Split-step and go', 'Split-step et départ', 'Split-Step und Start', 'A small jump as the coach hits or points, then a quick start to the side shown.', 'Petit saut d’appel au signal du coach, puis départ rapide du côté indiqué.', 'Kleiner Sprung beim Signal des Trainers, dann schneller Start zur angezeigten Seite.', 'footwork', 8, '["8-10", "11-13", "14-16", "adult"]'::jsonb, '[]'::jsonb) ON CONFLICT (name) WHERE user_id IS NULL DO NOTHING;
INSERT INTO tennis_drills (user_id, name, name_fr, name_de, description, description_fr, description_de, category, minutes, ages, equipment) VALUES (NULL, 'Agility ladder', 'Échelle de rythme', 'Koordinationsleiter', 'Quick feet through the ladder: one foot, two feet, sideways, in and out.', 'Pieds rapides dans l’échelle : un pied, deux pieds, de côté, dedans-dehors.', 'Schnelle Füße durch die Leiter: ein Fuß, zwei Füße, seitlich, rein und raus.', 'footwork', 8, '["8-10", "11-13", "14-16", "adult"]'::jsonb, '["ladder"]'::jsonb) ON CONFLICT (name) WHERE user_id IS NULL DO NOTHING;
INSERT INTO tennis_drills (user_id, name, name_fr, name_de, description, description_fr, description_de, category, minutes, ages, equipment) VALUES (NULL, 'Side shuffle between cones', 'Pas chassés entre plots', 'Sidesteps zwischen Hütchen', 'Side steps between two cones 3 m apart, low, without crossing the feet.', 'Pas chassés entre deux plots à 3 m, bas sur les jambes, sans croiser les pieds.', 'Sidesteps zwischen zwei Hütchen im Abstand von 3 m, tief, ohne die Füße zu kreuzen.', 'footwork', 6, '["8-10", "11-13", "14-16", "adult"]'::jsonb, '["cones"]'::jsonb) ON CONFLICT (name) WHERE user_id IS NULL DO NOTHING;
INSERT INTO tennis_drills (user_id, name, name_fr, name_de, description, description_fr, description_de, category, minutes, ages, equipment) VALUES (NULL, 'Spider run', 'Course de l’araignée', 'Spinnenlauf', 'Five balls on the lines: bring them back one by one to the centre mark, timed.', 'Cinq balles sur les lignes : les ramener une à une à la marque centrale, chronométré.', 'Fünf Bälle auf den Linien: einzeln zur Mittelmarkierung zurückbringen, auf Zeit.', 'footwork', 6, '["11-13", "14-16", "adult"]'::jsonb, '["balls"]'::jsonb) ON CONFLICT (name) WHERE user_id IS NULL DO NOTHING;
INSERT INTO tennis_drills (user_id, name, name_fr, name_de, description, description_fr, description_de, category, minutes, ages, equipment) VALUES (NULL, 'Hit and recover', 'Frapper et se replacer', 'Schlagen und zurück', 'After each shot, back to the centre with side steps before the next ball.', 'Après chaque frappe, retour au centre en pas chassés avant la balle suivante.', 'Nach jedem Schlag mit Sidesteps zurück zur Mitte vor dem nächsten Ball.', 'footwork', 8, '["11-13", "14-16", "adult"]'::jsonb, '["balls"]'::jsonb) ON CONFLICT (name) WHERE user_id IS NULL DO NOTHING;
INSERT INTO tennis_drills (user_id, name, name_fr, name_de, description, description_fr, description_de, category, minutes, ages, equipment) VALUES (NULL, 'Forehand from the basket', 'Coup droit au panier', 'Vorhand aus dem Korb', 'The coach feeds, the player hits cross-court forehands, then joins the queue.', 'Le coach distribue, le joueur frappe en coup droit croisé puis repasse dans la file.', 'Der Trainer spielt zu, der Spieler schlägt Vorhand cross und stellt sich wieder an.', 'forehand', 10, '["8-10", "11-13", "14-16", "adult"]'::jsonb, '["balls"]'::jsonb) ON CONFLICT (name) WHERE user_id IS NULL DO NOTHING;
INSERT INTO tennis_drills (user_id, name, name_fr, name_de, description, description_fr, description_de, category, minutes, ages, equipment) VALUES (NULL, 'Cross-court forehand rally', 'Échange croisé en coup droit', 'Vorhand-Crossduell', 'Two players rally cross-court on forehands, aiming past the service line.', 'Deux joueurs échangent en coup droit croisé, en visant derrière la ligne de service.', 'Zwei Spieler spielen Vorhand cross, Ziel hinter der Aufschlaglinie.', 'forehand', 10, '["11-13", "14-16", "adult"]'::jsonb, '["balls"]'::jsonb) ON CONFLICT (name) WHERE user_id IS NULL DO NOTHING;
INSERT INTO tennis_drills (user_id, name, name_fr, name_de, description, description_fr, description_de, category, minutes, ages, equipment) VALUES (NULL, 'Forehand to targets', 'Coup droit sur cibles', 'Vorhand auf Ziele', 'Hit forehands at hoops or cones in the court; a point for each target.', 'Coups droits sur des cerceaux ou des plots dans le court ; un point par cible touchée.', 'Vorhand auf Reifen oder Hütchen im Feld; ein Punkt pro getroffenem Ziel.', 'forehand', 10, '["8-10", "11-13", "14-16", "adult"]'::jsonb, '["balls", "targets"]'::jsonb) ON CONFLICT (name) WHERE user_id IS NULL DO NOTHING;
INSERT INTO tennis_drills (user_id, name, name_fr, name_de, description, description_fr, description_de, category, minutes, ages, equipment) VALUES (NULL, 'Backhand from the basket', 'Revers au panier', 'Rückhand aus dem Korb', 'The coach feeds to the backhand, the player hits cross-court then joins the queue.', 'Le coach distribue côté revers, le joueur frappe croisé puis repasse dans la file.', 'Der Trainer spielt auf die Rückhand, der Spieler schlägt cross und stellt sich wieder an.', 'backhand', 10, '["8-10", "11-13", "14-16", "adult"]'::jsonb, '["balls"]'::jsonb) ON CONFLICT (name) WHERE user_id IS NULL DO NOTHING;
INSERT INTO tennis_drills (user_id, name, name_fr, name_de, description, description_fr, description_de, category, minutes, ages, equipment) VALUES (NULL, 'Cross-court backhand rally', 'Échange croisé en revers', 'Rückhand-Crossduell', 'Two players rally cross-court on backhands, steady before fast.', 'Deux joueurs échangent en revers croisé, la régularité avant la vitesse.', 'Zwei Spieler spielen Rückhand cross, erst sicher, dann schnell.', 'backhand', 10, '["11-13", "14-16", "adult"]'::jsonb, '["balls"]'::jsonb) ON CONFLICT (name) WHERE user_id IS NULL DO NOTHING;
INSERT INTO tennis_drills (user_id, name, name_fr, name_de, description, description_fr, description_de, category, minutes, ages, equipment) VALUES (NULL, 'Backhand down the line', 'Revers le long de la ligne', 'Rückhand longline', 'From a cross-court rally, change to down the line on the coach’s call.', 'Depuis un échange croisé, changer le long de la ligne à l’appel du coach.', 'Aus dem Crossduell auf Zuruf des Trainers longline spielen.', 'backhand', 10, '["14-16", "adult"]'::jsonb, '["balls"]'::jsonb) ON CONFLICT (name) WHERE user_id IS NULL DO NOTHING;
INSERT INTO tennis_drills (user_id, name, name_fr, name_de, description, description_fr, description_de, category, minutes, ages, equipment) VALUES (NULL, 'The ball toss', 'Le lancer de balle', 'Der Ballwurf', 'Toss the ball and let it fall into a hoop in front of the front foot, no hit.', 'Lancer la balle et la laisser retomber dans un cerceau devant le pied avant, sans frapper.', 'Den Ball hochwerfen und in einen Reifen vor dem vorderen Fuß fallen lassen, ohne Schlag.', 'serve', 6, '["8-10", "11-13", "14-16", "adult"]'::jsonb, '["hoops", "balls"]'::jsonb) ON CONFLICT (name) WHERE user_id IS NULL DO NOTHING;
INSERT INTO tennis_drills (user_id, name, name_fr, name_de, description, description_fr, description_de, category, minutes, ages, equipment) VALUES (NULL, 'Serve from the service line', 'Service depuis la ligne de service', 'Aufschlag von der Aufschlaglinie', 'Start the serve racket on the back, from the service line, then step back.', 'Servir raquette déjà dans le dos, depuis la ligne de service, puis reculer peu à peu.', 'Aufschlag mit dem Schläger schon im Rücken, von der Aufschlaglinie, dann Schritt für Schritt zurück.', 'serve', 10, '["8-10", "11-13"]'::jsonb, '["balls"]'::jsonb) ON CONFLICT (name) WHERE user_id IS NULL DO NOTHING;
INSERT INTO tennis_drills (user_id, name, name_fr, name_de, description, description_fr, description_de, category, minutes, ages, equipment) VALUES (NULL, 'Serve to targets', 'Service sur cibles', 'Aufschlag auf Ziele', 'Serve at cones in the corners of the service box: wide, body, T.', 'Servir sur des plots aux coins du carré : extérieur, corps, centre.', 'Aufschlag auf Hütchen in den Ecken des Feldes: außen, Körper, Mitte.', 'serve', 10, '["11-13", "14-16", "adult"]'::jsonb, '["balls", "targets"]'::jsonb) ON CONFLICT (name) WHERE user_id IS NULL DO NOTHING;
INSERT INTO tennis_drills (user_id, name, name_fr, name_de, description, description_fr, description_de, category, minutes, ages, equipment) VALUES (NULL, 'Serve and first ball', 'Service et première balle', 'Aufschlag und erster Ball', 'Serve, then play the first ball the coach sends back to the open court.', 'Servir, puis jouer la première balle renvoyée par le coach vers le côté ouvert.', 'Aufschlagen, dann den ersten Ball vom Trainer ins offene Feld spielen.', 'serve', 10, '["14-16", "adult"]'::jsonb, '["balls"]'::jsonb) ON CONFLICT (name) WHERE user_id IS NULL DO NOTHING;
INSERT INTO tennis_drills (user_id, name, name_fr, name_de, description, description_fr, description_de, category, minutes, ages, equipment) VALUES (NULL, 'Return of serve', 'Retour de service', 'Return', 'Short swing, ball in front: block the serve back deep into the court.', 'Geste court, balle devant soi : bloquer le service et le renvoyer profond.', 'Kurze Bewegung, Ball vor dem Körper: den Aufschlag tief zurückblocken.', 'return', 10, '["11-13", "14-16", "adult"]'::jsonb, '["balls"]'::jsonb) ON CONFLICT (name) WHERE user_id IS NULL DO NOTHING;
INSERT INTO tennis_drills (user_id, name, name_fr, name_de, description, description_fr, description_de, category, minutes, ages, equipment) VALUES (NULL, 'Volley catch', 'Volée attrapée', 'Volley fangen', 'In the volley stance, catch the ball with the hand, in front of the body.', 'En position de volée, attraper la balle à la main, devant le corps.', 'In Volleystellung den Ball mit der Hand vor dem Körper fangen.', 'volley', 6, '["8-10"]'::jsonb, '["balls"]'::jsonb) ON CONFLICT (name) WHERE user_id IS NULL DO NOTHING;
INSERT INTO tennis_drills (user_id, name, name_fr, name_de, description, description_fr, description_de, category, minutes, ages, equipment) VALUES (NULL, 'Volleys at the net', 'Volées au filet', 'Volleys am Netz', 'The coach feeds at the net: forehand then backhand volleys, short swing.', 'Le coach distribue au filet : volées de coup droit puis de revers, geste court.', 'Der Trainer spielt am Netz zu: Vorhand- dann Rückhandvolley, kurze Bewegung.', 'volley', 10, '["8-10", "11-13", "14-16", "adult"]'::jsonb, '["balls"]'::jsonb) ON CONFLICT (name) WHERE user_id IS NULL DO NOTHING;
INSERT INTO tennis_drills (user_id, name, name_fr, name_de, description, description_fr, description_de, category, minutes, ages, equipment) VALUES (NULL, 'Approach and volley', 'Montée au filet', 'Netzangriff', 'A short ball to attack, move in, split-step, then volley to finish the point.', 'Une balle courte à attaquer, avancer, split-step puis volée pour finir le point.', 'Einen kurzen Ball angreifen, vorrücken, Split-Step, dann Volley zum Punktgewinn.', 'volley', 10, '["11-13", "14-16", "adult"]'::jsonb, '["balls"]'::jsonb) ON CONFLICT (name) WHERE user_id IS NULL DO NOTHING;
INSERT INTO tennis_drills (user_id, name, name_fr, name_de, description, description_fr, description_de, category, minutes, ages, equipment) VALUES (NULL, 'Overhead', 'Smash', 'Schmetterball', 'Turn sideways, point at the ball with the free hand, hit high and in front.', 'Se placer de profil, viser la balle avec la main libre, frapper haut et devant.', 'Seitlich stellen, mit der freien Hand auf den Ball zeigen, hoch und vor dem Körper schlagen.', 'volley', 8, '["11-13", "14-16", "adult"]'::jsonb, '["balls"]'::jsonb) ON CONFLICT (name) WHERE user_id IS NULL DO NOTHING;
INSERT INTO tennis_drills (user_id, name, name_fr, name_de, description, description_fr, description_de, category, minutes, ages, equipment) VALUES (NULL, 'King of the court', 'Roi du court', 'König des Platzes', 'Points against the king: the winner stays, the loser goes back in line.', 'Points contre le roi : le gagnant reste, le perdant repasse dans la file.', 'Punkte gegen den König: Der Sieger bleibt, der Verlierer stellt sich wieder an.', 'play', 15, '["8-10", "11-13", "14-16", "adult"]'::jsonb, '["balls"]'::jsonb) ON CONFLICT (name) WHERE user_id IS NULL DO NOTHING;
INSERT INTO tennis_drills (user_id, name, name_fr, name_de, description, description_fr, description_de, category, minutes, ages, equipment) VALUES (NULL, 'Baseline points', 'Points en fond de court', 'Punkte von der Grundlinie', 'Points started by a feed, played from the baseline, first to 7.', 'Points lancés par une balle du coach, joués du fond de court, en 7 points.', 'Punkte nach Zuspiel des Trainers, von der Grundlinie gespielt, bis 7.', 'play', 15, '["11-13", "14-16", "adult"]'::jsonb, '["balls"]'::jsonb) ON CONFLICT (name) WHERE user_id IS NULL DO NOTHING;
INSERT INTO tennis_drills (user_id, name, name_fr, name_de, description, description_fr, description_de, category, minutes, ages, equipment) VALUES (NULL, 'Tie-break', 'Tie-break', 'Tiebreak', 'Tie-breaks with real serves, changing ends every six points.', 'Tie-breaks avec vrais services, changement de côté tous les six points.', 'Tiebreaks mit echtem Aufschlag, Seitenwechsel alle sechs Punkte.', 'play', 15, '["11-13", "14-16", "adult"]'::jsonb, '["balls"]'::jsonb) ON CONFLICT (name) WHERE user_id IS NULL DO NOTHING;
INSERT INTO tennis_drills (user_id, name, name_fr, name_de, description, description_fr, description_de, category, minutes, ages, equipment) VALUES (NULL, 'Team relay', 'Relais par équipes', 'Staffellauf im Team', 'Carry a ball on the racket to a cone and back, then hand over to the next one.', 'Transporter une balle sur la raquette jusqu’au plot et revenir, puis passer le relais.', 'Einen Ball auf dem Schläger zum Hütchen und zurück tragen, dann übergeben.', 'games', 8, '["8-10", "11-13"]'::jsonb, '["balls"]'::jsonb) ON CONFLICT (name) WHERE user_id IS NULL DO NOTHING;
INSERT INTO tennis_drills (user_id, name, name_fr, name_de, description, description_fr, description_de, category, minutes, ages, equipment) VALUES (NULL, 'Clear your side', 'Vide ton camp', 'Räum dein Feld', 'Two teams send as many balls as they can to the other side before the whistle.', 'Deux équipes envoient le plus de balles possible dans l’autre camp avant le coup de sifflet.', 'Zwei Teams spielen bis zum Pfiff so viele Bälle wie möglich ins andere Feld.', 'games', 8, '["8-10"]'::jsonb, '["balls"]'::jsonb) ON CONFLICT (name) WHERE user_id IS NULL DO NOTHING;
INSERT INTO tennis_drills (user_id, name, name_fr, name_de, description, description_fr, description_de, category, minutes, ages, equipment) VALUES (NULL, 'Round the world', 'La tournante', 'Rundlauf', 'Hit and run to the other side; a miss and you are out, the last one wins.', 'Frapper puis courir de l’autre côté ; une faute et on sort, le dernier gagne.', 'Schlagen und auf die andere Seite laufen; ein Fehler und man scheidet aus, der Letzte gewinnt.', 'games', 10, '["8-10", "11-13", "14-16", "adult"]'::jsonb, '["balls"]'::jsonb) ON CONFLICT (name) WHERE user_id IS NULL DO NOTHING;
INSERT INTO tennis_drills (user_id, name, name_fr, name_de, description, description_fr, description_de, category, minutes, ages, equipment) VALUES (NULL, 'Jump rope', 'Corde à sauter', 'Seilspringen', 'Bounces on the balls of the feet: both feet, one foot, crossed.', 'Sauts sur l’avant du pied : pieds joints, un pied, croisés.', 'Sprünge auf dem Vorfuß: beidbeinig, einbeinig, gekreuzt.', 'physical', 5, '["8-10", "11-13", "14-16", "adult"]'::jsonb, '["rope"]'::jsonb) ON CONFLICT (name) WHERE user_id IS NULL DO NOTHING;
INSERT INTO tennis_drills (user_id, name, name_fr, name_de, description, description_fr, description_de, category, minutes, ages, equipment) VALUES (NULL, 'Short sprints', 'Sprints courts', 'Kurze Sprints', 'Sprints of 5 to 10 m from a split-step, full recovery walking back.', 'Sprints de 5 à 10 m depuis un split-step, récupération complète en marchant.', 'Sprints über 5 bis 10 m aus dem Split-Step, volle Erholung im Gehen zurück.', 'physical', 6, '["8-10", "11-13", "14-16", "adult"]'::jsonb, '["cones"]'::jsonb) ON CONFLICT (name) WHERE user_id IS NULL DO NOTHING;
INSERT INTO tennis_drills (user_id, name, name_fr, name_de, description, description_fr, description_de, category, minutes, ages, equipment) VALUES (NULL, 'Medicine ball side throws', 'Lancers de médecine-ball', 'Medizinball-Seitwürfe', 'Rotational throws against a wall, on the forehand then the backhand side.', 'Lancers en rotation contre un mur, côté coup droit puis côté revers.', 'Rotationswürfe gegen eine Wand, auf der Vorhand- und dann der Rückhandseite.', 'physical', 8, '["14-16", "adult"]'::jsonb, '["medicine_ball"]'::jsonb) ON CONFLICT (name) WHERE user_id IS NULL DO NOTHING;
INSERT INTO tennis_drills (user_id, name, name_fr, name_de, description, description_fr, description_de, category, minutes, ages, equipment) VALUES (NULL, 'Shoulder band work', 'Épaules à l’élastique', 'Schulter mit dem Band', 'External rotations with a light band, elbow against the side, slow.', 'Rotations externes avec un élastique léger, coude au corps, lentement.', 'Außenrotation mit leichtem Band, Ellbogen am Körper, langsam.', 'physical', 6, '["11-13", "14-16", "adult"]'::jsonb, '["bands"]'::jsonb) ON CONFLICT (name) WHERE user_id IS NULL DO NOTHING;
INSERT INTO tennis_drills (user_id, name, name_fr, name_de, description, description_fr, description_de, category, minutes, ages, equipment) VALUES (NULL, 'Easy stretches', 'Étirements doux', 'Leichtes Dehnen', 'Calves, thighs, shoulders and forearms, held without bouncing.', 'Mollets, cuisses, épaules et avant-bras, tenus sans à-coups.', 'Waden, Oberschenkel, Schultern und Unterarme, ohne Wippen gehalten.', 'cooldown', 5, '["8-10", "11-13", "14-16", "adult"]'::jsonb, '[]'::jsonb) ON CONFLICT (name) WHERE user_id IS NULL DO NOTHING;
INSERT INTO tennis_drills (user_id, name, name_fr, name_de, description, description_fr, description_de, category, minutes, ages, equipment) VALUES (NULL, 'Wrap-up talk', 'Retour sur la séance', 'Kurze Nachbesprechung', 'Each player says what they learnt and what they want to work on next time.', 'Chacun dit ce qu’il a appris et ce qu’il veut travailler la prochaine fois.', 'Jeder sagt, was er gelernt hat und woran er nächstes Mal arbeiten will.', 'cooldown', 3, '["8-10", "11-13", "14-16", "adult"]'::jsonb, '[]'::jsonb) ON CONFLICT (name) WHERE user_id IS NULL DO NOTHING;

COMMIT;

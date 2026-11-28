-- 089_tennis_teams_and_references.sql
-- 1. Lists of values an admin keeps, no longer fixed in the code nor in the
--    database's checks (which now check their form only):
--    - app_settings.tennis_reference: the tennis notebook's themes (in a
--      lesson's order, the strokes and footwork marked core), age bands,
--      levels and equipment, each named in French, English and German
--      (Admin > Tennis);
--    - app_settings.body_muscles: the muscles of the body map, each in a
--      group and named in the three languages (Admin > Body map). The drawing
--      has a shape for each of today's 17; one added later shows in the lists.
-- 2. A tennis group becomes a team without accounts: kept with the teams
--    (groups.kind = 'tennis', with its age band, level, weekly slots and how
--    many play), shown in Coaching > Teams. The groups of migration 088 move
--    there with their ids, their lessons follow, tennis_groups goes. The
--    teams' list (get_my_groups) leaves them out: no one is invited to one.
--    The rules of the teams do not change: their owner keeps every right on
--    his rows, members still read through the same functions.
-- Apply this file first, then the code.
-- Plain quotes only; safe to run again. All-or-nothing: one transaction.

BEGIN;

-- ─── The references ─────────────────────────────────────────────

INSERT INTO app_settings (key, value) VALUES ('tennis_reference', '{
  "themes": [
    {
      "id": "warmup",
      "fr": "Échauffement",
      "en": "Warm-up",
      "de": "Aufwärmen",
      "core": false
    },
    {
      "id": "footwork",
      "fr": "Jeu de jambes",
      "en": "Footwork",
      "de": "Beinarbeit",
      "core": true
    },
    {
      "id": "forehand",
      "fr": "Coup droit",
      "en": "Forehand",
      "de": "Vorhand",
      "core": true
    },
    {
      "id": "backhand",
      "fr": "Revers",
      "en": "Backhand",
      "de": "Rückhand",
      "core": true
    },
    {
      "id": "serve",
      "fr": "Service",
      "en": "Serve",
      "de": "Aufschlag",
      "core": true
    },
    {
      "id": "return",
      "fr": "Retour",
      "en": "Return",
      "de": "Return",
      "core": true
    },
    {
      "id": "volley",
      "fr": "Volée et smash",
      "en": "Volley and overhead",
      "de": "Volley und Schmetterball",
      "core": true
    },
    {
      "id": "play",
      "fr": "Jeu et points",
      "en": "Play and points",
      "de": "Spiel und Punkte",
      "core": false
    },
    {
      "id": "games",
      "fr": "Jeux",
      "en": "Games",
      "de": "Spiele",
      "core": false
    },
    {
      "id": "physical",
      "fr": "Physique",
      "en": "Physical",
      "de": "Athletik",
      "core": false
    },
    {
      "id": "cooldown",
      "fr": "Retour au calme",
      "en": "Cool-down",
      "de": "Cool-down",
      "core": false
    }
  ],
  "ageBands": [
    {
      "id": "8-10",
      "fr": "8-10 ans",
      "en": "Ages 8-10",
      "de": "8-10 Jahre"
    },
    {
      "id": "11-13",
      "fr": "11-13 ans",
      "en": "Ages 11-13",
      "de": "11-13 Jahre"
    },
    {
      "id": "14-16",
      "fr": "14-16 ans",
      "en": "Ages 14-16",
      "de": "14-16 Jahre"
    },
    {
      "id": "adult",
      "fr": "Adultes",
      "en": "Adults",
      "de": "Erwachsene"
    }
  ],
  "levels": [
    {
      "id": "beginner",
      "fr": "Débutant",
      "en": "Beginner",
      "de": "Anfänger"
    },
    {
      "id": "intermediate",
      "fr": "Intermédiaire",
      "en": "Intermediate",
      "de": "Fortgeschritten"
    },
    {
      "id": "competition",
      "fr": "Compétition",
      "en": "Competition",
      "de": "Wettkampf"
    }
  ],
  "equipment": [
    {
      "id": "balls",
      "fr": "Balles",
      "en": "Balls",
      "de": "Bälle"
    },
    {
      "id": "bands",
      "fr": "Élastiques",
      "en": "Bands",
      "de": "Bänder"
    },
    {
      "id": "cones",
      "fr": "Plots",
      "en": "Cones",
      "de": "Hütchen"
    },
    {
      "id": "hoops",
      "fr": "Cerceaux",
      "en": "Hoops",
      "de": "Reifen"
    },
    {
      "id": "ladder",
      "fr": "Échelle de rythme",
      "en": "Agility ladder",
      "de": "Koordinationsleiter"
    },
    {
      "id": "medicine_ball",
      "fr": "Médecine-ball",
      "en": "Medicine ball",
      "de": "Medizinball"
    },
    {
      "id": "rope",
      "fr": "Corde à sauter",
      "en": "Jump rope",
      "de": "Springseil"
    },
    {
      "id": "targets",
      "fr": "Cibles",
      "en": "Targets",
      "de": "Ziele"
    }
  ]
}') ON CONFLICT (key) DO NOTHING;

INSERT INTO app_settings (key, value) VALUES ('body_muscles', '[
  {
    "id": "chest",
    "group": "chest",
    "fr": "Pectoraux",
    "en": "Chest",
    "de": "Brust"
  },
  {
    "id": "front_delts",
    "group": "shoulders",
    "fr": "Deltoïdes antérieurs",
    "en": "Front delts",
    "de": "Vordere Schulter"
  },
  {
    "id": "side_delts",
    "group": "shoulders",
    "fr": "Deltoïdes latéraux",
    "en": "Side delts",
    "de": "Seitliche Schulter"
  },
  {
    "id": "rear_delts",
    "group": "shoulders",
    "fr": "Deltoïdes postérieurs",
    "en": "Rear delts",
    "de": "Hintere Schulter"
  },
  {
    "id": "biceps",
    "group": "arms",
    "fr": "Biceps",
    "en": "Biceps",
    "de": "Bizeps"
  },
  {
    "id": "triceps",
    "group": "arms",
    "fr": "Triceps",
    "en": "Triceps",
    "de": "Trizeps"
  },
  {
    "id": "forearms",
    "group": "arms",
    "fr": "Avant-bras",
    "en": "Forearms",
    "de": "Unterarme"
  },
  {
    "id": "abs",
    "group": "core",
    "fr": "Abdominaux",
    "en": "Abs",
    "de": "Bauch"
  },
  {
    "id": "obliques",
    "group": "core",
    "fr": "Obliques",
    "en": "Obliques",
    "de": "Seitliche Bauchmuskeln"
  },
  {
    "id": "traps",
    "group": "back",
    "fr": "Trapèzes",
    "en": "Traps",
    "de": "Trapez"
  },
  {
    "id": "lats",
    "group": "back",
    "fr": "Grands dorsaux",
    "en": "Lats",
    "de": "Latissimus"
  },
  {
    "id": "lower_back",
    "group": "back",
    "fr": "Lombaires",
    "en": "Lower back",
    "de": "Unterer Rücken"
  },
  {
    "id": "glutes",
    "group": "legs",
    "fr": "Fessiers",
    "en": "Glutes",
    "de": "Gesäß"
  },
  {
    "id": "quads",
    "group": "legs",
    "fr": "Quadriceps",
    "en": "Quads",
    "de": "Quadrizeps"
  },
  {
    "id": "hamstrings",
    "group": "legs",
    "fr": "Ischio-jambiers",
    "en": "Hamstrings",
    "de": "Beinbeuger"
  },
  {
    "id": "adductors",
    "group": "legs",
    "fr": "Adducteurs",
    "en": "Adductors",
    "de": "Adduktoren"
  },
  {
    "id": "calves",
    "group": "legs",
    "fr": "Mollets",
    "en": "Calves",
    "de": "Waden"
  }
]') ON CONFLICT (key) DO NOTHING;

-- Their ids in the rows: checked for their form, not against a fixed list.
ALTER TABLE exercises DROP CONSTRAINT IF EXISTS exercises_muscles_check;
ALTER TABLE exercises ADD CONSTRAINT exercises_muscles_check CHECK (
  (target_muscles IS NULL OR (jsonb_typeof(target_muscles) = 'array' AND jsonb_array_length(target_muscles) BETWEEN 1 AND 8
       AND jsonb_array_length(target_muscles) = jsonb_array_length(jsonb_path_query_array(target_muscles, '$[*] ? (@ like_regex "^[a-z_]{1,30}$")'))))
  AND (assist_muscles IS NULL OR (jsonb_typeof(assist_muscles) = 'array' AND jsonb_array_length(assist_muscles) BETWEEN 0 AND 10
       AND jsonb_array_length(assist_muscles) = jsonb_array_length(jsonb_path_query_array(assist_muscles, '$[*] ? (@ like_regex "^[a-z_]{1,30}$")'))))
) NOT VALID;

ALTER TABLE tennis_drills DROP CONSTRAINT IF EXISTS tennis_drills_check;
ALTER TABLE tennis_drills ADD CONSTRAINT tennis_drills_check CHECK (
  char_length(name) BETWEEN 1 AND 80
  AND (name_fr IS NULL OR char_length(name_fr) <= 80)
  AND (name_de IS NULL OR char_length(name_de) <= 80)
  AND (description IS NULL OR char_length(description) <= 500)
  AND (description_fr IS NULL OR char_length(description_fr) <= 500)
  AND (description_de IS NULL OR char_length(description_de) <= 500)
  AND category ~ '^[a-z0-9_-]{1,30}$'
  AND minutes BETWEEN 1 AND 60
  AND jsonb_typeof(ages) = 'array' AND jsonb_array_length(ages) BETWEEN 0 AND 20
       AND jsonb_array_length(ages) = jsonb_array_length(jsonb_path_query_array(ages, '$[*] ? (@ like_regex "^[a-z0-9_-]{1,30}$")'))
  AND jsonb_typeof(equipment) = 'array' AND jsonb_array_length(equipment) BETWEEN 0 AND 20
       AND jsonb_array_length(equipment) = jsonb_array_length(jsonb_path_query_array(equipment, '$[*] ? (@ like_regex "^[a-z0-9_-]{1,30}$")'))
) NOT VALID;

-- ─── A tennis group: a team without accounts ─────────────────────

ALTER TABLE groups ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'team';
ALTER TABLE groups ADD COLUMN IF NOT EXISTS age_band TEXT;
ALTER TABLE groups ADD COLUMN IF NOT EXISTS level TEXT;
ALTER TABLE groups ADD COLUMN IF NOT EXISTS slots JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE groups ADD COLUMN IF NOT EXISTS players INT;
ALTER TABLE groups ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;
ALTER TABLE groups DROP CONSTRAINT IF EXISTS groups_kind_check;
ALTER TABLE groups ADD CONSTRAINT groups_kind_check CHECK (
  kind IN ('team', 'tennis')
  AND (age_band IS NULL OR age_band ~ '^[a-z0-9_-]{1,30}$')
  AND (level IS NULL OR level ~ '^[a-z0-9_-]{1,30}$')
  AND jsonb_typeof(slots) = 'array' AND jsonb_array_length(slots) <= 7
  AND (players IS NULL OR players BETWEEN 1 AND 40)
);
CREATE INDEX IF NOT EXISTS idx_groups_user_kind ON groups(user_id, kind, updated_at);

-- Changed on the device and synced: its time of change kept by the server, like the other synced rows.
DROP TRIGGER IF EXISTS trg_groups_updated ON groups;
CREATE TRIGGER trg_groups_updated BEFORE UPDATE ON groups FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- A tennis group needs the tennis feature, like its lessons (a team, nothing more than before).
DROP TRIGGER IF EXISTS groups_tennis_plan ON groups;
CREATE TRIGGER groups_tennis_plan BEFORE INSERT OR UPDATE ON groups
  FOR EACH ROW WHEN (NEW.kind = 'tennis') EXECUTE FUNCTION enforce_tennis_rows();

-- The groups of migration 088 move to the teams, with their ids; their lessons follow
-- (the lessons' rule, which reads the old table, is set again just after).
DROP POLICY IF EXISTS "tennis_lessons_own_all" ON tennis_lessons;
DO '
BEGIN
  IF to_regclass(''public.tennis_groups'') IS NOT NULL THEN
    INSERT INTO groups (id, user_id, name, description, kind, age_band, level, slots, players, archived_at, created_at, updated_at, deleted_at)
    SELECT id, user_id, name, notes, ''tennis'', age_band, level, slots, players, archived_at, created_at, updated_at, deleted_at
    FROM tennis_groups
    ON CONFLICT (id) DO NOTHING;
    ALTER TABLE tennis_lessons DROP CONSTRAINT IF EXISTS tennis_lessons_group_id_fkey;
    DROP TABLE tennis_groups;
  END IF;
END
';

ALTER TABLE tennis_lessons DROP CONSTRAINT IF EXISTS tennis_lessons_group_id_fkey;
ALTER TABLE tennis_lessons ADD CONSTRAINT tennis_lessons_group_id_fkey FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE;

CREATE POLICY "tennis_lessons_own_all" ON tennis_lessons
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND (group_id IS NULL OR EXISTS (SELECT 1 FROM groups g WHERE g.id = group_id AND g.user_id = auth.uid() AND g.kind = 'tennis'))
  );

-- The teams' list: the teams one coaches, not the tennis groups (shown apart, without members).
CREATE OR REPLACE FUNCTION get_my_groups()
RETURNS TABLE (id UUID, name TEXT, description TEXT, member_count BIGINT, created_at TIMESTAMPTZ)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS '
  SELECT g.id, g.name, g.description,
         (SELECT count(*) FROM group_members gm
          WHERE gm.group_id = g.id AND gm.status = ''active'' AND gm.deleted_at IS NULL) AS member_count,
         g.created_at
  FROM groups g
  WHERE g.user_id = auth.uid() AND g.deleted_at IS NULL AND g.kind = ''team'' AND is_active_account()
  ORDER BY g.created_at DESC;
';

COMMIT;

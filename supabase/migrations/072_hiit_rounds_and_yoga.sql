-- 072_hiit_rounds_and_yoga.sql
-- HIIT and yoga:
--   - workouts.rounds_done: the rounds of a timed (HIIT) session carried out
--     to the end;
--   - yoga joins the warm-ups and stretches as a third mode of the reference
--     app_settings.mobility_moves (lengths, holds, 17 postures in three
--     languages with their breathing), editable in Admin > Warm-ups; a yoga
--     session opens with its first posture and ends with the last (final
--     relaxation);
--   - what each posture loads when injured joins injury_guidance.mobility.
-- Plain quotes only; safe to run again (nothing added twice, nothing an
-- admin changed is overwritten).

ALTER TABLE workouts ADD COLUMN IF NOT EXISTS rounds_done SMALLINT;

UPDATE app_settings
SET value = (
      jsonb_set(
        jsonb_set(
          jsonb_set(value::jsonb, '{minutes,yoga}', y.data -> 'minutes'),
          '{timing,yoga}', y.data -> 'timing'),
        '{moves}', (value::jsonb -> 'moves') || (y.data -> 'moves'))
    )::text,
    updated_at = now()
FROM (SELECT '
{
  "minutes": [
    10,
    15,
    25
  ],
  "timing": {
    "hold": 60,
    "sideHold": 45,
    "transition": 10
  },
  "moves": [
    {
      "key": "yoga-breath",
      "mode": "yoga",
      "muscles": [
        "full_body"
      ],
      "name": {
        "en": "Seated breathing",
        "fr": "Respiration assise",
        "de": "Atmung im Sitzen"
      },
      "cue": {
        "en": "Sit cross-legged, back tall. Breathe in through the nose for 4, out for 6. Let the shoulders drop.",
        "fr": "Assis en tailleur, dos long. Inspirez par le nez sur 4 temps, expirez sur 6. Relâchez les épaules.",
        "de": "Im Schneidersitz, Rücken lang. Durch die Nase 4 Zählzeiten ein, 6 aus. Schultern sinken lassen."
      },
      "video": "https://www.youtube.com/watch?v=zLvJD7iKVhw"
    },
    {
      "key": "yoga-cat-cow",
      "mode": "yoga",
      "muscles": [
        "back",
        "core"
      ],
      "name": {
        "en": "Cat-cow",
        "fr": "Chat-vache",
        "de": "Katze-Kuh"
      },
      "cue": {
        "en": "On hands and knees: breathe in, chest forward and back hollow; breathe out, round the back. Slowly, with the breath.",
        "fr": "À quatre pattes : inspirez en creusant le dos, poitrine vers l’avant ; expirez en arrondissant le dos. Lentement, au rythme du souffle.",
        "de": "Im Vierfüßlerstand: einatmen, Rücken ins Hohlkreuz, Brust nach vorn; ausatmen, Rücken rund. Langsam, im Atemrhythmus."
      },
      "video": "https://www.youtube.com/watch?v=y39PrKY_4JM"
    },
    {
      "key": "yoga-down-dog",
      "mode": "yoga",
      "muscles": [
        "shoulders",
        "legs",
        "back"
      ],
      "name": {
        "en": "Downward dog",
        "fr": "Chien tête en bas",
        "de": "Herabschauender Hund"
      },
      "cue": {
        "en": "From hands and knees, lift the hips up and back, an inverted V. Knees bent if needed, heels towards the floor. Breathe slowly.",
        "fr": "Depuis quatre pattes, montez les hanches vers le haut et l’arrière, en V inversé. Genoux fléchis si besoin, talons vers le sol. Respirez lentement.",
        "de": "Aus dem Vierfüßlerstand die Hüfte nach oben und hinten schieben, ein umgekehrtes V. Knie bei Bedarf gebeugt, Fersen Richtung Boden. Ruhig atmen."
      },
      "video": "https://www.youtube.com/watch?v=j97SSGsnCAQ"
    },
    {
      "key": "yoga-mountain",
      "mode": "yoga",
      "muscles": [
        "full_body"
      ],
      "name": {
        "en": "Mountain",
        "fr": "Montagne",
        "de": "Berg"
      },
      "cue": {
        "en": "Standing, feet hip-width, weight even. Lengthen the spine, arms by your sides. Breathe deeply.",
        "fr": "Debout, pieds largeur de hanches, poids bien réparti. Grandissez la colonne, bras le long du corps. Respirez profondément.",
        "de": "Stehend, Füße hüftbreit, Gewicht gleichmäßig. Wirbelsäule lang, Arme seitlich. Tief atmen."
      },
      "video": "https://www.youtube.com/watch?v=NYhH8Gr35cI"
    },
    {
      "key": "yoga-chair",
      "mode": "yoga",
      "muscles": [
        "legs",
        "core"
      ],
      "name": {
        "en": "Chair",
        "fr": "Chaise",
        "de": "Stuhl"
      },
      "cue": {
        "en": "Feet together, sit back as on a chair, arms up beside the ears. Weight in the heels. Breathe.",
        "fr": "Pieds joints, asseyez-vous en arrière comme sur une chaise, bras levés le long des oreilles. Poids dans les talons. Respirez.",
        "de": "Füße zusammen, nach hinten setzen wie auf einen Stuhl, Arme neben den Ohren nach oben. Gewicht auf den Fersen. Atmen."
      },
      "video": "https://www.youtube.com/watch?v=ySafTekJ3Ls"
    },
    {
      "key": "yoga-warrior-1",
      "mode": "yoga",
      "muscles": [
        "legs",
        "shoulders"
      ],
      "name": {
        "en": "Warrior I",
        "fr": "Guerrier I",
        "de": "Krieger I"
      },
      "cue": {
        "en": "A big step back, front knee above the ankle, hips facing forward, arms up. Breathe into the stretch of the back hip.",
        "fr": "Un grand pas en arrière, genou avant au-dessus de la cheville, bassin de face, bras levés. Respirez dans l’étirement de la hanche arrière.",
        "de": "Großer Schritt zurück, vorderes Knie über dem Knöchel, Becken nach vorn, Arme nach oben. In die Dehnung der hinteren Hüfte atmen."
      },
      "video": "https://www.youtube.com/watch?v=5rT--p_cLOc",
      "sides": true
    },
    {
      "key": "yoga-warrior-2",
      "mode": "yoga",
      "muscles": [
        "legs",
        "shoulders"
      ],
      "name": {
        "en": "Warrior II",
        "fr": "Guerrier II",
        "de": "Krieger II"
      },
      "cue": {
        "en": "Feet wide, front foot forward, front knee bent over the ankle, arms out at shoulder height, gaze over the front hand.",
        "fr": "Pieds écartés, pied avant tourné vers l’avant, genou avant fléchi au-dessus de la cheville, bras tendus à hauteur d’épaules, regard au-delà de la main avant.",
        "de": "Füße weit, vorderer Fuß nach vorn, vorderes Knie über dem Knöchel gebeugt, Arme auf Schulterhöhe, Blick über die vordere Hand."
      },
      "video": "https://www.youtube.com/watch?v=4Ejz7IgODlU",
      "sides": true
    },
    {
      "key": "yoga-triangle",
      "mode": "yoga",
      "muscles": [
        "legs",
        "core"
      ],
      "name": {
        "en": "Triangle",
        "fr": "Triangle",
        "de": "Dreieck"
      },
      "cue": {
        "en": "Feet wide, front leg straight; reach forward, then lower the front hand to the shin, the other arm up. Chest open, long sides.",
        "fr": "Pieds écartés, jambe avant tendue ; allez loin vers l’avant puis descendez la main avant sur le tibia, l’autre bras vers le ciel. Poitrine ouverte, flancs longs.",
        "de": "Füße weit, vorderes Bein gestreckt; nach vorn reichen, dann die vordere Hand zum Schienbein, der andere Arm nach oben. Brust offen, Flanken lang."
      },
      "video": "https://www.youtube.com/watch?v=upFYlxZHif0",
      "sides": true
    },
    {
      "key": "yoga-tree",
      "mode": "yoga",
      "muscles": [
        "legs",
        "core"
      ],
      "name": {
        "en": "Tree",
        "fr": "Arbre",
        "de": "Baum"
      },
      "cue": {
        "en": "On one leg, the other foot against the calf or the thigh (never the knee), hands together. Eyes on a fixed point, breathe calmly.",
        "fr": "Sur une jambe, l’autre pied contre le mollet ou la cuisse (jamais le genou), mains jointes. Regard sur un point fixe, respirez calmement.",
        "de": "Auf einem Bein, der andere Fuß an Wade oder Oberschenkel (nie am Knie), Hände zusammen. Blick auf einen festen Punkt, ruhig atmen."
      },
      "video": "https://www.youtube.com/watch?v=yVE4XXFFO70",
      "sides": true
    },
    {
      "key": "yoga-low-lunge",
      "mode": "yoga",
      "muscles": [
        "legs"
      ],
      "name": {
        "en": "Low lunge",
        "fr": "Fente basse",
        "de": "Tiefer Ausfallschritt"
      },
      "cue": {
        "en": "Back knee on the floor (on a cushion), front knee above the ankle; let the hips sink forward, arms up if comfortable.",
        "fr": "Genou arrière au sol (sur un coussin), genou avant au-dessus de la cheville ; laissez le bassin descendre vers l’avant, bras levés si c’est confortable.",
        "de": "Hinteres Knie am Boden (auf einem Kissen), vorderes Knie über dem Knöchel; Becken nach vorn sinken lassen, Arme hoch, wenn angenehm."
      },
      "video": "https://www.youtube.com/watch?v=aOfniMZY2hk",
      "sides": true
    },
    {
      "key": "yoga-seated-fold",
      "mode": "yoga",
      "muscles": [
        "legs",
        "back"
      ],
      "name": {
        "en": "Seated forward fold",
        "fr": "Pince assise",
        "de": "Vorbeuge im Sitzen"
      },
      "cue": {
        "en": "Seated, legs straight, knees soft. Breathe in to grow tall, breathe out to fold from the hips. Never force.",
        "fr": "Assis, jambes tendues, genoux souples. Inspirez pour vous grandir, expirez pour vous pencher depuis les hanches. Sans jamais forcer.",
        "de": "Im Sitzen, Beine gestreckt, Knie locker. Einatmen und aufrichten, ausatmen und aus der Hüfte vorbeugen. Nie erzwingen."
      },
      "video": "https://www.youtube.com/watch?v=OsvHyiMhO9s"
    },
    {
      "key": "yoga-sphinx",
      "mode": "yoga",
      "muscles": [
        "back"
      ],
      "name": {
        "en": "Sphinx",
        "fr": "Sphinx",
        "de": "Sphinx"
      },
      "cue": {
        "en": "Lying on the belly, elbows under the shoulders, forearms on the floor; lift the chest gently, shoulders away from the ears.",
        "fr": "Allongé sur le ventre, coudes sous les épaules, avant-bras au sol ; soulevez doucement la poitrine, épaules loin des oreilles.",
        "de": "In Bauchlage, Ellbogen unter den Schultern, Unterarme am Boden; Brust sanft anheben, Schultern weg von den Ohren."
      },
      "video": "https://www.youtube.com/watch?v=IzEjLbkeBA8"
    },
    {
      "key": "yoga-bridge",
      "mode": "yoga",
      "muscles": [
        "legs",
        "back"
      ],
      "name": {
        "en": "Bridge",
        "fr": "Pont",
        "de": "Brücke"
      },
      "cue": {
        "en": "On your back, knees bent, feet flat; breathe in and lift the hips, breathe out and roll the spine down slowly.",
        "fr": "Sur le dos, genoux fléchis, pieds à plat ; inspirez en soulevant le bassin, expirez en déroulant lentement la colonne.",
        "de": "Auf dem Rücken, Knie gebeugt, Füße flach; einatmen und das Becken heben, ausatmen und die Wirbelsäule langsam abrollen."
      },
      "video": "https://www.youtube.com/watch?v=NnbvPeAIhmA"
    },
    {
      "key": "yoga-supine-twist",
      "mode": "yoga",
      "muscles": [
        "back",
        "core"
      ],
      "name": {
        "en": "Supine twist",
        "fr": "Torsion allongée",
        "de": "Drehung in Rückenlage"
      },
      "cue": {
        "en": "On your back, bring one knee across the body to the floor, arms open, gaze the other way. Breathe into the twist.",
        "fr": "Sur le dos, amenez un genou de l’autre côté du corps vers le sol, bras ouverts, regard à l’opposé. Respirez dans la torsion.",
        "de": "Auf dem Rücken ein Knie über den Körper zum Boden führen, Arme offen, Blick zur Gegenseite. In die Drehung atmen."
      },
      "video": "https://www.youtube.com/watch?v=ezyMaQEaVaI",
      "sides": true
    },
    {
      "key": "yoga-happy-baby",
      "mode": "yoga",
      "muscles": [
        "legs"
      ],
      "name": {
        "en": "Happy baby",
        "fr": "Bébé heureux",
        "de": "Glückliches Baby"
      },
      "cue": {
        "en": "On your back, knees towards the armpits, hands holding the feet or the shins; rock gently from side to side.",
        "fr": "Sur le dos, genoux vers les aisselles, mains sur les pieds ou les tibias ; balancez-vous doucement d’un côté à l’autre.",
        "de": "Auf dem Rücken, Knie Richtung Achseln, Hände an Füßen oder Schienbeinen; sanft von Seite zu Seite wiegen."
      },
      "video": "https://www.youtube.com/watch?v=Ppku7i3ypGM"
    },
    {
      "key": "yoga-child",
      "mode": "yoga",
      "muscles": [
        "back"
      ],
      "name": {
        "en": "Child’s pose",
        "fr": "Posture de l’enfant",
        "de": "Kindhaltung"
      },
      "cue": {
        "en": "Kneeling, sit on the heels and fold forward, forehead on the floor, arms long or by the sides. Breathe into the back.",
        "fr": "À genoux, asseyez-vous sur les talons et penchez-vous vers l’avant, front au sol, bras allongés ou le long du corps. Respirez dans le dos.",
        "de": "Kniend auf die Fersen setzen und nach vorn beugen, Stirn am Boden, Arme lang oder seitlich. In den Rücken atmen."
      },
      "video": "https://www.youtube.com/watch?v=l-mtV34Afok"
    },
    {
      "key": "yoga-savasana",
      "mode": "yoga",
      "muscles": [
        "full_body"
      ],
      "name": {
        "en": "Final relaxation",
        "fr": "Relaxation finale",
        "de": "Endentspannung"
      },
      "cue": {
        "en": "Lying on your back, arms away from the body, palms up. Close your eyes, let the breath come and go on its own.",
        "fr": "Allongé sur le dos, bras écartés du corps, paumes vers le ciel. Fermez les yeux, laissez le souffle aller et venir seul.",
        "de": "Auf dem Rücken, Arme vom Körper weg, Handflächen nach oben. Augen schließen, den Atem von selbst kommen und gehen lassen."
      },
      "video": "https://www.youtube.com/watch?v=eSeRjoolN2A"
    }
  ]
}
'::jsonb AS data) AS y
WHERE key = 'mobility_moves'
  AND NOT ((value::jsonb -> 'minutes') ? 'yoga');

UPDATE app_settings
SET value = jsonb_set(value::jsonb, '{mobility}', (y.data || (value::jsonb -> 'mobility')))::text,
    updated_at = now()
FROM (SELECT '
{
  "yoga-cat-cow": {
    "wrist": "caution"
  },
  "yoga-down-dog": {
    "shoulder": "caution",
    "wrist": "caution"
  },
  "yoga-chair": {
    "knee": "caution"
  },
  "yoga-warrior-1": {
    "knee": "caution",
    "hip": "caution"
  },
  "yoga-warrior-2": {
    "knee": "caution",
    "hip": "caution",
    "shoulder": "caution"
  },
  "yoga-triangle": {
    "lower_back": "caution"
  },
  "yoga-tree": {
    "ankle": "caution"
  },
  "yoga-low-lunge": {
    "knee": "caution",
    "hip": "caution"
  },
  "yoga-seated-fold": {
    "lower_back": "caution"
  },
  "yoga-sphinx": {
    "lower_back": "caution"
  },
  "yoga-bridge": {
    "neck": "caution",
    "lower_back": "caution"
  },
  "yoga-supine-twist": {
    "lower_back": "caution"
  },
  "yoga-happy-baby": {
    "hip": "caution",
    "knee": "caution"
  },
  "yoga-child": {
    "knee": "caution"
  }
}
'::jsonb AS data) AS y
WHERE key = 'injury_guidance'
  AND value::jsonb -> 'mobility' IS NOT NULL
  AND NOT ((value::jsonb -> 'mobility') ? 'yoga-down-dog');

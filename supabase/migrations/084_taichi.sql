-- 084_taichi.sql
-- Tai-chi, a session of its own like yoga:
--   - tai-chi joins the warm-ups, stretches and yoga as a fourth mode of the
--     reference app_settings.mobility_moves: standing like a tree and
--     loosening the joints, then the 24 movements of the Yang short form, in
--     three languages, editable in Admin > Warm-ups. A session follows the
--     form in its order (its first movements for a short one, the whole form
--     for a long one) and always ends with the closing;
--   - what each movement loads when injured (mostly the knees, in the low
--     stances, and the balance of the kicks) joins injury_guidance.mobility.
-- Plain quotes only; safe to run again (nothing added twice, nothing an
-- admin changed is overwritten).

UPDATE app_settings
SET value = (
      jsonb_set(
        jsonb_set(
          jsonb_set(value::jsonb, '{minutes,taichi}', t.data -> 'minutes'),
          '{timing,taichi}', t.data -> 'timing'),
        '{moves}', (value::jsonb -> 'moves') || (t.data -> 'moves'))
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
    "hold": 45,
    "sideHold": 45,
    "transition": 5
  },
  "moves": [
    {
      "key": "taichi-standing",
      "mode": "taichi",
      "muscles": [
        "legs",
        "core"
      ],
      "name": {
        "en": "Standing like a tree",
        "fr": "Posture de l’arbre",
        "de": "Stehen wie ein Baum"
      },
      "cue": {
        "en": "Feet hip-width apart, knees soft, arms rounded in front of the chest as if holding a ball. Breathe slowly into the belly.",
        "fr": "Pieds à largeur de hanches, genoux souples, bras arrondis devant la poitrine comme pour tenir un ballon. Respirez lentement par le ventre.",
        "de": "Füße hüftbreit, Knie locker, Arme vor der Brust gerundet, als hieltest du einen Ball. Langsam in den Bauch atmen."
      },
      "video": "https://www.youtube.com/watch?v=NRUZB9mzo_c"
    },
    {
      "key": "taichi-loosen",
      "mode": "taichi",
      "muscles": [
        "full_body"
      ],
      "name": {
        "en": "Loosening the joints",
        "fr": "Dérouiller les articulations",
        "de": "Gelenke lockern"
      },
      "cue": {
        "en": "Slow circles: neck, shoulders, wrists, hips, knees, ankles. Let the weight sink into the feet.",
        "fr": "Rotations lentes : nuque, épaules, poignets, hanches, genoux, chevilles. Laissez le poids descendre dans les pieds.",
        "de": "Langsame Kreise: Nacken, Schultern, Handgelenke, Hüften, Knie, Knöchel. Das Gewicht in die Füße sinken lassen."
      },
      "video": "https://www.youtube.com/watch?v=zSWIfZVyc5Y"
    },
    {
      "key": "taichi-commencing",
      "mode": "taichi",
      "muscles": [
        "shoulders",
        "legs"
      ],
      "name": {
        "en": "Commencing",
        "fr": "Ouverture",
        "de": "Eröffnung"
      },
      "cue": {
        "en": "Feet parallel. Breathing in, raise the arms slowly in front to shoulder height; breathing out, lower them as the knees bend.",
        "fr": "Pieds parallèles. En inspirant, levez lentement les bras devant vous à hauteur d’épaules ; en expirant, redescendez-les en pliant les genoux.",
        "de": "Füße parallel. Beim Einatmen die Arme langsam vorne auf Schulterhöhe heben, beim Ausatmen senken und dabei die Knie beugen."
      },
      "video": "https://www.youtube.com/watch?v=PAJ4Iu84E14"
    },
    {
      "key": "taichi-wild-horse",
      "mode": "taichi",
      "muscles": [
        "legs",
        "arms"
      ],
      "name": {
        "en": "Part the wild horse’s mane",
        "fr": "Séparer la crinière du cheval sauvage",
        "de": "Die Mähne des Wildpferdes teilen"
      },
      "cue": {
        "en": "Step forward, the front hand rises on a diagonal, the back hand settles by the hip. Left, right, left.",
        "fr": "Pas en avant : la main avant monte en diagonale, l’autre se pose près de la hanche. Gauche, droite, gauche.",
        "de": "Schritt nach vorn, die vordere Hand steigt diagonal, die hintere sinkt neben die Hüfte. Links, rechts, links."
      },
      "video": "https://www.youtube.com/watch?v=tu5m4xl0YkE"
    },
    {
      "key": "taichi-white-crane",
      "mode": "taichi",
      "muscles": [
        "legs",
        "shoulders"
      ],
      "name": {
        "en": "White crane spreads its wings",
        "fr": "La grue blanche déploie ses ailes",
        "de": "Der weiße Kranich breitet seine Flügel aus"
      },
      "cue": {
        "en": "Weight on the back leg, front toes resting. The right hand rises beside the forehead, the left settles by the hip.",
        "fr": "Le poids sur la jambe arrière, la pointe du pied avant posée. La main droite monte près du front, la gauche descend près de la hanche.",
        "de": "Gewicht auf dem hinteren Bein, vordere Zehen aufgesetzt. Die rechte Hand steigt neben die Stirn, die linke sinkt neben die Hüfte."
      },
      "video": "https://www.youtube.com/watch?v=RLyHrhkvbl8"
    },
    {
      "key": "taichi-brush-knee",
      "mode": "taichi",
      "muscles": [
        "legs",
        "arms"
      ],
      "name": {
        "en": "Brush knee and push",
        "fr": "Brosser le genou et pousser",
        "de": "Knie streifen und schieben"
      },
      "cue": {
        "en": "Step forward: one hand sweeps past the front knee, the other pushes forward at shoulder height. Three times, side after side.",
        "fr": "Pas en avant : une main balaie devant le genou, l’autre pousse vers l’avant à hauteur d’épaule. Trois fois, en alternant.",
        "de": "Schritt nach vorn: eine Hand streift am vorderen Knie vorbei, die andere schiebt auf Schulterhöhe nach vorn. Dreimal im Wechsel."
      },
      "video": "https://www.youtube.com/watch?v=w6gyLHgXQUk"
    },
    {
      "key": "taichi-lute",
      "mode": "taichi",
      "muscles": [
        "arms",
        "shoulders"
      ],
      "name": {
        "en": "Play the lute",
        "fr": "Jouer du luth",
        "de": "Die Laute spielen"
      },
      "cue": {
        "en": "Front heel down, hands facing each other as if holding a lute: the front one at nose height, the back one by the elbow.",
        "fr": "Le talon avant posé, les mains face à face comme pour tenir un luth : la main avant à hauteur du nez, l’autre près du coude.",
        "de": "Vordere Ferse aufgesetzt, Hände einander zugewandt wie um eine Laute: die vordere auf Nasenhöhe, die hintere am Ellbogen."
      },
      "video": "https://www.youtube.com/watch?v=OtID_eFXTns"
    },
    {
      "key": "taichi-repulse-monkey",
      "mode": "taichi",
      "muscles": [
        "legs",
        "arms"
      ],
      "name": {
        "en": "Repulse the monkey",
        "fr": "Repousser le singe",
        "de": "Den Affen abwehren"
      },
      "cue": {
        "en": "Stepping back one foot at a time, one hand pushes forward while the other draws back to the hip. Four steps.",
        "fr": "En reculant pas à pas, une main pousse vers l’avant pendant que l’autre revient près de la hanche. Quatre pas.",
        "de": "Schritt für Schritt zurück: eine Hand schiebt nach vorn, die andere kehrt zur Hüfte zurück. Vier Schritte."
      },
      "video": "https://www.youtube.com/watch?v=Rtq-HaZ3Kzw"
    },
    {
      "key": "taichi-bird-tail-left",
      "mode": "taichi",
      "muscles": [
        "legs",
        "arms",
        "core"
      ],
      "name": {
        "en": "Grasp the bird’s tail, left",
        "fr": "Saisir la queue de l’oiseau, à gauche",
        "de": "Den Vogel am Schwanz fassen, links"
      },
      "cue": {
        "en": "Ward off, roll back, press, push: four movements in a row towards the left, the weight going from one leg to the other.",
        "fr": "Parer, tirer en arrière, presser, pousser : quatre gestes enchaînés vers la gauche, le poids passe d’une jambe à l’autre.",
        "de": "Abwehren, zurückrollen, drücken, schieben: vier Bewegungen nach links, das Gewicht wandert von einem Bein zum anderen."
      },
      "video": "https://www.youtube.com/watch?v=F1weGA_IgcA"
    },
    {
      "key": "taichi-bird-tail-right",
      "mode": "taichi",
      "muscles": [
        "legs",
        "arms",
        "core"
      ],
      "name": {
        "en": "Grasp the bird’s tail, right",
        "fr": "Saisir la queue de l’oiseau, à droite",
        "de": "Den Vogel am Schwanz fassen, rechts"
      },
      "cue": {
        "en": "The same four movements towards the right: ward off, roll back, press, push.",
        "fr": "Les mêmes quatre gestes vers la droite : parer, tirer en arrière, presser, pousser.",
        "de": "Dieselben vier Bewegungen nach rechts: abwehren, zurückrollen, drücken, schieben."
      },
      "video": "https://www.youtube.com/watch?v=dgHO5zl9DkY"
    },
    {
      "key": "taichi-single-whip",
      "mode": "taichi",
      "muscles": [
        "legs",
        "shoulders"
      ],
      "name": {
        "en": "Single whip",
        "fr": "Simple fouet",
        "de": "Einfache Peitsche"
      },
      "cue": {
        "en": "The right hand forms a hook out to the side; the left turns past the face and pushes forward as you step into a lunge to the left.",
        "fr": "La main droite forme un bec sur le côté ; la gauche passe devant le visage et pousse vers l’avant, en fente vers la gauche.",
        "de": "Die rechte Hand formt seitlich einen Haken, die linke zieht am Gesicht vorbei und schiebt nach vorn, im Ausfallschritt nach links."
      },
      "video": "https://www.youtube.com/watch?v=2oGGU0sa2Ow"
    },
    {
      "key": "taichi-cloud-hands",
      "mode": "taichi",
      "muscles": [
        "core",
        "arms"
      ],
      "name": {
        "en": "Wave hands like clouds",
        "fr": "Mains comme des nuages",
        "de": "Wolkenhände"
      },
      "cue": {
        "en": "Side steps, the hands circling one after the other in front of the face and the belly; the waist leads the movement.",
        "fr": "En pas chassés sur le côté, les mains tournent l’une après l’autre devant le visage et le ventre ; la taille guide le mouvement.",
        "de": "Seitliche Schritte, die Hände kreisen nacheinander vor Gesicht und Bauch; die Taille führt die Bewegung."
      },
      "video": "https://www.youtube.com/watch?v=W6EVFHg6DC8"
    },
    {
      "key": "taichi-single-whip-2",
      "mode": "taichi",
      "muscles": [
        "legs",
        "shoulders"
      ],
      "name": {
        "en": "Single whip, again",
        "fr": "Simple fouet, reprise",
        "de": "Einfache Peitsche, Wiederholung"
      },
      "cue": {
        "en": "As the first time: a hook with the right hand, the left pushes forward in a lunge to the left.",
        "fr": "Comme la première fois : bec de la main droite, la gauche pousse vers l’avant en fente vers la gauche.",
        "de": "Wie beim ersten Mal: Haken mit der rechten Hand, die linke schiebt im Ausfallschritt nach links nach vorn."
      },
      "video": "https://www.youtube.com/watch?v=gaifBm-3NYg"
    },
    {
      "key": "taichi-high-pat",
      "mode": "taichi",
      "muscles": [
        "shoulders",
        "arms"
      ],
      "name": {
        "en": "High pat on horse",
        "fr": "Flatter l’encolure du cheval",
        "de": "Das Pferd hoch tätscheln"
      },
      "cue": {
        "en": "Front foot light, the right hand passes over the left and pushes forward at face height.",
        "fr": "Le pied avant léger, la main droite passe au-dessus de la gauche et pousse vers l’avant à hauteur du visage.",
        "de": "Vorderer Fuß leicht, die rechte Hand gleitet über die linke und schiebt auf Gesichtshöhe nach vorn."
      },
      "video": "https://www.youtube.com/watch?v=Oh9EigAfpNw"
    },
    {
      "key": "taichi-right-heel",
      "mode": "taichi",
      "muscles": [
        "legs",
        "core"
      ],
      "name": {
        "en": "Kick with the right heel",
        "fr": "Coup de talon droit",
        "de": "Fersenstoß rechts"
      },
      "cue": {
        "en": "Wrists cross in front of the chest, then the arms open while the right heel pushes slowly forward. Stay steady; kick low if needed.",
        "fr": "Les poignets se croisent devant la poitrine, puis les bras s’ouvrent pendant que le talon droit pousse lentement vers l’avant. Restez stable, frappez bas si besoin.",
        "de": "Handgelenke vor der Brust kreuzen, dann öffnen sich die Arme, während die rechte Ferse langsam nach vorn stößt. Stabil bleiben, notfalls tief treten."
      },
      "video": "https://www.youtube.com/watch?v=uPdoGckLnPA"
    },
    {
      "key": "taichi-strike-ears",
      "mode": "taichi",
      "muscles": [
        "shoulders",
        "arms"
      ],
      "name": {
        "en": "Strike the ears with both fists",
        "fr": "Frapper les oreilles avec les poings",
        "de": "Mit beiden Fäusten die Ohren schlagen"
      },
      "cue": {
        "en": "The right foot steps forward, both fists rise in an arc on either side up to temple height.",
        "fr": "Le pied droit se pose en avant, les deux poings montent en arc de chaque côté jusqu’à hauteur des tempes.",
        "de": "Der rechte Fuß setzt vorn auf, beide Fäuste steigen seitlich im Bogen bis auf Schläfenhöhe."
      },
      "video": "https://www.youtube.com/watch?v=Rnrb1XiC8xo"
    },
    {
      "key": "taichi-left-heel",
      "mode": "taichi",
      "muscles": [
        "legs",
        "core"
      ],
      "name": {
        "en": "Turn and kick with the left heel",
        "fr": "Se retourner, coup de talon gauche",
        "de": "Drehen und Fersenstoß links"
      },
      "cue": {
        "en": "Turn on the right foot, cross the wrists, then open the arms as the left heel pushes forward.",
        "fr": "Pivotez sur le pied droit, croisez les poignets, puis ouvrez les bras pendant que le talon gauche pousse vers l’avant.",
        "de": "Auf dem rechten Fuß drehen, Handgelenke kreuzen, dann die Arme öffnen, während die linke Ferse nach vorn stößt."
      },
      "video": "https://www.youtube.com/watch?v=SOEHGosjvfQ"
    },
    {
      "key": "taichi-snake-left",
      "mode": "taichi",
      "muscles": [
        "legs",
        "core"
      ],
      "name": {
        "en": "Snake creeps down, golden rooster on one leg, left",
        "fr": "Le serpent rampe, le coq d’or sur une patte, à gauche",
        "de": "Die Schlange kriecht hinab, goldener Hahn auf einem Bein, links"
      },
      "cue": {
        "en": "Sink slowly onto the bent right leg, the left one stretched, then rise onto the left leg with the right knee lifted. Only go as low as is comfortable.",
        "fr": "Descendez lentement sur la jambe droite fléchie, la gauche tendue, puis remontez sur la jambe gauche, le genou droit levé. Ne descendez que jusqu’où c’est confortable.",
        "de": "Langsam auf das gebeugte rechte Bein sinken, das linke gestreckt, dann auf das linke Bein steigen, das rechte Knie gehoben. Nur so tief, wie es angenehm ist."
      },
      "video": "https://www.youtube.com/watch?v=fVVdJ-TxkvY"
    },
    {
      "key": "taichi-snake-right",
      "mode": "taichi",
      "muscles": [
        "legs",
        "core"
      ],
      "name": {
        "en": "Snake creeps down, golden rooster on one leg, right",
        "fr": "Le serpent rampe, le coq d’or sur une patte, à droite",
        "de": "Die Schlange kriecht hinab, goldener Hahn auf einem Bein, rechts"
      },
      "cue": {
        "en": "The same to the other side: sink onto the left leg, then rise onto the right one, the left knee lifted.",
        "fr": "La même chose de l’autre côté : descendez sur la jambe gauche, puis remontez sur la droite, le genou gauche levé.",
        "de": "Dasselbe zur anderen Seite: auf das linke Bein sinken, dann auf das rechte steigen, das linke Knie gehoben."
      },
      "video": "https://www.youtube.com/watch?v=LfJBvKwR6a0"
    },
    {
      "key": "taichi-shuttles",
      "mode": "taichi",
      "muscles": [
        "shoulders",
        "legs"
      ],
      "name": {
        "en": "Fair lady works at shuttles",
        "fr": "La belle dame lance la navette",
        "de": "Die schöne Frau webt am Webstuhl"
      },
      "cue": {
        "en": "Step on a diagonal: one hand rises above the forehead, palm turned out, the other pushes forward. Both sides.",
        "fr": "Pas en diagonale : une main monte au-dessus du front, paume tournée vers l’extérieur, l’autre pousse vers l’avant. Des deux côtés.",
        "de": "Schritt in die Diagonale: eine Hand steigt über die Stirn, Handfläche nach außen, die andere schiebt nach vorn. Beide Seiten."
      },
      "video": "https://www.youtube.com/watch?v=Yyd2R5ob3Ik"
    },
    {
      "key": "taichi-needle",
      "mode": "taichi",
      "muscles": [
        "back",
        "legs"
      ],
      "name": {
        "en": "Needle at sea bottom",
        "fr": "L’aiguille au fond de la mer",
        "de": "Nadel am Meeresgrund"
      },
      "cue": {
        "en": "Weight back, the trunk leaning slightly forward, the right hand points down towards the floor in front of you.",
        "fr": "Le poids en arrière, le buste légèrement penché, la main droite pointe vers le sol devant vous.",
        "de": "Gewicht hinten, Oberkörper leicht nach vorn geneigt, die rechte Hand zeigt vor dir zum Boden."
      },
      "video": "https://www.youtube.com/watch?v=7MGabpDVxiQ"
    },
    {
      "key": "taichi-fan-back",
      "mode": "taichi",
      "muscles": [
        "shoulders",
        "legs"
      ],
      "name": {
        "en": "Fan through the back",
        "fr": "Déployer l’éventail",
        "de": "Den Fächer öffnen"
      },
      "cue": {
        "en": "Step forward with the left foot: the right hand rises above the head, the left pushes forward, like a fan opening.",
        "fr": "Pas en avant du pied gauche : la main droite monte au-dessus de la tête, la gauche pousse vers l’avant, comme un éventail qui s’ouvre.",
        "de": "Schritt nach vorn mit links: die rechte Hand steigt über den Kopf, die linke schiebt nach vorn, wie ein sich öffnender Fächer."
      },
      "video": "https://www.youtube.com/watch?v=AAa3N4wX8zU"
    },
    {
      "key": "taichi-deflect-punch",
      "mode": "taichi",
      "muscles": [
        "core",
        "arms"
      ],
      "name": {
        "en": "Turn, deflect, parry and punch",
        "fr": "Se retourner, dévier, parer et frapper",
        "de": "Drehen, ablenken, parieren und schlagen"
      },
      "cue": {
        "en": "Turn round, the right fist deflects downwards, the left hand parries, then the fist strikes gently forward.",
        "fr": "Pivotez vers l’arrière, le poing droit dévie vers le bas, la main gauche pare, puis le poing frappe doucement vers l’avant.",
        "de": "Umdrehen, die rechte Faust lenkt nach unten ab, die linke Hand pariert, dann schlägt die Faust sanft nach vorn."
      },
      "video": "https://www.youtube.com/watch?v=LRXfOWUjUx0"
    },
    {
      "key": "taichi-apparent-close",
      "mode": "taichi",
      "muscles": [
        "arms",
        "legs"
      ],
      "name": {
        "en": "Apparent close up",
        "fr": "Fermeture apparente",
        "de": "Scheinbares Schließen"
      },
      "cue": {
        "en": "The left hand slides under the fist, the weight shifts back, then both palms push forward.",
        "fr": "La main gauche glisse sous le poing, le poids recule, puis les deux paumes poussent vers l’avant.",
        "de": "Die linke Hand gleitet unter die Faust, das Gewicht verlagert sich nach hinten, dann schieben beide Handflächen nach vorn."
      },
      "video": "https://www.youtube.com/watch?v=N_1pys03LwY"
    },
    {
      "key": "taichi-cross-hands",
      "mode": "taichi",
      "muscles": [
        "shoulders",
        "legs"
      ],
      "name": {
        "en": "Cross hands",
        "fr": "Croiser les mains",
        "de": "Hände kreuzen"
      },
      "cue": {
        "en": "The arms open in a wide circle and cross in front of the chest, wrist on wrist, the feet back parallel.",
        "fr": "Les bras s’ouvrent en grand cercle puis se croisent devant la poitrine, poignet sur poignet, les pieds revenus parallèles.",
        "de": "Die Arme öffnen sich in einem großen Kreis und kreuzen sich vor der Brust, Handgelenk auf Handgelenk, die Füße wieder parallel."
      },
      "video": "https://www.youtube.com/watch?v=a7qu7TABQFs"
    },
    {
      "key": "taichi-closing",
      "mode": "taichi",
      "muscles": [
        "full_body"
      ],
      "name": {
        "en": "Closing",
        "fr": "Clôture",
        "de": "Abschluss"
      },
      "cue": {
        "en": "Uncross the hands, the palms slowly lower along the body as you breathe out. Stay still a moment, the breath calm.",
        "fr": "Décroisez les mains, les paumes descendent lentement le long du corps en expirant. Restez immobile un moment, le souffle calme.",
        "de": "Hände lösen, die Handflächen sinken beim Ausatmen langsam am Körper entlang. Einen Moment still stehen, ruhig atmen."
      },
      "video": "https://www.youtube.com/watch?v=9y7x3bivD4k"
    }
  ]
}
'::jsonb AS data) AS t
WHERE key = 'mobility_moves'
  AND NOT ((value::jsonb -> 'minutes') ? 'taichi');

UPDATE app_settings
SET value = jsonb_set(value::jsonb, '{mobility}', (t.data || (value::jsonb -> 'mobility')))::text,
    updated_at = now()
FROM (SELECT '
{
  "taichi-wild-horse": {
    "knee": "caution"
  },
  "taichi-brush-knee": {
    "knee": "caution"
  },
  "taichi-repulse-monkey": {
    "knee": "caution"
  },
  "taichi-bird-tail-left": {
    "knee": "caution"
  },
  "taichi-bird-tail-right": {
    "knee": "caution"
  },
  "taichi-single-whip": {
    "knee": "caution"
  },
  "taichi-single-whip-2": {
    "knee": "caution"
  },
  "taichi-right-heel": {
    "hip": "caution",
    "knee": "caution",
    "ankle": "caution"
  },
  "taichi-left-heel": {
    "hip": "caution",
    "knee": "caution",
    "ankle": "caution"
  },
  "taichi-snake-left": {
    "knee": "caution",
    "hip": "caution",
    "ankle": "caution"
  },
  "taichi-snake-right": {
    "knee": "caution",
    "hip": "caution",
    "ankle": "caution"
  },
  "taichi-shuttles": {
    "shoulder": "caution",
    "knee": "caution"
  },
  "taichi-needle": {
    "lower_back": "caution"
  },
  "taichi-fan-back": {
    "shoulder": "caution"
  }
}
'::jsonb AS data) AS t
WHERE key = 'injury_guidance'
  AND value::jsonb -> 'mobility' IS NOT NULL
  AND NOT ((value::jsonb -> 'mobility') ? 'taichi-snake-left');

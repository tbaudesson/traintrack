-- 065_mobility_and_timed_sessions.sql
-- The warm-ups and stretches, and the timed sessions, become references an
-- admin keeps instead of lists in the app's code:
--   - mobility_moves: the 30 moves (names and cues in three languages, the
--     muscles they work, one side then the other or not, their video), the
--     time each is held, the session lengths offered, the muscles of each
--     target (Admin, Warm-ups tab);
--   - timed_sessions: the exercises a timed session draws from (the area,
--     the kind of effort, the equipment, sides), the rhythms and lengths
--     offered, the rest between rounds, the countdown, exercises per round,
--     the order of efforts and the usual rhythm by level (Admin, Timed tab).
-- The names and descriptions of the timed exercises are the library's own.
--
-- Deploy: apply this file BEFORE the code: until the app has read them, the
-- warm-ups and the timed sessions have nothing to offer.
--
-- Safe to re-run: an admin's changes are kept.

INSERT INTO app_settings (key, value) VALUES ('mobility_moves', '
{
  "minutes": {
    "warmup": [
      5,
      10
    ],
    "stretch": [
      5,
      10,
      15
    ]
  },
  "timing": {
    "warmup": {
      "hold": 40,
      "sideHold": 25,
      "transition": 5
    },
    "stretch": {
      "hold": 40,
      "sideHold": 30,
      "transition": 10
    }
  },
  "targets": {
    "full": [
      "full_body"
    ],
    "upper": [
      "chest",
      "back",
      "shoulders",
      "arms"
    ],
    "lower": [
      "legs",
      "core"
    ]
  },
  "moves": [
    {
      "key": "jumping-jack",
      "mode": "warmup",
      "muscles": [
        "full_body"
      ],
      "name": {
        "en": "Jumping jacks",
        "fr": "Jumping jacks",
        "de": "Hampelmann"
      },
      "cue": {
        "en": "Easy pace, to raise the heart rate.",
        "fr": "À allure facile, pour faire monter le cœur.",
        "de": "Locker, um den Puls zu heben."
      },
      "video": "https://www.youtube.com/watch?v=nGaXj3kkmrU"
    },
    {
      "key": "high-knees",
      "mode": "warmup",
      "muscles": [
        "full_body",
        "legs"
      ],
      "name": {
        "en": "High knees",
        "fr": "Montées de genoux",
        "de": "Kniehebelauf"
      },
      "cue": {
        "en": "On the spot, knees to hip height, arms moving.",
        "fr": "Sur place, genoux à hauteur des hanches, les bras accompagnent.",
        "de": "Auf der Stelle, Knie auf Hüfthöhe, Arme schwingen mit."
      },
      "video": "https://www.youtube.com/watch?v=oDdkytliOqE"
    },
    {
      "key": "arm-circles",
      "mode": "warmup",
      "muscles": [
        "shoulders",
        "chest",
        "arms"
      ],
      "name": {
        "en": "Arm circles",
        "fr": "Moulinets des bras",
        "de": "Armkreisen"
      },
      "cue": {
        "en": "Small circles growing larger, forwards then backwards.",
        "fr": "Petits cercles de plus en plus grands, vers l''avant puis vers l''arrière.",
        "de": "Kleine Kreise, die größer werden, vorwärts und rückwärts."
      },
      "video": "https://www.youtube.com/watch?v=UVMEnIaY8aU"
    },
    {
      "key": "arm-swings",
      "mode": "warmup",
      "muscles": [
        "chest",
        "shoulders",
        "back"
      ],
      "name": {
        "en": "Cross-body arm swings",
        "fr": "Ouverture-fermeture des bras",
        "de": "Arme öffnen und kreuzen"
      },
      "cue": {
        "en": "Open the arms wide, then cross them in front of the chest.",
        "fr": "Ouvrir grand les bras, puis les croiser devant la poitrine.",
        "de": "Arme weit öffnen, dann vor der Brust kreuzen."
      },
      "video": "https://www.youtube.com/watch?v=AsMMF3YWIIM"
    },
    {
      "key": "torso-twists",
      "mode": "warmup",
      "muscles": [
        "core",
        "back"
      ],
      "name": {
        "en": "Torso twists",
        "fr": "Rotations du buste",
        "de": "Rumpfdrehungen"
      },
      "cue": {
        "en": "Feet planted, turn the shoulders from side to side.",
        "fr": "Pieds ancrés, tourner les épaules d''un côté puis de l''autre.",
        "de": "Füße fest, Schultern von Seite zu Seite drehen."
      },
      "video": "https://www.youtube.com/watch?v=h6XyzlM8m24"
    },
    {
      "key": "hip-circles",
      "mode": "warmup",
      "muscles": [
        "legs",
        "core"
      ],
      "name": {
        "en": "Hip circles",
        "fr": "Cercles de hanches",
        "de": "Hüftkreisen"
      },
      "cue": {
        "en": "Hands on the hips, draw wide circles both ways.",
        "fr": "Mains sur les hanches, dessiner de grands cercles dans les deux sens.",
        "de": "Hände an die Hüfte, große Kreise in beide Richtungen."
      },
      "video": "https://www.youtube.com/watch?v=qkrJXGVj_OQ"
    },
    {
      "key": "leg-swings",
      "mode": "warmup",
      "muscles": [
        "legs"
      ],
      "sides": true,
      "name": {
        "en": "Leg swings",
        "fr": "Balancés de jambe",
        "de": "Beinschwingen"
      },
      "cue": {
        "en": "Hold on to a wall, swing the leg forwards and back, relaxed.",
        "fr": "En appui sur un mur, balancer la jambe d''avant en arrière, relâchée.",
        "de": "An der Wand abstützen, das Bein locker vor und zurück schwingen."
      },
      "video": "https://www.youtube.com/watch?v=naW8u72lOzI"
    },
    {
      "key": "knee-hug",
      "mode": "warmup",
      "muscles": [
        "legs"
      ],
      "name": {
        "en": "Walking knee hugs",
        "fr": "Genou à la poitrine en marchant",
        "de": "Knie zur Brust im Gehen"
      },
      "cue": {
        "en": "Each step, pull a knee to the chest and rise on the toes.",
        "fr": "À chaque pas, tirer un genou vers la poitrine et monter sur la pointe du pied.",
        "de": "Bei jedem Schritt ein Knie zur Brust ziehen und auf die Zehen gehen."
      },
      "video": "https://www.youtube.com/watch?v=s2emWIC58bI"
    },
    {
      "key": "squat",
      "mode": "warmup",
      "muscles": [
        "legs",
        "full_body"
      ],
      "name": {
        "en": "Bodyweight squats",
        "fr": "Squats au poids du corps",
        "de": "Kniebeugen ohne Gewicht"
      },
      "cue": {
        "en": "Slow and deep, chest up, heels down.",
        "fr": "Lents et profonds, buste droit, talons au sol.",
        "de": "Langsam und tief, Brust aufrecht, Fersen am Boden."
      },
      "video": "https://www.youtube.com/watch?v=P-yaD24bUE8"
    },
    {
      "key": "lunge-rotation",
      "mode": "warmup",
      "muscles": [
        "legs",
        "core",
        "full_body"
      ],
      "name": {
        "en": "Lunge with rotation",
        "fr": "Fente avec rotation",
        "de": "Ausfallschritt mit Drehung"
      },
      "cue": {
        "en": "Step into a lunge, turn the chest over the front knee, alternate.",
        "fr": "Faire une fente, tourner le buste vers le genou avant, alterner.",
        "de": "Ausfallschritt, Oberkörper zum vorderen Knie drehen, abwechseln."
      },
      "video": "https://www.youtube.com/watch?v=G65aplILBXs"
    },
    {
      "key": "inchworm",
      "mode": "warmup",
      "muscles": [
        "full_body",
        "back",
        "legs"
      ],
      "name": {
        "en": "Inchworms",
        "fr": "Chenilles (inchworm)",
        "de": "Raupen (Inchworm)"
      },
      "cue": {
        "en": "Walk the hands out to a plank, then the feet back to the hands.",
        "fr": "Avancer les mains jusqu''à la planche, puis ramener les pieds vers les mains.",
        "de": "Mit den Händen in den Stütz laufen, dann die Füße zu den Händen."
      },
      "video": "https://www.youtube.com/watch?v=SCJ9qcNPEOQ"
    },
    {
      "key": "worlds-greatest",
      "mode": "warmup",
      "muscles": [
        "full_body",
        "legs",
        "back"
      ],
      "sides": true,
      "name": {
        "en": "World''s greatest stretch",
        "fr": "Fente avec rotation au sol",
        "de": "World''s Greatest Stretch"
      },
      "cue": {
        "en": "Deep lunge, hand inside the front foot, open the other arm to the sky.",
        "fr": "Fente profonde, main à l''intérieur du pied avant, ouvrir l''autre bras vers le ciel.",
        "de": "Tiefer Ausfallschritt, Hand innen neben den vorderen Fuß, anderen Arm zum Himmel öffnen."
      },
      "video": "https://www.youtube.com/watch?v=ftLV1SkpWAA"
    },
    {
      "key": "scapular-pushup",
      "mode": "warmup",
      "muscles": [
        "chest",
        "shoulders",
        "back"
      ],
      "name": {
        "en": "Scapular push-ups",
        "fr": "Pompes scapulaires",
        "de": "Schulterblatt-Liegestütze"
      },
      "cue": {
        "en": "In a plank, arms straight, squeeze then spread the shoulder blades.",
        "fr": "En planche bras tendus, rapprocher puis écarter les omoplates.",
        "de": "Im Stütz mit gestreckten Armen die Schulterblätter zusammen- und auseinanderziehen."
      },
      "video": "https://www.youtube.com/watch?v=tu9DyLjSd4Y"
    },
    {
      "key": "cat-cow",
      "mode": "warmup",
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
        "en": "On all fours, round the back, then arch it, with the breath.",
        "fr": "À quatre pattes, arrondir le dos puis le creuser, au rythme de la respiration.",
        "de": "Im Vierfüßlerstand den Rücken runden, dann durchhängen lassen, im Atemrhythmus."
      },
      "video": "https://www.youtube.com/watch?v=1Y0YjXS9sKI"
    },
    {
      "key": "glute-bridge",
      "mode": "warmup",
      "muscles": [
        "legs",
        "core"
      ],
      "name": {
        "en": "Glute bridges",
        "fr": "Ponts fessiers",
        "de": "Glute Bridges"
      },
      "cue": {
        "en": "On your back, push the hips up, squeeze the glutes, lower slowly.",
        "fr": "Sur le dos, monter les hanches en serrant les fessiers, redescendre lentement.",
        "de": "In Rückenlage die Hüfte hochdrücken, Gesäß anspannen, langsam absenken."
      },
      "video": "https://www.youtube.com/watch?v=L9KZfxT654Y"
    },
    {
      "key": "neck-side",
      "mode": "stretch",
      "muscles": [
        "shoulders",
        "back"
      ],
      "sides": true,
      "name": {
        "en": "Neck side stretch",
        "fr": "Étirement latéral du cou",
        "de": "Seitliche Nackendehnung"
      },
      "cue": {
        "en": "Tilt the ear towards the shoulder, the other shoulder low.",
        "fr": "Pencher l''oreille vers l''épaule, l''autre épaule reste basse.",
        "de": "Ohr zur Schulter neigen, die andere Schulter bleibt unten."
      },
      "video": "https://www.youtube.com/watch?v=54y0JAT46vE"
    },
    {
      "key": "chest-doorway",
      "mode": "stretch",
      "muscles": [
        "chest",
        "shoulders"
      ],
      "sides": true,
      "name": {
        "en": "Doorway chest stretch",
        "fr": "Étirement des pectoraux contre un mur",
        "de": "Brustdehnung am Türrahmen"
      },
      "cue": {
        "en": "Forearm on a wall at shoulder height, turn the body away.",
        "fr": "Avant-bras contre un mur à hauteur d''épaule, tourner le corps vers l''extérieur.",
        "de": "Unterarm auf Schulterhöhe an die Wand, Körper wegdrehen."
      },
      "video": "https://www.youtube.com/watch?v=M850sCj9LHQ"
    },
    {
      "key": "cross-shoulder",
      "mode": "stretch",
      "muscles": [
        "shoulders",
        "back"
      ],
      "sides": true,
      "name": {
        "en": "Cross-body shoulder stretch",
        "fr": "Étirement de l''épaule bras croisé",
        "de": "Schulterdehnung vor dem Körper"
      },
      "cue": {
        "en": "Pull the straight arm across the chest with the other hand.",
        "fr": "Tirer le bras tendu devant la poitrine avec l''autre main.",
        "de": "Den gestreckten Arm mit der anderen Hand vor die Brust ziehen."
      },
      "video": "https://www.youtube.com/watch?v=Pg0JvLSfWwM"
    },
    {
      "key": "triceps",
      "mode": "stretch",
      "muscles": [
        "arms",
        "shoulders"
      ],
      "sides": true,
      "name": {
        "en": "Overhead triceps stretch",
        "fr": "Étirement des triceps",
        "de": "Trizepsdehnung über Kopf"
      },
      "cue": {
        "en": "Hand behind the head, push the elbow gently with the other hand.",
        "fr": "Main derrière la tête, pousser doucement le coude avec l''autre main.",
        "de": "Hand hinter den Kopf, den Ellbogen sanft mit der anderen Hand drücken."
      },
      "video": "https://www.youtube.com/watch?v=MWzR-WE_nhU"
    },
    {
      "key": "biceps-wall",
      "mode": "stretch",
      "muscles": [
        "arms",
        "chest"
      ],
      "sides": true,
      "name": {
        "en": "Biceps wall stretch",
        "fr": "Étirement des biceps contre un mur",
        "de": "Bizepsdehnung an der Wand"
      },
      "cue": {
        "en": "Palm on a wall behind you, arm straight, turn away slowly.",
        "fr": "Paume contre un mur derrière soi, bras tendu, tourner lentement.",
        "de": "Handfläche hinter dir an die Wand, Arm gestreckt, langsam wegdrehen."
      },
      "video": "https://www.youtube.com/watch?v=BzPzDuIn1PA"
    },
    {
      "key": "side-bend",
      "mode": "stretch",
      "muscles": [
        "back",
        "core"
      ],
      "sides": true,
      "name": {
        "en": "Standing side bend",
        "fr": "Inclinaison latérale debout",
        "de": "Seitneigung im Stand"
      },
      "cue": {
        "en": "One arm overhead, lean to the other side, hips still.",
        "fr": "Un bras au-dessus de la tête, se pencher de l''autre côté, hanches fixes.",
        "de": "Einen Arm über den Kopf, zur anderen Seite neigen, Hüfte ruhig."
      },
      "video": "https://www.youtube.com/watch?v=Vko-SJok-fk"
    },
    {
      "key": "quad",
      "mode": "stretch",
      "muscles": [
        "legs"
      ],
      "sides": true,
      "name": {
        "en": "Standing quad stretch",
        "fr": "Étirement des quadriceps debout",
        "de": "Quadrizepsdehnung im Stand"
      },
      "cue": {
        "en": "Heel to the glute, knees together, hips forward.",
        "fr": "Talon vers la fesse, genoux serrés, bassin vers l''avant.",
        "de": "Ferse zum Gesäß, Knie zusammen, Hüfte nach vorn."
      },
      "video": "https://www.youtube.com/watch?v=j-KreYRNOCc"
    },
    {
      "key": "calf",
      "mode": "stretch",
      "muscles": [
        "legs"
      ],
      "sides": true,
      "name": {
        "en": "Calf stretch against a wall",
        "fr": "Étirement des mollets contre un mur",
        "de": "Wadendehnung an der Wand"
      },
      "cue": {
        "en": "Back leg straight, heel down, lean towards the wall.",
        "fr": "Jambe arrière tendue, talon au sol, se pencher vers le mur.",
        "de": "Hinteres Bein gestreckt, Ferse am Boden, zur Wand lehnen."
      },
      "video": "https://www.youtube.com/watch?v=_QWfhbIioy8"
    },
    {
      "key": "hip-flexor",
      "mode": "stretch",
      "muscles": [
        "legs",
        "core"
      ],
      "sides": true,
      "name": {
        "en": "Kneeling hip flexor stretch",
        "fr": "Étirement du psoas à genou",
        "de": "Hüftbeugerdehnung im Kniestand"
      },
      "cue": {
        "en": "One knee down, push the hips forward, glute squeezed.",
        "fr": "Un genou au sol, pousser le bassin vers l''avant, fessier serré.",
        "de": "Ein Knie am Boden, Hüfte nach vorn schieben, Gesäß angespannt."
      },
      "video": "https://www.youtube.com/watch?v=34SlL-PPCWQ"
    },
    {
      "key": "hamstring",
      "mode": "stretch",
      "muscles": [
        "legs",
        "back"
      ],
      "name": {
        "en": "Seated hamstring stretch",
        "fr": "Étirement des ischios assis",
        "de": "Beinrückseite im Sitzen"
      },
      "cue": {
        "en": "Legs straight, lean forward from the hips, back long.",
        "fr": "Jambes tendues, se pencher depuis les hanches, dos long.",
        "de": "Beine gestreckt, aus der Hüfte nach vorn neigen, Rücken lang."
      },
      "video": "https://www.youtube.com/watch?v=u55F2jOzBVI"
    },
    {
      "key": "butterfly",
      "mode": "stretch",
      "muscles": [
        "legs"
      ],
      "name": {
        "en": "Butterfly stretch",
        "fr": "Papillon",
        "de": "Schmetterling"
      },
      "cue": {
        "en": "Soles together, let the knees drop, back straight.",
        "fr": "Plantes de pieds jointes, laisser descendre les genoux, dos droit.",
        "de": "Fußsohlen zusammen, Knie sinken lassen, Rücken gerade."
      },
      "video": "https://www.youtube.com/watch?v=MHwUChXNy-Y"
    },
    {
      "key": "pigeon",
      "mode": "stretch",
      "muscles": [
        "legs"
      ],
      "sides": true,
      "name": {
        "en": "Pigeon stretch",
        "fr": "Posture du pigeon",
        "de": "Taube"
      },
      "cue": {
        "en": "Front shin across, back leg long, sink the hips.",
        "fr": "Tibia avant en travers, jambe arrière allongée, laisser descendre le bassin.",
        "de": "Vorderes Schienbein quer, hinteres Bein lang, Hüfte sinken lassen."
      },
      "video": "https://www.youtube.com/watch?v=lqCqETr7Q0g"
    },
    {
      "key": "spinal-twist",
      "mode": "stretch",
      "muscles": [
        "back",
        "core"
      ],
      "sides": true,
      "name": {
        "en": "Lying spinal twist",
        "fr": "Torsion allongée",
        "de": "Liegende Drehung"
      },
      "cue": {
        "en": "On your back, drop the bent knee across, shoulders on the floor.",
        "fr": "Sur le dos, laisser tomber le genou plié de l''autre côté, épaules au sol.",
        "de": "In Rückenlage das gebeugte Knie zur anderen Seite sinken lassen, Schultern am Boden."
      },
      "video": "https://www.youtube.com/watch?v=G28BnPX-tlA"
    },
    {
      "key": "cobra",
      "mode": "stretch",
      "muscles": [
        "core",
        "chest"
      ],
      "name": {
        "en": "Cobra stretch",
        "fr": "Posture du cobra",
        "de": "Kobra"
      },
      "cue": {
        "en": "On your front, push up on the hands, hips on the floor.",
        "fr": "Sur le ventre, se redresser sur les mains, bassin au sol.",
        "de": "In Bauchlage auf die Hände drücken, Hüfte bleibt am Boden."
      },
      "video": "https://www.youtube.com/watch?v=JDcdhTuycOI"
    },
    {
      "key": "childs-pose",
      "mode": "stretch",
      "muscles": [
        "back",
        "shoulders",
        "full_body"
      ],
      "name": {
        "en": "Child''s pose",
        "fr": "Posture de l''enfant",
        "de": "Kindhaltung"
      },
      "cue": {
        "en": "Sit back on the heels, arms long in front, breathe into the back.",
        "fr": "Assis sur les talons, bras allongés devant, respirer dans le dos.",
        "de": "Auf die Fersen setzen, Arme lang nach vorn, in den Rücken atmen."
      },
      "video": "https://www.youtube.com/watch?v=LZgABs0IggM"
    }
  ]
}
')
ON CONFLICT (key) DO NOTHING;

INSERT INTO app_settings (key, value) VALUES ('timed_sessions', '
{
  "minutes": [
    10,
    15,
    20,
    30,
    45
  ],
  "patterns": [
    "30-30",
    "45-15",
    "50-10"
  ],
  "roundRestSec": 60,
  "getReadySec": 10,
  "perRound": [
    {
      "upToMinutes": 15,
      "count": 5
    },
    {
      "upToMinutes": 30,
      "count": 6
    },
    {
      "upToMinutes": 600,
      "count": 8
    }
  ],
  "rhythm": {
    "full": [
      "cardio",
      "strength",
      "core"
    ],
    "lower": [
      "cardio",
      "strength"
    ],
    "abs": [
      "core",
      "core",
      "cardio"
    ]
  },
  "patternForLevel": {
    "beginner": "30-30",
    "intermediate": "45-15",
    "advanced": "50-10"
  },
  "exercises": [
    {
      "name": "Burpee",
      "muscleGroup": "full_body",
      "equipment": "bodyweight",
      "focus": [
        "full"
      ],
      "kind": "cardio"
    },
    {
      "name": "Bodyweight Squat",
      "muscleGroup": "legs",
      "equipment": "bodyweight",
      "focus": [
        "lower",
        "full"
      ],
      "kind": "strength"
    },
    {
      "name": "Jump Squat",
      "muscleGroup": "legs",
      "equipment": "bodyweight",
      "focus": [
        "lower",
        "full"
      ],
      "kind": "cardio"
    },
    {
      "name": "Mountain Climber",
      "muscleGroup": "core",
      "equipment": "bodyweight",
      "focus": [
        "abs",
        "full"
      ],
      "kind": "cardio"
    },
    {
      "name": "Jumping Jack",
      "muscleGroup": "full_body",
      "equipment": "bodyweight",
      "focus": [
        "full",
        "lower"
      ],
      "kind": "cardio"
    },
    {
      "name": "High Knees",
      "muscleGroup": "full_body",
      "equipment": "bodyweight",
      "focus": [
        "full",
        "lower"
      ],
      "kind": "cardio"
    },
    {
      "name": "Reverse Lunge",
      "muscleGroup": "legs",
      "equipment": "bodyweight",
      "focus": [
        "lower",
        "full"
      ],
      "kind": "strength"
    },
    {
      "name": "Jumping Lunge",
      "muscleGroup": "legs",
      "equipment": "bodyweight",
      "focus": [
        "lower"
      ],
      "kind": "cardio"
    },
    {
      "name": "Skater Jump",
      "muscleGroup": "legs",
      "equipment": "bodyweight",
      "focus": [
        "lower",
        "full"
      ],
      "kind": "cardio"
    },
    {
      "name": "Wall Sit",
      "muscleGroup": "legs",
      "equipment": "bodyweight",
      "focus": [
        "lower"
      ],
      "kind": "strength"
    },
    {
      "name": "Glute Bridge",
      "muscleGroup": "legs",
      "equipment": "bodyweight",
      "focus": [
        "lower"
      ],
      "kind": "strength"
    },
    {
      "name": "Push-up",
      "muscleGroup": "chest",
      "equipment": "bodyweight",
      "focus": [
        "full"
      ],
      "kind": "strength"
    },
    {
      "name": "Inchworm",
      "muscleGroup": "full_body",
      "equipment": "bodyweight",
      "focus": [
        "full"
      ],
      "kind": "strength"
    },
    {
      "name": "Plank",
      "muscleGroup": "core",
      "equipment": "bodyweight",
      "focus": [
        "abs",
        "full"
      ],
      "kind": "core"
    },
    {
      "name": "Plank Shoulder Tap",
      "muscleGroup": "core",
      "equipment": "bodyweight",
      "focus": [
        "abs",
        "full"
      ],
      "kind": "core"
    },
    {
      "name": "Side Plank",
      "muscleGroup": "core",
      "equipment": "bodyweight",
      "focus": [
        "abs"
      ],
      "kind": "core",
      "sides": true
    },
    {
      "name": "Bicycle Crunch",
      "muscleGroup": "core",
      "equipment": "bodyweight",
      "focus": [
        "abs"
      ],
      "kind": "core"
    },
    {
      "name": "Flutter Kicks",
      "muscleGroup": "core",
      "equipment": "bodyweight",
      "focus": [
        "abs"
      ],
      "kind": "core"
    },
    {
      "name": "Crunch",
      "muscleGroup": "core",
      "equipment": "bodyweight",
      "focus": [
        "abs"
      ],
      "kind": "core"
    },
    {
      "name": "Lying Leg Raise",
      "muscleGroup": "core",
      "equipment": "bodyweight",
      "focus": [
        "abs"
      ],
      "kind": "core"
    },
    {
      "name": "Hollow Hold",
      "muscleGroup": "core",
      "equipment": "bodyweight",
      "focus": [
        "abs"
      ],
      "kind": "core"
    },
    {
      "name": "Dead Bug",
      "muscleGroup": "core",
      "equipment": "bodyweight",
      "focus": [
        "abs"
      ],
      "kind": "core"
    },
    {
      "name": "Russian Twist",
      "muscleGroup": "core",
      "equipment": "bodyweight",
      "focus": [
        "abs"
      ],
      "kind": "core"
    },
    {
      "name": "Goblet Squat",
      "muscleGroup": "legs",
      "equipment": "dumbbell",
      "focus": [
        "lower",
        "full"
      ],
      "kind": "strength"
    },
    {
      "name": "Dumbbell Thruster",
      "muscleGroup": "full_body",
      "equipment": "dumbbell",
      "focus": [
        "full"
      ],
      "kind": "cardio"
    },
    {
      "name": "Dumbbell Swing",
      "muscleGroup": "full_body",
      "equipment": "dumbbell",
      "focus": [
        "full",
        "lower"
      ],
      "kind": "cardio"
    },
    {
      "name": "Renegade Row",
      "muscleGroup": "back",
      "equipment": "dumbbell",
      "focus": [
        "full",
        "abs"
      ],
      "kind": "strength"
    },
    {
      "name": "Dumbbell Romanian Deadlift",
      "muscleGroup": "legs",
      "equipment": "dumbbell",
      "focus": [
        "lower"
      ],
      "kind": "strength"
    },
    {
      "name": "Dumbbell Reverse Lunge",
      "muscleGroup": "legs",
      "equipment": "dumbbell",
      "focus": [
        "lower",
        "full"
      ],
      "kind": "strength"
    },
    {
      "name": "Dumbbell Sumo Squat",
      "muscleGroup": "legs",
      "equipment": "dumbbell",
      "focus": [
        "lower"
      ],
      "kind": "strength"
    },
    {
      "name": "Dumbbell Push Press",
      "muscleGroup": "shoulders",
      "equipment": "dumbbell",
      "focus": [
        "full"
      ],
      "kind": "strength"
    },
    {
      "name": "Dumbbell Woodchop",
      "muscleGroup": "core",
      "equipment": "dumbbell",
      "focus": [
        "abs",
        "full"
      ],
      "kind": "core",
      "sides": true
    },
    {
      "name": "Butt Kicks",
      "muscleGroup": "full_body",
      "equipment": "bodyweight",
      "focus": [
        "full",
        "lower"
      ],
      "kind": "cardio"
    },
    {
      "name": "Fast Feet",
      "muscleGroup": "legs",
      "equipment": "bodyweight",
      "focus": [
        "full",
        "lower"
      ],
      "kind": "cardio"
    },
    {
      "name": "Lateral Shuffle",
      "muscleGroup": "legs",
      "equipment": "bodyweight",
      "focus": [
        "full",
        "lower"
      ],
      "kind": "cardio"
    },
    {
      "name": "Step Jack",
      "muscleGroup": "full_body",
      "equipment": "bodyweight",
      "focus": [
        "full",
        "lower"
      ],
      "kind": "cardio"
    },
    {
      "name": "Standing Knee Drive",
      "muscleGroup": "core",
      "equipment": "bodyweight",
      "focus": [
        "abs",
        "full"
      ],
      "kind": "cardio"
    },
    {
      "name": "Star Jump",
      "muscleGroup": "full_body",
      "equipment": "bodyweight",
      "focus": [
        "full",
        "lower"
      ],
      "kind": "cardio"
    },
    {
      "name": "Broad Jump",
      "muscleGroup": "legs",
      "equipment": "bodyweight",
      "focus": [
        "lower"
      ],
      "kind": "cardio"
    },
    {
      "name": "Shadow Boxing",
      "muscleGroup": "full_body",
      "equipment": "bodyweight",
      "focus": [
        "full"
      ],
      "kind": "cardio"
    },
    {
      "name": "Squat Thrust",
      "muscleGroup": "full_body",
      "equipment": "bodyweight",
      "focus": [
        "full"
      ],
      "kind": "cardio"
    },
    {
      "name": "Plank Jack",
      "muscleGroup": "core",
      "equipment": "bodyweight",
      "focus": [
        "abs",
        "full"
      ],
      "kind": "cardio"
    },
    {
      "name": "Bear Crawl",
      "muscleGroup": "full_body",
      "equipment": "bodyweight",
      "focus": [
        "full",
        "abs"
      ],
      "kind": "cardio"
    },
    {
      "name": "Sumo Squat",
      "muscleGroup": "legs",
      "equipment": "bodyweight",
      "focus": [
        "lower",
        "full"
      ],
      "kind": "strength"
    },
    {
      "name": "Squat Pulse",
      "muscleGroup": "legs",
      "equipment": "bodyweight",
      "focus": [
        "lower"
      ],
      "kind": "strength"
    },
    {
      "name": "Lateral Lunge",
      "muscleGroup": "legs",
      "equipment": "bodyweight",
      "focus": [
        "lower",
        "full"
      ],
      "kind": "strength"
    },
    {
      "name": "Curtsy Lunge",
      "muscleGroup": "legs",
      "equipment": "bodyweight",
      "focus": [
        "lower",
        "full"
      ],
      "kind": "strength"
    },
    {
      "name": "Split Squat",
      "muscleGroup": "legs",
      "equipment": "bodyweight",
      "focus": [
        "lower"
      ],
      "kind": "strength",
      "sides": true
    },
    {
      "name": "Cossack Squat",
      "muscleGroup": "legs",
      "equipment": "bodyweight",
      "focus": [
        "lower"
      ],
      "kind": "strength"
    },
    {
      "name": "Single-Leg Glute Bridge",
      "muscleGroup": "legs",
      "equipment": "bodyweight",
      "focus": [
        "lower",
        "abs"
      ],
      "kind": "strength",
      "sides": true
    },
    {
      "name": "Bodyweight Calf Raise",
      "muscleGroup": "legs",
      "equipment": "bodyweight",
      "focus": [
        "lower"
      ],
      "kind": "strength"
    },
    {
      "name": "Good Morning",
      "muscleGroup": "legs",
      "equipment": "bodyweight",
      "focus": [
        "lower"
      ],
      "kind": "strength"
    },
    {
      "name": "Donkey Kick",
      "muscleGroup": "legs",
      "equipment": "bodyweight",
      "focus": [
        "lower"
      ],
      "kind": "strength",
      "sides": true
    },
    {
      "name": "Fire Hydrant",
      "muscleGroup": "legs",
      "equipment": "bodyweight",
      "focus": [
        "lower"
      ],
      "kind": "strength",
      "sides": true
    },
    {
      "name": "Knee Push-up",
      "muscleGroup": "chest",
      "equipment": "bodyweight",
      "focus": [
        "full"
      ],
      "kind": "strength"
    },
    {
      "name": "Incline Push-up",
      "muscleGroup": "chest",
      "equipment": "bodyweight",
      "focus": [
        "full"
      ],
      "kind": "strength"
    },
    {
      "name": "Diamond Push-up",
      "muscleGroup": "arms",
      "equipment": "bodyweight",
      "focus": [
        "full"
      ],
      "kind": "strength"
    },
    {
      "name": "Pike Push-up",
      "muscleGroup": "shoulders",
      "equipment": "bodyweight",
      "focus": [
        "full"
      ],
      "kind": "strength"
    },
    {
      "name": "Bench Dip",
      "muscleGroup": "arms",
      "equipment": "bodyweight",
      "focus": [
        "full"
      ],
      "kind": "strength"
    },
    {
      "name": "Heel Taps",
      "muscleGroup": "core",
      "equipment": "bodyweight",
      "focus": [
        "abs"
      ],
      "kind": "core"
    },
    {
      "name": "Reverse Crunch",
      "muscleGroup": "core",
      "equipment": "bodyweight",
      "focus": [
        "abs"
      ],
      "kind": "core"
    },
    {
      "name": "Scissor Kicks",
      "muscleGroup": "core",
      "equipment": "bodyweight",
      "focus": [
        "abs"
      ],
      "kind": "core"
    },
    {
      "name": "V-up",
      "muscleGroup": "core",
      "equipment": "bodyweight",
      "focus": [
        "abs"
      ],
      "kind": "core"
    },
    {
      "name": "Sit-up",
      "muscleGroup": "core",
      "equipment": "bodyweight",
      "focus": [
        "abs"
      ],
      "kind": "core"
    },
    {
      "name": "Standing Oblique Crunch",
      "muscleGroup": "core",
      "equipment": "bodyweight",
      "focus": [
        "abs",
        "full"
      ],
      "kind": "core"
    },
    {
      "name": "Glute Bridge Hold",
      "muscleGroup": "core",
      "equipment": "bodyweight",
      "focus": [
        "abs",
        "lower"
      ],
      "kind": "core"
    },
    {
      "name": "Side Plank Hip Dip",
      "muscleGroup": "core",
      "equipment": "bodyweight",
      "focus": [
        "abs"
      ],
      "kind": "core",
      "sides": true
    },
    {
      "name": "Dumbbell Bent-Over Row",
      "muscleGroup": "back",
      "equipment": "dumbbell",
      "focus": [
        "full"
      ],
      "kind": "strength"
    },
    {
      "name": "Dumbbell Floor Press",
      "muscleGroup": "chest",
      "equipment": "dumbbell",
      "focus": [
        "full"
      ],
      "kind": "strength"
    },
    {
      "name": "Dumbbell Curl to Press",
      "muscleGroup": "shoulders",
      "equipment": "dumbbell",
      "focus": [
        "full"
      ],
      "kind": "strength"
    },
    {
      "name": "Dumbbell Lateral Lunge",
      "muscleGroup": "legs",
      "equipment": "dumbbell",
      "focus": [
        "lower",
        "full"
      ],
      "kind": "strength"
    },
    {
      "name": "Dumbbell Glute Bridge",
      "muscleGroup": "legs",
      "equipment": "dumbbell",
      "focus": [
        "lower"
      ],
      "kind": "strength"
    },
    {
      "name": "Dumbbell Hammer Curl",
      "muscleGroup": "arms",
      "equipment": "dumbbell",
      "focus": [
        "full"
      ],
      "kind": "strength"
    },
    {
      "name": "Bird Dog",
      "muscleGroup": "core",
      "equipment": "bodyweight",
      "focus": [
        "abs"
      ],
      "kind": "core",
      "sides": true
    },
    {
      "name": "Superman Hold",
      "muscleGroup": "core",
      "equipment": "bodyweight",
      "focus": [
        "abs",
        "full"
      ],
      "kind": "core"
    },
    {
      "name": "TRX Row",
      "muscleGroup": "back",
      "equipment": "suspension",
      "focus": [
        "full"
      ],
      "kind": "strength"
    },
    {
      "name": "TRX Chest Press",
      "muscleGroup": "chest",
      "equipment": "suspension",
      "focus": [
        "full"
      ],
      "kind": "strength"
    },
    {
      "name": "TRX Squat",
      "muscleGroup": "legs",
      "equipment": "suspension",
      "focus": [
        "lower",
        "full"
      ],
      "kind": "strength"
    },
    {
      "name": "TRX Suspended Lunge",
      "muscleGroup": "legs",
      "equipment": "suspension",
      "focus": [
        "lower"
      ],
      "kind": "strength",
      "sides": true
    },
    {
      "name": "TRX Hamstring Curl",
      "muscleGroup": "legs",
      "equipment": "suspension",
      "focus": [
        "lower"
      ],
      "kind": "strength"
    },
    {
      "name": "TRX Pike",
      "muscleGroup": "core",
      "equipment": "suspension",
      "focus": [
        "abs",
        "full"
      ],
      "kind": "core"
    },
    {
      "name": "TRX Knee Tuck",
      "muscleGroup": "core",
      "equipment": "suspension",
      "focus": [
        "abs",
        "full"
      ],
      "kind": "core"
    },
    {
      "name": "TRX Mountain Climber",
      "muscleGroup": "core",
      "equipment": "suspension",
      "focus": [
        "abs",
        "full"
      ],
      "kind": "cardio"
    },
    {
      "name": "TRX Plank",
      "muscleGroup": "core",
      "equipment": "suspension",
      "focus": [
        "abs"
      ],
      "kind": "core"
    },
    {
      "name": "TRX Side Plank",
      "muscleGroup": "core",
      "equipment": "suspension",
      "focus": [
        "abs"
      ],
      "kind": "core",
      "sides": true
    },
    {
      "name": "TRX Biceps Curl",
      "muscleGroup": "arms",
      "equipment": "suspension",
      "focus": [
        "full"
      ],
      "kind": "strength"
    },
    {
      "name": "TRX Triceps Extension",
      "muscleGroup": "arms",
      "equipment": "suspension",
      "focus": [
        "full"
      ],
      "kind": "strength"
    },
    {
      "name": "TRX Y-Fly",
      "muscleGroup": "shoulders",
      "equipment": "suspension",
      "focus": [
        "full"
      ],
      "kind": "strength"
    },
    {
      "name": "TRX Jump Squat",
      "muscleGroup": "legs",
      "equipment": "suspension",
      "focus": [
        "lower",
        "full"
      ],
      "kind": "cardio"
    },
    {
      "name": "TRX Atomic Push-up",
      "muscleGroup": "chest",
      "equipment": "suspension",
      "focus": [
        "full"
      ],
      "kind": "strength"
    },
    {
      "name": "TRX Single-Leg Squat",
      "muscleGroup": "legs",
      "equipment": "suspension",
      "focus": [
        "lower"
      ],
      "kind": "strength",
      "sides": true
    },
    {
      "name": "TRX Sprinter Start",
      "muscleGroup": "legs",
      "equipment": "suspension",
      "focus": [
        "lower",
        "full"
      ],
      "kind": "cardio",
      "sides": true
    }
  ]
}
')
ON CONFLICT (key) DO NOTHING;

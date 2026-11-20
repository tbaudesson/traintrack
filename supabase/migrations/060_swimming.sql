-- 060_swimming.sql
-- Swimming: the technique sheets (the four strokes and twelve drills, with
-- key points, usual mistakes and a video, in French, English and German) as
-- data an admin keeps (app_settings.swim_techniques, Admin > Swimming), and
-- four programs in the three languages: learn front crawl, swim for fitness,
-- towards 1,500 m and 2 km, triathlon and open water prep. Their sessions
-- link to the sheets by key.
--
-- Deploy: apply this file, in any order with the code. Until it is applied,
-- the technique page is empty and the programs are not in the catalogue.
--
-- Safe to re-run: an admin's changes and the programs already there are kept.

BEGIN;

INSERT INTO app_settings (key, value) VALUES ('swim_techniques', '[
  {
    "key": "crawl",
    "kind": "stroke",
    "video": "https://www.youtube.com/watch?v=AQy_c30lNjI",
    "name": {
      "fr": "Crawl",
      "en": "Front crawl",
      "de": "Kraulschwimmen"
    },
    "points": {
      "fr": [
        "Corps allongé et horizontal, tête dans l''axe, regard vers le fond.",
        "Bras qui entre devant l''épaule, s''allonge, puis tire sous le corps jusqu''à la cuisse, coude haut.",
        "Rotation des épaules et des hanches à chaque mouvement ; on inspire sur le côté pendant la rotation.",
        "Battements de jambes souples, partant des hanches, pieds en extension."
      ],
      "en": [
        "Long body, horizontal, head in line, eyes on the bottom.",
        "The hand enters in front of the shoulder, reaches forward, then pulls under the body to the thigh, elbow high.",
        "Shoulders and hips roll with each stroke; breathe to the side as you roll.",
        "Easy kick from the hips, toes pointed."
      ],
      "de": [
        "Gestreckter, waagrechter Körper, Kopf in Verlängerung, Blick zum Boden.",
        "Die Hand taucht vor der Schulter ein, streckt sich, zieht dann mit hohem Ellbogen unter dem Körper bis zum Oberschenkel.",
        "Schultern und Hüfte rotieren bei jedem Zug; eingeatmet wird seitlich während der Rotation.",
        "Lockerer Beinschlag aus der Hüfte, Füße gestreckt."
      ]
    },
    "mistakes": {
      "fr": [
        "Relever la tête pour respirer : les jambes coulent.",
        "Croiser la main devant la tête à l''entrée dans l''eau."
      ],
      "en": [
        "Lifting the head to breathe: the legs sink.",
        "Crossing the hand over the head line on entry."
      ],
      "de": [
        "Kopf zum Atmen heben: die Beine sinken ab.",
        "Die Hand beim Eintauchen über die Kopflinie kreuzen."
      ]
    }
  },
  {
    "key": "breaststroke",
    "kind": "stroke",
    "video": "https://www.youtube.com/watch?v=ppuDgfdk9y8",
    "name": {
      "fr": "Brasse",
      "en": "Breaststroke",
      "de": "Brustschwimmen"
    },
    "points": {
      "fr": [
        "Traction des bras en cœur, mains qui restent devant les épaules.",
        "Inspiration en fin de traction, puis la tête replonge pendant que les bras s''allongent.",
        "Ciseau des jambes : talons vers les fesses, pieds en flexion tournés vers l''extérieur, poussée en fouet.",
        "Une glisse bras tendus après chaque cycle : tirer, respirer, pousser, glisser."
      ],
      "en": [
        "Heart-shaped arm pull, hands staying in front of the shoulders.",
        "Breathe at the end of the pull, then the head goes back down as the arms reach forward.",
        "Whip kick: heels to the seat, feet flexed and turned out, then push back in a whip.",
        "Glide with straight arms after each cycle: pull, breathe, kick, glide."
      ],
      "de": [
        "Herzförmiger Armzug, die Hände bleiben vor den Schultern.",
        "Am Ende des Zugs einatmen, dann taucht der Kopf ab, während sich die Arme nach vorn strecken.",
        "Beinschlag: Fersen zum Gesäß, Füße angezogen und nach außen gedreht, dann peitschenartig zurückstoßen.",
        "Nach jedem Zyklus mit gestreckten Armen gleiten: ziehen, atmen, stoßen, gleiten."
      ]
    },
    "mistakes": {
      "fr": [
        "Tête hors de l''eau en permanence : nuque et dos tirent.",
        "Tirer les bras jusqu''aux hanches : on perd la glisse."
      ],
      "en": [
        "Keeping the head out all the time: strain on the neck and back.",
        "Pulling the arms back to the hips: the glide is lost."
      ],
      "de": [
        "Kopf ständig über Wasser: Nacken und Rücken werden belastet.",
        "Arme bis zur Hüfte ziehen: das Gleiten geht verloren."
      ]
    }
  },
  {
    "key": "backstroke",
    "kind": "stroke",
    "video": "https://www.youtube.com/watch?v=zf1yjQOjMV0",
    "name": {
      "fr": "Dos crawlé",
      "en": "Backstroke",
      "de": "Rückenkraulen"
    },
    "points": {
      "fr": [
        "Allongé sur le dos, oreilles dans l''eau, hanches hautes, regard vers le plafond.",
        "Bras tendu qui sort par le pouce et entre par l''auriculaire, dans l''alignement de l''épaule.",
        "Rotation des épaules d''un côté à l''autre ; traction coude fléchi sous l''eau.",
        "Battements continus, genoux sous la surface."
      ],
      "en": [
        "On the back, ears in the water, hips high, eyes on the ceiling.",
        "Straight arm leaving thumb first and entering little finger first, in line with the shoulder.",
        "Shoulders roll side to side; the pull bends the elbow under water.",
        "Steady kick, knees below the surface."
      ],
      "de": [
        "In Rückenlage, Ohren im Wasser, Hüfte oben, Blick zur Decke.",
        "Gestreckter Arm verlässt das Wasser mit dem Daumen voran und taucht mit dem kleinen Finger in Schulterlinie ein.",
        "Die Schultern rotieren von Seite zu Seite; unter Wasser wird mit gebeugtem Ellbogen gezogen.",
        "Gleichmäßiger Beinschlag, Knie unter der Oberfläche."
      ]
    },
    "mistakes": {
      "fr": [
        "S''asseoir dans l''eau : hanches basses, on freine.",
        "Pédaler, genoux qui sortent de l''eau."
      ],
      "en": [
        "Sitting in the water: low hips that brake.",
        "Cycling with the knees breaking the surface."
      ],
      "de": [
        "Im Wasser sitzen: tiefe Hüfte bremst.",
        "Radfahren mit Knien, die aus dem Wasser kommen."
      ]
    }
  },
  {
    "key": "butterfly",
    "kind": "stroke",
    "video": "https://www.youtube.com/watch?v=SVO1JeaBBo4",
    "name": {
      "fr": "Papillon",
      "en": "Butterfly",
      "de": "Delfinschwimmen"
    },
    "points": {
      "fr": [
        "Ondulation qui part de la poitrine et se transmet aux hanches puis aux pieds.",
        "Deux battements de dauphin par cycle : un à l''entrée des mains, un à la sortie.",
        "Les deux bras ensemble : traction en trou de serrure sous le corps, retour bras relâchés au ras de l''eau.",
        "Respiration vers l''avant, menton au ras de l''eau, tête qui replonge avant les bras."
      ],
      "en": [
        "A wave that starts at the chest and travels to the hips, then the feet.",
        "Two dolphin kicks per cycle: one as the hands enter, one as they leave.",
        "Both arms together: keyhole pull under the body, relaxed recovery just over the water.",
        "Breathe forward, chin skimming the water, head back down before the arms."
      ],
      "de": [
        "Eine Welle, die in der Brust beginnt und über die Hüfte bis zu den Füßen läuft.",
        "Zwei Delfinkicks pro Zyklus: einer beim Eintauchen der Hände, einer beim Herausnehmen.",
        "Beide Arme zusammen: Schlüssellochzug unter dem Körper, lockere Rückführung knapp über dem Wasser.",
        "Nach vorn atmen, Kinn knapp über dem Wasser, der Kopf taucht vor den Armen wieder ab."
      ]
    },
    "mistakes": {
      "fr": [
        "Plier les genoux pour battre : l''ondulation disparaît.",
        "Relever la tête trop haut : les hanches s''enfoncent."
      ],
      "en": [
        "Bending the knees to kick: the wave is lost.",
        "Lifting the head too high: the hips sink."
      ],
      "de": [
        "Mit den Knien kicken: die Welle geht verloren.",
        "Kopf zu hoch heben: die Hüfte sinkt ab."
      ]
    }
  },
  {
    "key": "catch-up",
    "kind": "drill",
    "video": "https://www.youtube.com/watch?v=5iGGeNJc1K4",
    "name": {
      "fr": "Rattrapé",
      "en": "Catch-up",
      "de": "Abschlagschwimmen"
    },
    "points": {
      "fr": [
        "Une main attend devant que l''autre la rejoigne avant de tirer à son tour.",
        "Garder le bras d''appui bien allongé pendant la respiration.",
        "Chercher la glisse : moins de mouvements par longueur."
      ],
      "en": [
        "One hand waits in front until the other joins it before pulling in turn.",
        "Keep the leading arm long while you breathe.",
        "Look for the glide: fewer strokes per length."
      ],
      "de": [
        "Eine Hand wartet vorn, bis die andere sie erreicht, bevor sie zieht.",
        "Den vorderen Arm beim Atmen lang halten.",
        "Auf das Gleiten achten: weniger Züge pro Bahn."
      ]
    },
    "mistakes": {
      "fr": [
        "Laisser le bras d''appui s''enfoncer pour respirer."
      ],
      "en": [
        "Letting the leading arm sink to breathe."
      ],
      "de": [
        "Den vorderen Arm zum Atmen absinken lassen."
      ]
    }
  },
  {
    "key": "fist",
    "kind": "drill",
    "video": "https://www.youtube.com/watch?v=8Me_va9__NU",
    "name": {
      "fr": "Poings fermés",
      "en": "Fist drill",
      "de": "Faustschwimmen"
    },
    "points": {
      "fr": [
        "Nager le crawl poings fermés.",
        "Sentir l''appui de tout l''avant-bras, coude haut.",
        "Rouvrir les mains en fin de longueur : l''appui paraît plus grand."
      ],
      "en": [
        "Swim front crawl with closed fists.",
        "Feel the whole forearm hold the water, elbow high.",
        "Open the hands for the last strokes: the catch feels bigger."
      ],
      "de": [
        "Kraulen mit geschlossenen Fäusten.",
        "Den ganzen Unterarm am Wasser spüren, Ellbogen hoch.",
        "Am Bahnende die Hände öffnen: der Griff fühlt sich größer an."
      ]
    },
    "mistakes": {
      "fr": [
        "Laisser tomber le coude : on ne tire plus rien."
      ],
      "en": [
        "Dropping the elbow: nothing is pulled any more."
      ],
      "de": [
        "Den Ellbogen fallen lassen: dann zieht man nichts mehr."
      ]
    }
  },
  {
    "key": "side-kick",
    "kind": "drill",
    "video": "https://www.youtube.com/watch?v=9gG0DcdowC4",
    "name": {
      "fr": "Battements sur le côté",
      "en": "Side kick",
      "de": "Seitlage-Beinschlag"
    },
    "points": {
      "fr": [
        "Sur le côté, un bras allongé devant, l''autre le long du corps.",
        "Battements réguliers, tête posée sur le bras, nez vers le fond.",
        "Tourner juste la tête pour respirer, sans lever le menton ; 6 battements puis un mouvement de bras pour changer de côté."
      ],
      "en": [
        "On your side, one arm reaching forward, the other along the body.",
        "Steady kick, head resting on the arm, nose to the bottom.",
        "Turn only the head to breathe, chin down; 6 kicks, then one stroke to switch sides."
      ],
      "de": [
        "Seitlich, ein Arm vorn gestreckt, der andere am Körper.",
        "Gleichmäßiger Beinschlag, Kopf auf dem Arm, Nase zum Boden.",
        "Zum Atmen nur den Kopf drehen, Kinn unten; 6 Kicks, dann ein Armzug zum Seitenwechsel."
      ]
    },
    "mistakes": {
      "fr": [
        "Se mettre à plat ventre ou sur le dos : rester vraiment de côté."
      ],
      "en": [
        "Rolling flat onto the front or back: stay truly on the side."
      ],
      "de": [
        "Auf Bauch oder Rücken kippen: wirklich seitlich bleiben."
      ]
    }
  },
  {
    "key": "breathing-3",
    "kind": "drill",
    "video": "https://www.youtube.com/watch?v=u7Gs2yizOZs",
    "name": {
      "fr": "Respiration tous les 3 temps",
      "en": "Breathing every 3 strokes",
      "de": "Dreieratmung"
    },
    "points": {
      "fr": [
        "Inspirer un coup à droite, un coup à gauche, tous les 3 mouvements de bras.",
        "Souffler dans l''eau en continu pendant les 2 mouvements sans respiration.",
        "Équilibre la rotation et la nage des deux côtés."
      ],
      "en": [
        "Breathe right, then left, every third arm stroke.",
        "Breathe out steadily into the water during the two strokes without a breath.",
        "Balances the roll and the stroke on both sides."
      ],
      "de": [
        "Abwechselnd rechts und links einatmen, bei jedem dritten Armzug.",
        "Während der zwei Züge ohne Atmung gleichmäßig ins Wasser ausatmen.",
        "Gleicht Rotation und Zug auf beiden Seiten aus."
      ]
    },
    "mistakes": {
      "fr": [
        "Bloquer l''air : on arrive à la respiration déjà essoufflé."
      ],
      "en": [
        "Holding the breath: arriving at each breath already out of air."
      ],
      "de": [
        "Die Luft anhalten: man kommt schon außer Atem zur Einatmung."
      ]
    }
  },
  {
    "key": "sculling",
    "kind": "drill",
    "video": "https://www.youtube.com/watch?v=jsTS-EC10KQ",
    "name": {
      "fr": "Godille",
      "en": "Sculling",
      "de": "Wriggeln"
    },
    "points": {
      "fr": [
        "Allongé, bras devant, mains qui balaient l''eau de l''intérieur vers l''extérieur et inversement.",
        "Coudes plus hauts que les mains, petits mouvements, comme un essuie-glace.",
        "Développe la sensation d''appui sur l''eau."
      ],
      "en": [
        "Lying face down, arms in front, hands sweeping in and out.",
        "Elbows higher than the hands, small windscreen-wiper movements.",
        "Builds the feel of holding the water."
      ],
      "de": [
        "In Bauchlage, Arme vorn, die Hände streichen nach innen und außen.",
        "Ellbogen höher als die Hände, kleine Scheibenwischerbewegungen.",
        "Schult das Wassergefühl."
      ]
    },
    "mistakes": {
      "fr": [
        "Faire de grands mouvements de bras : la godille se fait avec les mains."
      ],
      "en": [
        "Making big arm movements: sculling is done with the hands."
      ],
      "de": [
        "Große Armbewegungen machen: gewriggelt wird mit den Händen."
      ]
    }
  },
  {
    "key": "one-arm",
    "kind": "drill",
    "video": "https://www.youtube.com/watch?v=8J0jeC9qTO0",
    "name": {
      "fr": "Nage un bras",
      "en": "One-arm freestyle",
      "de": "Einarmiges Kraulen"
    },
    "points": {
      "fr": [
        "Un bras travaille, l''autre reste le long du corps (ou devant, plus facile).",
        "Respirer du côté du bras immobile pour garder la rotation.",
        "Alterner une longueur de chaque côté."
      ],
      "en": [
        "One arm works, the other stays along the body (or in front, easier).",
        "Breathe to the side of the still arm to keep the roll.",
        "One length on each side."
      ],
      "de": [
        "Ein Arm arbeitet, der andere bleibt am Körper (oder vorn, leichter).",
        "Zur Seite des ruhenden Arms atmen, um die Rotation zu halten.",
        "Eine Bahn je Seite."
      ]
    },
    "mistakes": {
      "fr": [
        "Nager à plat sans rotation des hanches."
      ],
      "en": [
        "Swimming flat, without rolling the hips."
      ],
      "de": [
        "Flach schwimmen, ohne Hüftrotation."
      ]
    }
  },
  {
    "key": "kickboard",
    "kind": "drill",
    "video": "https://www.youtube.com/watch?v=5hcr3o8ziwE",
    "name": {
      "fr": "Battements avec planche",
      "en": "Kick with a board",
      "de": "Beinschlag mit Brett"
    },
    "points": {
      "fr": [
        "Bras allongés sur la planche, visage dans l''eau entre deux respirations.",
        "Battements depuis les hanches, jambes presque tendues, chevilles souples.",
        "Petite amplitude, rythme régulier."
      ],
      "en": [
        "Arms stretched on the board, face in the water between breaths.",
        "Kick from the hips, legs nearly straight, ankles loose.",
        "Small and steady kicks."
      ],
      "de": [
        "Arme auf dem Brett gestreckt, Gesicht zwischen den Atemzügen im Wasser.",
        "Beinschlag aus der Hüfte, Beine fast gestreckt, lockere Fußgelenke.",
        "Kleiner, gleichmäßiger Ausschlag."
      ]
    },
    "mistakes": {
      "fr": [
        "Pédaler en pliant les genoux.",
        "Garder la tête hors de l''eau : les hanches coulent."
      ],
      "en": [
        "Cycling with bent knees.",
        "Keeping the head up: the hips sink."
      ],
      "de": [
        "Radfahren mit gebeugten Knien.",
        "Den Kopf oben halten: die Hüfte sinkt."
      ]
    }
  },
  {
    "key": "pull-buoy",
    "kind": "drill",
    "video": "https://www.youtube.com/watch?v=ITK0chbKegI",
    "name": {
      "fr": "Pull-buoy",
      "en": "Pull buoy",
      "de": "Pull-Buoy"
    },
    "points": {
      "fr": [
        "Le pull-buoy entre les cuisses, on nage avec les bras seuls.",
        "Concentré sur la traction et la rotation, jambes immobiles.",
        "À doser : ne pas s''en servir pour masquer des jambes qui coulent."
      ],
      "en": [
        "The buoy between the thighs, swim with the arms only.",
        "Focus on the pull and the roll, legs still.",
        "In moderation: not to hide sinking legs."
      ],
      "de": [
        "Den Pull-Buoy zwischen die Oberschenkel, nur mit den Armen schwimmen.",
        "Auf Zug und Rotation achten, Beine ruhig.",
        "In Maßen: nicht um absinkende Beine zu überspielen."
      ]
    },
    "mistakes": {
      "fr": [
        "Continuer à battre des jambes et faire tomber le pull-buoy."
      ],
      "en": [
        "Kicking anyway and losing the buoy."
      ],
      "de": [
        "Trotzdem kicken und den Buoy verlieren."
      ]
    }
  },
  {
    "key": "streamline",
    "kind": "drill",
    "video": "https://www.youtube.com/watch?v=fNu622jJe_M",
    "name": {
      "fr": "Coulée",
      "en": "Streamline push-off",
      "de": "Abstoß in Stromlinie"
    },
    "points": {
      "fr": [
        "Pousser fort sur le mur, bras tendus au-dessus de la tête, mains l''une sur l''autre.",
        "Biceps contre les oreilles, corps gainé, regard vers le fond.",
        "Garder la glisse avant de reprendre la nage."
      ],
      "en": [
        "Push hard off the wall, arms straight overhead, one hand on the other.",
        "Biceps against the ears, body tight, eyes on the bottom.",
        "Hold the glide before you start swimming."
      ],
      "de": [
        "Kräftig von der Wand abstoßen, Arme gestreckt über dem Kopf, eine Hand auf der anderen.",
        "Oberarme an den Ohren, Körper gespannt, Blick zum Boden.",
        "Das Gleiten halten, bevor man losschwimmt."
      ]
    },
    "mistakes": {
      "fr": [
        "Relever la tête pendant la coulée : on freine."
      ],
      "en": [
        "Lifting the head during the glide: it brakes."
      ],
      "de": [
        "Den Kopf beim Gleiten heben: das bremst."
      ]
    }
  },
  {
    "key": "flip-turn",
    "kind": "drill",
    "video": "https://www.youtube.com/watch?v=wwLBrxpdfiw",
    "name": {
      "fr": "Virage culbute",
      "en": "Flip turn",
      "de": "Rollwende"
    },
    "points": {
      "fr": [
        "Dernier mouvement de bras, menton vers la poitrine, roulade avant.",
        "Pieds au mur, jambes pliées, on pousse sur le dos ou sur le côté.",
        "Revenir sur le ventre pendant la coulée."
      ],
      "en": [
        "Last arm stroke, chin to the chest, forward roll.",
        "Feet on the wall, legs bent, push off on the back or side.",
        "Turn back onto the front during the glide."
      ],
      "de": [
        "Letzter Armzug, Kinn zur Brust, Vorwärtsrolle.",
        "Füße an die Wand, Beine gebeugt, in Rücken- oder Seitlage abstoßen.",
        "Während des Gleitens auf den Bauch drehen."
      ]
    },
    "mistakes": {
      "fr": [
        "Souffler trop tôt : il ne reste plus d''air sous l''eau."
      ],
      "en": [
        "Breathing out too early: no air left under water."
      ],
      "de": [
        "Zu früh ausatmen: unter Wasser bleibt keine Luft."
      ]
    }
  },
  {
    "key": "sighting",
    "kind": "drill",
    "video": "https://www.youtube.com/watch?v=uwYZqcyYtS0",
    "name": {
      "fr": "Orientation (eau libre)",
      "en": "Sighting (open water)",
      "de": "Orientierung (Freiwasser)"
    },
    "points": {
      "fr": [
        "Tous les 6 à 10 mouvements, lever juste les yeux au ras de l''eau (« yeux de crocodile ») en appuyant sur le bras devant.",
        "Repérer la bouée, puis tourner la tête sur le côté pour respirer.",
        "S''entraîner en piscine en visant un repère au bout du bassin."
      ],
      "en": [
        "Every 6 to 10 strokes, lift just the eyes over the water (\"crocodile eyes\") while pressing on the leading arm.",
        "Spot the buoy, then turn the head to the side to breathe.",
        "Practise in the pool by aiming at a mark at the end of the lane."
      ],
      "de": [
        "Alle 6 bis 10 Züge nur die Augen über das Wasser heben („Krokodilaugen“) und dabei auf den vorderen Arm drücken.",
        "Die Boje anpeilen, dann den Kopf zum Atmen zur Seite drehen.",
        "Im Becken üben, indem man ein Ziel am Bahnende anpeilt."
      ]
    },
    "mistakes": {
      "fr": [
        "Lever toute la tête : les jambes coulent et on ralentit."
      ],
      "en": [
        "Lifting the whole head: the legs sink and you slow down."
      ],
      "de": [
        "Den ganzen Kopf heben: die Beine sinken und man wird langsamer."
      ]
    }
  },
  {
    "key": "fingertip-drag",
    "kind": "drill",
    "video": "https://www.youtube.com/watch?v=36lp6NgDYF0",
    "name": {
      "fr": "Frôlé",
      "en": "Fingertip drag",
      "de": "Fingerspitzen-Ziehen"
    },
    "points": {
      "fr": [
        "Au retour du bras, laisser le bout des doigts frôler la surface.",
        "Coude haut et relâché, main qui passe près du corps.",
        "Améliore le retour de bras et la rotation."
      ],
      "en": [
        "As the arm recovers, let the fingertips skim the surface.",
        "Elbow high and relaxed, hand close to the body.",
        "Improves the arm recovery and the roll."
      ],
      "de": [
        "Bei der Armrückführung die Fingerspitzen über die Oberfläche ziehen.",
        "Ellbogen hoch und locker, Hand nah am Körper.",
        "Verbessert Rückführung und Rotation."
      ]
    },
    "mistakes": {
      "fr": [
        "Sortir le bras tendu sur le côté."
      ],
      "en": [
        "Swinging a straight arm wide over the water."
      ],
      "de": [
        "Den gestreckten Arm seitlich herumschwingen."
      ]
    }
  }
]')
ON CONFLICT (key) DO NOTHING;

INSERT INTO program_templates (name, description, goal, level, days_per_week, home_friendly, structure, is_published, sort_order, locale)
SELECT 'Apprendre le crawl en 8 semaines', 'Deux séances par semaine pour passer de quelques longueurs à 200 m de crawl sans s''arrêter : aisance, battements, respiration, glisse. Pour qui sait nager un peu mais pas encore le crawl.', 'general', 'beginner', 2, false, '[{"name":"S1 · Technique","week":1,"exercises":[],"cardio":{"sport":"swim","distanceKm":0.625,"intensity":"Zone 1-2","purpose":"Se sentir à l''aise dans l''eau et poser les bases du crawl, sans se presser.","steps":["200 m au choix (brasse ou dos), sans forcer","4 × 25 m coulées bras tendus, puis 4 battements, 30 s de pause","4 × 25 m battements avec planche, 30 s de pause","5 × 25 m crawl, 30 s de pause","100 m de retour au calme, très souple"],"techniques":["crawl","streamline","kickboard"]}},{"name":"S1 · Endurance","week":1,"exercises":[],"cardio":{"sport":"swim","distanceKm":0.5,"intensity":"Zone 2","purpose":"Allonger peu à peu les distances en crawl, avec autant de pauses que nécessaire.","steps":["200 m au choix (brasse ou dos), sans forcer","8 × 25 m crawl, 30 s de pause","100 m de retour au calme, très souple"],"techniques":["crawl","breathing-3"]}},{"name":"S2 · Technique","week":2,"exercises":[],"cardio":{"sport":"swim","distanceKm":0.65,"intensity":"Zone 1-2","purpose":"Se sentir à l''aise dans l''eau et poser les bases du crawl, sans se presser.","steps":["200 m au choix (brasse ou dos), sans forcer","4 × 25 m battements avec planche, 30 s de pause","4 × 25 m battements avec planche, 30 s de pause","6 × 25 m crawl, 30 s de pause","100 m de retour au calme, très souple"],"techniques":["crawl","kickboard","kickboard"]}},{"name":"S2 · Endurance","week":2,"exercises":[],"cardio":{"sport":"swim","distanceKm":0.6,"intensity":"Zone 2","purpose":"Allonger peu à peu les distances en crawl, avec autant de pauses que nécessaire.","steps":["200 m au choix (brasse ou dos), sans forcer","6 × 50 m crawl, 30 s de pause","100 m de retour au calme, très souple"],"techniques":["crawl","breathing-3"]}},{"name":"S3 · Technique","week":3,"exercises":[],"cardio":{"sport":"swim","distanceKm":0.675,"intensity":"Zone 1-2","purpose":"Se sentir à l''aise dans l''eau et poser les bases du crawl, sans se presser.","steps":["200 m au choix (brasse ou dos), sans forcer","4 × 25 m battements sur le côté, 30 s de pause","4 × 25 m battements avec planche, 30 s de pause","7 × 25 m crawl, 30 s de pause","100 m de retour au calme, très souple"],"techniques":["crawl","side-kick","kickboard"]}},{"name":"S3 · Endurance","week":3,"exercises":[],"cardio":{"sport":"swim","distanceKm":0.7,"intensity":"Zone 2","purpose":"Allonger peu à peu les distances en crawl, avec autant de pauses que nécessaire.","steps":["200 m au choix (brasse ou dos), sans forcer","8 × 50 m crawl, 30 s de pause","100 m de retour au calme, très souple"],"techniques":["crawl","breathing-3"]}},{"name":"S4 · Technique","week":4,"exercises":[],"cardio":{"sport":"swim","distanceKm":0.7,"intensity":"Zone 1-2","purpose":"Se sentir à l''aise dans l''eau et poser les bases du crawl, sans se presser.","steps":["200 m au choix (brasse ou dos), sans forcer","4 × 25 m battements sur le côté, 30 s de pause","4 × 25 m battements avec planche, 30 s de pause","8 × 25 m crawl, 30 s de pause","100 m de retour au calme, très souple"],"techniques":["crawl","side-kick","kickboard"]}},{"name":"S4 · Endurance","week":4,"exercises":[],"cardio":{"sport":"swim","distanceKm":0.45,"intensity":"Zone 2","purpose":"Allonger peu à peu les distances en crawl, avec autant de pauses que nécessaire.","steps":["200 m au choix (brasse ou dos), sans forcer","6 × 25 m crawl, 30 s de pause","100 m de retour au calme, très souple"],"techniques":["crawl","breathing-3"]}},{"name":"S5 · Technique","week":5,"exercises":[],"cardio":{"sport":"swim","distanceKm":0.725,"intensity":"Zone 1-2","purpose":"Se sentir à l''aise dans l''eau et poser les bases du crawl, sans se presser.","steps":["200 m au choix (brasse ou dos), sans forcer","4 × 25 m rattrapé, 30 s de pause","4 × 25 m battements avec planche, 30 s de pause","9 × 25 m crawl, 30 s de pause","100 m de retour au calme, très souple"],"techniques":["crawl","catch-up","kickboard"]}},{"name":"S5 · Endurance","week":5,"exercises":[],"cardio":{"sport":"swim","distanceKm":0.7,"intensity":"Zone 2","purpose":"Allonger peu à peu les distances en crawl, avec autant de pauses que nécessaire.","steps":["200 m au choix (brasse ou dos), sans forcer","4 × 100 m crawl, 45 s de pause","100 m de retour au calme, très souple"],"techniques":["crawl","breathing-3"]}},{"name":"S6 · Technique","week":6,"exercises":[],"cardio":{"sport":"swim","distanceKm":0.75,"intensity":"Zone 1-2","purpose":"Se sentir à l''aise dans l''eau et poser les bases du crawl, sans se presser.","steps":["200 m au choix (brasse ou dos), sans forcer","4 × 25 m respiration tous les 3 temps, 30 s de pause","4 × 25 m battements avec planche, 30 s de pause","10 × 25 m crawl, 30 s de pause","100 m de retour au calme, très souple"],"techniques":["crawl","breathing-3","kickboard"]}},{"name":"S6 · Endurance","week":6,"exercises":[],"cardio":{"sport":"swim","distanceKm":0.8,"intensity":"Zone 2","purpose":"Allonger peu à peu les distances en crawl, avec autant de pauses que nécessaire.","steps":["200 m au choix (brasse ou dos), sans forcer","5 × 100 m crawl, 45 s de pause","100 m de retour au calme, très souple"],"techniques":["crawl","breathing-3"]}},{"name":"S7 · Technique","week":7,"exercises":[],"cardio":{"sport":"swim","distanceKm":0.75,"intensity":"Zone 1-2","purpose":"Se sentir à l''aise dans l''eau et poser les bases du crawl, sans se presser.","steps":["200 m au choix (brasse ou dos), sans forcer","4 × 25 m rattrapé, 30 s de pause","4 × 25 m battements avec planche, 30 s de pause","10 × 25 m crawl, 30 s de pause","100 m de retour au calme, très souple"],"techniques":["crawl","catch-up","kickboard"]}},{"name":"S7 · Endurance","week":7,"exercises":[],"cardio":{"sport":"swim","distanceKm":0.75,"intensity":"Zone 2","purpose":"Allonger peu à peu les distances en crawl, avec autant de pauses que nécessaire.","steps":["200 m au choix (brasse ou dos), sans forcer","3 × 150 m crawl, 45 s de pause","100 m de retour au calme, très souple"],"techniques":["crawl","breathing-3"]}},{"name":"S8 · Technique","week":8,"exercises":[],"cardio":{"sport":"swim","distanceKm":0.75,"intensity":"Zone 1-2","purpose":"Se sentir à l''aise dans l''eau et poser les bases du crawl, sans se presser.","steps":["200 m au choix (brasse ou dos), sans forcer","4 × 25 m frôlé, 30 s de pause","4 × 25 m battements avec planche, 30 s de pause","10 × 25 m crawl, 30 s de pause","100 m de retour au calme, très souple"],"techniques":["crawl","fingertip-drag","kickboard"]}},{"name":"S8 · Test","week":8,"exercises":[],"cardio":{"sport":"swim","distanceKm":0.5,"intensity":"Zone 2","purpose":"Mesurer le chemin parcouru : 200 m de crawl sans s''arrêter.","steps":["200 m au choix (brasse ou dos), sans forcer","200 m sans s''arrêter","100 m de retour au calme, très souple"],"techniques":["crawl","breathing-3"]}}]'::jsonb, true, 420, 'fr'
WHERE NOT EXISTS (SELECT 1 FROM program_templates WHERE name = 'Apprendre le crawl en 8 semaines' AND locale = 'fr');

INSERT INTO program_templates (name, description, goal, level, days_per_week, home_friendly, structure, is_published, sort_order, locale)
SELECT 'Natation forme', 'Trois séances en rotation, nages variées, sans chrono : pour garder la forme, ménager les articulations et varier ses entraînements.', 'general', 'beginner', 3, false, '[{"name":"Nages variées","exercises":[],"cardio":{"sport":"swim","distanceKm":1.2,"intensity":"Zone 2","purpose":"Faire travailler tout le corps en changeant de nage.","steps":["200 m échauffement souple, nage au choix","4 × 50 m brasse, 20 s de pause","4 × 50 m dos, 20 s de pause","6 × 50 m crawl, 20 s de pause","2 × 100 m crawl avec pull-buoy, 30 s de pause","100 m de retour au calme, très souple"],"techniques":["breaststroke","backstroke","crawl","pull-buoy"]}},{"name":"Endurance","exercises":[],"cardio":{"sport":"swim","distanceKm":1.5,"intensity":"Zone 2","purpose":"Nager longtemps à une allure où l''on peut encore parler entre deux longueurs.","steps":["300 m échauffement souple, nage au choix","3 × 300 m crawl, 60 s de pause","4 × 50 m battements avec planche, 20 s de pause","100 m de retour au calme, très souple"],"techniques":["crawl","kickboard"]}},{"name":"Technique","exercises":[],"cardio":{"sport":"swim","distanceKm":1.2,"intensity":"Zone 2","purpose":"Nager mieux plutôt que plus : la glisse, c''est de la vitesse gratuite.","steps":["200 m échauffement souple, nage au choix","4 × 50 m rattrapé, 20 s de pause","4 × 50 m poings fermés, 20 s de pause","4 × 50 m dos, 20 s de pause","4 × 50 m crawl en cherchant la glisse (un mouvement de moins par longueur), 20 s de pause","200 m de retour au calme, très souple"],"techniques":["catch-up","fist","backstroke","crawl"]}}]'::jsonb, true, 425, 'fr'
WHERE NOT EXISTS (SELECT 1 FROM program_templates WHERE name = 'Natation forme' AND locale = 'fr');

INSERT INTO program_templates (name, description, goal, level, days_per_week, home_friendly, structure, is_published, sort_order, locale)
SELECT 'Vers 1 500 m et 2 km de crawl', 'Trois séances par semaine sur 8 semaines : technique, séries et endurance, jusqu''à 2 km sans s''arrêter, puis un test sur 1 500 m. Pour qui nage déjà 400 m de crawl.', 'endurance', 'intermediate', 3, false, '[{"name":"S1 · Technique","week":1,"exercises":[],"cardio":{"sport":"swim","distanceKm":1.6,"intensity":"Zone 2","purpose":"Nager mieux plutôt que plus : la glisse, c''est de la vitesse gratuite.","steps":["300 m échauffement souple, nage au choix","4 × 50 m rattrapé, 20 s de pause","4 × 50 m battements avec planche, 20 s de pause","6 × 100 m crawl, 20 s de pause","2 × 100 m crawl avec pull-buoy, 30 s de pause","100 m de retour au calme, très souple"],"techniques":["crawl","catch-up","kickboard","pull-buoy"]}},{"name":"S1 · Séries","week":1,"exercises":[],"cardio":{"sport":"swim","distanceKm":1.4,"intensity":"Zone 4","purpose":"Tenir une allure soutenue avec peu de repos.","steps":["400 m échauffement souple, nage au choix","8 × 100 m crawl, 20 s de pause","200 m de retour au calme, très souple"],"techniques":["crawl","streamline"]}},{"name":"S1 · Endurance","week":1,"exercises":[],"cardio":{"sport":"swim","distanceKm":1.1,"intensity":"Zone 2","purpose":"Nager longtemps à une allure où l''on peut encore parler entre deux longueurs.","steps":["200 m échauffement souple, nage au choix","800 m sans s''arrêter","100 m de retour au calme, très souple"],"techniques":["crawl","breathing-3"]}},{"name":"S2 · Technique","week":2,"exercises":[],"cardio":{"sport":"swim","distanceKm":1.6,"intensity":"Zone 2","purpose":"Nager mieux plutôt que plus : la glisse, c''est de la vitesse gratuite.","steps":["300 m échauffement souple, nage au choix","4 × 50 m poings fermés, 20 s de pause","4 × 50 m battements avec planche, 20 s de pause","6 × 100 m crawl, 20 s de pause","2 × 100 m crawl avec pull-buoy, 30 s de pause","100 m de retour au calme, très souple"],"techniques":["crawl","fist","kickboard","pull-buoy"]}},{"name":"S2 · Séries","week":2,"exercises":[],"cardio":{"sport":"swim","distanceKm":1.6,"intensity":"Zone 4","purpose":"Tenir une allure soutenue avec peu de repos.","steps":["400 m échauffement souple, nage au choix","10 × 100 m crawl, 20 s de pause","200 m de retour au calme, très souple"],"techniques":["crawl","streamline"]}},{"name":"S2 · Endurance","week":2,"exercises":[],"cardio":{"sport":"swim","distanceKm":1.3,"intensity":"Zone 2","purpose":"Nager longtemps à une allure où l''on peut encore parler entre deux longueurs.","steps":["200 m échauffement souple, nage au choix","1000 m sans s''arrêter","100 m de retour au calme, très souple"],"techniques":["crawl","breathing-3"]}},{"name":"S3 · Technique","week":3,"exercises":[],"cardio":{"sport":"swim","distanceKm":1.6,"intensity":"Zone 2","purpose":"Nager mieux plutôt que plus : la glisse, c''est de la vitesse gratuite.","steps":["300 m échauffement souple, nage au choix","4 × 50 m battements sur le côté, 20 s de pause","4 × 50 m battements avec planche, 20 s de pause","6 × 100 m crawl, 20 s de pause","2 × 100 m crawl avec pull-buoy, 30 s de pause","100 m de retour au calme, très souple"],"techniques":["crawl","side-kick","kickboard","pull-buoy"]}},{"name":"S3 · Séries","week":3,"exercises":[],"cardio":{"sport":"swim","distanceKm":1.6,"intensity":"Zone 4","purpose":"Tenir une allure soutenue avec peu de repos.","steps":["400 m échauffement souple, nage au choix","5 × 200 m crawl, 30 s de pause","200 m de retour au calme, très souple"],"techniques":["crawl","streamline"]}},{"name":"S3 · Endurance","week":3,"exercises":[],"cardio":{"sport":"swim","distanceKm":1.5,"intensity":"Zone 2","purpose":"Nager longtemps à une allure où l''on peut encore parler entre deux longueurs.","steps":["200 m échauffement souple, nage au choix","1200 m sans s''arrêter","100 m de retour au calme, très souple"],"techniques":["crawl","breathing-3"]}},{"name":"S4 · Technique","week":4,"exercises":[],"cardio":{"sport":"swim","distanceKm":1.6,"intensity":"Zone 2","purpose":"Nager mieux plutôt que plus : la glisse, c''est de la vitesse gratuite.","steps":["300 m échauffement souple, nage au choix","4 × 50 m godille, 20 s de pause","4 × 50 m battements avec planche, 20 s de pause","6 × 100 m crawl, 20 s de pause","2 × 100 m crawl avec pull-buoy, 30 s de pause","100 m de retour au calme, très souple"],"techniques":["crawl","sculling","kickboard","pull-buoy"]}},{"name":"S4 · Séries","week":4,"exercises":[],"cardio":{"sport":"swim","distanceKm":1.2,"intensity":"Zone 2-3","purpose":"Garder du rythme en allégeant avant l''objectif.","steps":["400 m échauffement souple, nage au choix","6 × 100 m crawl, 30 s de pause","200 m de retour au calme, très souple"],"techniques":["crawl","streamline"]}},{"name":"S4 · Endurance","week":4,"exercises":[],"cardio":{"sport":"swim","distanceKm":1.1,"intensity":"Zone 2","purpose":"Nager longtemps à une allure où l''on peut encore parler entre deux longueurs.","steps":["200 m échauffement souple, nage au choix","800 m sans s''arrêter","100 m de retour au calme, très souple"],"techniques":["crawl","breathing-3"]}},{"name":"S5 · Technique","week":5,"exercises":[],"cardio":{"sport":"swim","distanceKm":1.6,"intensity":"Zone 2","purpose":"Nager mieux plutôt que plus : la glisse, c''est de la vitesse gratuite.","steps":["300 m échauffement souple, nage au choix","4 × 50 m nage un bras, 20 s de pause","4 × 50 m battements avec planche, 20 s de pause","6 × 100 m crawl, 20 s de pause","2 × 100 m crawl avec pull-buoy, 30 s de pause","100 m de retour au calme, très souple"],"techniques":["crawl","one-arm","kickboard","pull-buoy"]}},{"name":"S5 · Séries","week":5,"exercises":[],"cardio":{"sport":"swim","distanceKm":1.8,"intensity":"Zone 4","purpose":"Tenir une allure soutenue avec peu de repos.","steps":["400 m échauffement souple, nage au choix","4 × 300 m crawl, 30 s de pause","200 m de retour au calme, très souple"],"techniques":["crawl","flip-turn"]}},{"name":"S5 · Endurance","week":5,"exercises":[],"cardio":{"sport":"swim","distanceKm":1.8,"intensity":"Zone 2","purpose":"Nager longtemps à une allure où l''on peut encore parler entre deux longueurs.","steps":["200 m échauffement souple, nage au choix","1500 m sans s''arrêter","100 m de retour au calme, très souple"],"techniques":["crawl","breathing-3"]}},{"name":"S6 · Technique","week":6,"exercises":[],"cardio":{"sport":"swim","distanceKm":1.6,"intensity":"Zone 2","purpose":"Nager mieux plutôt que plus : la glisse, c''est de la vitesse gratuite.","steps":["300 m échauffement souple, nage au choix","4 × 50 m frôlé, 20 s de pause","4 × 50 m battements avec planche, 20 s de pause","6 × 100 m crawl, 20 s de pause","2 × 100 m crawl avec pull-buoy, 30 s de pause","100 m de retour au calme, très souple"],"techniques":["crawl","fingertip-drag","kickboard","pull-buoy"]}},{"name":"S6 · Séries","week":6,"exercises":[],"cardio":{"sport":"swim","distanceKm":1.8,"intensity":"Zone 4","purpose":"Tenir une allure soutenue avec peu de repos.","steps":["400 m échauffement souple, nage au choix","3 × 400 m crawl, 40 s de pause","200 m de retour au calme, très souple"],"techniques":["crawl","flip-turn"]}},{"name":"S6 · Endurance","week":6,"exercises":[],"cardio":{"sport":"swim","distanceKm":2,"intensity":"Zone 2","purpose":"Nager longtemps à une allure où l''on peut encore parler entre deux longueurs.","steps":["200 m échauffement souple, nage au choix","1700 m sans s''arrêter","100 m de retour au calme, très souple"],"techniques":["crawl","breathing-3"]}},{"name":"S7 · Technique","week":7,"exercises":[],"cardio":{"sport":"swim","distanceKm":1.6,"intensity":"Zone 2","purpose":"Nager mieux plutôt que plus : la glisse, c''est de la vitesse gratuite.","steps":["300 m échauffement souple, nage au choix","4 × 50 m rattrapé, 20 s de pause","4 × 50 m battements avec planche, 20 s de pause","6 × 100 m crawl, 20 s de pause","2 × 100 m crawl avec pull-buoy, 30 s de pause","100 m de retour au calme, très souple"],"techniques":["crawl","catch-up","kickboard","pull-buoy"]}},{"name":"S7 · Séries","week":7,"exercises":[],"cardio":{"sport":"swim","distanceKm":1.8,"intensity":"Zone 4","purpose":"Tenir une allure soutenue avec peu de repos.","steps":["400 m échauffement souple, nage au choix","2 × 600 m crawl, 60 s de pause","200 m de retour au calme, très souple"],"techniques":["crawl","flip-turn"]}},{"name":"S7 · Endurance","week":7,"exercises":[],"cardio":{"sport":"swim","distanceKm":2.3,"intensity":"Zone 2","purpose":"Nager longtemps à une allure où l''on peut encore parler entre deux longueurs.","steps":["200 m échauffement souple, nage au choix","2000 m sans s''arrêter","100 m de retour au calme, très souple"],"techniques":["crawl","breathing-3"]}},{"name":"S8 · Technique","week":8,"exercises":[],"cardio":{"sport":"swim","distanceKm":1.6,"intensity":"Zone 2","purpose":"Nager mieux plutôt que plus : la glisse, c''est de la vitesse gratuite.","steps":["300 m échauffement souple, nage au choix","4 × 50 m respiration tous les 3 temps, 20 s de pause","4 × 50 m battements avec planche, 20 s de pause","6 × 100 m crawl, 20 s de pause","2 × 100 m crawl avec pull-buoy, 30 s de pause","100 m de retour au calme, très souple"],"techniques":["crawl","breathing-3","kickboard","pull-buoy"]}},{"name":"S8 · Séries","week":8,"exercises":[],"cardio":{"sport":"swim","distanceKm":1.4,"intensity":"Zone 2-3","purpose":"Garder du rythme en allégeant avant l''objectif.","steps":["400 m échauffement souple, nage au choix","8 × 100 m crawl, 20 s de pause","200 m de retour au calme, très souple"],"techniques":["crawl","flip-turn"]}},{"name":"S8 · Test","week":8,"exercises":[],"cardio":{"sport":"swim","distanceKm":1.8,"intensity":"Zone 2","purpose":"Atteindre la distance visée, à allure régulière.","steps":["200 m échauffement souple, nage au choix","1500 m sans s''arrêter","100 m de retour au calme, très souple"],"techniques":["crawl","breathing-3"]}}]'::jsonb, true, 430, 'fr'
WHERE NOT EXISTS (SELECT 1 FROM program_templates WHERE name = 'Vers 1 500 m et 2 km de crawl' AND locale = 'fr');

INSERT INTO program_templates (name, description, goal, level, days_per_week, home_friendly, structure, is_published, sort_order, locale)
SELECT 'Prépa triathlon et eau libre', 'Trois séances par semaine sur 8 semaines : orientation, respiration des deux côtés, départs rapides et longues distances sans les murs, jusqu''à une simulation de course. Pour qui nage déjà 800 m de crawl.', 'endurance', 'intermediate', 3, false, '[{"name":"S1 · Technique","week":1,"exercises":[],"cardio":{"sport":"swim","distanceKm":1.6,"intensity":"Zone 2","purpose":"Nager mieux plutôt que plus : la glisse, c''est de la vitesse gratuite.","steps":["300 m échauffement souple, nage au choix","4 × 50 m orientation, yeux de crocodile, 20 s de pause","4 × 50 m respiration tous les 3 temps, 20 s de pause","4 × 50 m rattrapé, 20 s de pause","6 × 100 m crawl en levant les yeux tous les 8 mouvements, 20 s de pause","100 m de retour au calme, très souple"],"techniques":["sighting","breathing-3","catch-up","crawl"]}},{"name":"S1 · Départs et relances","week":1,"exercises":[],"cardio":{"sport":"swim","distanceKm":1.5,"intensity":"Zone 4","purpose":"Partir vite sans s''épuiser, puis trouver son rythme, comme au départ d''un triathlon.","steps":["400 m échauffement souple, nage au choix","6 × 50 m départ rapide sur 15 m puis nage régulière, 20 s de pause","6 × 100 m crawl, 20 s de pause","200 m de retour au calme, très souple"],"techniques":["crawl","sighting"]}},{"name":"S1 · Comme en eau libre","week":1,"exercises":[],"cardio":{"sport":"swim","distanceKm":1.3,"intensity":"Zone 2","purpose":"Nager longtemps sans l''appui des murs, en gardant le cap.","steps":["200 m échauffement souple, nage au choix","1000 m sans s''arrêter, en levant les yeux tous les 8 mouvements, sans pousser aux murs (demi-tour sur place, comme en eau libre)","100 m de retour au calme, très souple"],"techniques":["sighting","crawl","breathing-3"]}},{"name":"S2 · Technique","week":2,"exercises":[],"cardio":{"sport":"swim","distanceKm":1.6,"intensity":"Zone 2","purpose":"Nager mieux plutôt que plus : la glisse, c''est de la vitesse gratuite.","steps":["300 m échauffement souple, nage au choix","4 × 50 m orientation, yeux de crocodile, 20 s de pause","4 × 50 m respiration tous les 3 temps, 20 s de pause","4 × 50 m rattrapé, 20 s de pause","6 × 100 m crawl en levant les yeux tous les 8 mouvements, 20 s de pause","100 m de retour au calme, très souple"],"techniques":["sighting","breathing-3","catch-up","crawl"]}},{"name":"S2 · Départs et relances","week":2,"exercises":[],"cardio":{"sport":"swim","distanceKm":1.7,"intensity":"Zone 4","purpose":"Partir vite sans s''épuiser, puis trouver son rythme, comme au départ d''un triathlon.","steps":["400 m échauffement souple, nage au choix","6 × 50 m départ rapide sur 15 m puis nage régulière, 20 s de pause","8 × 100 m crawl, 20 s de pause","200 m de retour au calme, très souple"],"techniques":["crawl","sighting"]}},{"name":"S2 · Comme en eau libre","week":2,"exercises":[],"cardio":{"sport":"swim","distanceKm":1.5,"intensity":"Zone 2","purpose":"Nager longtemps sans l''appui des murs, en gardant le cap.","steps":["200 m échauffement souple, nage au choix","1200 m sans s''arrêter, en levant les yeux tous les 8 mouvements, sans pousser aux murs (demi-tour sur place, comme en eau libre)","100 m de retour au calme, très souple"],"techniques":["sighting","crawl","breathing-3"]}},{"name":"S3 · Technique","week":3,"exercises":[],"cardio":{"sport":"swim","distanceKm":1.6,"intensity":"Zone 2","purpose":"Nager mieux plutôt que plus : la glisse, c''est de la vitesse gratuite.","steps":["300 m échauffement souple, nage au choix","4 × 50 m orientation, yeux de crocodile, 20 s de pause","4 × 50 m respiration tous les 3 temps, 20 s de pause","4 × 50 m rattrapé, 20 s de pause","6 × 100 m crawl en levant les yeux tous les 8 mouvements, 20 s de pause","100 m de retour au calme, très souple"],"techniques":["sighting","breathing-3","catch-up","crawl"]}},{"name":"S3 · Départs et relances","week":3,"exercises":[],"cardio":{"sport":"swim","distanceKm":1.7,"intensity":"Zone 4","purpose":"Partir vite sans s''épuiser, puis trouver son rythme, comme au départ d''un triathlon.","steps":["400 m échauffement souple, nage au choix","6 × 50 m départ rapide sur 15 m puis nage régulière, 20 s de pause","4 × 200 m crawl, 30 s de pause","200 m de retour au calme, très souple"],"techniques":["crawl","sighting"]}},{"name":"S3 · Comme en eau libre","week":3,"exercises":[],"cardio":{"sport":"swim","distanceKm":1.8,"intensity":"Zone 2","purpose":"Nager longtemps sans l''appui des murs, en gardant le cap.","steps":["200 m échauffement souple, nage au choix","1500 m sans s''arrêter, en levant les yeux tous les 8 mouvements, sans pousser aux murs (demi-tour sur place, comme en eau libre)","100 m de retour au calme, très souple"],"techniques":["sighting","crawl","breathing-3"]}},{"name":"S4 · Technique","week":4,"exercises":[],"cardio":{"sport":"swim","distanceKm":1.6,"intensity":"Zone 2","purpose":"Nager mieux plutôt que plus : la glisse, c''est de la vitesse gratuite.","steps":["300 m échauffement souple, nage au choix","4 × 50 m orientation, yeux de crocodile, 20 s de pause","4 × 50 m respiration tous les 3 temps, 20 s de pause","4 × 50 m rattrapé, 20 s de pause","6 × 100 m crawl en levant les yeux tous les 8 mouvements, 20 s de pause","100 m de retour au calme, très souple"],"techniques":["sighting","breathing-3","catch-up","crawl"]}},{"name":"S4 · Départs et relances","week":4,"exercises":[],"cardio":{"sport":"swim","distanceKm":1.5,"intensity":"Zone 2-3","purpose":"Garder du rythme en allégeant avant l''objectif.","steps":["400 m échauffement souple, nage au choix","6 × 50 m départ rapide sur 15 m puis nage régulière, 20 s de pause","6 × 100 m crawl, 30 s de pause","200 m de retour au calme, très souple"],"techniques":["crawl","sighting"]}},{"name":"S4 · Comme en eau libre","week":4,"exercises":[],"cardio":{"sport":"swim","distanceKm":1.3,"intensity":"Zone 2","purpose":"Nager longtemps sans l''appui des murs, en gardant le cap.","steps":["200 m échauffement souple, nage au choix","1000 m sans s''arrêter, en levant les yeux tous les 8 mouvements, sans pousser aux murs (demi-tour sur place, comme en eau libre)","100 m de retour au calme, très souple"],"techniques":["sighting","crawl","breathing-3"]}},{"name":"S5 · Technique","week":5,"exercises":[],"cardio":{"sport":"swim","distanceKm":1.6,"intensity":"Zone 2","purpose":"Nager mieux plutôt que plus : la glisse, c''est de la vitesse gratuite.","steps":["300 m échauffement souple, nage au choix","4 × 50 m orientation, yeux de crocodile, 20 s de pause","4 × 50 m respiration tous les 3 temps, 20 s de pause","4 × 50 m rattrapé, 20 s de pause","6 × 100 m crawl en levant les yeux tous les 8 mouvements, 20 s de pause","100 m de retour au calme, très souple"],"techniques":["sighting","breathing-3","catch-up","crawl"]}},{"name":"S5 · Départs et relances","week":5,"exercises":[],"cardio":{"sport":"swim","distanceKm":1.9,"intensity":"Zone 4","purpose":"Partir vite sans s''épuiser, puis trouver son rythme, comme au départ d''un triathlon.","steps":["400 m échauffement souple, nage au choix","6 × 50 m départ rapide sur 15 m puis nage régulière, 20 s de pause","5 × 200 m crawl, 30 s de pause","200 m de retour au calme, très souple"],"techniques":["crawl","sighting"]}},{"name":"S5 · Comme en eau libre","week":5,"exercises":[],"cardio":{"sport":"swim","distanceKm":2.1,"intensity":"Zone 2","purpose":"Nager longtemps sans l''appui des murs, en gardant le cap.","steps":["200 m échauffement souple, nage au choix","1800 m sans s''arrêter, en levant les yeux tous les 8 mouvements, sans pousser aux murs (demi-tour sur place, comme en eau libre)","100 m de retour au calme, très souple"],"techniques":["sighting","crawl","breathing-3"],"notes":"En eau libre, ne nagez jamais seul : un accompagnant, une bouée de sécurité visible."}},{"name":"S6 · Technique","week":6,"exercises":[],"cardio":{"sport":"swim","distanceKm":1.6,"intensity":"Zone 2","purpose":"Nager mieux plutôt que plus : la glisse, c''est de la vitesse gratuite.","steps":["300 m échauffement souple, nage au choix","4 × 50 m orientation, yeux de crocodile, 20 s de pause","4 × 50 m respiration tous les 3 temps, 20 s de pause","4 × 50 m rattrapé, 20 s de pause","6 × 100 m crawl en levant les yeux tous les 8 mouvements, 20 s de pause","100 m de retour au calme, très souple"],"techniques":["sighting","breathing-3","catch-up","crawl"]}},{"name":"S6 · Départs et relances","week":6,"exercises":[],"cardio":{"sport":"swim","distanceKm":2.1,"intensity":"Zone 4","purpose":"Partir vite sans s''épuiser, puis trouver son rythme, comme au départ d''un triathlon.","steps":["400 m échauffement souple, nage au choix","6 × 50 m départ rapide sur 15 m puis nage régulière, 20 s de pause","4 × 300 m crawl, 30 s de pause","200 m de retour au calme, très souple"],"techniques":["crawl","sighting"]}},{"name":"S6 · Comme en eau libre","week":6,"exercises":[],"cardio":{"sport":"swim","distanceKm":2.3,"intensity":"Zone 2","purpose":"Nager longtemps sans l''appui des murs, en gardant le cap.","steps":["200 m échauffement souple, nage au choix","2000 m sans s''arrêter, en levant les yeux tous les 8 mouvements, sans pousser aux murs (demi-tour sur place, comme en eau libre)","100 m de retour au calme, très souple"],"techniques":["sighting","crawl","breathing-3"],"notes":"En eau libre, ne nagez jamais seul : un accompagnant, une bouée de sécurité visible."}},{"name":"S7 · Technique","week":7,"exercises":[],"cardio":{"sport":"swim","distanceKm":1.6,"intensity":"Zone 2","purpose":"Nager mieux plutôt que plus : la glisse, c''est de la vitesse gratuite.","steps":["300 m échauffement souple, nage au choix","4 × 50 m orientation, yeux de crocodile, 20 s de pause","4 × 50 m respiration tous les 3 temps, 20 s de pause","4 × 50 m rattrapé, 20 s de pause","6 × 100 m crawl en levant les yeux tous les 8 mouvements, 20 s de pause","100 m de retour au calme, très souple"],"techniques":["sighting","breathing-3","catch-up","crawl"]}},{"name":"S7 · Départs et relances","week":7,"exercises":[],"cardio":{"sport":"swim","distanceKm":2.1,"intensity":"Zone 4","purpose":"Partir vite sans s''épuiser, puis trouver son rythme, comme au départ d''un triathlon.","steps":["400 m échauffement souple, nage au choix","6 × 50 m départ rapide sur 15 m puis nage régulière, 20 s de pause","3 × 400 m crawl, 40 s de pause","200 m de retour au calme, très souple"],"techniques":["crawl","sighting"]}},{"name":"S7 · Comme en eau libre","week":7,"exercises":[],"cardio":{"sport":"swim","distanceKm":2.5,"intensity":"Zone 2","purpose":"Nager longtemps sans l''appui des murs, en gardant le cap.","steps":["200 m échauffement souple, nage au choix","2200 m sans s''arrêter, en levant les yeux tous les 8 mouvements, sans pousser aux murs (demi-tour sur place, comme en eau libre)","100 m de retour au calme, très souple"],"techniques":["sighting","crawl","breathing-3"],"notes":"En eau libre, ne nagez jamais seul : un accompagnant, une bouée de sécurité visible."}},{"name":"S8 · Technique","week":8,"exercises":[],"cardio":{"sport":"swim","distanceKm":1.6,"intensity":"Zone 2","purpose":"Nager mieux plutôt que plus : la glisse, c''est de la vitesse gratuite.","steps":["300 m échauffement souple, nage au choix","4 × 50 m orientation, yeux de crocodile, 20 s de pause","4 × 50 m respiration tous les 3 temps, 20 s de pause","4 × 50 m rattrapé, 20 s de pause","6 × 100 m crawl en levant les yeux tous les 8 mouvements, 20 s de pause","100 m de retour au calme, très souple"],"techniques":["sighting","breathing-3","catch-up","crawl"]}},{"name":"S8 · Départs et relances","week":8,"exercises":[],"cardio":{"sport":"swim","distanceKm":1.5,"intensity":"Zone 2-3","purpose":"Garder du rythme en allégeant avant l''objectif.","steps":["400 m échauffement souple, nage au choix","6 × 50 m départ rapide sur 15 m puis nage régulière, 20 s de pause","6 × 100 m crawl, 20 s de pause","200 m de retour au calme, très souple"],"techniques":["crawl","sighting"]}},{"name":"S8 · Simulation de course","week":8,"exercises":[],"cardio":{"sport":"swim","distanceKm":2,"intensity":"Zone 3","purpose":"Répéter la course : départ rapide, orientation, allure tenue jusqu''au bout.","steps":["300 m échauffement souple, nage au choix","1500 m sans s''arrêter, départ rapide sur 15 m puis nage régulière, en levant les yeux tous les 8 mouvements, sans pousser aux murs (demi-tour sur place, comme en eau libre)","200 m de retour au calme, très souple"],"techniques":["sighting","crawl"],"notes":"En eau libre, ne nagez jamais seul : un accompagnant, une bouée de sécurité visible."}}]'::jsonb, true, 435, 'fr'
WHERE NOT EXISTS (SELECT 1 FROM program_templates WHERE name = 'Prépa triathlon et eau libre' AND locale = 'fr');

INSERT INTO program_templates (name, description, goal, level, days_per_week, home_friendly, structure, is_published, sort_order, locale)
SELECT 'Learn front crawl in 8 weeks', 'Two sessions a week to go from a few lengths to 200 m of front crawl without stopping: comfort, kick, breathing, glide. For those who can swim a little but not front crawl yet.', 'general', 'beginner', 2, false, '[{"name":"W1 · Technique","week":1,"exercises":[],"cardio":{"sport":"swim","distanceKm":0.625,"intensity":"Zone 1-2","purpose":"Feel at ease in the water and lay the foundations of front crawl, without rushing.","steps":["200 m any stroke (breaststroke or backstroke), easy","4 × 25 m streamline push-offs, then 4 kicks, 30 s rest","4 × 25 m kick with a board, 30 s rest","5 × 25 m front crawl, 30 s rest","100 m cool-down, very easy"],"techniques":["crawl","streamline","kickboard"]}},{"name":"W1 · Endurance","week":1,"exercises":[],"cardio":{"sport":"swim","distanceKm":0.5,"intensity":"Zone 2","purpose":"Stretch the front crawl distances little by little, with as many rests as you need.","steps":["200 m any stroke (breaststroke or backstroke), easy","8 × 25 m front crawl, 30 s rest","100 m cool-down, very easy"],"techniques":["crawl","breathing-3"]}},{"name":"W2 · Technique","week":2,"exercises":[],"cardio":{"sport":"swim","distanceKm":0.65,"intensity":"Zone 1-2","purpose":"Feel at ease in the water and lay the foundations of front crawl, without rushing.","steps":["200 m any stroke (breaststroke or backstroke), easy","4 × 25 m kick with a board, 30 s rest","4 × 25 m kick with a board, 30 s rest","6 × 25 m front crawl, 30 s rest","100 m cool-down, very easy"],"techniques":["crawl","kickboard","kickboard"]}},{"name":"W2 · Endurance","week":2,"exercises":[],"cardio":{"sport":"swim","distanceKm":0.6,"intensity":"Zone 2","purpose":"Stretch the front crawl distances little by little, with as many rests as you need.","steps":["200 m any stroke (breaststroke or backstroke), easy","6 × 50 m front crawl, 30 s rest","100 m cool-down, very easy"],"techniques":["crawl","breathing-3"]}},{"name":"W3 · Technique","week":3,"exercises":[],"cardio":{"sport":"swim","distanceKm":0.675,"intensity":"Zone 1-2","purpose":"Feel at ease in the water and lay the foundations of front crawl, without rushing.","steps":["200 m any stroke (breaststroke or backstroke), easy","4 × 25 m side kick, 30 s rest","4 × 25 m kick with a board, 30 s rest","7 × 25 m front crawl, 30 s rest","100 m cool-down, very easy"],"techniques":["crawl","side-kick","kickboard"]}},{"name":"W3 · Endurance","week":3,"exercises":[],"cardio":{"sport":"swim","distanceKm":0.7,"intensity":"Zone 2","purpose":"Stretch the front crawl distances little by little, with as many rests as you need.","steps":["200 m any stroke (breaststroke or backstroke), easy","8 × 50 m front crawl, 30 s rest","100 m cool-down, very easy"],"techniques":["crawl","breathing-3"]}},{"name":"W4 · Technique","week":4,"exercises":[],"cardio":{"sport":"swim","distanceKm":0.7,"intensity":"Zone 1-2","purpose":"Feel at ease in the water and lay the foundations of front crawl, without rushing.","steps":["200 m any stroke (breaststroke or backstroke), easy","4 × 25 m side kick, 30 s rest","4 × 25 m kick with a board, 30 s rest","8 × 25 m front crawl, 30 s rest","100 m cool-down, very easy"],"techniques":["crawl","side-kick","kickboard"]}},{"name":"W4 · Endurance","week":4,"exercises":[],"cardio":{"sport":"swim","distanceKm":0.45,"intensity":"Zone 2","purpose":"Stretch the front crawl distances little by little, with as many rests as you need.","steps":["200 m any stroke (breaststroke or backstroke), easy","6 × 25 m front crawl, 30 s rest","100 m cool-down, very easy"],"techniques":["crawl","breathing-3"]}},{"name":"W5 · Technique","week":5,"exercises":[],"cardio":{"sport":"swim","distanceKm":0.725,"intensity":"Zone 1-2","purpose":"Feel at ease in the water and lay the foundations of front crawl, without rushing.","steps":["200 m any stroke (breaststroke or backstroke), easy","4 × 25 m catch-up, 30 s rest","4 × 25 m kick with a board, 30 s rest","9 × 25 m front crawl, 30 s rest","100 m cool-down, very easy"],"techniques":["crawl","catch-up","kickboard"]}},{"name":"W5 · Endurance","week":5,"exercises":[],"cardio":{"sport":"swim","distanceKm":0.7,"intensity":"Zone 2","purpose":"Stretch the front crawl distances little by little, with as many rests as you need.","steps":["200 m any stroke (breaststroke or backstroke), easy","4 × 100 m front crawl, 45 s rest","100 m cool-down, very easy"],"techniques":["crawl","breathing-3"]}},{"name":"W6 · Technique","week":6,"exercises":[],"cardio":{"sport":"swim","distanceKm":0.75,"intensity":"Zone 1-2","purpose":"Feel at ease in the water and lay the foundations of front crawl, without rushing.","steps":["200 m any stroke (breaststroke or backstroke), easy","4 × 25 m breathing every 3 strokes, 30 s rest","4 × 25 m kick with a board, 30 s rest","10 × 25 m front crawl, 30 s rest","100 m cool-down, very easy"],"techniques":["crawl","breathing-3","kickboard"]}},{"name":"W6 · Endurance","week":6,"exercises":[],"cardio":{"sport":"swim","distanceKm":0.8,"intensity":"Zone 2","purpose":"Stretch the front crawl distances little by little, with as many rests as you need.","steps":["200 m any stroke (breaststroke or backstroke), easy","5 × 100 m front crawl, 45 s rest","100 m cool-down, very easy"],"techniques":["crawl","breathing-3"]}},{"name":"W7 · Technique","week":7,"exercises":[],"cardio":{"sport":"swim","distanceKm":0.75,"intensity":"Zone 1-2","purpose":"Feel at ease in the water and lay the foundations of front crawl, without rushing.","steps":["200 m any stroke (breaststroke or backstroke), easy","4 × 25 m catch-up, 30 s rest","4 × 25 m kick with a board, 30 s rest","10 × 25 m front crawl, 30 s rest","100 m cool-down, very easy"],"techniques":["crawl","catch-up","kickboard"]}},{"name":"W7 · Endurance","week":7,"exercises":[],"cardio":{"sport":"swim","distanceKm":0.75,"intensity":"Zone 2","purpose":"Stretch the front crawl distances little by little, with as many rests as you need.","steps":["200 m any stroke (breaststroke or backstroke), easy","3 × 150 m front crawl, 45 s rest","100 m cool-down, very easy"],"techniques":["crawl","breathing-3"]}},{"name":"W8 · Technique","week":8,"exercises":[],"cardio":{"sport":"swim","distanceKm":0.75,"intensity":"Zone 1-2","purpose":"Feel at ease in the water and lay the foundations of front crawl, without rushing.","steps":["200 m any stroke (breaststroke or backstroke), easy","4 × 25 m fingertip drag, 30 s rest","4 × 25 m kick with a board, 30 s rest","10 × 25 m front crawl, 30 s rest","100 m cool-down, very easy"],"techniques":["crawl","fingertip-drag","kickboard"]}},{"name":"W8 · Test","week":8,"exercises":[],"cardio":{"sport":"swim","distanceKm":0.5,"intensity":"Zone 2","purpose":"See how far you have come: 200 m of front crawl without stopping.","steps":["200 m any stroke (breaststroke or backstroke), easy","200 m without stopping","100 m cool-down, very easy"],"techniques":["crawl","breathing-3"]}}]'::jsonb, true, 420, 'en'
WHERE NOT EXISTS (SELECT 1 FROM program_templates WHERE name = 'Learn front crawl in 8 weeks' AND locale = 'en');

INSERT INTO program_templates (name, description, goal, level, days_per_week, home_friendly, structure, is_published, sort_order, locale)
SELECT 'Swim for fitness', 'Three sessions in rotation, mixed strokes, no stopwatch: to stay fit, spare the joints and vary your training.', 'general', 'beginner', 3, false, '[{"name":"Mixed strokes","exercises":[],"cardio":{"sport":"swim","distanceKm":1.2,"intensity":"Zone 2","purpose":"Work the whole body by changing strokes.","steps":["200 m easy warm-up, any stroke","4 × 50 m breaststroke, 20 s rest","4 × 50 m backstroke, 20 s rest","6 × 50 m front crawl, 20 s rest","2 × 100 m front crawl with a pull buoy, 30 s rest","100 m cool-down, very easy"],"techniques":["breaststroke","backstroke","crawl","pull-buoy"]}},{"name":"Endurance","exercises":[],"cardio":{"sport":"swim","distanceKm":1.5,"intensity":"Zone 2","purpose":"Swim for long at a pace where you could still talk between lengths.","steps":["300 m easy warm-up, any stroke","3 × 300 m front crawl, 60 s rest","4 × 50 m kick with a board, 20 s rest","100 m cool-down, very easy"],"techniques":["crawl","kickboard"]}},{"name":"Technique","exercises":[],"cardio":{"sport":"swim","distanceKm":1.2,"intensity":"Zone 2","purpose":"Swim better rather than more: a good glide is free speed.","steps":["200 m easy warm-up, any stroke","4 × 50 m catch-up, 20 s rest","4 × 50 m fist drill, 20 s rest","4 × 50 m backstroke, 20 s rest","4 × 50 m front crawl looking for the glide (one stroke fewer per length), 20 s rest","200 m cool-down, very easy"],"techniques":["catch-up","fist","backstroke","crawl"]}}]'::jsonb, true, 425, 'en'
WHERE NOT EXISTS (SELECT 1 FROM program_templates WHERE name = 'Swim for fitness' AND locale = 'en');

INSERT INTO program_templates (name, description, goal, level, days_per_week, home_friendly, structure, is_published, sort_order, locale)
SELECT 'Towards 1,500 m and 2 km of front crawl', 'Three sessions a week for 8 weeks: technique, sets and endurance, up to 2 km without stopping, then a 1,500 m test. For those who already swim 400 m of front crawl.', 'endurance', 'intermediate', 3, false, '[{"name":"W1 · Technique","week":1,"exercises":[],"cardio":{"sport":"swim","distanceKm":1.6,"intensity":"Zone 2","purpose":"Swim better rather than more: a good glide is free speed.","steps":["300 m easy warm-up, any stroke","4 × 50 m catch-up, 20 s rest","4 × 50 m kick with a board, 20 s rest","6 × 100 m front crawl, 20 s rest","2 × 100 m front crawl with a pull buoy, 30 s rest","100 m cool-down, very easy"],"techniques":["crawl","catch-up","kickboard","pull-buoy"]}},{"name":"W1 · Sets","week":1,"exercises":[],"cardio":{"sport":"swim","distanceKm":1.4,"intensity":"Zone 4","purpose":"Hold a strong pace with little rest.","steps":["400 m easy warm-up, any stroke","8 × 100 m front crawl, 20 s rest","200 m cool-down, very easy"],"techniques":["crawl","streamline"]}},{"name":"W1 · Endurance","week":1,"exercises":[],"cardio":{"sport":"swim","distanceKm":1.1,"intensity":"Zone 2","purpose":"Swim for long at a pace where you could still talk between lengths.","steps":["200 m easy warm-up, any stroke","800 m without stopping","100 m cool-down, very easy"],"techniques":["crawl","breathing-3"]}},{"name":"W2 · Technique","week":2,"exercises":[],"cardio":{"sport":"swim","distanceKm":1.6,"intensity":"Zone 2","purpose":"Swim better rather than more: a good glide is free speed.","steps":["300 m easy warm-up, any stroke","4 × 50 m fist drill, 20 s rest","4 × 50 m kick with a board, 20 s rest","6 × 100 m front crawl, 20 s rest","2 × 100 m front crawl with a pull buoy, 30 s rest","100 m cool-down, very easy"],"techniques":["crawl","fist","kickboard","pull-buoy"]}},{"name":"W2 · Sets","week":2,"exercises":[],"cardio":{"sport":"swim","distanceKm":1.6,"intensity":"Zone 4","purpose":"Hold a strong pace with little rest.","steps":["400 m easy warm-up, any stroke","10 × 100 m front crawl, 20 s rest","200 m cool-down, very easy"],"techniques":["crawl","streamline"]}},{"name":"W2 · Endurance","week":2,"exercises":[],"cardio":{"sport":"swim","distanceKm":1.3,"intensity":"Zone 2","purpose":"Swim for long at a pace where you could still talk between lengths.","steps":["200 m easy warm-up, any stroke","1000 m without stopping","100 m cool-down, very easy"],"techniques":["crawl","breathing-3"]}},{"name":"W3 · Technique","week":3,"exercises":[],"cardio":{"sport":"swim","distanceKm":1.6,"intensity":"Zone 2","purpose":"Swim better rather than more: a good glide is free speed.","steps":["300 m easy warm-up, any stroke","4 × 50 m side kick, 20 s rest","4 × 50 m kick with a board, 20 s rest","6 × 100 m front crawl, 20 s rest","2 × 100 m front crawl with a pull buoy, 30 s rest","100 m cool-down, very easy"],"techniques":["crawl","side-kick","kickboard","pull-buoy"]}},{"name":"W3 · Sets","week":3,"exercises":[],"cardio":{"sport":"swim","distanceKm":1.6,"intensity":"Zone 4","purpose":"Hold a strong pace with little rest.","steps":["400 m easy warm-up, any stroke","5 × 200 m front crawl, 30 s rest","200 m cool-down, very easy"],"techniques":["crawl","streamline"]}},{"name":"W3 · Endurance","week":3,"exercises":[],"cardio":{"sport":"swim","distanceKm":1.5,"intensity":"Zone 2","purpose":"Swim for long at a pace where you could still talk between lengths.","steps":["200 m easy warm-up, any stroke","1200 m without stopping","100 m cool-down, very easy"],"techniques":["crawl","breathing-3"]}},{"name":"W4 · Technique","week":4,"exercises":[],"cardio":{"sport":"swim","distanceKm":1.6,"intensity":"Zone 2","purpose":"Swim better rather than more: a good glide is free speed.","steps":["300 m easy warm-up, any stroke","4 × 50 m sculling, 20 s rest","4 × 50 m kick with a board, 20 s rest","6 × 100 m front crawl, 20 s rest","2 × 100 m front crawl with a pull buoy, 30 s rest","100 m cool-down, very easy"],"techniques":["crawl","sculling","kickboard","pull-buoy"]}},{"name":"W4 · Sets","week":4,"exercises":[],"cardio":{"sport":"swim","distanceKm":1.2,"intensity":"Zone 2-3","purpose":"Keep some rhythm while easing off before the goal.","steps":["400 m easy warm-up, any stroke","6 × 100 m front crawl, 30 s rest","200 m cool-down, very easy"],"techniques":["crawl","streamline"]}},{"name":"W4 · Endurance","week":4,"exercises":[],"cardio":{"sport":"swim","distanceKm":1.1,"intensity":"Zone 2","purpose":"Swim for long at a pace where you could still talk between lengths.","steps":["200 m easy warm-up, any stroke","800 m without stopping","100 m cool-down, very easy"],"techniques":["crawl","breathing-3"]}},{"name":"W5 · Technique","week":5,"exercises":[],"cardio":{"sport":"swim","distanceKm":1.6,"intensity":"Zone 2","purpose":"Swim better rather than more: a good glide is free speed.","steps":["300 m easy warm-up, any stroke","4 × 50 m one-arm freestyle, 20 s rest","4 × 50 m kick with a board, 20 s rest","6 × 100 m front crawl, 20 s rest","2 × 100 m front crawl with a pull buoy, 30 s rest","100 m cool-down, very easy"],"techniques":["crawl","one-arm","kickboard","pull-buoy"]}},{"name":"W5 · Sets","week":5,"exercises":[],"cardio":{"sport":"swim","distanceKm":1.8,"intensity":"Zone 4","purpose":"Hold a strong pace with little rest.","steps":["400 m easy warm-up, any stroke","4 × 300 m front crawl, 30 s rest","200 m cool-down, very easy"],"techniques":["crawl","flip-turn"]}},{"name":"W5 · Endurance","week":5,"exercises":[],"cardio":{"sport":"swim","distanceKm":1.8,"intensity":"Zone 2","purpose":"Swim for long at a pace where you could still talk between lengths.","steps":["200 m easy warm-up, any stroke","1500 m without stopping","100 m cool-down, very easy"],"techniques":["crawl","breathing-3"]}},{"name":"W6 · Technique","week":6,"exercises":[],"cardio":{"sport":"swim","distanceKm":1.6,"intensity":"Zone 2","purpose":"Swim better rather than more: a good glide is free speed.","steps":["300 m easy warm-up, any stroke","4 × 50 m fingertip drag, 20 s rest","4 × 50 m kick with a board, 20 s rest","6 × 100 m front crawl, 20 s rest","2 × 100 m front crawl with a pull buoy, 30 s rest","100 m cool-down, very easy"],"techniques":["crawl","fingertip-drag","kickboard","pull-buoy"]}},{"name":"W6 · Sets","week":6,"exercises":[],"cardio":{"sport":"swim","distanceKm":1.8,"intensity":"Zone 4","purpose":"Hold a strong pace with little rest.","steps":["400 m easy warm-up, any stroke","3 × 400 m front crawl, 40 s rest","200 m cool-down, very easy"],"techniques":["crawl","flip-turn"]}},{"name":"W6 · Endurance","week":6,"exercises":[],"cardio":{"sport":"swim","distanceKm":2,"intensity":"Zone 2","purpose":"Swim for long at a pace where you could still talk between lengths.","steps":["200 m easy warm-up, any stroke","1700 m without stopping","100 m cool-down, very easy"],"techniques":["crawl","breathing-3"]}},{"name":"W7 · Technique","week":7,"exercises":[],"cardio":{"sport":"swim","distanceKm":1.6,"intensity":"Zone 2","purpose":"Swim better rather than more: a good glide is free speed.","steps":["300 m easy warm-up, any stroke","4 × 50 m catch-up, 20 s rest","4 × 50 m kick with a board, 20 s rest","6 × 100 m front crawl, 20 s rest","2 × 100 m front crawl with a pull buoy, 30 s rest","100 m cool-down, very easy"],"techniques":["crawl","catch-up","kickboard","pull-buoy"]}},{"name":"W7 · Sets","week":7,"exercises":[],"cardio":{"sport":"swim","distanceKm":1.8,"intensity":"Zone 4","purpose":"Hold a strong pace with little rest.","steps":["400 m easy warm-up, any stroke","2 × 600 m front crawl, 60 s rest","200 m cool-down, very easy"],"techniques":["crawl","flip-turn"]}},{"name":"W7 · Endurance","week":7,"exercises":[],"cardio":{"sport":"swim","distanceKm":2.3,"intensity":"Zone 2","purpose":"Swim for long at a pace where you could still talk between lengths.","steps":["200 m easy warm-up, any stroke","2000 m without stopping","100 m cool-down, very easy"],"techniques":["crawl","breathing-3"]}},{"name":"W8 · Technique","week":8,"exercises":[],"cardio":{"sport":"swim","distanceKm":1.6,"intensity":"Zone 2","purpose":"Swim better rather than more: a good glide is free speed.","steps":["300 m easy warm-up, any stroke","4 × 50 m breathing every 3 strokes, 20 s rest","4 × 50 m kick with a board, 20 s rest","6 × 100 m front crawl, 20 s rest","2 × 100 m front crawl with a pull buoy, 30 s rest","100 m cool-down, very easy"],"techniques":["crawl","breathing-3","kickboard","pull-buoy"]}},{"name":"W8 · Sets","week":8,"exercises":[],"cardio":{"sport":"swim","distanceKm":1.4,"intensity":"Zone 2-3","purpose":"Keep some rhythm while easing off before the goal.","steps":["400 m easy warm-up, any stroke","8 × 100 m front crawl, 20 s rest","200 m cool-down, very easy"],"techniques":["crawl","flip-turn"]}},{"name":"W8 · Test","week":8,"exercises":[],"cardio":{"sport":"swim","distanceKm":1.8,"intensity":"Zone 2","purpose":"Reach the distance you aimed at, at a steady pace.","steps":["200 m easy warm-up, any stroke","1500 m without stopping","100 m cool-down, very easy"],"techniques":["crawl","breathing-3"]}}]'::jsonb, true, 430, 'en'
WHERE NOT EXISTS (SELECT 1 FROM program_templates WHERE name = 'Towards 1,500 m and 2 km of front crawl' AND locale = 'en');

INSERT INTO program_templates (name, description, goal, level, days_per_week, home_friendly, structure, is_published, sort_order, locale)
SELECT 'Triathlon and open water prep', 'Three sessions a week for 8 weeks: sighting, breathing on both sides, fast starts and long swims without the walls, up to a race rehearsal. For those who already swim 800 m of front crawl.', 'endurance', 'intermediate', 3, false, '[{"name":"W1 · Technique","week":1,"exercises":[],"cardio":{"sport":"swim","distanceKm":1.6,"intensity":"Zone 2","purpose":"Swim better rather than more: a good glide is free speed.","steps":["300 m easy warm-up, any stroke","4 × 50 m sighting, crocodile eyes, 20 s rest","4 × 50 m breathing every 3 strokes, 20 s rest","4 × 50 m catch-up, 20 s rest","6 × 100 m front crawl lifting the eyes every 8 strokes, 20 s rest","100 m cool-down, very easy"],"techniques":["sighting","breathing-3","catch-up","crawl"]}},{"name":"W1 · Starts and surges","week":1,"exercises":[],"cardio":{"sport":"swim","distanceKm":1.5,"intensity":"Zone 4","purpose":"Start fast without burning out, then find your rhythm, as at the start of a triathlon.","steps":["400 m easy warm-up, any stroke","6 × 50 m fast start over 15 m, then steady swimming, 20 s rest","6 × 100 m front crawl, 20 s rest","200 m cool-down, very easy"],"techniques":["crawl","sighting"]}},{"name":"W1 · As in open water","week":1,"exercises":[],"cardio":{"sport":"swim","distanceKm":1.3,"intensity":"Zone 2","purpose":"Swim for long without the walls, holding your course.","steps":["200 m easy warm-up, any stroke","1000 m without stopping, lifting the eyes every 8 strokes, without pushing off the walls (turn on the spot, as in open water)","100 m cool-down, very easy"],"techniques":["sighting","crawl","breathing-3"]}},{"name":"W2 · Technique","week":2,"exercises":[],"cardio":{"sport":"swim","distanceKm":1.6,"intensity":"Zone 2","purpose":"Swim better rather than more: a good glide is free speed.","steps":["300 m easy warm-up, any stroke","4 × 50 m sighting, crocodile eyes, 20 s rest","4 × 50 m breathing every 3 strokes, 20 s rest","4 × 50 m catch-up, 20 s rest","6 × 100 m front crawl lifting the eyes every 8 strokes, 20 s rest","100 m cool-down, very easy"],"techniques":["sighting","breathing-3","catch-up","crawl"]}},{"name":"W2 · Starts and surges","week":2,"exercises":[],"cardio":{"sport":"swim","distanceKm":1.7,"intensity":"Zone 4","purpose":"Start fast without burning out, then find your rhythm, as at the start of a triathlon.","steps":["400 m easy warm-up, any stroke","6 × 50 m fast start over 15 m, then steady swimming, 20 s rest","8 × 100 m front crawl, 20 s rest","200 m cool-down, very easy"],"techniques":["crawl","sighting"]}},{"name":"W2 · As in open water","week":2,"exercises":[],"cardio":{"sport":"swim","distanceKm":1.5,"intensity":"Zone 2","purpose":"Swim for long without the walls, holding your course.","steps":["200 m easy warm-up, any stroke","1200 m without stopping, lifting the eyes every 8 strokes, without pushing off the walls (turn on the spot, as in open water)","100 m cool-down, very easy"],"techniques":["sighting","crawl","breathing-3"]}},{"name":"W3 · Technique","week":3,"exercises":[],"cardio":{"sport":"swim","distanceKm":1.6,"intensity":"Zone 2","purpose":"Swim better rather than more: a good glide is free speed.","steps":["300 m easy warm-up, any stroke","4 × 50 m sighting, crocodile eyes, 20 s rest","4 × 50 m breathing every 3 strokes, 20 s rest","4 × 50 m catch-up, 20 s rest","6 × 100 m front crawl lifting the eyes every 8 strokes, 20 s rest","100 m cool-down, very easy"],"techniques":["sighting","breathing-3","catch-up","crawl"]}},{"name":"W3 · Starts and surges","week":3,"exercises":[],"cardio":{"sport":"swim","distanceKm":1.7,"intensity":"Zone 4","purpose":"Start fast without burning out, then find your rhythm, as at the start of a triathlon.","steps":["400 m easy warm-up, any stroke","6 × 50 m fast start over 15 m, then steady swimming, 20 s rest","4 × 200 m front crawl, 30 s rest","200 m cool-down, very easy"],"techniques":["crawl","sighting"]}},{"name":"W3 · As in open water","week":3,"exercises":[],"cardio":{"sport":"swim","distanceKm":1.8,"intensity":"Zone 2","purpose":"Swim for long without the walls, holding your course.","steps":["200 m easy warm-up, any stroke","1500 m without stopping, lifting the eyes every 8 strokes, without pushing off the walls (turn on the spot, as in open water)","100 m cool-down, very easy"],"techniques":["sighting","crawl","breathing-3"]}},{"name":"W4 · Technique","week":4,"exercises":[],"cardio":{"sport":"swim","distanceKm":1.6,"intensity":"Zone 2","purpose":"Swim better rather than more: a good glide is free speed.","steps":["300 m easy warm-up, any stroke","4 × 50 m sighting, crocodile eyes, 20 s rest","4 × 50 m breathing every 3 strokes, 20 s rest","4 × 50 m catch-up, 20 s rest","6 × 100 m front crawl lifting the eyes every 8 strokes, 20 s rest","100 m cool-down, very easy"],"techniques":["sighting","breathing-3","catch-up","crawl"]}},{"name":"W4 · Starts and surges","week":4,"exercises":[],"cardio":{"sport":"swim","distanceKm":1.5,"intensity":"Zone 2-3","purpose":"Keep some rhythm while easing off before the goal.","steps":["400 m easy warm-up, any stroke","6 × 50 m fast start over 15 m, then steady swimming, 20 s rest","6 × 100 m front crawl, 30 s rest","200 m cool-down, very easy"],"techniques":["crawl","sighting"]}},{"name":"W4 · As in open water","week":4,"exercises":[],"cardio":{"sport":"swim","distanceKm":1.3,"intensity":"Zone 2","purpose":"Swim for long without the walls, holding your course.","steps":["200 m easy warm-up, any stroke","1000 m without stopping, lifting the eyes every 8 strokes, without pushing off the walls (turn on the spot, as in open water)","100 m cool-down, very easy"],"techniques":["sighting","crawl","breathing-3"]}},{"name":"W5 · Technique","week":5,"exercises":[],"cardio":{"sport":"swim","distanceKm":1.6,"intensity":"Zone 2","purpose":"Swim better rather than more: a good glide is free speed.","steps":["300 m easy warm-up, any stroke","4 × 50 m sighting, crocodile eyes, 20 s rest","4 × 50 m breathing every 3 strokes, 20 s rest","4 × 50 m catch-up, 20 s rest","6 × 100 m front crawl lifting the eyes every 8 strokes, 20 s rest","100 m cool-down, very easy"],"techniques":["sighting","breathing-3","catch-up","crawl"]}},{"name":"W5 · Starts and surges","week":5,"exercises":[],"cardio":{"sport":"swim","distanceKm":1.9,"intensity":"Zone 4","purpose":"Start fast without burning out, then find your rhythm, as at the start of a triathlon.","steps":["400 m easy warm-up, any stroke","6 × 50 m fast start over 15 m, then steady swimming, 20 s rest","5 × 200 m front crawl, 30 s rest","200 m cool-down, very easy"],"techniques":["crawl","sighting"]}},{"name":"W5 · As in open water","week":5,"exercises":[],"cardio":{"sport":"swim","distanceKm":2.1,"intensity":"Zone 2","purpose":"Swim for long without the walls, holding your course.","steps":["200 m easy warm-up, any stroke","1800 m without stopping, lifting the eyes every 8 strokes, without pushing off the walls (turn on the spot, as in open water)","100 m cool-down, very easy"],"techniques":["sighting","crawl","breathing-3"],"notes":"In open water, never swim alone: someone with you, a visible safety buoy."}},{"name":"W6 · Technique","week":6,"exercises":[],"cardio":{"sport":"swim","distanceKm":1.6,"intensity":"Zone 2","purpose":"Swim better rather than more: a good glide is free speed.","steps":["300 m easy warm-up, any stroke","4 × 50 m sighting, crocodile eyes, 20 s rest","4 × 50 m breathing every 3 strokes, 20 s rest","4 × 50 m catch-up, 20 s rest","6 × 100 m front crawl lifting the eyes every 8 strokes, 20 s rest","100 m cool-down, very easy"],"techniques":["sighting","breathing-3","catch-up","crawl"]}},{"name":"W6 · Starts and surges","week":6,"exercises":[],"cardio":{"sport":"swim","distanceKm":2.1,"intensity":"Zone 4","purpose":"Start fast without burning out, then find your rhythm, as at the start of a triathlon.","steps":["400 m easy warm-up, any stroke","6 × 50 m fast start over 15 m, then steady swimming, 20 s rest","4 × 300 m front crawl, 30 s rest","200 m cool-down, very easy"],"techniques":["crawl","sighting"]}},{"name":"W6 · As in open water","week":6,"exercises":[],"cardio":{"sport":"swim","distanceKm":2.3,"intensity":"Zone 2","purpose":"Swim for long without the walls, holding your course.","steps":["200 m easy warm-up, any stroke","2000 m without stopping, lifting the eyes every 8 strokes, without pushing off the walls (turn on the spot, as in open water)","100 m cool-down, very easy"],"techniques":["sighting","crawl","breathing-3"],"notes":"In open water, never swim alone: someone with you, a visible safety buoy."}},{"name":"W7 · Technique","week":7,"exercises":[],"cardio":{"sport":"swim","distanceKm":1.6,"intensity":"Zone 2","purpose":"Swim better rather than more: a good glide is free speed.","steps":["300 m easy warm-up, any stroke","4 × 50 m sighting, crocodile eyes, 20 s rest","4 × 50 m breathing every 3 strokes, 20 s rest","4 × 50 m catch-up, 20 s rest","6 × 100 m front crawl lifting the eyes every 8 strokes, 20 s rest","100 m cool-down, very easy"],"techniques":["sighting","breathing-3","catch-up","crawl"]}},{"name":"W7 · Starts and surges","week":7,"exercises":[],"cardio":{"sport":"swim","distanceKm":2.1,"intensity":"Zone 4","purpose":"Start fast without burning out, then find your rhythm, as at the start of a triathlon.","steps":["400 m easy warm-up, any stroke","6 × 50 m fast start over 15 m, then steady swimming, 20 s rest","3 × 400 m front crawl, 40 s rest","200 m cool-down, very easy"],"techniques":["crawl","sighting"]}},{"name":"W7 · As in open water","week":7,"exercises":[],"cardio":{"sport":"swim","distanceKm":2.5,"intensity":"Zone 2","purpose":"Swim for long without the walls, holding your course.","steps":["200 m easy warm-up, any stroke","2200 m without stopping, lifting the eyes every 8 strokes, without pushing off the walls (turn on the spot, as in open water)","100 m cool-down, very easy"],"techniques":["sighting","crawl","breathing-3"],"notes":"In open water, never swim alone: someone with you, a visible safety buoy."}},{"name":"W8 · Technique","week":8,"exercises":[],"cardio":{"sport":"swim","distanceKm":1.6,"intensity":"Zone 2","purpose":"Swim better rather than more: a good glide is free speed.","steps":["300 m easy warm-up, any stroke","4 × 50 m sighting, crocodile eyes, 20 s rest","4 × 50 m breathing every 3 strokes, 20 s rest","4 × 50 m catch-up, 20 s rest","6 × 100 m front crawl lifting the eyes every 8 strokes, 20 s rest","100 m cool-down, very easy"],"techniques":["sighting","breathing-3","catch-up","crawl"]}},{"name":"W8 · Starts and surges","week":8,"exercises":[],"cardio":{"sport":"swim","distanceKm":1.5,"intensity":"Zone 2-3","purpose":"Keep some rhythm while easing off before the goal.","steps":["400 m easy warm-up, any stroke","6 × 50 m fast start over 15 m, then steady swimming, 20 s rest","6 × 100 m front crawl, 20 s rest","200 m cool-down, very easy"],"techniques":["crawl","sighting"]}},{"name":"W8 · Race rehearsal","week":8,"exercises":[],"cardio":{"sport":"swim","distanceKm":2,"intensity":"Zone 3","purpose":"Rehearse the race: fast start, sighting, a pace held to the end.","steps":["300 m easy warm-up, any stroke","1500 m without stopping, fast start over 15 m, then steady swimming, lifting the eyes every 8 strokes, without pushing off the walls (turn on the spot, as in open water)","200 m cool-down, very easy"],"techniques":["sighting","crawl"],"notes":"In open water, never swim alone: someone with you, a visible safety buoy."}}]'::jsonb, true, 435, 'en'
WHERE NOT EXISTS (SELECT 1 FROM program_templates WHERE name = 'Triathlon and open water prep' AND locale = 'en');

INSERT INTO program_templates (name, description, goal, level, days_per_week, home_friendly, structure, is_published, sort_order, locale)
SELECT 'Kraulen lernen in 8 Wochen', 'Zwei Einheiten pro Woche, um von wenigen Bahnen auf 200 m Kraul ohne Pause zu kommen: Wassergefühl, Beinschlag, Atmung, Gleiten. Für alle, die etwas schwimmen können, aber noch nicht kraulen.', 'general', 'beginner', 2, false, '[{"name":"W1 · Technik","week":1,"exercises":[],"cardio":{"sport":"swim","distanceKm":0.625,"intensity":"Zone 1-2","purpose":"Sich im Wasser wohlfühlen und die Grundlagen des Kraulens legen, ohne Eile.","steps":["200 m beliebig (Brust oder Rücken), locker","4 × 25 m Abstoß in Stromlinie, dann 4 Kicks, 30 s Pause","4 × 25 m Beinschlag mit Brett, 30 s Pause","5 × 25 m Kraul, 30 s Pause","100 m Ausschwimmen, sehr locker"],"techniques":["crawl","streamline","kickboard"]}},{"name":"W1 · Ausdauer","week":1,"exercises":[],"cardio":{"sport":"swim","distanceKm":0.5,"intensity":"Zone 2","purpose":"Die Kraulstrecken Schritt für Schritt verlängern, mit so vielen Pausen wie nötig.","steps":["200 m beliebig (Brust oder Rücken), locker","8 × 25 m Kraul, 30 s Pause","100 m Ausschwimmen, sehr locker"],"techniques":["crawl","breathing-3"]}},{"name":"W2 · Technik","week":2,"exercises":[],"cardio":{"sport":"swim","distanceKm":0.65,"intensity":"Zone 1-2","purpose":"Sich im Wasser wohlfühlen und die Grundlagen des Kraulens legen, ohne Eile.","steps":["200 m beliebig (Brust oder Rücken), locker","4 × 25 m Beinschlag mit Brett, 30 s Pause","4 × 25 m Beinschlag mit Brett, 30 s Pause","6 × 25 m Kraul, 30 s Pause","100 m Ausschwimmen, sehr locker"],"techniques":["crawl","kickboard","kickboard"]}},{"name":"W2 · Ausdauer","week":2,"exercises":[],"cardio":{"sport":"swim","distanceKm":0.6,"intensity":"Zone 2","purpose":"Die Kraulstrecken Schritt für Schritt verlängern, mit so vielen Pausen wie nötig.","steps":["200 m beliebig (Brust oder Rücken), locker","6 × 50 m Kraul, 30 s Pause","100 m Ausschwimmen, sehr locker"],"techniques":["crawl","breathing-3"]}},{"name":"W3 · Technik","week":3,"exercises":[],"cardio":{"sport":"swim","distanceKm":0.675,"intensity":"Zone 1-2","purpose":"Sich im Wasser wohlfühlen und die Grundlagen des Kraulens legen, ohne Eile.","steps":["200 m beliebig (Brust oder Rücken), locker","4 × 25 m Beinschlag in Seitlage, 30 s Pause","4 × 25 m Beinschlag mit Brett, 30 s Pause","7 × 25 m Kraul, 30 s Pause","100 m Ausschwimmen, sehr locker"],"techniques":["crawl","side-kick","kickboard"]}},{"name":"W3 · Ausdauer","week":3,"exercises":[],"cardio":{"sport":"swim","distanceKm":0.7,"intensity":"Zone 2","purpose":"Die Kraulstrecken Schritt für Schritt verlängern, mit so vielen Pausen wie nötig.","steps":["200 m beliebig (Brust oder Rücken), locker","8 × 50 m Kraul, 30 s Pause","100 m Ausschwimmen, sehr locker"],"techniques":["crawl","breathing-3"]}},{"name":"W4 · Technik","week":4,"exercises":[],"cardio":{"sport":"swim","distanceKm":0.7,"intensity":"Zone 1-2","purpose":"Sich im Wasser wohlfühlen und die Grundlagen des Kraulens legen, ohne Eile.","steps":["200 m beliebig (Brust oder Rücken), locker","4 × 25 m Beinschlag in Seitlage, 30 s Pause","4 × 25 m Beinschlag mit Brett, 30 s Pause","8 × 25 m Kraul, 30 s Pause","100 m Ausschwimmen, sehr locker"],"techniques":["crawl","side-kick","kickboard"]}},{"name":"W4 · Ausdauer","week":4,"exercises":[],"cardio":{"sport":"swim","distanceKm":0.45,"intensity":"Zone 2","purpose":"Die Kraulstrecken Schritt für Schritt verlängern, mit so vielen Pausen wie nötig.","steps":["200 m beliebig (Brust oder Rücken), locker","6 × 25 m Kraul, 30 s Pause","100 m Ausschwimmen, sehr locker"],"techniques":["crawl","breathing-3"]}},{"name":"W5 · Technik","week":5,"exercises":[],"cardio":{"sport":"swim","distanceKm":0.725,"intensity":"Zone 1-2","purpose":"Sich im Wasser wohlfühlen und die Grundlagen des Kraulens legen, ohne Eile.","steps":["200 m beliebig (Brust oder Rücken), locker","4 × 25 m Abschlagschwimmen, 30 s Pause","4 × 25 m Beinschlag mit Brett, 30 s Pause","9 × 25 m Kraul, 30 s Pause","100 m Ausschwimmen, sehr locker"],"techniques":["crawl","catch-up","kickboard"]}},{"name":"W5 · Ausdauer","week":5,"exercises":[],"cardio":{"sport":"swim","distanceKm":0.7,"intensity":"Zone 2","purpose":"Die Kraulstrecken Schritt für Schritt verlängern, mit so vielen Pausen wie nötig.","steps":["200 m beliebig (Brust oder Rücken), locker","4 × 100 m Kraul, 45 s Pause","100 m Ausschwimmen, sehr locker"],"techniques":["crawl","breathing-3"]}},{"name":"W6 · Technik","week":6,"exercises":[],"cardio":{"sport":"swim","distanceKm":0.75,"intensity":"Zone 1-2","purpose":"Sich im Wasser wohlfühlen und die Grundlagen des Kraulens legen, ohne Eile.","steps":["200 m beliebig (Brust oder Rücken), locker","4 × 25 m Dreieratmung, 30 s Pause","4 × 25 m Beinschlag mit Brett, 30 s Pause","10 × 25 m Kraul, 30 s Pause","100 m Ausschwimmen, sehr locker"],"techniques":["crawl","breathing-3","kickboard"]}},{"name":"W6 · Ausdauer","week":6,"exercises":[],"cardio":{"sport":"swim","distanceKm":0.8,"intensity":"Zone 2","purpose":"Die Kraulstrecken Schritt für Schritt verlängern, mit so vielen Pausen wie nötig.","steps":["200 m beliebig (Brust oder Rücken), locker","5 × 100 m Kraul, 45 s Pause","100 m Ausschwimmen, sehr locker"],"techniques":["crawl","breathing-3"]}},{"name":"W7 · Technik","week":7,"exercises":[],"cardio":{"sport":"swim","distanceKm":0.75,"intensity":"Zone 1-2","purpose":"Sich im Wasser wohlfühlen und die Grundlagen des Kraulens legen, ohne Eile.","steps":["200 m beliebig (Brust oder Rücken), locker","4 × 25 m Abschlagschwimmen, 30 s Pause","4 × 25 m Beinschlag mit Brett, 30 s Pause","10 × 25 m Kraul, 30 s Pause","100 m Ausschwimmen, sehr locker"],"techniques":["crawl","catch-up","kickboard"]}},{"name":"W7 · Ausdauer","week":7,"exercises":[],"cardio":{"sport":"swim","distanceKm":0.75,"intensity":"Zone 2","purpose":"Die Kraulstrecken Schritt für Schritt verlängern, mit so vielen Pausen wie nötig.","steps":["200 m beliebig (Brust oder Rücken), locker","3 × 150 m Kraul, 45 s Pause","100 m Ausschwimmen, sehr locker"],"techniques":["crawl","breathing-3"]}},{"name":"W8 · Technik","week":8,"exercises":[],"cardio":{"sport":"swim","distanceKm":0.75,"intensity":"Zone 1-2","purpose":"Sich im Wasser wohlfühlen und die Grundlagen des Kraulens legen, ohne Eile.","steps":["200 m beliebig (Brust oder Rücken), locker","4 × 25 m Fingerspitzen-Ziehen, 30 s Pause","4 × 25 m Beinschlag mit Brett, 30 s Pause","10 × 25 m Kraul, 30 s Pause","100 m Ausschwimmen, sehr locker"],"techniques":["crawl","fingertip-drag","kickboard"]}},{"name":"W8 · Test","week":8,"exercises":[],"cardio":{"sport":"swim","distanceKm":0.5,"intensity":"Zone 2","purpose":"Den Fortschritt messen: 200 m Kraul ohne Pause.","steps":["200 m beliebig (Brust oder Rücken), locker","200 m ohne Pause","100 m Ausschwimmen, sehr locker"],"techniques":["crawl","breathing-3"]}}]'::jsonb, true, 420, 'de'
WHERE NOT EXISTS (SELECT 1 FROM program_templates WHERE name = 'Kraulen lernen in 8 Wochen' AND locale = 'de');

INSERT INTO program_templates (name, description, goal, level, days_per_week, home_friendly, structure, is_published, sort_order, locale)
SELECT 'Fitnessschwimmen', 'Drei Einheiten im Wechsel, verschiedene Lagen, ohne Stoppuhr: um fit zu bleiben, die Gelenke zu schonen und abwechslungsreich zu trainieren.', 'general', 'beginner', 3, false, '[{"name":"Lagenmix","exercises":[],"cardio":{"sport":"swim","distanceKm":1.2,"intensity":"Zone 2","purpose":"Durch Lagenwechsel den ganzen Körper trainieren.","steps":["200 m lockeres Einschwimmen, beliebige Lage","4 × 50 m Brust, 20 s Pause","4 × 50 m Rücken, 20 s Pause","6 × 50 m Kraul, 20 s Pause","2 × 100 m Kraul mit Pull-Buoy, 30 s Pause","100 m Ausschwimmen, sehr locker"],"techniques":["breaststroke","backstroke","crawl","pull-buoy"]}},{"name":"Ausdauer","exercises":[],"cardio":{"sport":"swim","distanceKm":1.5,"intensity":"Zone 2","purpose":"Lange in einem Tempo schwimmen, bei dem man zwischen den Bahnen noch sprechen könnte.","steps":["300 m lockeres Einschwimmen, beliebige Lage","3 × 300 m Kraul, 60 s Pause","4 × 50 m Beinschlag mit Brett, 20 s Pause","100 m Ausschwimmen, sehr locker"],"techniques":["crawl","kickboard"]}},{"name":"Technik","exercises":[],"cardio":{"sport":"swim","distanceKm":1.2,"intensity":"Zone 2","purpose":"Besser statt mehr schwimmen: gutes Gleiten ist geschenkte Geschwindigkeit.","steps":["200 m lockeres Einschwimmen, beliebige Lage","4 × 50 m Abschlagschwimmen, 20 s Pause","4 × 50 m Faustschwimmen, 20 s Pause","4 × 50 m Rücken, 20 s Pause","4 × 50 m Kraul mit Fokus aufs Gleiten (ein Zug weniger pro Bahn), 20 s Pause","200 m Ausschwimmen, sehr locker"],"techniques":["catch-up","fist","backstroke","crawl"]}}]'::jsonb, true, 425, 'de'
WHERE NOT EXISTS (SELECT 1 FROM program_templates WHERE name = 'Fitnessschwimmen' AND locale = 'de');

INSERT INTO program_templates (name, description, goal, level, days_per_week, home_friendly, structure, is_published, sort_order, locale)
SELECT 'Auf 1.500 m und 2 km Kraul', 'Drei Einheiten pro Woche über 8 Wochen: Technik, Serien und Ausdauer bis 2 km ohne Pause, dann ein Test über 1.500 m. Für alle, die schon 400 m kraulen.', 'endurance', 'intermediate', 3, false, '[{"name":"W1 · Technik","week":1,"exercises":[],"cardio":{"sport":"swim","distanceKm":1.6,"intensity":"Zone 2","purpose":"Besser statt mehr schwimmen: gutes Gleiten ist geschenkte Geschwindigkeit.","steps":["300 m lockeres Einschwimmen, beliebige Lage","4 × 50 m Abschlagschwimmen, 20 s Pause","4 × 50 m Beinschlag mit Brett, 20 s Pause","6 × 100 m Kraul, 20 s Pause","2 × 100 m Kraul mit Pull-Buoy, 30 s Pause","100 m Ausschwimmen, sehr locker"],"techniques":["crawl","catch-up","kickboard","pull-buoy"]}},{"name":"W1 · Serien","week":1,"exercises":[],"cardio":{"sport":"swim","distanceKm":1.4,"intensity":"Zone 4","purpose":"Ein zügiges Tempo mit wenig Pause halten.","steps":["400 m lockeres Einschwimmen, beliebige Lage","8 × 100 m Kraul, 20 s Pause","200 m Ausschwimmen, sehr locker"],"techniques":["crawl","streamline"]}},{"name":"W1 · Ausdauer","week":1,"exercises":[],"cardio":{"sport":"swim","distanceKm":1.1,"intensity":"Zone 2","purpose":"Lange in einem Tempo schwimmen, bei dem man zwischen den Bahnen noch sprechen könnte.","steps":["200 m lockeres Einschwimmen, beliebige Lage","800 m ohne Pause","100 m Ausschwimmen, sehr locker"],"techniques":["crawl","breathing-3"]}},{"name":"W2 · Technik","week":2,"exercises":[],"cardio":{"sport":"swim","distanceKm":1.6,"intensity":"Zone 2","purpose":"Besser statt mehr schwimmen: gutes Gleiten ist geschenkte Geschwindigkeit.","steps":["300 m lockeres Einschwimmen, beliebige Lage","4 × 50 m Faustschwimmen, 20 s Pause","4 × 50 m Beinschlag mit Brett, 20 s Pause","6 × 100 m Kraul, 20 s Pause","2 × 100 m Kraul mit Pull-Buoy, 30 s Pause","100 m Ausschwimmen, sehr locker"],"techniques":["crawl","fist","kickboard","pull-buoy"]}},{"name":"W2 · Serien","week":2,"exercises":[],"cardio":{"sport":"swim","distanceKm":1.6,"intensity":"Zone 4","purpose":"Ein zügiges Tempo mit wenig Pause halten.","steps":["400 m lockeres Einschwimmen, beliebige Lage","10 × 100 m Kraul, 20 s Pause","200 m Ausschwimmen, sehr locker"],"techniques":["crawl","streamline"]}},{"name":"W2 · Ausdauer","week":2,"exercises":[],"cardio":{"sport":"swim","distanceKm":1.3,"intensity":"Zone 2","purpose":"Lange in einem Tempo schwimmen, bei dem man zwischen den Bahnen noch sprechen könnte.","steps":["200 m lockeres Einschwimmen, beliebige Lage","1000 m ohne Pause","100 m Ausschwimmen, sehr locker"],"techniques":["crawl","breathing-3"]}},{"name":"W3 · Technik","week":3,"exercises":[],"cardio":{"sport":"swim","distanceKm":1.6,"intensity":"Zone 2","purpose":"Besser statt mehr schwimmen: gutes Gleiten ist geschenkte Geschwindigkeit.","steps":["300 m lockeres Einschwimmen, beliebige Lage","4 × 50 m Beinschlag in Seitlage, 20 s Pause","4 × 50 m Beinschlag mit Brett, 20 s Pause","6 × 100 m Kraul, 20 s Pause","2 × 100 m Kraul mit Pull-Buoy, 30 s Pause","100 m Ausschwimmen, sehr locker"],"techniques":["crawl","side-kick","kickboard","pull-buoy"]}},{"name":"W3 · Serien","week":3,"exercises":[],"cardio":{"sport":"swim","distanceKm":1.6,"intensity":"Zone 4","purpose":"Ein zügiges Tempo mit wenig Pause halten.","steps":["400 m lockeres Einschwimmen, beliebige Lage","5 × 200 m Kraul, 30 s Pause","200 m Ausschwimmen, sehr locker"],"techniques":["crawl","streamline"]}},{"name":"W3 · Ausdauer","week":3,"exercises":[],"cardio":{"sport":"swim","distanceKm":1.5,"intensity":"Zone 2","purpose":"Lange in einem Tempo schwimmen, bei dem man zwischen den Bahnen noch sprechen könnte.","steps":["200 m lockeres Einschwimmen, beliebige Lage","1200 m ohne Pause","100 m Ausschwimmen, sehr locker"],"techniques":["crawl","breathing-3"]}},{"name":"W4 · Technik","week":4,"exercises":[],"cardio":{"sport":"swim","distanceKm":1.6,"intensity":"Zone 2","purpose":"Besser statt mehr schwimmen: gutes Gleiten ist geschenkte Geschwindigkeit.","steps":["300 m lockeres Einschwimmen, beliebige Lage","4 × 50 m Wriggeln, 20 s Pause","4 × 50 m Beinschlag mit Brett, 20 s Pause","6 × 100 m Kraul, 20 s Pause","2 × 100 m Kraul mit Pull-Buoy, 30 s Pause","100 m Ausschwimmen, sehr locker"],"techniques":["crawl","sculling","kickboard","pull-buoy"]}},{"name":"W4 · Serien","week":4,"exercises":[],"cardio":{"sport":"swim","distanceKm":1.2,"intensity":"Zone 2-3","purpose":"Vor dem Ziel entlasten und den Rhythmus halten.","steps":["400 m lockeres Einschwimmen, beliebige Lage","6 × 100 m Kraul, 30 s Pause","200 m Ausschwimmen, sehr locker"],"techniques":["crawl","streamline"]}},{"name":"W4 · Ausdauer","week":4,"exercises":[],"cardio":{"sport":"swim","distanceKm":1.1,"intensity":"Zone 2","purpose":"Lange in einem Tempo schwimmen, bei dem man zwischen den Bahnen noch sprechen könnte.","steps":["200 m lockeres Einschwimmen, beliebige Lage","800 m ohne Pause","100 m Ausschwimmen, sehr locker"],"techniques":["crawl","breathing-3"]}},{"name":"W5 · Technik","week":5,"exercises":[],"cardio":{"sport":"swim","distanceKm":1.6,"intensity":"Zone 2","purpose":"Besser statt mehr schwimmen: gutes Gleiten ist geschenkte Geschwindigkeit.","steps":["300 m lockeres Einschwimmen, beliebige Lage","4 × 50 m einarmiges Kraulen, 20 s Pause","4 × 50 m Beinschlag mit Brett, 20 s Pause","6 × 100 m Kraul, 20 s Pause","2 × 100 m Kraul mit Pull-Buoy, 30 s Pause","100 m Ausschwimmen, sehr locker"],"techniques":["crawl","one-arm","kickboard","pull-buoy"]}},{"name":"W5 · Serien","week":5,"exercises":[],"cardio":{"sport":"swim","distanceKm":1.8,"intensity":"Zone 4","purpose":"Ein zügiges Tempo mit wenig Pause halten.","steps":["400 m lockeres Einschwimmen, beliebige Lage","4 × 300 m Kraul, 30 s Pause","200 m Ausschwimmen, sehr locker"],"techniques":["crawl","flip-turn"]}},{"name":"W5 · Ausdauer","week":5,"exercises":[],"cardio":{"sport":"swim","distanceKm":1.8,"intensity":"Zone 2","purpose":"Lange in einem Tempo schwimmen, bei dem man zwischen den Bahnen noch sprechen könnte.","steps":["200 m lockeres Einschwimmen, beliebige Lage","1500 m ohne Pause","100 m Ausschwimmen, sehr locker"],"techniques":["crawl","breathing-3"]}},{"name":"W6 · Technik","week":6,"exercises":[],"cardio":{"sport":"swim","distanceKm":1.6,"intensity":"Zone 2","purpose":"Besser statt mehr schwimmen: gutes Gleiten ist geschenkte Geschwindigkeit.","steps":["300 m lockeres Einschwimmen, beliebige Lage","4 × 50 m Fingerspitzen-Ziehen, 20 s Pause","4 × 50 m Beinschlag mit Brett, 20 s Pause","6 × 100 m Kraul, 20 s Pause","2 × 100 m Kraul mit Pull-Buoy, 30 s Pause","100 m Ausschwimmen, sehr locker"],"techniques":["crawl","fingertip-drag","kickboard","pull-buoy"]}},{"name":"W6 · Serien","week":6,"exercises":[],"cardio":{"sport":"swim","distanceKm":1.8,"intensity":"Zone 4","purpose":"Ein zügiges Tempo mit wenig Pause halten.","steps":["400 m lockeres Einschwimmen, beliebige Lage","3 × 400 m Kraul, 40 s Pause","200 m Ausschwimmen, sehr locker"],"techniques":["crawl","flip-turn"]}},{"name":"W6 · Ausdauer","week":6,"exercises":[],"cardio":{"sport":"swim","distanceKm":2,"intensity":"Zone 2","purpose":"Lange in einem Tempo schwimmen, bei dem man zwischen den Bahnen noch sprechen könnte.","steps":["200 m lockeres Einschwimmen, beliebige Lage","1700 m ohne Pause","100 m Ausschwimmen, sehr locker"],"techniques":["crawl","breathing-3"]}},{"name":"W7 · Technik","week":7,"exercises":[],"cardio":{"sport":"swim","distanceKm":1.6,"intensity":"Zone 2","purpose":"Besser statt mehr schwimmen: gutes Gleiten ist geschenkte Geschwindigkeit.","steps":["300 m lockeres Einschwimmen, beliebige Lage","4 × 50 m Abschlagschwimmen, 20 s Pause","4 × 50 m Beinschlag mit Brett, 20 s Pause","6 × 100 m Kraul, 20 s Pause","2 × 100 m Kraul mit Pull-Buoy, 30 s Pause","100 m Ausschwimmen, sehr locker"],"techniques":["crawl","catch-up","kickboard","pull-buoy"]}},{"name":"W7 · Serien","week":7,"exercises":[],"cardio":{"sport":"swim","distanceKm":1.8,"intensity":"Zone 4","purpose":"Ein zügiges Tempo mit wenig Pause halten.","steps":["400 m lockeres Einschwimmen, beliebige Lage","2 × 600 m Kraul, 60 s Pause","200 m Ausschwimmen, sehr locker"],"techniques":["crawl","flip-turn"]}},{"name":"W7 · Ausdauer","week":7,"exercises":[],"cardio":{"sport":"swim","distanceKm":2.3,"intensity":"Zone 2","purpose":"Lange in einem Tempo schwimmen, bei dem man zwischen den Bahnen noch sprechen könnte.","steps":["200 m lockeres Einschwimmen, beliebige Lage","2000 m ohne Pause","100 m Ausschwimmen, sehr locker"],"techniques":["crawl","breathing-3"]}},{"name":"W8 · Technik","week":8,"exercises":[],"cardio":{"sport":"swim","distanceKm":1.6,"intensity":"Zone 2","purpose":"Besser statt mehr schwimmen: gutes Gleiten ist geschenkte Geschwindigkeit.","steps":["300 m lockeres Einschwimmen, beliebige Lage","4 × 50 m Dreieratmung, 20 s Pause","4 × 50 m Beinschlag mit Brett, 20 s Pause","6 × 100 m Kraul, 20 s Pause","2 × 100 m Kraul mit Pull-Buoy, 30 s Pause","100 m Ausschwimmen, sehr locker"],"techniques":["crawl","breathing-3","kickboard","pull-buoy"]}},{"name":"W8 · Serien","week":8,"exercises":[],"cardio":{"sport":"swim","distanceKm":1.4,"intensity":"Zone 2-3","purpose":"Vor dem Ziel entlasten und den Rhythmus halten.","steps":["400 m lockeres Einschwimmen, beliebige Lage","8 × 100 m Kraul, 20 s Pause","200 m Ausschwimmen, sehr locker"],"techniques":["crawl","flip-turn"]}},{"name":"W8 · Test","week":8,"exercises":[],"cardio":{"sport":"swim","distanceKm":1.8,"intensity":"Zone 2","purpose":"Die angestrebte Strecke in gleichmäßigem Tempo schaffen.","steps":["200 m lockeres Einschwimmen, beliebige Lage","1500 m ohne Pause","100 m Ausschwimmen, sehr locker"],"techniques":["crawl","breathing-3"]}}]'::jsonb, true, 430, 'de'
WHERE NOT EXISTS (SELECT 1 FROM program_templates WHERE name = 'Auf 1.500 m und 2 km Kraul' AND locale = 'de');

INSERT INTO program_templates (name, description, goal, level, days_per_week, home_friendly, structure, is_published, sort_order, locale)
SELECT 'Triathlon- und Freiwasservorbereitung', 'Drei Einheiten pro Woche über 8 Wochen: Orientierung, beidseitige Atmung, schnelle Starts und lange Strecken ohne Wände bis zur Wettkampfprobe. Für alle, die schon 800 m kraulen.', 'endurance', 'intermediate', 3, false, '[{"name":"W1 · Technik","week":1,"exercises":[],"cardio":{"sport":"swim","distanceKm":1.6,"intensity":"Zone 2","purpose":"Besser statt mehr schwimmen: gutes Gleiten ist geschenkte Geschwindigkeit.","steps":["300 m lockeres Einschwimmen, beliebige Lage","4 × 50 m Orientierung, Krokodilaugen, 20 s Pause","4 × 50 m Dreieratmung, 20 s Pause","4 × 50 m Abschlagschwimmen, 20 s Pause","6 × 100 m Kraul alle 8 Züge die Augen heben, 20 s Pause","100 m Ausschwimmen, sehr locker"],"techniques":["sighting","breathing-3","catch-up","crawl"]}},{"name":"W1 · Starts und Tempowechsel","week":1,"exercises":[],"cardio":{"sport":"swim","distanceKm":1.5,"intensity":"Zone 4","purpose":"Schnell starten, ohne sich zu verausgaben, dann den Rhythmus finden, wie beim Triathlonstart.","steps":["400 m lockeres Einschwimmen, beliebige Lage","6 × 50 m schneller Start über 15 m, dann gleichmäßig, 20 s Pause","6 × 100 m Kraul, 20 s Pause","200 m Ausschwimmen, sehr locker"],"techniques":["crawl","sighting"]}},{"name":"W1 · Wie im Freiwasser","week":1,"exercises":[],"cardio":{"sport":"swim","distanceKm":1.3,"intensity":"Zone 2","purpose":"Lange ohne die Wände schwimmen und den Kurs halten.","steps":["200 m lockeres Einschwimmen, beliebige Lage","1000 m ohne Pause, alle 8 Züge die Augen heben, ohne Abstoß an der Wand (auf der Stelle wenden, wie im Freiwasser)","100 m Ausschwimmen, sehr locker"],"techniques":["sighting","crawl","breathing-3"]}},{"name":"W2 · Technik","week":2,"exercises":[],"cardio":{"sport":"swim","distanceKm":1.6,"intensity":"Zone 2","purpose":"Besser statt mehr schwimmen: gutes Gleiten ist geschenkte Geschwindigkeit.","steps":["300 m lockeres Einschwimmen, beliebige Lage","4 × 50 m Orientierung, Krokodilaugen, 20 s Pause","4 × 50 m Dreieratmung, 20 s Pause","4 × 50 m Abschlagschwimmen, 20 s Pause","6 × 100 m Kraul alle 8 Züge die Augen heben, 20 s Pause","100 m Ausschwimmen, sehr locker"],"techniques":["sighting","breathing-3","catch-up","crawl"]}},{"name":"W2 · Starts und Tempowechsel","week":2,"exercises":[],"cardio":{"sport":"swim","distanceKm":1.7,"intensity":"Zone 4","purpose":"Schnell starten, ohne sich zu verausgaben, dann den Rhythmus finden, wie beim Triathlonstart.","steps":["400 m lockeres Einschwimmen, beliebige Lage","6 × 50 m schneller Start über 15 m, dann gleichmäßig, 20 s Pause","8 × 100 m Kraul, 20 s Pause","200 m Ausschwimmen, sehr locker"],"techniques":["crawl","sighting"]}},{"name":"W2 · Wie im Freiwasser","week":2,"exercises":[],"cardio":{"sport":"swim","distanceKm":1.5,"intensity":"Zone 2","purpose":"Lange ohne die Wände schwimmen und den Kurs halten.","steps":["200 m lockeres Einschwimmen, beliebige Lage","1200 m ohne Pause, alle 8 Züge die Augen heben, ohne Abstoß an der Wand (auf der Stelle wenden, wie im Freiwasser)","100 m Ausschwimmen, sehr locker"],"techniques":["sighting","crawl","breathing-3"]}},{"name":"W3 · Technik","week":3,"exercises":[],"cardio":{"sport":"swim","distanceKm":1.6,"intensity":"Zone 2","purpose":"Besser statt mehr schwimmen: gutes Gleiten ist geschenkte Geschwindigkeit.","steps":["300 m lockeres Einschwimmen, beliebige Lage","4 × 50 m Orientierung, Krokodilaugen, 20 s Pause","4 × 50 m Dreieratmung, 20 s Pause","4 × 50 m Abschlagschwimmen, 20 s Pause","6 × 100 m Kraul alle 8 Züge die Augen heben, 20 s Pause","100 m Ausschwimmen, sehr locker"],"techniques":["sighting","breathing-3","catch-up","crawl"]}},{"name":"W3 · Starts und Tempowechsel","week":3,"exercises":[],"cardio":{"sport":"swim","distanceKm":1.7,"intensity":"Zone 4","purpose":"Schnell starten, ohne sich zu verausgaben, dann den Rhythmus finden, wie beim Triathlonstart.","steps":["400 m lockeres Einschwimmen, beliebige Lage","6 × 50 m schneller Start über 15 m, dann gleichmäßig, 20 s Pause","4 × 200 m Kraul, 30 s Pause","200 m Ausschwimmen, sehr locker"],"techniques":["crawl","sighting"]}},{"name":"W3 · Wie im Freiwasser","week":3,"exercises":[],"cardio":{"sport":"swim","distanceKm":1.8,"intensity":"Zone 2","purpose":"Lange ohne die Wände schwimmen und den Kurs halten.","steps":["200 m lockeres Einschwimmen, beliebige Lage","1500 m ohne Pause, alle 8 Züge die Augen heben, ohne Abstoß an der Wand (auf der Stelle wenden, wie im Freiwasser)","100 m Ausschwimmen, sehr locker"],"techniques":["sighting","crawl","breathing-3"]}},{"name":"W4 · Technik","week":4,"exercises":[],"cardio":{"sport":"swim","distanceKm":1.6,"intensity":"Zone 2","purpose":"Besser statt mehr schwimmen: gutes Gleiten ist geschenkte Geschwindigkeit.","steps":["300 m lockeres Einschwimmen, beliebige Lage","4 × 50 m Orientierung, Krokodilaugen, 20 s Pause","4 × 50 m Dreieratmung, 20 s Pause","4 × 50 m Abschlagschwimmen, 20 s Pause","6 × 100 m Kraul alle 8 Züge die Augen heben, 20 s Pause","100 m Ausschwimmen, sehr locker"],"techniques":["sighting","breathing-3","catch-up","crawl"]}},{"name":"W4 · Starts und Tempowechsel","week":4,"exercises":[],"cardio":{"sport":"swim","distanceKm":1.5,"intensity":"Zone 2-3","purpose":"Vor dem Ziel entlasten und den Rhythmus halten.","steps":["400 m lockeres Einschwimmen, beliebige Lage","6 × 50 m schneller Start über 15 m, dann gleichmäßig, 20 s Pause","6 × 100 m Kraul, 30 s Pause","200 m Ausschwimmen, sehr locker"],"techniques":["crawl","sighting"]}},{"name":"W4 · Wie im Freiwasser","week":4,"exercises":[],"cardio":{"sport":"swim","distanceKm":1.3,"intensity":"Zone 2","purpose":"Lange ohne die Wände schwimmen und den Kurs halten.","steps":["200 m lockeres Einschwimmen, beliebige Lage","1000 m ohne Pause, alle 8 Züge die Augen heben, ohne Abstoß an der Wand (auf der Stelle wenden, wie im Freiwasser)","100 m Ausschwimmen, sehr locker"],"techniques":["sighting","crawl","breathing-3"]}},{"name":"W5 · Technik","week":5,"exercises":[],"cardio":{"sport":"swim","distanceKm":1.6,"intensity":"Zone 2","purpose":"Besser statt mehr schwimmen: gutes Gleiten ist geschenkte Geschwindigkeit.","steps":["300 m lockeres Einschwimmen, beliebige Lage","4 × 50 m Orientierung, Krokodilaugen, 20 s Pause","4 × 50 m Dreieratmung, 20 s Pause","4 × 50 m Abschlagschwimmen, 20 s Pause","6 × 100 m Kraul alle 8 Züge die Augen heben, 20 s Pause","100 m Ausschwimmen, sehr locker"],"techniques":["sighting","breathing-3","catch-up","crawl"]}},{"name":"W5 · Starts und Tempowechsel","week":5,"exercises":[],"cardio":{"sport":"swim","distanceKm":1.9,"intensity":"Zone 4","purpose":"Schnell starten, ohne sich zu verausgaben, dann den Rhythmus finden, wie beim Triathlonstart.","steps":["400 m lockeres Einschwimmen, beliebige Lage","6 × 50 m schneller Start über 15 m, dann gleichmäßig, 20 s Pause","5 × 200 m Kraul, 30 s Pause","200 m Ausschwimmen, sehr locker"],"techniques":["crawl","sighting"]}},{"name":"W5 · Wie im Freiwasser","week":5,"exercises":[],"cardio":{"sport":"swim","distanceKm":2.1,"intensity":"Zone 2","purpose":"Lange ohne die Wände schwimmen und den Kurs halten.","steps":["200 m lockeres Einschwimmen, beliebige Lage","1800 m ohne Pause, alle 8 Züge die Augen heben, ohne Abstoß an der Wand (auf der Stelle wenden, wie im Freiwasser)","100 m Ausschwimmen, sehr locker"],"techniques":["sighting","crawl","breathing-3"],"notes":"Im Freiwasser nie allein schwimmen: eine Begleitperson und eine sichtbare Schwimmboje."}},{"name":"W6 · Technik","week":6,"exercises":[],"cardio":{"sport":"swim","distanceKm":1.6,"intensity":"Zone 2","purpose":"Besser statt mehr schwimmen: gutes Gleiten ist geschenkte Geschwindigkeit.","steps":["300 m lockeres Einschwimmen, beliebige Lage","4 × 50 m Orientierung, Krokodilaugen, 20 s Pause","4 × 50 m Dreieratmung, 20 s Pause","4 × 50 m Abschlagschwimmen, 20 s Pause","6 × 100 m Kraul alle 8 Züge die Augen heben, 20 s Pause","100 m Ausschwimmen, sehr locker"],"techniques":["sighting","breathing-3","catch-up","crawl"]}},{"name":"W6 · Starts und Tempowechsel","week":6,"exercises":[],"cardio":{"sport":"swim","distanceKm":2.1,"intensity":"Zone 4","purpose":"Schnell starten, ohne sich zu verausgaben, dann den Rhythmus finden, wie beim Triathlonstart.","steps":["400 m lockeres Einschwimmen, beliebige Lage","6 × 50 m schneller Start über 15 m, dann gleichmäßig, 20 s Pause","4 × 300 m Kraul, 30 s Pause","200 m Ausschwimmen, sehr locker"],"techniques":["crawl","sighting"]}},{"name":"W6 · Wie im Freiwasser","week":6,"exercises":[],"cardio":{"sport":"swim","distanceKm":2.3,"intensity":"Zone 2","purpose":"Lange ohne die Wände schwimmen und den Kurs halten.","steps":["200 m lockeres Einschwimmen, beliebige Lage","2000 m ohne Pause, alle 8 Züge die Augen heben, ohne Abstoß an der Wand (auf der Stelle wenden, wie im Freiwasser)","100 m Ausschwimmen, sehr locker"],"techniques":["sighting","crawl","breathing-3"],"notes":"Im Freiwasser nie allein schwimmen: eine Begleitperson und eine sichtbare Schwimmboje."}},{"name":"W7 · Technik","week":7,"exercises":[],"cardio":{"sport":"swim","distanceKm":1.6,"intensity":"Zone 2","purpose":"Besser statt mehr schwimmen: gutes Gleiten ist geschenkte Geschwindigkeit.","steps":["300 m lockeres Einschwimmen, beliebige Lage","4 × 50 m Orientierung, Krokodilaugen, 20 s Pause","4 × 50 m Dreieratmung, 20 s Pause","4 × 50 m Abschlagschwimmen, 20 s Pause","6 × 100 m Kraul alle 8 Züge die Augen heben, 20 s Pause","100 m Ausschwimmen, sehr locker"],"techniques":["sighting","breathing-3","catch-up","crawl"]}},{"name":"W7 · Starts und Tempowechsel","week":7,"exercises":[],"cardio":{"sport":"swim","distanceKm":2.1,"intensity":"Zone 4","purpose":"Schnell starten, ohne sich zu verausgaben, dann den Rhythmus finden, wie beim Triathlonstart.","steps":["400 m lockeres Einschwimmen, beliebige Lage","6 × 50 m schneller Start über 15 m, dann gleichmäßig, 20 s Pause","3 × 400 m Kraul, 40 s Pause","200 m Ausschwimmen, sehr locker"],"techniques":["crawl","sighting"]}},{"name":"W7 · Wie im Freiwasser","week":7,"exercises":[],"cardio":{"sport":"swim","distanceKm":2.5,"intensity":"Zone 2","purpose":"Lange ohne die Wände schwimmen und den Kurs halten.","steps":["200 m lockeres Einschwimmen, beliebige Lage","2200 m ohne Pause, alle 8 Züge die Augen heben, ohne Abstoß an der Wand (auf der Stelle wenden, wie im Freiwasser)","100 m Ausschwimmen, sehr locker"],"techniques":["sighting","crawl","breathing-3"],"notes":"Im Freiwasser nie allein schwimmen: eine Begleitperson und eine sichtbare Schwimmboje."}},{"name":"W8 · Technik","week":8,"exercises":[],"cardio":{"sport":"swim","distanceKm":1.6,"intensity":"Zone 2","purpose":"Besser statt mehr schwimmen: gutes Gleiten ist geschenkte Geschwindigkeit.","steps":["300 m lockeres Einschwimmen, beliebige Lage","4 × 50 m Orientierung, Krokodilaugen, 20 s Pause","4 × 50 m Dreieratmung, 20 s Pause","4 × 50 m Abschlagschwimmen, 20 s Pause","6 × 100 m Kraul alle 8 Züge die Augen heben, 20 s Pause","100 m Ausschwimmen, sehr locker"],"techniques":["sighting","breathing-3","catch-up","crawl"]}},{"name":"W8 · Starts und Tempowechsel","week":8,"exercises":[],"cardio":{"sport":"swim","distanceKm":1.5,"intensity":"Zone 2-3","purpose":"Vor dem Ziel entlasten und den Rhythmus halten.","steps":["400 m lockeres Einschwimmen, beliebige Lage","6 × 50 m schneller Start über 15 m, dann gleichmäßig, 20 s Pause","6 × 100 m Kraul, 20 s Pause","200 m Ausschwimmen, sehr locker"],"techniques":["crawl","sighting"]}},{"name":"W8 · Wettkampfprobe","week":8,"exercises":[],"cardio":{"sport":"swim","distanceKm":2,"intensity":"Zone 3","purpose":"Den Wettkampf proben: schneller Start, Orientierung, Tempo bis zum Ende.","steps":["300 m lockeres Einschwimmen, beliebige Lage","1500 m ohne Pause, schneller Start über 15 m, dann gleichmäßig, alle 8 Züge die Augen heben, ohne Abstoß an der Wand (auf der Stelle wenden, wie im Freiwasser)","200 m Ausschwimmen, sehr locker"],"techniques":["sighting","crawl"],"notes":"Im Freiwasser nie allein schwimmen: eine Begleitperson und eine sichtbare Schwimmboje."}}]'::jsonb, true, 435, 'de'
WHERE NOT EXISTS (SELECT 1 FROM program_templates WHERE name = 'Triathlon- und Freiwasservorbereitung' AND locale = 'de');

COMMIT;

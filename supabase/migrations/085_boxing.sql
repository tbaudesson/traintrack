-- 085_boxing.sql
-- Boxing rounds among the timed sessions:
--   - 10 shadow-boxing combinations join the exercise library (names,
--     descriptions, key points and usual faults in three languages, a
--     lesson video each, what they load when injured, level and movements);
--   - app_settings.boxing_rounds: what a boxing session is built from, the
--     lengths offered, the round formats (2 min or 3 min, a minute of rest),
--     the usual one for each level, how long each combination lasts, the
--     order of the kinds in a round (the burst closes it) and the
--     combinations, editable in Admin > Boxing.
-- Nothing the app already reads changes: the code before it ignores both.
-- Plain quotes only; safe to run again (nothing added twice, nothing an
-- admin changed is overwritten). All-or-nothing: one transaction.

BEGIN;

INSERT INTO exercises (user_id, name, muscle_group, equipment, is_custom, description, name_fr, name_de, description_fr, description_de, video_url, injury_rules, level, movements, secondary_muscles, cues, mistakes)
SELECT NULL, 'Shadow Boxing Jab-Cross', 'shoulders', 'bodyweight', false, 'Guard up, lead foot forward. Snap the lead hand straight out (jab), then drive the rear hand straight through, turning the rear hip and heel. Hands back to the face after each punch.', 'Jab-direct', 'Jab-Gerade', 'Garde haute, pied avant devant. Lancez la main avant droit devant (jab), puis le direct du bras arrière en tournant la hanche et le talon arrière. Les mains reviennent au visage après chaque coup.', 'Deckung oben, vorderer Fuß vorn. Die Führhand gerade vorschnellen lassen (Jab), dann die Schlaghand gerade durchziehen, hintere Hüfte und Ferse eindrehen. Nach jedem Schlag die Hände zurück zum Gesicht.', 'https://www.youtube.com/watch?v=YI0uAx1QPvI', '{"shoulder": "caution", "elbow": "caution", "wrist": "caution"}'::jsonb, 'beginner', '["push_horizontal", "rotation", "conditioning"]'::jsonb, '["arms", "core"]'::jsonb, '{"fr": ["Le poing tourne en fin de coup, coude dans l’axe", "Le direct part de la hanche et du talon arrière", "La main qui ne frappe pas reste au menton"], "en": ["Turn the fist at the end of the punch, elbow in line", "The cross starts from the rear hip and heel", "The other hand stays at the chin"], "de": ["Faust am Ende des Schlags eindrehen, Ellbogen in Linie", "Die Gerade kommt aus hinterer Hüfte und Ferse", "Die andere Hand bleibt am Kinn"]}'::jsonb, '{"fr": ["Baisser la garde en frappant", "Verrouiller le coude bras tendu"], "en": ["Dropping the guard while punching", "Locking the elbow at full reach"], "de": ["Beim Schlagen die Deckung fallen lassen", "Den Ellbogen ganz durchstrecken"]}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE user_id IS NULL AND name = 'Shadow Boxing Jab-Cross');

INSERT INTO exercises (user_id, name, muscle_group, equipment, is_custom, description, name_fr, name_de, description_fr, description_de, video_url, injury_rules, level, movements, secondary_muscles, cues, mistakes)
SELECT NULL, 'Shadow Boxing Double Jab-Cross', 'shoulders', 'bodyweight', false, 'Two quick jabs with a small step forward, then the cross. The first jab measures the distance, the second one opens the way.', 'Double jab, direct', 'Doppel-Jab, Gerade', 'Deux jabs rapides en avançant d’un petit pas, puis le direct. Le premier jab mesure la distance, le second ouvre le passage.', 'Zwei schnelle Jabs mit einem kleinen Schritt nach vorn, dann die Gerade. Der erste Jab misst die Distanz, der zweite öffnet den Weg.', 'https://www.youtube.com/watch?v=0PA2TDoPzVA', '{"shoulder": "caution", "elbow": "caution", "wrist": "caution"}'::jsonb, 'beginner', '["push_horizontal", "rotation", "conditioning"]'::jsonb, '["arms", "core"]'::jsonb, '{"fr": ["Deux jabs vifs, le second un peu plus long", "Le pied avant avance avec le jab", "Direct en tournant le talon arrière"], "en": ["Two sharp jabs, the second a little longer", "The lead foot steps in with the jab", "Cross while turning the rear heel"], "de": ["Zwei schnelle Jabs, der zweite etwas länger", "Der vordere Fuß geht mit dem Jab mit", "Gerade mit eingedrehter hinterer Ferse"]}'::jsonb, '{"fr": ["Ramener le jab trop bas entre les deux", "Se pencher en avant au lieu d’avancer"], "en": ["Pulling the jab back low between the two", "Leaning forward instead of stepping"], "de": ["Den Jab zwischen beiden tief zurückziehen", "Nach vorn lehnen statt zu gehen"]}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE user_id IS NULL AND name = 'Shadow Boxing Double Jab-Cross');

INSERT INTO exercises (user_id, name, muscle_group, equipment, is_custom, description, name_fr, name_de, description_fr, description_de, video_url, injury_rules, level, movements, secondary_muscles, cues, mistakes)
SELECT NULL, 'Shadow Boxing Jab-Cross-Hook', 'shoulders', 'bodyweight', false, 'Jab, cross, then a lead hook: the lead elbow comes up to shoulder height, arm bent at a right angle, and the hips and lead foot turn the punch across.', 'Jab, direct, crochet', 'Jab, Gerade, Haken', 'Jab, direct, puis crochet du bras avant : le coude avant monte à hauteur d’épaule, bras plié à angle droit, et les hanches et le pied avant pivotent pour lancer le coup.', 'Jab, Gerade, dann ein Führhandhaken: der vordere Ellbogen kommt auf Schulterhöhe, Arm im rechten Winkel gebeugt, Hüfte und vorderer Fuß drehen den Schlag herum.', 'https://www.youtube.com/watch?v=H8VF1EQ2CCo', '{"shoulder": "caution", "elbow": "caution", "wrist": "caution"}'::jsonb, 'beginner', '["push_horizontal", "rotation", "conditioning"]'::jsonb, '["arms", "core"]'::jsonb, '{"fr": ["Crochet bras plié à 90°, coude à hauteur du poing", "Pivoter sur le pied avant", "Le direct prépare le crochet en chargeant la hanche avant"], "en": ["Hook with the arm bent at 90°, elbow level with the fist", "Pivot on the lead foot", "The cross loads the lead hip for the hook"], "de": ["Haken mit 90°-gebeugtem Arm, Ellbogen auf Faushöhe", "Auf dem vorderen Fuß drehen", "Die Gerade lädt die vordere Hüfte für den Haken"]}'::jsonb, '{"fr": ["Armer le crochet en reculant le bras", "Frapper avec le bras seul, sans pivoter"], "en": ["Winding the hook up by pulling the arm back", "Punching with the arm alone, without pivoting"], "de": ["Den Haken durch Zurückziehen des Arms ankündigen", "Nur aus dem Arm schlagen, ohne Drehung"]}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE user_id IS NULL AND name = 'Shadow Boxing Jab-Cross-Hook');

INSERT INTO exercises (user_id, name, muscle_group, equipment, is_custom, description, name_fr, name_de, description_fr, description_de, video_url, injury_rules, level, movements, secondary_muscles, cues, mistakes)
SELECT NULL, 'Shadow Boxing Jab-Cross-Hook-Cross', 'shoulders', 'bodyweight', false, 'The 1-2-3-2: jab, cross, lead hook, and a last cross while the hips swing back. Four punches in one flow, the weight going from one foot to the other.', 'Jab, direct, crochet, direct', 'Jab, Gerade, Haken, Gerade', 'Le 1-2-3-2 : jab, direct, crochet avant, et un dernier direct pendant que les hanches reviennent. Quatre coups d’un seul trait, le poids passant d’un pied à l’autre.', 'Die 1-2-3-2: Jab, Gerade, Führhandhaken und eine letzte Gerade, während die Hüfte zurückschwingt. Vier Schläge in einem Fluss, das Gewicht wandert von Fuß zu Fuß.', 'https://www.youtube.com/watch?v=LKxMYyHIpH8', '{"shoulder": "caution", "elbow": "caution", "wrist": "caution"}'::jsonb, 'intermediate', '["push_horizontal", "rotation", "conditioning"]'::jsonb, '["arms", "core"]'::jsonb, '{"fr": ["Enchaîner sans pause, les hanches donnent le rythme", "Le dernier direct profite du retour du crochet", "Garde haute à la fin"], "en": ["Flow without pausing, the hips set the rhythm", "The last cross rides the return of the hook", "Guard up at the end"], "de": ["Ohne Pause verbinden, die Hüfte gibt den Rhythmus", "Die letzte Gerade nutzt das Zurückdrehen vom Haken", "Am Ende Deckung oben"]}'::jsonb, '{"fr": ["S’arrêter entre les coups", "Finir en déséquilibre vers l’avant"], "en": ["Stopping between the punches", "Ending off balance, leaning forward"], "de": ["Zwischen den Schlägen anhalten", "Am Ende nach vorn aus dem Gleichgewicht kommen"]}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE user_id IS NULL AND name = 'Shadow Boxing Jab-Cross-Hook-Cross');

INSERT INTO exercises (user_id, name, muscle_group, equipment, is_custom, description, name_fr, name_de, description_fr, description_de, video_url, injury_rules, level, movements, secondary_muscles, cues, mistakes)
SELECT NULL, 'Shadow Boxing Uppercuts', 'shoulders', 'bodyweight', false, 'Alternate lead and rear uppercuts: bend the knees slightly, turn the hip and drive the fist upwards, palm towards you, close to the body.', 'Uppercuts', 'Aufwärtshaken', 'Alternez uppercuts avant et arrière : fléchissez légèrement les genoux, tournez la hanche et montez le poing, paume vers vous, près du corps.', 'Führ- und Schlaghand-Aufwärtshaken im Wechsel: Knie leicht beugen, Hüfte eindrehen und die Faust nach oben treiben, Handfläche zu dir, nah am Körper.', 'https://www.youtube.com/watch?v=ZmxyguvPwlo', '{"shoulder": "caution", "elbow": "caution", "wrist": "caution"}'::jsonb, 'beginner', '["rotation", "conditioning"]'::jsonb, '["arms", "legs"]'::jsonb, '{"fr": ["La poussée vient des jambes et de la hanche", "Poing paume vers soi, coude plié", "Coup court, qui ne dépasse pas le menton"], "en": ["The drive comes from the legs and hip", "Fist palm-up, elbow bent", "A short punch, no higher than the chin"], "de": ["Der Schub kommt aus Beinen und Hüfte", "Faust mit Handfläche zu dir, Ellbogen gebeugt", "Kurzer Schlag, nicht höher als das Kinn"]}'::jsonb, '{"fr": ["Baisser la main avant de frapper", "Frapper loin du corps, bras tendu"], "en": ["Dropping the hand before punching", "Punching far from the body, arm straight"], "de": ["Die Hand vor dem Schlag senken", "Weit vom Körper mit gestrecktem Arm schlagen"]}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE user_id IS NULL AND name = 'Shadow Boxing Uppercuts');

INSERT INTO exercises (user_id, name, muscle_group, equipment, is_custom, description, name_fr, name_de, description_fr, description_de, video_url, injury_rules, level, movements, secondary_muscles, cues, mistakes)
SELECT NULL, 'Shadow Boxing Body Shots', 'core', 'bodyweight', false, 'Bend the knees to lower the level, then jab and hook to the body. The back stays straight: the legs go down, not the head.', 'Coups au corps', 'Körpertreffer', 'Fléchissez les genoux pour descendre, puis jab et crochet au corps. Le dos reste droit : ce sont les jambes qui descendent, pas la tête.', 'Knie beugen, um tiefer zu gehen, dann Jab und Haken zum Körper. Der Rücken bleibt gerade: die Beine gehen runter, nicht der Kopf.', 'https://www.youtube.com/watch?v=IJe74IFmi5Q', '{"shoulder": "caution", "wrist": "caution", "knee": "caution", "lower_back": "caution"}'::jsonb, 'intermediate', '["squat", "rotation", "conditioning"]'::jsonb, '["shoulders", "legs"]'::jsonb, '{"fr": ["Descendre en pliant les genoux", "Dos droit, regard devant", "Remonter en garde après la série"], "en": ["Lower the level by bending the knees", "Back straight, eyes forward", "Come back up into guard after the series"], "de": ["Durch Beugen der Knie tiefer gehen", "Rücken gerade, Blick nach vorn", "Nach der Serie zurück in die Deckung"]}'::jsonb, '{"fr": ["Se pencher en avant au lieu de plier les jambes", "Baisser les mains en descendant"], "en": ["Bending forward instead of bending the legs", "Dropping the hands on the way down"], "de": ["Nach vorn beugen statt die Beine zu beugen", "Beim Absenken die Hände fallen lassen"]}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE user_id IS NULL AND name = 'Shadow Boxing Body Shots');

INSERT INTO exercises (user_id, name, muscle_group, equipment, is_custom, description, name_fr, name_de, description_fr, description_de, video_url, injury_rules, level, movements, secondary_muscles, cues, mistakes)
SELECT NULL, 'Shadow Boxing Slip and Counter', 'core', 'bodyweight', false, 'Imagine a jab coming: slip it by turning the shoulders and bending the knees slightly to one side, head just off the line, then counter at once with a cross or a hook.', 'Esquive et contre', 'Ausweichen und kontern', 'Imaginez un jab qui arrive : esquivez en tournant les épaules et en fléchissant un peu les genoux d’un côté, la tête juste hors de la ligne, puis contrez aussitôt d’un direct ou d’un crochet.', 'Stell dir einen kommenden Jab vor: ausweichen, indem du die Schultern drehst und die Knie leicht zur Seite beugst, der Kopf knapp aus der Linie, dann sofort mit Gerade oder Haken kontern.', 'https://www.youtube.com/watch?v=GNBcd7zhrNc', '{"lower_back": "caution", "neck": "caution", "shoulder": "caution"}'::jsonb, 'intermediate', '["rotation", "conditioning"]'::jsonb, '["legs", "shoulders"]'::jsonb, '{"fr": ["Esquive petite, juste hors de la ligne", "Les genoux plient, le dos reste droit", "Le contre part dès la fin de l’esquive"], "en": ["A small slip, just off the line", "The knees bend, the back stays straight", "Counter as the slip ends"], "de": ["Kleines Ausweichen, knapp aus der Linie", "Die Knie beugen, der Rücken bleibt gerade", "Kontern, sobald das Ausweichen endet"]}'::jsonb, '{"fr": ["Pencher la tête seule sur le côté", "Esquiver trop large et perdre l’équilibre"], "en": ["Tilting only the head to the side", "Slipping too wide and losing balance"], "de": ["Nur den Kopf zur Seite neigen", "Zu weit ausweichen und das Gleichgewicht verlieren"]}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE user_id IS NULL AND name = 'Shadow Boxing Slip and Counter');

INSERT INTO exercises (user_id, name, muscle_group, equipment, is_custom, description, name_fr, name_de, description_fr, description_de, video_url, injury_rules, level, movements, secondary_muscles, cues, mistakes)
SELECT NULL, 'Shadow Boxing Bob and Weave', 'legs', 'bodyweight', false, 'Roll under an imaginary hook: bend the knees and draw a U with the head from one side to the other, guard up, then come back up ready to punch.', 'Esquive rotative', 'Abtauchen und Pendeln', 'Passez sous un crochet imaginaire : pliez les genoux et dessinez un U avec la tête d’un côté à l’autre, garde haute, puis remontez prêt à frapper.', 'Unter einem gedachten Haken durchtauchen: Knie beugen und mit dem Kopf ein U von einer Seite zur anderen zeichnen, Deckung oben, dann schlagbereit wieder hoch.', 'https://www.youtube.com/watch?v=XIja1S9SXI4', '{"knee": "caution", "lower_back": "caution"}'::jsonb, 'intermediate', '["squat", "rotation", "conditioning"]'::jsonb, '["core"]'::jsonb, '{"fr": ["Descendre par les jambes, pas par le dos", "La tête dessine un U", "Garde haute tout du long"], "en": ["Go down with the legs, not the back", "The head draws a U", "Guard up all the way"], "de": ["Mit den Beinen runter, nicht mit dem Rücken", "Der Kopf zeichnet ein U", "Die ganze Zeit Deckung oben"]}'::jsonb, '{"fr": ["Se pencher en avant, la tête plus bas que la taille", "Fermer les yeux en passant dessous"], "en": ["Bending forward, the head below the waist", "Closing the eyes when going under"], "de": ["Nach vorn beugen, Kopf unter Hüfthöhe", "Beim Durchtauchen die Augen schließen"]}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE user_id IS NULL AND name = 'Shadow Boxing Bob and Weave');

INSERT INTO exercises (user_id, name, muscle_group, equipment, is_custom, description, name_fr, name_de, description_fr, description_de, video_url, injury_rules, level, movements, secondary_muscles, cues, mistakes)
SELECT NULL, 'Shadow Boxing Footwork', 'legs', 'bodyweight', false, 'Light on the balls of the feet: step in and out, to the sides, and pivot on the lead foot, always back in your stance, with a jab now and then.', 'Jeu de jambes', 'Beinarbeit', 'Léger sur la pointe des pieds : avancez, reculez, déplacez-vous sur les côtés et pivotez sur le pied avant, toujours revenu en garde, avec un jab de temps en temps.', 'Leicht auf den Fußballen: vor und zurück, zur Seite, und auf dem vorderen Fuß drehen, immer zurück in die Auslage, ab und zu ein Jab.', 'https://www.youtube.com/watch?v=_qZdEGFSxdM', '{"knee": "caution", "ankle": "caution"}'::jsonb, 'beginner', '["jump", "conditioning"]'::jsonb, '["core"]'::jsonb, '{"fr": ["Le pied qui est du côté où l’on va bouge le premier", "Ne jamais croiser les pieds", "Petits pas, toujours en appui"], "en": ["The foot on the side you go moves first", "Never cross the feet", "Small steps, always balanced"], "de": ["Der Fuß auf der Seite, in die du gehst, bewegt sich zuerst", "Nie die Füße kreuzen", "Kleine Schritte, immer im Gleichgewicht"]}'::jsonb, '{"fr": ["Sauter haut au lieu de glisser", "Rester sur les talons"], "en": ["Hopping high instead of gliding", "Staying on the heels"], "de": ["Hoch springen statt zu gleiten", "Auf den Fersen stehen"]}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE user_id IS NULL AND name = 'Shadow Boxing Footwork');

INSERT INTO exercises (user_id, name, muscle_group, equipment, is_custom, description, name_fr, name_de, description_fr, description_de, video_url, injury_rules, level, movements, secondary_muscles, cues, mistakes)
SELECT NULL, 'Shadow Boxing Speed Punches', 'shoulders', 'bodyweight', false, 'To end the round: short, fast straight punches, one hand after the other, as many as you can, relaxed shoulders, without fully extending the arms.', 'Rafale de directs', 'Schnelle Geraden', 'Pour finir le round : des directs courts et rapides, une main après l’autre, le plus possible, épaules relâchées, sans tendre complètement les bras.', 'Zum Rundenende: kurze, schnelle Geraden, eine Hand nach der anderen, so viele wie möglich, Schultern locker, ohne die Arme ganz zu strecken.', 'https://www.youtube.com/watch?v=nyD9JPi9aCE', '{"shoulder": "caution", "elbow": "caution", "wrist": "caution"}'::jsonb, 'beginner', '["push_horizontal", "conditioning"]'::jsonb, '["arms", "core"]'::jsonb, '{"fr": ["Vitesse avant la puissance", "Épaules relâchées, souffle court à chaque coup", "Mains qui reviennent au visage"], "en": ["Speed before power", "Relaxed shoulders, a short breath with each punch", "Hands back to the face"], "de": ["Tempo vor Kraft", "Schultern locker, bei jedem Schlag kurz ausatmen", "Hände zurück zum Gesicht"]}'::jsonb, '{"fr": ["Bloquer la respiration", "Frapper bras tendus jusqu’à la butée"], "en": ["Holding the breath", "Punching to full extension"], "de": ["Die Luft anhalten", "Bis zum Anschlag durchstrecken"]}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE user_id IS NULL AND name = 'Shadow Boxing Speed Punches');

INSERT INTO app_settings (key, value) VALUES ('boxing_rounds', '
{
  "minutes": [
    10,
    15,
    20,
    30
  ],
  "formats": [
    "120-60",
    "180-60"
  ],
  "formatForLevel": {
    "beginner": "120-60",
    "intermediate": "180-60",
    "advanced": "180-60"
  },
  "comboSec": 30,
  "rhythm": [
    "attack",
    "defense",
    "attack",
    "footwork",
    "attack"
  ],
  "combos": [
    {
      "name": "Shadow Boxing Jab-Cross",
      "muscleGroup": "shoulders",
      "kind": "attack"
    },
    {
      "name": "Shadow Boxing Double Jab-Cross",
      "muscleGroup": "shoulders",
      "kind": "attack"
    },
    {
      "name": "Shadow Boxing Jab-Cross-Hook",
      "muscleGroup": "shoulders",
      "kind": "attack"
    },
    {
      "name": "Shadow Boxing Jab-Cross-Hook-Cross",
      "muscleGroup": "shoulders",
      "kind": "attack"
    },
    {
      "name": "Shadow Boxing Uppercuts",
      "muscleGroup": "shoulders",
      "kind": "attack"
    },
    {
      "name": "Shadow Boxing Body Shots",
      "muscleGroup": "core",
      "kind": "attack"
    },
    {
      "name": "Shadow Boxing Slip and Counter",
      "muscleGroup": "core",
      "kind": "defense"
    },
    {
      "name": "Shadow Boxing Bob and Weave",
      "muscleGroup": "legs",
      "kind": "defense"
    },
    {
      "name": "Shadow Boxing Footwork",
      "muscleGroup": "legs",
      "kind": "footwork"
    },
    {
      "name": "Shadow Boxing Speed Punches",
      "muscleGroup": "shoulders",
      "kind": "finisher"
    }
  ]
}
')
ON CONFLICT (key) DO NOTHING;

COMMIT;

import { useCallback, useMemo } from "react";
import { useExercises } from "@/hooks/useExercises";
import { useLocale } from "next-intl";

/**
 * The library's exercises in French and German. The English name stays the
 * key everywhere (programs and sessions find exercises by it); only what the
 * athlete reads changes. Custom exercises keep the name their author gave.
 */
export const NAMES: Record<string, { fr: string; de: string }> = {
  "Barbell Bench Press": { fr: "Développé couché à la barre", de: "Bankdrücken mit Langhantel" },
  "Incline Barbell Bench Press": { fr: "Développé incliné à la barre", de: "Schrägbankdrücken mit Langhantel" },
  "Dumbbell Bench Press": { fr: "Développé couché aux haltères", de: "Kurzhantel-Bankdrücken" },
  "Incline Dumbbell Press": { fr: "Développé incliné aux haltères", de: "Schrägbankdrücken mit Kurzhanteln" },
  "Cable Fly": { fr: "Écarté à la poulie", de: "Kabelfliegende" },
  "Push-up": { fr: "Pompes", de: "Liegestütze" },
  "Chest Dip": { fr: "Dips (pectoraux)", de: "Dips (Brust)" },
  Deadlift: { fr: "Soulevé de terre", de: "Kreuzheben" },
  "Barbell Row": { fr: "Rowing à la barre", de: "Langhantelrudern" },
  "Pull-up": { fr: "Tractions pronation", de: "Klimmzüge" },
  "Chin-up": { fr: "Tractions supination", de: "Klimmzüge im Untergriff" },
  "Lat Pulldown": { fr: "Tirage vertical", de: "Latzug" },
  "Seated Cable Row": { fr: "Tirage horizontal à la poulie", de: "Rudern am Kabelzug sitzend" },
  "Dumbbell Row": { fr: "Rowing à un bras avec haltère", de: "Einarmiges Kurzhantelrudern" },
  "T-Bar Row": { fr: "Rowing T-bar", de: "T-Bar-Rudern" },
  "Back Squat": { fr: "Squat arrière", de: "Kniebeuge" },
  "Front Squat": { fr: "Squat avant", de: "Frontkniebeuge" },
  "Romanian Deadlift": { fr: "Soulevé de terre roumain", de: "Rumänisches Kreuzheben" },
  "Leg Press": { fr: "Presse à cuisses", de: "Beinpresse" },
  "Leg Extension": { fr: "Leg extension", de: "Beinstrecker" },
  "Leg Curl": { fr: "Leg curl", de: "Beinbeuger" },
  "Walking Lunge": { fr: "Fentes marchées", de: "Ausfallschritte gehend" },
  "Bulgarian Split Squat": { fr: "Squat bulgare", de: "Bulgarische Kniebeuge" },
  "Standing Calf Raise": { fr: "Mollets debout", de: "Wadenheben stehend" },
  "Hip Thrust": { fr: "Hip thrust", de: "Hip Thrust" },
  "Overhead Press": { fr: "Développé militaire", de: "Schulterdrücken stehend" },
  "Seated Dumbbell Press": { fr: "Développé épaules assis aux haltères", de: "Kurzhantel-Schulterdrücken sitzend" },
  "Lateral Raise": { fr: "Élévations latérales", de: "Seitheben" },
  "Rear Delt Fly": { fr: "Oiseau (deltoïdes postérieurs)", de: "Reverse Flys" },
  "Face Pull": { fr: "Face pull", de: "Face Pull" },
  "Barbell Curl": { fr: "Curl à la barre", de: "Langhantel-Curl" },
  "Dumbbell Curl": { fr: "Curl aux haltères", de: "Kurzhantel-Curl" },
  "Hammer Curl": { fr: "Curl marteau", de: "Hammer-Curl" },
  "Triceps Pushdown": { fr: "Extension triceps à la poulie", de: "Trizepsdrücken am Kabel" },
  "Skull Crusher": { fr: "Barre au front", de: "French Press liegend" },
  "Overhead Triceps Extension": { fr: "Extension triceps au-dessus de la tête", de: "Trizepsstrecken über Kopf" },
  Plank: { fr: "Gainage (planche)", de: "Unterarmstütz (Plank)" },
  "Hanging Leg Raise": { fr: "Relevés de jambes suspendu", de: "Beinheben hängend" },
  "Cable Crunch": { fr: "Crunch à la poulie", de: "Kabel-Crunch" },
  "Russian Twist": { fr: "Rotations russes", de: "Russian Twist" },
  "Side Plank": { fr: "Gainage latéral", de: "Seitstütz" },
  "Dead Bug": { fr: "Dead bug", de: "Dead Bug" },
  "Bird Dog": { fr: "Bird dog (quadrupédie)", de: "Vierfüßlerstand diagonal" },
  "Glute Bridge": { fr: "Pont fessier", de: "Glute Bridge" },
  "Single-Leg Calf Raise": { fr: "Mollets sur une jambe", de: "Einbeiniges Wadenheben" },
  "Step-up": { fr: "Montée sur banc", de: "Step-up" },
  "Single-Leg Romanian Deadlift": { fr: "Soulevé de terre roumain sur une jambe", de: "Einbeiniges rumänisches Kreuzheben" },
  "External Shoulder Rotation": { fr: "Rotation externe de l'épaule", de: "Schulter-Außenrotation" },
  "Straight-Arm Pulldown": { fr: "Pull-over à la poulie, bras tendus", de: "Latziehen mit gestreckten Armen" },
  Burpee: { fr: "Burpee", de: "Burpee" },
  "Bodyweight Squat": { fr: "Squat au poids du corps", de: "Kniebeuge ohne Gewicht" },
  "Jump Squat": { fr: "Squat sauté", de: "Sprungkniebeuge" },
  "Mountain Climber": { fr: "Mountain climber", de: "Bergsteiger" },
  "Jumping Jack": { fr: "Jumping jack", de: "Hampelmann" },
  "High Knees": { fr: "Montées de genoux", de: "Kniehebelauf" },
  "Reverse Lunge": { fr: "Fente arrière", de: "Ausfallschritt rückwärts" },
  "Jumping Lunge": { fr: "Fentes sautées", de: "Sprungausfallschritte" },
  "Skater Jump": { fr: "Sauts de patineur", de: "Eisschnellläufer-Sprünge" },
  "Wall Sit": { fr: "Chaise contre le mur", de: "Wandsitzen" },
  Inchworm: { fr: "Chenille (inchworm)", de: "Raupe (Inchworm)" },
  "Plank Shoulder Tap": { fr: "Planche avec touches d'épaule", de: "Plank mit Schulterberührung" },
  "Bicycle Crunch": { fr: "Crunch vélo", de: "Fahrrad-Crunch" },
  "Flutter Kicks": { fr: "Battements de jambes", de: "Flutter Kicks" },
  Crunch: { fr: "Crunch", de: "Crunch" },
  "Lying Leg Raise": { fr: "Relevés de jambes au sol", de: "Beinheben liegend" },
  "Hollow Hold": { fr: "Hollow hold (position creuse)", de: "Hollow Hold" },
  "Goblet Squat": { fr: "Goblet squat", de: "Goblet Squat" },
  "Dumbbell Thruster": { fr: "Thruster aux haltères", de: "Kurzhantel-Thruster" },
  "Dumbbell Swing": { fr: "Swing avec haltère", de: "Kurzhantel-Swing" },
  "Renegade Row": { fr: "Rowing renegade", de: "Renegade Row" },
  "Dumbbell Romanian Deadlift": { fr: "Soulevé de terre roumain aux haltères", de: "Rumänisches Kreuzheben mit Kurzhanteln" },
  "Dumbbell Reverse Lunge": { fr: "Fente arrière aux haltères", de: "Ausfallschritt rückwärts mit Kurzhanteln" },
  "Dumbbell Sumo Squat": { fr: "Squat sumo avec haltère", de: "Sumo-Kniebeuge mit Kurzhantel" },
  "Dumbbell Push Press": { fr: "Push press aux haltères", de: "Kurzhantel-Push-Press" },
  "Dumbbell Woodchop": { fr: "Bûcheron avec haltère", de: "Holzhacker mit Kurzhantel" },
  "Handstand Hold": { fr: "Appui tendu renversé (ATR) au mur", de: "Handstand an der Wand" },
  "Single-Leg Balance": { fr: "Équilibre sur une jambe", de: "Einbeinstand" },
  "Arabesque Hold": { fr: "Arabesque (équilibre)", de: "Standwaage" },
  "Superman Hold": { fr: "Superman (gainage dorsal)", de: "Superman" },
  "Tuck Jump": { fr: "Sauts groupés", de: "Hocksprünge" },
  "Bridge Hold": { fr: "Pont", de: "Brücke" },
  "Front Split Stretch": { fr: "Grand écart avant (progressif)", de: "Spagat vorwärts (schrittweise)" },
  "Pike Stretch": { fr: "Pince assise (jambes tendues)", de: "Hechtdehnung im Sitzen" },
  "Butt Kicks": { fr: "Talons-fesses", de: "Anfersen" },
  "Fast Feet": { fr: "Pas rapides sur place", de: "Schnelle Füße" },
  "Lateral Shuffle": { fr: "Pas chassés latéraux", de: "Seitliche Sidesteps" },
  "Step Jack": { fr: "Jumping jack sans saut", de: "Hampelmann ohne Sprung" },
  "Standing Knee Drive": { fr: "Montées de genou debout", de: "Kniehub im Stehen" },
  "Star Jump": { fr: "Saut en étoile", de: "Sternsprung" },
  "Broad Jump": { fr: "Saut en longueur", de: "Weitsprung aus dem Stand" },
  "Shadow Boxing": { fr: "Boxe dans le vide", de: "Schattenboxen" },
  "Squat Thrust": { fr: "Squat thrust", de: "Squat Thrust" },
  "Plank Jack": { fr: "Planche jumping jack", de: "Plank Jacks" },
  "Bear Crawl": { fr: "Marche de l'ours", de: "Bärengang" },
  "Sumo Squat": { fr: "Squat sumo", de: "Sumo-Kniebeuge" },
  "Squat Pulse": { fr: "Squat pulsé", de: "Kniebeuge-Pulse" },
  "Lateral Lunge": { fr: "Fente latérale", de: "Seitlicher Ausfallschritt" },
  "Curtsy Lunge": { fr: "Fente croisée", de: "Curtsy Lunge" },
  "Split Squat": { fr: "Fente statique", de: "Split Squat" },
  "Cossack Squat": { fr: "Squat cosaque", de: "Kosaken-Kniebeuge" },
  "Single-Leg Glute Bridge": { fr: "Pont fessier sur une jambe", de: "Einbeinige Glute Bridge" },
  "Bodyweight Calf Raise": { fr: "Montées sur pointes", de: "Wadenheben ohne Gewicht" },
  "Good Morning": { fr: "Good morning", de: "Good Morning" },
  "Donkey Kick": { fr: "Kick arrière à quatre pattes", de: "Donkey Kick" },
  "Fire Hydrant": { fr: "Fire hydrant (ouverture de hanche)", de: "Fire Hydrant" },
  "Knee Push-up": { fr: "Pompes sur les genoux", de: "Liegestütze auf den Knien" },
  "Incline Push-up": { fr: "Pompes inclinées", de: "Schräge Liegestütze" },
  "Diamond Push-up": { fr: "Pompes diamant", de: "Diamant-Liegestütze" },
  "Pike Push-up": { fr: "Pompes en V (pike)", de: "Pike-Liegestütze" },
  "Bench Dip": { fr: "Dips sur une chaise", de: "Dips an der Stuhlkante" },
  "Heel Taps": { fr: "Touches de talons", de: "Fersen-Tippen" },
  "Reverse Crunch": { fr: "Crunch inversé", de: "Reverse Crunch" },
  "Scissor Kicks": { fr: "Ciseaux", de: "Scherenbeine" },
  "V-up": { fr: "V-up", de: "V-Up" },
  "Sit-up": { fr: "Relevés de buste", de: "Sit-up" },
  "Standing Oblique Crunch": { fr: "Crunch oblique debout", de: "Seitlicher Crunch im Stehen" },
  "Glute Bridge Hold": { fr: "Pont fessier tenu", de: "Glute Bridge halten" },
  "Side Plank Hip Dip": { fr: "Planche latérale avec descente de hanche", de: "Seitstütz mit Hüftsenken" },
  "Dumbbell Bent-Over Row": { fr: "Rowing buste penché aux haltères", de: "Vorgebeugtes Kurzhantelrudern" },
  "Dumbbell Floor Press": { fr: "Développé au sol aux haltères", de: "Kurzhantel-Bodendrücken" },
  "Dumbbell Curl to Press": { fr: "Curl puis développé aux haltères", de: "Curl mit Schulterdrücken" },
  "Dumbbell Lateral Lunge": { fr: "Fente latérale avec haltère", de: "Seitlicher Ausfallschritt mit Kurzhantel" },
  "Dumbbell Glute Bridge": { fr: "Pont fessier avec haltère", de: "Glute Bridge mit Kurzhantel" },
  "Dumbbell Hammer Curl": { fr: "Curl marteau aux haltères", de: "Hammer-Curl mit Kurzhanteln" },
};

export const DESCRIPTIONS: Record<string, { fr: string; de: string }> = {
  "Side Plank": {
    fr: "Sur un avant-bras, le corps aligné, les hanches hautes. Tenir sans s'affaisser.",
    de: "Auf einem Unterarm, Körper in einer Linie, Hüfte hoch. Halten, ohne durchzuhängen.",
  },
  "Dead Bug": {
    fr: "Sur le dos, descendre lentement le bras et la jambe opposés en gardant le bas du dos plaqué au sol.",
    de: "In Rückenlage den gegenüberliegenden Arm und das Bein langsam absenken, der untere Rücken bleibt am Boden.",
  },
  "Bird Dog": {
    fr: "À quatre pattes, tendre le bras et la jambe opposés, marquer une pause, revenir sans tourner le buste.",
    de: "Im Vierfüßlerstand den gegenüberliegenden Arm und das Bein strecken, kurz halten, ohne Verdrehen zurück.",
  },
  "Glute Bridge": {
    fr: "Sur le dos, genoux fléchis, pousser les hanches vers le haut en serrant les fessiers.",
    de: "In Rückenlage mit gebeugten Knien die Hüfte nach oben drücken und das Gesäß anspannen.",
  },
  "Single-Leg Calf Raise": {
    fr: "Sur un pied, monter le plus haut possible, puis redescendre lentement en trois secondes.",
    de: "Auf einem Fuß so hoch wie möglich steigen, dann in drei Sekunden langsam absenken.",
  },
  "Step-up": {
    fr: "Monter sur un banc en poussant sur le talon avant, redescendre en contrôlant.",
    de: "Auf eine Box steigen, über die vordere Ferse drücken, kontrolliert absenken.",
  },
  "Single-Leg Romanian Deadlift": {
    fr: "En équilibre sur une jambe, basculer à partir des hanches dos plat, remonter en serrant le fessier.",
    de: "Auf einem Bein balancieren, mit geradem Rücken aus der Hüfte beugen, mit angespanntem Gesäß zurück.",
  },
  "External Shoulder Rotation": {
    fr: "Coude collé au corps, tourner lentement l'avant-bras vers l'extérieur. Charge légère.",
    de: "Ellbogen am Körper, den Unterarm langsam nach außen drehen. Leichtes Gewicht.",
  },
  "Straight-Arm Pulldown": {
    fr: "Bras presque tendus, tirer la barre jusqu'aux cuisses avec les dorsaux.",
    de: "Mit fast gestreckten Armen die Stange mit dem Latissimus zu den Oberschenkeln ziehen.",
  },
  Burpee: {
    fr: "Debout, mains au sol, sauter les pieds en arrière en planche, poitrine au sol, ramener les pieds et sauter.",
    de: "Aus dem Stand Hände auf den Boden, Füße in den Stütz springen, Brust zum Boden, Füße zurück und hochspringen.",
  },
  "Bodyweight Squat": {
    fr: "Pieds largeur d'épaules, s'asseoir en arrière jusqu'aux cuisses parallèles, buste droit, remonter.",
    de: "Füße schulterbreit, nach hinten unten setzen bis die Oberschenkel parallel sind, Brust aufrecht, hochkommen.",
  },
  "Jump Squat": {
    fr: "Descendre en squat, puis sauter le plus haut possible et se réceptionner en douceur dans le squat.",
    de: "In die Kniebeuge gehen, so hoch wie möglich springen und weich in der Kniebeuge landen.",
  },
  "Mountain Climber": {
    fr: "En planche bras tendus, ramener les genoux vers la poitrine l'un après l'autre, vite, hanches basses.",
    de: "Im hohen Stütz die Knie abwechselnd schnell zur Brust ziehen, Hüfte tief.",
  },
  "Jumping Jack": {
    fr: "Sauter pieds écartés en levant les bras au-dessus de la tête, puis revenir pieds joints.",
    de: "Mit gegrätschten Beinen springen und die Arme über den Kopf heben, dann zurückspringen.",
  },
  "High Knees": {
    fr: "Courir sur place en montant les genoux à hauteur des hanches, sur l'avant des pieds.",
    de: "Auf der Stelle laufen, Knie auf Hüfthöhe, auf den Fußballen.",
  },
  "Reverse Lunge": {
    fr: "Reculer d'un pas et descendre le genou arrière vers le sol, pousser sur le talon avant pour revenir. Alterner.",
    de: "Einen Schritt zurück, hinteres Knie Richtung Boden, über die vordere Ferse zurückdrücken. Beine abwechseln.",
  },
  "Jumping Lunge": {
    fr: "Depuis une fente, sauter et changer de jambe en l'air, se réceptionner en douceur en fente de l'autre côté.",
    de: "Aus dem Ausfallschritt springen, in der Luft die Beine wechseln und weich auf der anderen Seite landen.",
  },
  "Skater Jump": {
    fr: "Bondir latéralement d'un pied sur l'autre, la jambe arrière croisant derrière.",
    de: "Seitlich von einem Fuß auf den anderen springen, das hintere Bein kreuzt dahinter.",
  },
  "Wall Sit": {
    fr: "Dos au mur, descendre jusqu'aux genoux à 90 degrés et tenir.",
    de: "Rücken an der Wand, hinabgleiten bis die Knie 90 Grad haben, und halten.",
  },
  Inchworm: {
    fr: "Debout, avancer les mains jusqu'à la planche, puis ramener les pieds vers les mains et se redresser.",
    de: "Aus dem Stand mit den Händen in den Stütz laufen, dann die Füße zu den Händen bringen und aufrichten.",
  },
  "Plank Shoulder Tap": {
    fr: "En planche bras tendus, toucher chaque épaule avec la main opposée sans balancer les hanches.",
    de: "Im hohen Stütz mit jeder Hand die gegenüberliegende Schulter berühren, ohne die Hüfte zu bewegen.",
  },
  "Bicycle Crunch": {
    fr: "Sur le dos, amener chaque coude vers le genou opposé en tendant l'autre jambe.",
    de: "In Rückenlage jeden Ellbogen zum gegenüberliegenden Knie führen und das andere Bein strecken.",
  },
  "Flutter Kicks": {
    fr: "Sur le dos, jambes tendues décollées du sol, battre des jambes par petits mouvements rapides.",
    de: "In Rückenlage die gestreckten Beine anheben und in kleinen, schnellen Bewegungen auf und ab schlagen.",
  },
  Crunch: {
    fr: "Sur le dos, genoux fléchis, enrouler les épaules avec les abdos, puis redescendre lentement.",
    de: "In Rückenlage mit gebeugten Knien die Schultern mit den Bauchmuskeln anheben, dann langsam absenken.",
  },
  "Lying Leg Raise": {
    fr: "Sur le dos, jambes tendues, les monter à la verticale et redescendre lentement sans cambrer.",
    de: "In Rückenlage die gestreckten Beine senkrecht heben und langsam senken, ohne ins Hohlkreuz zu gehen.",
  },
  "Hollow Hold": {
    fr: "Sur le dos, bras et jambes tendus et décollés, le bas du dos plaqué au sol. Tenir.",
    de: "In Rückenlage Arme und Beine gestreckt anheben, unterer Rücken am Boden. Halten.",
  },
  "Goblet Squat": {
    fr: "Un haltère contre la poitrine, descendre en squat entre les genoux, buste droit, remonter.",
    de: "Eine Kurzhantel vor der Brust, zwischen die Knie in die Hocke gehen, Brust aufrecht, hochkommen.",
  },
  "Dumbbell Thruster": {
    fr: "Haltères aux épaules, squatter puis se relever en les poussant au-dessus de la tête d'un seul mouvement.",
    de: "Kurzhanteln an den Schultern, Kniebeuge, dann in einer Bewegung aufstehen und über Kopf drücken.",
  },
  "Dumbbell Swing": {
    fr: "Un haltère à deux mains, basculer des hanches et le lancer à hauteur de poitrine par une poussée des hanches.",
    de: "Eine Kurzhantel beidhändig, aus der Hüfte beugen und sie mit einem Hüftstoß auf Brusthöhe schwingen.",
  },
  "Renegade Row": {
    fr: "En planche sur deux haltères, tirer l'un vers la hanche puis l'autre, sans tourner les hanches.",
    de: "Im hohen Stütz auf zwei Kurzhanteln abwechselnd eine zur Hüfte ziehen, ohne die Hüfte zu drehen.",
  },
  "Dumbbell Romanian Deadlift": {
    fr: "Haltères devant les cuisses, basculer des hanches dos plat, puis se relever en serrant les fessiers.",
    de: "Kurzhanteln vor den Oberschenkeln, mit geradem Rücken aus der Hüfte beugen, mit angespanntem Gesäß aufrichten.",
  },
  "Dumbbell Reverse Lunge": {
    fr: "Un haltère dans chaque main, reculer en fente et pousser sur le talon avant pour revenir. Alterner.",
    de: "Mit einer Kurzhantel in jeder Hand rückwärts in den Ausfallschritt und über die vordere Ferse zurück. Abwechseln.",
  },
  "Dumbbell Sumo Squat": {
    fr: "Pieds écartés, pointes vers l'extérieur, un haltère entre les jambes, descendre genoux au-dessus des pieds.",
    de: "Breiter Stand, Fußspitzen nach außen, Kurzhantel zwischen den Beinen, Knie über den Zehen absenken.",
  },
  "Dumbbell Push Press": {
    fr: "Haltères aux épaules, fléchir légèrement les genoux puis les pousser au-dessus de la tête avec les jambes.",
    de: "Kurzhanteln an den Schultern, leicht in die Knie, dann mit Beinschwung über Kopf drücken.",
  },
  "Dumbbell Woodchop": {
    fr: "Un haltère à deux mains, le monter en diagonale de la hanche jusqu'au-dessus de l'épaule opposée.",
    de: "Eine Kurzhantel beidhändig diagonal von der Hüfte bis über die gegenüberliegende Schulter führen.",
  },
  "Handstand Hold": {
    fr: "Face au mur ou dos au mur, mains largeur d’épaules, corps droit et gainé. Tenir.",
    de: "Mit dem Gesicht oder dem Rücken zur Wand, Hände schulterbreit, Körper gerade und fest. Halten.",
  },
  "Single-Leg Balance": {
    fr: "Sur une jambe, l’autre genou levé, le regard fixé sur un point. Plus dur les yeux fermés ou sur un coussin.",
    de: "Auf einem Bein, das andere Knie angehoben, Blick auf einen Punkt. Schwerer mit geschlossenen Augen oder auf einem Kissen.",
  },
  "Arabesque Hold": {
    fr: "Sur une jambe, pencher le buste et monter l’autre jambe derrière à hauteur de hanche, bras ouverts. Tenir, dos long.",
    de: "Auf einem Bein den Oberkörper neigen und das andere Bein hinten auf Hüfthöhe heben, Arme seitlich. Halten, Rücken lang.",
  },
  "Superman Hold": {
    fr: "Sur le ventre, décoller bras et jambes du sol, fessiers serrés, nuque longue. Tenir.",
    de: "In Bauchlage Arme und Beine anheben, Gesäß angespannt, Nacken lang. Halten.",
  },
  "Tuck Jump": {
    fr: "Sauter en ramenant les deux genoux vers la poitrine, puis se réceptionner en douceur sur l’avant des pieds.",
    de: "Springen und beide Knie zur Brust ziehen, dann weich auf den Fußballen landen.",
  },
  "Bridge Hold": {
    fr: "Sur le dos, mains près des oreilles, pousser jusqu’au pont, bras et jambes le plus tendus possible. Tenir.",
    de: "In Rückenlage, Hände neben den Ohren, in die Brücke drücken, Arme und Beine möglichst gestreckt. Halten.",
  },
  "Front Split Stretch": {
    fr: "Une jambe devant, l’autre derrière, bassin de face. Descendre doucement avec des cales sous les mains, sans jamais forcer.",
    de: "Ein Bein vorne, eines hinten, Hüfte gerade. Langsam absenken, mit Blöcken unter den Händen, nie erzwingen.",
  },
  "Pike Stretch": {
    fr: "Assis, jambes serrées et tendues, se pencher depuis les hanches, dos long. Respirer et relâcher.",
    de: "Im Sitzen, Beine geschlossen und gestreckt, aus der Hüfte nach vorn beugen, Rücken lang. Atmen und lösen.",
  },
  "Butt Kicks": {
    fr: "Courir sur place en ramenant les talons vers les fessiers, vite et léger sur les appuis.",
    de: "Auf der Stelle laufen und die Fersen schnell zum Gesäß ziehen, leichtfüßig.",
  },
  "Fast Feet": {
    fr: "Légèrement fléchi, piétiner le plus vite possible sur l'avant des pieds.",
    de: "Leicht gebeugt so schnell wie möglich auf den Fußballen trippeln.",
  },
  "Lateral Shuffle": {
    fr: "Genoux fléchis, trois pas chassés sur le côté puis retour, en restant bas, sans croiser les pieds.",
    de: "Mit gebeugten Knien drei Sidesteps zur Seite und zurück, tief bleiben, Füße nicht kreuzen.",
  },
  "Step Jack": {
    fr: "Écarter un pied sur le côté puis le ramener, puis l'autre, vite, sans sauter. Les bras restent bas.",
    de: "Einen Fuß zur Seite setzen und zurück, dann den anderen, zügig, ohne Sprung. Arme bleiben unten.",
  },
  "Standing Knee Drive": {
    fr: "Debout bien droit, monter un genou à hauteur de hanche puis l'autre, vite, abdos serrés.",
    de: "Aufrecht stehend abwechselnd ein Knie zügig auf Hüfthöhe ziehen, Bauch fest.",
  },
  "Star Jump": {
    fr: "Fléchir un peu, puis sauter en écartant bras et jambes en étoile, se réceptionner pieds joints en douceur.",
    de: "Leicht in die Knie, dann mit gespreizten Armen und Beinen als Stern springen, weich mit geschlossenen Füßen landen.",
  },
  "Broad Jump": {
    fr: "Lancer les bras et sauter vers l'avant le plus loin possible, se réceptionner en squat en douceur, revenir en marchant.",
    de: "Mit Armschwung so weit wie möglich nach vorne springen, weich in der Hocke landen, zurückgehen.",
  },
  "Shadow Boxing": {
    fr: "En garde, enchaîner des coups de poing rapides devant soi, léger sur les appuis, sans verrouiller les coudes.",
    de: "In Deckung schnelle gerade Schläge nach vorne, leichtfüßig, Ellbogen nicht durchstrecken.",
  },
  "Squat Thrust": {
    fr: "Descendre en squat, mains au sol, sauter les pieds en arrière en planche, les ramener et se relever.",
    de: "In die Hocke, Hände auf den Boden, Füße in den Stütz springen, zurückspringen und aufrichten.",
  },
  "Plank Jack": {
    fr: "En planche bras tendus, écarter et resserrer les pieds en sautant, hanches à niveau.",
    de: "Im hohen Stütz die Füße auseinander und wieder zusammen springen, Hüfte gerade.",
  },
  "Bear Crawl": {
    fr: "À quatre pattes, genoux juste décollés, avancer puis reculer à petits pas, dos plat.",
    de: "Im Vierfüßlerstand, Knie knapp über dem Boden, mit kleinen Schritten vor und zurück krabbeln, Rücken gerade.",
  },
  "Sumo Squat": {
    fr: "Pieds écartés, pointes vers l'extérieur, descendre genoux au-dessus des pieds, buste droit, remonter.",
    de: "Breiter Stand, Fußspitzen nach außen, Knie über den Zehen absenken, Brust aufrecht, hochkommen.",
  },
  "Squat Pulse": {
    fr: "Tenir le bas du squat et monter-descendre de quelques centimètres, sans se relever.",
    de: "Unten in der Kniebeuge bleiben und wenige Zentimeter auf und ab federn, ohne aufzustehen.",
  },
  "Lateral Lunge": {
    fr: "Faire un grand pas sur le côté, s'asseoir sur cette jambe l'autre tendue, revenir. Alterner.",
    de: "Großer Schritt zur Seite, auf dieses Bein setzen, das andere gestreckt, zurückdrücken. Abwechseln.",
  },
  "Curtsy Lunge": {
    fr: "Reculer une jambe en la croisant derrière l'autre, descendre le genou, revenir. Alterner.",
    de: "Ein Bein hinter dem anderen überkreuzt nach hinten setzen, Knie absenken, zurück. Abwechseln.",
  },
  "Split Squat": {
    fr: "En grande fente, descendre le genou arrière vers le sol et remonter, sans bouger les pieds.",
    de: "In weiter Schrittstellung das hintere Knie Richtung Boden senken und hochdrücken, Füße bleiben stehen.",
  },
  "Cossack Squat": {
    fr: "Pieds très écartés, s'asseoir sur une jambe, l'autre tendue pointe en l'air, puis passer de l'autre côté.",
    de: "Sehr breiter Stand, auf ein Bein setzen, das andere gestreckt mit Zehen nach oben, dann zur anderen Seite.",
  },
  "Single-Leg Glute Bridge": {
    fr: "Sur le dos, un pied au sol et l'autre jambe levée, monter les hanches en serrant les fessiers.",
    de: "In Rückenlage, ein Fuß am Boden, das andere Bein oben, Hüfte anheben und Gesäß anspannen.",
  },
  "Bodyweight Calf Raise": {
    fr: "Debout, monter sur la pointe des pieds le plus haut possible, marquer un temps, redescendre lentement.",
    de: "Im Stand so hoch wie möglich auf die Zehenspitzen, kurz halten, langsam absenken.",
  },
  "Good Morning": {
    fr: "Mains sur les hanches, genoux souples, basculer le buste dos plat presque à l'horizontale, se redresser.",
    de: "Hände an der Hüfte, Knie locker, mit geradem Rücken nach vorne beugen fast bis zur Waagerechten, aufrichten.",
  },
  "Donkey Kick": {
    fr: "À quatre pattes, genou fléchi, pousser un talon vers le plafond sans cambrer.",
    de: "Im Vierfüßlerstand mit gebeugtem Knie eine Ferse Richtung Decke drücken, ohne Hohlkreuz.",
  },
  "Fire Hydrant": {
    fr: "À quatre pattes, lever un genou fléchi sur le côté à hauteur de hanche, redescendre en contrôlant.",
    de: "Im Vierfüßlerstand ein gebeugtes Knie seitlich auf Hüfthöhe heben, kontrolliert absenken.",
  },
  "Knee Push-up": {
    fr: "Mains sous les épaules, genoux au sol, corps aligné des genoux à la tête, descendre la poitrine et pousser.",
    de: "Hände unter den Schultern, Knie am Boden, Körper gerade von Knie bis Kopf, Brust absenken und hochdrücken.",
  },
  "Incline Push-up": {
    fr: "Mains sur une chaise ou un banc, corps gainé, descendre la poitrine vers le bord et remonter.",
    de: "Hände auf einem Stuhl oder einer Bank, Körper gerade, Brust zur Kante senken und hochdrücken.",
  },
  "Diamond Push-up": {
    fr: "Mains jointes sous la poitrine, pouces et index qui se touchent, descendre et pousser, coudes serrés.",
    de: "Hände unter der Brust, Daumen und Zeigefinger berühren sich, absenken und hochdrücken, Ellbogen eng.",
  },
  "Pike Push-up": {
    fr: "Hanches hautes en V inversé, plier les coudes pour amener la tête vers le sol, repousser.",
    de: "Hüfte hoch im umgekehrten V, Ellbogen beugen und den Kopf Richtung Boden senken, hochdrücken.",
  },
  "Bench Dip": {
    fr: "Mains sur le bord d'une chaise derrière soi, jambes devant, plier les coudes pour descendre les hanches, remonter.",
    de: "Hände hinter dir auf einer Stuhlkante, Beine nach vorne, Ellbogen beugen, Hüfte senken, hochdrücken.",
  },
  "Heel Taps": {
    fr: "Sur le dos, genoux fléchis, épaules décollées, aller toucher chaque talon d'un côté puis de l'autre.",
    de: "In Rückenlage, Knie gebeugt, Schultern angehoben, abwechselnd seitlich zu den Fersen greifen.",
  },
  "Reverse Crunch": {
    fr: "Sur le dos, genoux à 90 degrés, enrouler le bassin vers la poitrine, redescendre lentement.",
    de: "In Rückenlage, Knie im rechten Winkel, das Becken Richtung Brust einrollen, langsam absenken.",
  },
  "Scissor Kicks": {
    fr: "Sur le dos, jambes tendues décollées, les croiser l'une sur l'autre, le bas du dos au sol.",
    de: "In Rückenlage die gestreckten Beine anheben und überkreuzen, unterer Rücken am Boden.",
  },
  "V-up": {
    fr: "Allongé, lever en même temps jambes et buste pour toucher les pieds, redescendre en contrôlant.",
    de: "Flach liegend Beine und Oberkörper gleichzeitig heben, die Zehen berühren, kontrolliert absenken.",
  },
  "Sit-up": {
    fr: "Sur le dos, genoux fléchis, s'enrouler jusqu'à la position assise, puis redescendre lentement.",
    de: "In Rückenlage mit gebeugten Knien bis zum Sitzen aufrollen, dann langsam ablegen.",
  },
  "Standing Oblique Crunch": {
    fr: "Debout, mains derrière la tête, monter un genou sur le côté vers le coude, alterner.",
    de: "Im Stand, Hände hinter dem Kopf, ein Knie seitlich zum Ellbogen ziehen, abwechseln.",
  },
  "Glute Bridge Hold": {
    fr: "Sur le dos, genoux fléchis, monter les hanches et les tenir hautes, fessiers et abdos serrés.",
    de: "In Rückenlage mit gebeugten Knien die Hüfte heben und oben halten, Gesäß und Bauch fest.",
  },
  "Side Plank Hip Dip": {
    fr: "En planche latérale sur l'avant-bras, descendre la hanche vers le sol puis la remonter.",
    de: "Im Seitstütz auf dem Unterarm die Hüfte Richtung Boden senken und wieder heben.",
  },
  "Dumbbell Bent-Over Row": {
    fr: "Penché en avant dos plat, un haltère dans chaque main, les tirer vers les hanches, redescendre en contrôlant.",
    de: "Mit geradem Rücken vorgebeugt, je eine Kurzhantel, zur Hüfte ziehen, kontrolliert absenken.",
  },
  "Dumbbell Floor Press": {
    fr: "Sur le dos, genoux fléchis, pousser les haltères vers le haut, redescendre jusqu'à poser les bras au sol.",
    de: "In Rückenlage mit gebeugten Knien die Kurzhanteln hochdrücken, absenken bis die Oberarme den Boden berühren.",
  },
  "Dumbbell Curl to Press": {
    fr: "Monter les haltères aux épaules en curl, puis les pousser au-dessus de la tête, redescendre en sens inverse.",
    de: "Kurzhanteln zu den Schultern curlen, dann über Kopf drücken, in umgekehrter Reihenfolge absenken.",
  },
  "Dumbbell Lateral Lunge": {
    fr: "Un haltère contre la poitrine, grand pas sur le côté et s'asseoir sur cette jambe, revenir. Alterner.",
    de: "Kurzhantel vor der Brust, großer Schritt zur Seite und auf dieses Bein setzen, zurückdrücken. Abwechseln.",
  },
  "Dumbbell Glute Bridge": {
    fr: "Sur le dos, un haltère sur les hanches, monter les hanches en serrant les fessiers, redescendre lentement.",
    de: "In Rückenlage, Kurzhantel auf der Hüfte, Hüfte anheben, Gesäß anspannen, langsam absenken.",
  },
  "Dumbbell Hammer Curl": {
    fr: "Debout, paumes face à face, monter les haltères vers les épaules, redescendre lentement.",
    de: "Im Stand, Handflächen zueinander, Kurzhanteln zu den Schultern curlen, langsam absenken.",
  },
};

type Lang = "fr" | "de";
const lang = (locale: string): Lang | null => (locale === "fr" || locale === "de" ? locale : null);

type Translated = { nameFr?: string | null; nameDe?: string | null; descriptionFr?: string | null; descriptionDe?: string | null };

/**
 * An exercise's name in the app's language: the admin's translation, then the
 * one the app shipped with, then the name itself (custom and English names).
 */
export function exerciseLabel(name: string | undefined, locale: string, row?: Translated): string {
  if (!name) return "?";
  const l = lang(locale);
  if (!l) return name;
  return (l === "fr" ? row?.nameFr : row?.nameDe) || NAMES[name]?.[l] || name;
}

/** An exercise's description in the app's language, when there is one. */
export function exerciseDescription(
  ex: (Translated & { name?: string; description?: string }) | undefined,
  locale: string
): string | undefined {
  if (!ex) return undefined;
  const l = lang(locale);
  if (!l) return ex.description;
  return (l === "fr" ? ex.descriptionFr : ex.descriptionDe) || (ex.name ? DESCRIPTIONS[ex.name]?.[l] : undefined) || ex.description;
}

/** The label function for the current language, reading the library's translations. */
export function useExerciseLabel(): (name: string | undefined) => string {
  const locale = useLocale();
  const exercises = useExercises();
  const rows = useMemo(() => {
    const map = new Map<string, Translated>();
    for (const e of exercises) if (!e.isCustom || !map.has(e.name)) map.set(e.name, e);
    return map;
  }, [exercises]);
  return useCallback((name: string | undefined) => exerciseLabel(name, locale, name ? rows.get(name) : undefined), [locale, rows]);
}

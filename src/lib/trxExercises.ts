import type { MuscleGroup } from "@/db";

/**
 * The suspension-strap (TRX) exercises: one list for the library (migration
 * 055), their names and descriptions in French and German, and their place
 * in the timed sessions. What they load when injured is data (migration 059).
 */

export interface TrxExercise {
  name: string;
  muscleGroup: MuscleGroup;
  kind: "cardio" | "strength" | "core";
  focus: ("abs" | "full" | "lower")[];
  sides?: boolean;
  en: string;
  fr: { name: string; description: string };
  de: { name: string; description: string };
}

export const TRX_EXERCISES: TrxExercise[] = [
  {
    name: "TRX Row", muscleGroup: "back", kind: "strength", focus: ["full"],
    en: "Facing the anchor, hold the handles and lean back, arms straight and body in a line. Pull the chest to the hands, lower slowly. Walk the feet forward to make it harder.",
    fr: { name: "Tirage TRX", description: "Face à l'ancrage, poignées en main, se pencher en arrière bras tendus, corps gainé. Tirer la poitrine vers les mains, redescendre lentement. Avancer les pieds pour corser." },
    de: { name: "TRX-Rudern", description: "Zum Ankerpunkt gewandt, Griffe fassen und mit gestreckten Armen zurücklehnen, Körper gerade. Brust zu den Händen ziehen, langsam ablassen. Füße nach vorn setzen macht es schwerer." },
  },
  {
    name: "TRX Chest Press", muscleGroup: "chest", kind: "strength", focus: ["full"],
    en: "Facing away from the anchor, lean forward on the handles, arms straight. Lower the chest between the hands, push back up. Step back to make it easier.",
    fr: { name: "Développé pectoraux TRX", description: "Dos à l'ancrage, en appui sur les poignées bras tendus, corps penché. Descendre la poitrine entre les mains, repousser. Reculer les pieds pour faciliter." },
    de: { name: "TRX-Brustpresse", description: "Vom Ankerpunkt abgewandt, mit gestreckten Armen auf die Griffe lehnen. Brust zwischen die Hände senken, wieder hochdrücken. Füße zurücksetzen macht es leichter." },
  },
  {
    name: "TRX Squat", muscleGroup: "legs", kind: "strength", focus: ["lower", "full"],
    en: "Facing the anchor, hold the handles with straight arms. Sit back into a deep squat, chest up, and stand up, the straps only for balance.",
    fr: { name: "Squat TRX", description: "Face à l'ancrage, poignées en main bras tendus. Descendre en squat profond, buste droit, et remonter : les sangles servent juste à l'équilibre." },
    de: { name: "TRX-Kniebeuge", description: "Zum Ankerpunkt gewandt, Griffe mit gestreckten Armen halten. Tief in die Kniebeuge setzen, Brust aufrecht, wieder aufstehen – die Bänder nur zur Balance." },
  },
  {
    name: "TRX Suspended Lunge", muscleGroup: "legs", kind: "strength", focus: ["lower"], sides: true,
    en: "Facing away, one foot in the cradles behind you. Bend the front leg to lower the back knee, push back up through the front heel. Switch legs halfway.",
    fr: { name: "Fente pied suspendu TRX", description: "Dos à l'ancrage, un pied dans les sangles derrière soi. Fléchir la jambe avant pour descendre le genou arrière, remonter en poussant sur le talon avant. Changer de jambe à mi-temps." },
    de: { name: "TRX-Ausfallschritt", description: "Vom Ankerpunkt abgewandt, ein Fuß hinten in den Schlaufen. Vorderes Bein beugen, bis das hintere Knie sinkt, über die vordere Ferse hochdrücken. Zur Hälfte Bein wechseln." },
  },
  {
    name: "TRX Hamstring Curl", muscleGroup: "legs", kind: "strength", focus: ["lower"],
    en: "On your back, heels in the cradles. Lift the hips, pull the heels to the glutes, then extend the legs slowly, hips up.",
    fr: { name: "Leg curl TRX", description: "Sur le dos, talons dans les sangles. Monter les hanches, ramener les talons vers les fessiers, puis tendre les jambes lentement en gardant les hanches hautes." },
    de: { name: "TRX-Beinbeuger", description: "Auf dem Rücken, Fersen in den Schlaufen. Hüfte heben, Fersen zum Gesäß ziehen, dann die Beine langsam strecken, Hüfte oben." },
  },
  {
    name: "TRX Pike", muscleGroup: "core", kind: "core", focus: ["abs", "full"],
    en: "In a high plank, feet in the cradles. Lift the hips high with straight legs, then lower back to the plank without sagging.",
    fr: { name: "Pike TRX", description: "En planche bras tendus, pieds dans les sangles. Monter les hanches très haut jambes tendues, puis revenir en planche sans creuser le dos." },
    de: { name: "TRX-Pike", description: "Im hohen Stütz, Füße in den Schlaufen. Hüfte mit gestreckten Beinen hoch anheben, dann zurück in den Stütz, ohne durchzuhängen." },
  },
  {
    name: "TRX Knee Tuck", muscleGroup: "core", kind: "core", focus: ["abs", "full"],
    en: "In a high plank, feet in the cradles. Pull both knees to the chest, then extend back to the plank.",
    fr: { name: "Genoux-poitrine TRX", description: "En planche bras tendus, pieds dans les sangles. Ramener les deux genoux vers la poitrine, puis revenir en planche." },
    de: { name: "TRX-Knieanzug", description: "Im hohen Stütz, Füße in den Schlaufen. Beide Knie zur Brust ziehen, dann zurück in den Stütz." },
  },
  {
    name: "TRX Mountain Climber", muscleGroup: "core", kind: "cardio", focus: ["abs", "full"],
    en: "In a high plank, feet in the cradles. Drive the knees to the chest one after the other, fast, hips low.",
    fr: { name: "Mountain climber TRX", description: "En planche bras tendus, pieds dans les sangles. Ramener les genoux vers la poitrine l'un après l'autre, vite, hanches basses." },
    de: { name: "TRX-Mountain-Climber", description: "Im hohen Stütz, Füße in den Schlaufen. Knie abwechselnd schnell zur Brust ziehen, Hüfte tief." },
  },
  {
    name: "TRX Plank", muscleGroup: "core", kind: "core", focus: ["abs"],
    en: "Forearms on the floor, feet in the cradles, body in a straight line. Hold without letting the hips drop.",
    fr: { name: "Gainage pieds suspendus TRX", description: "Avant-bras au sol, pieds dans les sangles, corps aligné. Tenir sans laisser tomber les hanches." },
    de: { name: "TRX-Unterarmstütz", description: "Unterarme am Boden, Füße in den Schlaufen, Körper in einer Linie. Halten, ohne die Hüfte sinken zu lassen." },
  },
  {
    name: "TRX Side Plank", muscleGroup: "core", kind: "core", focus: ["abs"], sides: true,
    en: "On one forearm, feet stacked in the cradles. Lift the hips in a straight line and hold. Switch sides halfway.",
    fr: { name: "Gainage latéral TRX", description: "Sur un avant-bras, pieds l'un sur l'autre dans les sangles. Monter les hanches dans l'alignement et tenir. Changer de côté à mi-temps." },
    de: { name: "TRX-Seitstütz", description: "Auf einem Unterarm, Füße übereinander in den Schlaufen. Hüfte in eine Linie heben und halten. Zur Hälfte Seite wechseln." },
  },
  {
    name: "TRX Biceps Curl", muscleGroup: "arms", kind: "strength", focus: ["full"],
    en: "Facing the anchor, palms up, lean back with straight arms. Curl the hands to the forehead, elbows high, lower slowly.",
    fr: { name: "Curl biceps TRX", description: "Face à l'ancrage, paumes vers le haut, se pencher en arrière bras tendus. Fléchir les bras pour amener les mains au front, coudes hauts, redescendre lentement." },
    de: { name: "TRX-Bizepscurl", description: "Zum Ankerpunkt gewandt, Handflächen nach oben, mit gestreckten Armen zurücklehnen. Hände zur Stirn beugen, Ellbogen hoch, langsam ablassen." },
  },
  {
    name: "TRX Triceps Extension", muscleGroup: "arms", kind: "strength", focus: ["full"],
    en: "Facing away, arms straight overhead on the handles. Lean forward bending only the elbows, then push back to straight arms.",
    fr: { name: "Extension triceps TRX", description: "Dos à l'ancrage, bras tendus au-dessus de la tête sur les poignées. Se pencher en avant en pliant seulement les coudes, puis repousser bras tendus." },
    de: { name: "TRX-Trizepsstrecken", description: "Vom Ankerpunkt abgewandt, Arme gestreckt über dem Kopf an den Griffen. Nur durch Beugen der Ellbogen nach vorn lehnen, dann zurück zu gestreckten Armen drücken." },
  },
  {
    name: "TRX Y-Fly", muscleGroup: "shoulders", kind: "strength", focus: ["full"],
    en: "Facing the anchor, lean back with straight arms. Raise the arms in a Y above the head, squeezing the shoulder blades, lower slowly.",
    fr: { name: "Élévation en Y TRX", description: "Face à l'ancrage, se pencher en arrière bras tendus. Monter les bras en Y au-dessus de la tête en serrant les omoplates, redescendre lentement." },
    de: { name: "TRX-Y-Heben", description: "Zum Ankerpunkt gewandt, mit gestreckten Armen zurücklehnen. Arme in einem Y über den Kopf heben, Schulterblätter zusammen, langsam ablassen." },
  },
  {
    name: "TRX Jump Squat", muscleGroup: "legs", kind: "cardio", focus: ["lower", "full"],
    en: "Facing the anchor, holding the handles. Squat down, jump up, land softly back in the squat.",
    fr: { name: "Squat sauté TRX", description: "Face à l'ancrage, poignées en main. Descendre en squat, sauter, se réceptionner en douceur dans le squat." },
    de: { name: "TRX-Sprungkniebeuge", description: "Zum Ankerpunkt gewandt, Griffe halten. In die Kniebeuge gehen, hochspringen, weich in der Kniebeuge landen." },
  },
  {
    name: "TRX Atomic Push-up", muscleGroup: "chest", kind: "strength", focus: ["full"],
    en: "Feet in the cradles, hands on the floor. Do a push-up, then pull the knees to the chest, extend back.",
    fr: { name: "Pompe atomique TRX", description: "Pieds dans les sangles, mains au sol. Faire une pompe, puis ramener les genoux vers la poitrine, et revenir." },
    de: { name: "TRX-Atomic-Liegestütz", description: "Füße in den Schlaufen, Hände am Boden. Einen Liegestütz machen, dann die Knie zur Brust ziehen und zurück." },
  },
  {
    name: "TRX Single-Leg Squat", muscleGroup: "legs", kind: "strength", focus: ["lower"], sides: true,
    en: "Facing the anchor, holding the handles, on one leg, the other forward. Squat down on the standing leg and stand up. Switch legs halfway.",
    fr: { name: "Squat sur une jambe TRX", description: "Face à l'ancrage, poignées en main, sur une jambe, l'autre tendue devant. Descendre sur la jambe d'appui et remonter. Changer de jambe à mi-temps." },
    de: { name: "Einbeinige TRX-Kniebeuge", description: "Zum Ankerpunkt gewandt, Griffe halten, auf einem Bein, das andere nach vorn. Auf dem Standbein beugen und aufstehen. Zur Hälfte Bein wechseln." },
  },
  {
    name: "TRX Sprinter Start", muscleGroup: "legs", kind: "cardio", focus: ["lower", "full"], sides: true,
    en: "Facing away, leaning forward on the handles in a sprinter stance. Drive one knee up fast and back down. Switch legs halfway.",
    fr: { name: "Départ de sprinteur TRX", description: "Dos à l'ancrage, penché en avant sur les poignées comme au départ d'un sprint. Monter un genou vite puis le redescendre. Changer de jambe à mi-temps." },
    de: { name: "TRX-Sprinterstart", description: "Vom Ankerpunkt abgewandt, in Sprinterhaltung nach vorn auf die Griffe gelehnt. Ein Knie schnell hochziehen und absetzen. Zur Hälfte Bein wechseln." },
  },
];

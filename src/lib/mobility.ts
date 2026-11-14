import type { MuscleGroup } from "@/db";
import type { PainArea } from "./pain";
import type { InjuryLevel } from "./injuries";

/** Before a session (moving, to warm up) or after (holding, to stretch). */
export type MobilityMode = "warmup" | "stretch";
export const MOBILITY_MINUTES: Record<MobilityMode, number[]> = { warmup: [5, 10], stretch: [5, 10, 15] };

/** The muscles a mobility session aims at when there is no session to read. */
export type MobilityTarget = "full" | "upper" | "lower";
export const TARGET_MUSCLES: Record<MobilityTarget, MuscleGroup[]> = {
  full: ["full_body"],
  upper: ["chest", "back", "shoulders", "arms"],
  lower: ["legs", "core"],
};

type Text = { en: string; fr: string; de: string };

export interface MobilityExercise {
  key: string;
  mode: MobilityMode;
  muscles: MuscleGroup[];
  /** Done on each side in turn: two steps, left then right. */
  sides?: boolean;
  name: Text;
  cue: Text;
}

/**
 * Warm-up moves and stretches, in the order they are done: standing first,
 * then on the floor, so that nobody gets up and down all the time.
 */
export const MOBILITY_EXERCISES: MobilityExercise[] = [
  // Warm-up: from the whole body to the joints the session will load.
  { key: "jumping-jack", mode: "warmup", muscles: ["full_body"], name: { en: "Jumping jacks", fr: "Jumping jacks", de: "Hampelmann" }, cue: { en: "Easy pace, to raise the heart rate.", fr: "À allure facile, pour faire monter le cœur.", de: "Locker, um den Puls zu heben." } },
  { key: "high-knees", mode: "warmup", muscles: ["full_body", "legs"], name: { en: "High knees", fr: "Montées de genoux", de: "Kniehebelauf" }, cue: { en: "On the spot, knees to hip height, arms moving.", fr: "Sur place, genoux à hauteur des hanches, les bras accompagnent.", de: "Auf der Stelle, Knie auf Hüfthöhe, Arme schwingen mit." } },
  { key: "arm-circles", mode: "warmup", muscles: ["shoulders", "chest", "arms"], name: { en: "Arm circles", fr: "Moulinets des bras", de: "Armkreisen" }, cue: { en: "Small circles growing larger, forwards then backwards.", fr: "Petits cercles de plus en plus grands, vers l'avant puis vers l'arrière.", de: "Kleine Kreise, die größer werden, vorwärts und rückwärts." } },
  { key: "arm-swings", mode: "warmup", muscles: ["chest", "shoulders", "back"], name: { en: "Cross-body arm swings", fr: "Ouverture-fermeture des bras", de: "Arme öffnen und kreuzen" }, cue: { en: "Open the arms wide, then cross them in front of the chest.", fr: "Ouvrir grand les bras, puis les croiser devant la poitrine.", de: "Arme weit öffnen, dann vor der Brust kreuzen." } },
  { key: "torso-twists", mode: "warmup", muscles: ["core", "back"], name: { en: "Torso twists", fr: "Rotations du buste", de: "Rumpfdrehungen" }, cue: { en: "Feet planted, turn the shoulders from side to side.", fr: "Pieds ancrés, tourner les épaules d'un côté puis de l'autre.", de: "Füße fest, Schultern von Seite zu Seite drehen." } },
  { key: "hip-circles", mode: "warmup", muscles: ["legs", "core"], name: { en: "Hip circles", fr: "Cercles de hanches", de: "Hüftkreisen" }, cue: { en: "Hands on the hips, draw wide circles both ways.", fr: "Mains sur les hanches, dessiner de grands cercles dans les deux sens.", de: "Hände an die Hüfte, große Kreise in beide Richtungen." } },
  { key: "leg-swings", mode: "warmup", muscles: ["legs"], sides: true, name: { en: "Leg swings", fr: "Balancés de jambe", de: "Beinschwingen" }, cue: { en: "Hold on to a wall, swing the leg forwards and back, relaxed.", fr: "En appui sur un mur, balancer la jambe d'avant en arrière, relâchée.", de: "An der Wand abstützen, das Bein locker vor und zurück schwingen." } },
  { key: "knee-hug", mode: "warmup", muscles: ["legs"], name: { en: "Walking knee hugs", fr: "Genou à la poitrine en marchant", de: "Knie zur Brust im Gehen" }, cue: { en: "Each step, pull a knee to the chest and rise on the toes.", fr: "À chaque pas, tirer un genou vers la poitrine et monter sur la pointe du pied.", de: "Bei jedem Schritt ein Knie zur Brust ziehen und auf die Zehen gehen." } },
  { key: "squat", mode: "warmup", muscles: ["legs", "full_body"], name: { en: "Bodyweight squats", fr: "Squats au poids du corps", de: "Kniebeugen ohne Gewicht" }, cue: { en: "Slow and deep, chest up, heels down.", fr: "Lents et profonds, buste droit, talons au sol.", de: "Langsam und tief, Brust aufrecht, Fersen am Boden." } },
  { key: "lunge-rotation", mode: "warmup", muscles: ["legs", "core", "full_body"], name: { en: "Lunge with rotation", fr: "Fente avec rotation", de: "Ausfallschritt mit Drehung" }, cue: { en: "Step into a lunge, turn the chest over the front knee, alternate.", fr: "Faire une fente, tourner le buste vers le genou avant, alterner.", de: "Ausfallschritt, Oberkörper zum vorderen Knie drehen, abwechseln." } },
  { key: "inchworm", mode: "warmup", muscles: ["full_body", "back", "legs"], name: { en: "Inchworms", fr: "Chenilles (inchworm)", de: "Raupen (Inchworm)" }, cue: { en: "Walk the hands out to a plank, then the feet back to the hands.", fr: "Avancer les mains jusqu'à la planche, puis ramener les pieds vers les mains.", de: "Mit den Händen in den Stütz laufen, dann die Füße zu den Händen." } },
  { key: "worlds-greatest", mode: "warmup", muscles: ["full_body", "legs", "back"], sides: true, name: { en: "World's greatest stretch", fr: "Fente avec rotation au sol", de: "World's Greatest Stretch" }, cue: { en: "Deep lunge, hand inside the front foot, open the other arm to the sky.", fr: "Fente profonde, main à l'intérieur du pied avant, ouvrir l'autre bras vers le ciel.", de: "Tiefer Ausfallschritt, Hand innen neben den vorderen Fuß, anderen Arm zum Himmel öffnen." } },
  { key: "scapular-pushup", mode: "warmup", muscles: ["chest", "shoulders", "back"], name: { en: "Scapular push-ups", fr: "Pompes scapulaires", de: "Schulterblatt-Liegestütze" }, cue: { en: "In a plank, arms straight, squeeze then spread the shoulder blades.", fr: "En planche bras tendus, rapprocher puis écarter les omoplates.", de: "Im Stütz mit gestreckten Armen die Schulterblätter zusammen- und auseinanderziehen." } },
  { key: "cat-cow", mode: "warmup", muscles: ["back", "core"], name: { en: "Cat-cow", fr: "Chat-vache", de: "Katze-Kuh" }, cue: { en: "On all fours, round the back, then arch it, with the breath.", fr: "À quatre pattes, arrondir le dos puis le creuser, au rythme de la respiration.", de: "Im Vierfüßlerstand den Rücken runden, dann durchhängen lassen, im Atemrhythmus." } },
  { key: "glute-bridge", mode: "warmup", muscles: ["legs", "core"], name: { en: "Glute bridges", fr: "Ponts fessiers", de: "Glute Bridges" }, cue: { en: "On your back, push the hips up, squeeze the glutes, lower slowly.", fr: "Sur le dos, monter les hanches en serrant les fessiers, redescendre lentement.", de: "In Rückenlage die Hüfte hochdrücken, Gesäß anspannen, langsam absenken." } },

  // Stretches: held, breathing slowly, never painful.
  { key: "neck-side", mode: "stretch", muscles: ["shoulders", "back"], sides: true, name: { en: "Neck side stretch", fr: "Étirement latéral du cou", de: "Seitliche Nackendehnung" }, cue: { en: "Tilt the ear towards the shoulder, the other shoulder low.", fr: "Pencher l'oreille vers l'épaule, l'autre épaule reste basse.", de: "Ohr zur Schulter neigen, die andere Schulter bleibt unten." } },
  { key: "chest-doorway", mode: "stretch", muscles: ["chest", "shoulders"], sides: true, name: { en: "Doorway chest stretch", fr: "Étirement des pectoraux contre un mur", de: "Brustdehnung am Türrahmen" }, cue: { en: "Forearm on a wall at shoulder height, turn the body away.", fr: "Avant-bras contre un mur à hauteur d'épaule, tourner le corps vers l'extérieur.", de: "Unterarm auf Schulterhöhe an die Wand, Körper wegdrehen." } },
  { key: "cross-shoulder", mode: "stretch", muscles: ["shoulders", "back"], sides: true, name: { en: "Cross-body shoulder stretch", fr: "Étirement de l'épaule bras croisé", de: "Schulterdehnung vor dem Körper" }, cue: { en: "Pull the straight arm across the chest with the other hand.", fr: "Tirer le bras tendu devant la poitrine avec l'autre main.", de: "Den gestreckten Arm mit der anderen Hand vor die Brust ziehen." } },
  { key: "triceps", mode: "stretch", muscles: ["arms", "shoulders"], sides: true, name: { en: "Overhead triceps stretch", fr: "Étirement des triceps", de: "Trizepsdehnung über Kopf" }, cue: { en: "Hand behind the head, push the elbow gently with the other hand.", fr: "Main derrière la tête, pousser doucement le coude avec l'autre main.", de: "Hand hinter den Kopf, den Ellbogen sanft mit der anderen Hand drücken." } },
  { key: "biceps-wall", mode: "stretch", muscles: ["arms", "chest"], sides: true, name: { en: "Biceps wall stretch", fr: "Étirement des biceps contre un mur", de: "Bizepsdehnung an der Wand" }, cue: { en: "Palm on a wall behind you, arm straight, turn away slowly.", fr: "Paume contre un mur derrière soi, bras tendu, tourner lentement.", de: "Handfläche hinter dir an die Wand, Arm gestreckt, langsam wegdrehen." } },
  { key: "side-bend", mode: "stretch", muscles: ["back", "core"], sides: true, name: { en: "Standing side bend", fr: "Inclinaison latérale debout", de: "Seitneigung im Stand" }, cue: { en: "One arm overhead, lean to the other side, hips still.", fr: "Un bras au-dessus de la tête, se pencher de l'autre côté, hanches fixes.", de: "Einen Arm über den Kopf, zur anderen Seite neigen, Hüfte ruhig." } },
  { key: "quad", mode: "stretch", muscles: ["legs"], sides: true, name: { en: "Standing quad stretch", fr: "Étirement des quadriceps debout", de: "Quadrizepsdehnung im Stand" }, cue: { en: "Heel to the glute, knees together, hips forward.", fr: "Talon vers la fesse, genoux serrés, bassin vers l'avant.", de: "Ferse zum Gesäß, Knie zusammen, Hüfte nach vorn." } },
  { key: "calf", mode: "stretch", muscles: ["legs"], sides: true, name: { en: "Calf stretch against a wall", fr: "Étirement des mollets contre un mur", de: "Wadendehnung an der Wand" }, cue: { en: "Back leg straight, heel down, lean towards the wall.", fr: "Jambe arrière tendue, talon au sol, se pencher vers le mur.", de: "Hinteres Bein gestreckt, Ferse am Boden, zur Wand lehnen." } },
  { key: "hip-flexor", mode: "stretch", muscles: ["legs", "core"], sides: true, name: { en: "Kneeling hip flexor stretch", fr: "Étirement du psoas à genou", de: "Hüftbeugerdehnung im Kniestand" }, cue: { en: "One knee down, push the hips forward, glute squeezed.", fr: "Un genou au sol, pousser le bassin vers l'avant, fessier serré.", de: "Ein Knie am Boden, Hüfte nach vorn schieben, Gesäß angespannt." } },
  { key: "hamstring", mode: "stretch", muscles: ["legs", "back"], name: { en: "Seated hamstring stretch", fr: "Étirement des ischios assis", de: "Beinrückseite im Sitzen" }, cue: { en: "Legs straight, lean forward from the hips, back long.", fr: "Jambes tendues, se pencher depuis les hanches, dos long.", de: "Beine gestreckt, aus der Hüfte nach vorn neigen, Rücken lang." } },
  { key: "butterfly", mode: "stretch", muscles: ["legs"], name: { en: "Butterfly stretch", fr: "Papillon", de: "Schmetterling" }, cue: { en: "Soles together, let the knees drop, back straight.", fr: "Plantes de pieds jointes, laisser descendre les genoux, dos droit.", de: "Fußsohlen zusammen, Knie sinken lassen, Rücken gerade." } },
  { key: "pigeon", mode: "stretch", muscles: ["legs"], sides: true, name: { en: "Pigeon stretch", fr: "Posture du pigeon", de: "Taube" }, cue: { en: "Front shin across, back leg long, sink the hips.", fr: "Tibia avant en travers, jambe arrière allongée, laisser descendre le bassin.", de: "Vorderes Schienbein quer, hinteres Bein lang, Hüfte sinken lassen." } },
  { key: "spinal-twist", mode: "stretch", muscles: ["back", "core"], sides: true, name: { en: "Lying spinal twist", fr: "Torsion allongée", de: "Liegende Drehung" }, cue: { en: "On your back, drop the bent knee across, shoulders on the floor.", fr: "Sur le dos, laisser tomber le genou plié de l'autre côté, épaules au sol.", de: "In Rückenlage das gebeugte Knie zur anderen Seite sinken lassen, Schultern am Boden." } },
  { key: "cobra", mode: "stretch", muscles: ["core", "chest"], name: { en: "Cobra stretch", fr: "Posture du cobra", de: "Kobra" }, cue: { en: "On your front, push up on the hands, hips on the floor.", fr: "Sur le ventre, se redresser sur les mains, bassin au sol.", de: "In Bauchlage auf die Hände drücken, Hüfte bleibt am Boden." } },
  { key: "childs-pose", mode: "stretch", muscles: ["back", "shoulders", "full_body"], name: { en: "Child's pose", fr: "Posture de l'enfant", de: "Kindhaltung" }, cue: { en: "Sit back on the heels, arms long in front, breathe into the back.", fr: "Assis sur les talons, bras allongés devant, respirer dans le dos.", de: "Auf die Fersen setzen, Arme lang nach vorn, in den Rücken atmen." } },
];

/**
 * The moves that load an injured area: "avoid" ones are left out, "caution"
 * ones are flagged. Same idea as the library's rules in injuries.ts.
 */
export const MOBILITY_INJURY_RULES: Record<string, Partial<Record<PainArea, InjuryLevel>>> = {
  "jumping-jack": { knee: "caution", ankle: "caution", shoulder: "caution" },
  "high-knees": { knee: "caution", ankle: "caution", hip: "caution" },
  "arm-circles": { shoulder: "caution" },
  "arm-swings": { shoulder: "caution" },
  "torso-twists": { lower_back: "caution" },
  "hip-circles": { hip: "caution", lower_back: "caution" },
  "leg-swings": { hip: "caution" },
  "knee-hug": { knee: "caution", hip: "caution" },
  squat: { knee: "caution" },
  "lunge-rotation": { knee: "avoid", lower_back: "caution" },
  inchworm: { wrist: "caution", shoulder: "caution", lower_back: "caution" },
  "worlds-greatest": { knee: "caution", hip: "caution", shoulder: "caution" },
  "scapular-pushup": { shoulder: "caution", wrist: "avoid", elbow: "caution" },
  "cat-cow": { wrist: "caution" },
  "glute-bridge": { hip: "caution" },
  "neck-side": { neck: "avoid" },
  "chest-doorway": { shoulder: "avoid", elbow: "caution" },
  "cross-shoulder": { shoulder: "avoid" },
  triceps: { shoulder: "avoid", elbow: "caution" },
  "biceps-wall": { shoulder: "caution", elbow: "avoid", wrist: "caution" },
  "side-bend": { lower_back: "caution", shoulder: "caution" },
  quad: { knee: "avoid", ankle: "caution" },
  calf: { ankle: "caution" },
  "hip-flexor": { knee: "caution", hip: "caution" },
  hamstring: { lower_back: "caution" },
  butterfly: { hip: "caution", knee: "caution" },
  pigeon: { knee: "avoid", hip: "avoid" },
  "spinal-twist": { lower_back: "caution" },
  cobra: { lower_back: "caution", wrist: "caution" },
  "childs-pose": { knee: "caution" },
};

/** The strongest warning for a move, given the injured areas. */
export function mobilityWarning(key: string, injuries: { area: PainArea }[]): { level: InjuryLevel; areas: PainArea[] } | null {
  const rules = MOBILITY_INJURY_RULES[key];
  if (!rules || !injuries.length) return null;
  for (const level of ["avoid", "caution"] as const) {
    const areas = injuries.map((i) => i.area).filter((a) => rules[a] === level);
    if (areas.length) return { level, areas };
  }
  return null;
}

/** Seconds per move or hold, and between two, by mode. */
export const MOBILITY_TIMING: Record<MobilityMode, { hold: number; sideHold: number; transition: number }> = {
  warmup: { hold: 40, sideHold: 25, transition: 5 },
  stretch: { hold: 40, sideHold: 30, transition: 10 },
};

/** A move as the timer shows it: in the app's language, one side at a time. */
export interface MobilityMove {
  key: string;
  name: string;
  cue: string;
}

export type MobilityStep =
  | { type: "work"; exercise: MobilityMove; seconds: number; side?: "left" | "right" }
  | { type: "rest"; seconds: number };

const cost = (e: MobilityExercise) => {
  const t = MOBILITY_TIMING[e.mode];
  return e.sides ? 2 * (t.sideHold + t.transition) : t.hold + t.transition;
};

/** How much an exercise works the muscles aimed at; whole-body ones always fit a little. */
function relevance(e: MobilityExercise, muscles: MuscleGroup[]): number {
  if (!muscles.length || muscles.includes("full_body")) return e.muscles.includes("full_body") ? 2 : 1;
  const hits = e.muscles.filter((m) => muscles.includes(m)).length;
  return hits * 2 + (e.muscles.includes("full_body") ? 0.5 : 0);
}

/**
 * The moves for a mobility session: those that work the muscles aimed at
 * first, as many as fit in the minutes asked, then put back in their natural
 * order. A warm-up starts with something that raises the heart rate, the
 * first that the injuries allow.
 */
export function pickMobility(
  mode: MobilityMode,
  minutes: number,
  muscles: MuscleGroup[],
  injuries: { area: PainArea }[] = []
): MobilityExercise[] {
  // Moves that load an injured area too much are left out.
  const all = MOBILITY_EXERCISES.filter((e) => e.mode === mode && mobilityWarning(e.key, injuries)?.level !== "avoid");
  const budget = minutes * 60;
  const ranked = [...all].sort((a, b) => relevance(b, muscles) - relevance(a, muscles));
  const chosen = new Set<MobilityExercise>();
  let total = 0;
  if (mode === "warmup") {
    chosen.add(all[0]);
    total += cost(all[0]);
  }
  for (const e of ranked) {
    if (chosen.has(e) || total + cost(e) > budget) continue;
    chosen.add(e);
    total += cost(e);
  }
  return all.filter((e) => chosen.has(e));
}

/** The steps the timer plays: each move or hold, a side after the other, with a pause between. */
export function buildMobilitySession(
  mode: MobilityMode,
  minutes: number,
  muscles: MuscleGroup[],
  locale: string,
  injuries: { area: PainArea }[] = []
): { exercises: MobilityExercise[]; steps: MobilityStep[]; totalSec: number } {
  const lang = (locale === "fr" || locale === "de" ? locale : "en") as keyof Text;
  const timing = MOBILITY_TIMING[mode];
  const exercises = pickMobility(mode, minutes, muscles, injuries);
  const steps: MobilityStep[] = [];
  for (const e of exercises) {
    const shown: MobilityMove = { key: e.key, name: e.name[lang], cue: e.cue[lang] };
    for (const side of e.sides ? (["left", "right"] as const) : [undefined]) {
      if (steps.length) steps.push({ type: "rest", seconds: timing.transition });
      steps.push({ type: "work", exercise: shown, seconds: e.sides ? timing.sideHold : timing.hold, side });
    }
  }
  return { exercises, steps, totalSec: steps.reduce((sum, s) => sum + s.seconds, 0) };
}

/** The muscles a past or planned session worked, read from its exercises. */
export function sessionMuscles(groups: (MuscleGroup | undefined)[]): MuscleGroup[] {
  return [...new Set(groups.filter((g): g is MuscleGroup => !!g && g !== "other"))];
}

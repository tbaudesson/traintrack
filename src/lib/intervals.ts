import type { MuscleGroup } from "@/db";
import { injuryWarning, type Injury } from "./injuries";
import { TRX_EXERCISES } from "./trxExercises";

/** What the session works: the belly, the whole body, or the legs and glutes. */
export type IntervalFocus = "abs" | "full" | "lower";
export const INTERVAL_FOCUSES: IntervalFocus[] = ["full", "abs", "lower"];

/** Seconds of effort / seconds of rest, one minute in all. */
export type IntervalPattern = "30-30" | "45-15" | "50-10";
export const INTERVAL_PATTERNS: IntervalPattern[] = ["30-30", "45-15", "50-10"];

export const INTERVAL_MINUTES = [10, 15, 20, 30, 45] as const;

/** A minute of recovery between two rounds. */
export const ROUND_REST_SEC = 60;
/** The countdown before the first exercise. */
export const GET_READY_SEC = 10;

/** What a timed session was built from, kept on the workout. */
export interface IntervalPlan {
  focus: IntervalFocus;
  dumbbells: boolean;
  /** Suspension straps (TRX); absent on the plans made before them. */
  trx?: boolean;
  pattern: IntervalPattern;
  minutes: number;
  seed: number;
}

type Kind = "cardio" | "strength" | "core";

export interface IntervalExercise {
  name: string;
  muscleGroup: MuscleGroup;
  equipment: "bodyweight" | "dumbbell" | "suspension";
  focus: IntervalFocus[];
  kind: Kind;
  /** Done one side then the other: switch halfway. */
  sides?: boolean;
  /** For the library, when the exercise is new. */
  description: string;
}

/**
 * The exercises a timed session draws from. The names are the library's keys
 * (see migration 038 and exerciseNames.ts for the translations).
 */
export const INTERVAL_EXERCISES: IntervalExercise[] = [
  { name: "Burpee", muscleGroup: "full_body", equipment: "bodyweight", focus: ["full"], kind: "cardio", description: "Standing, put the hands down, jump the feet back to a plank, chest to the floor, jump the feet in and jump up." },
  { name: "Bodyweight Squat", muscleGroup: "legs", equipment: "bodyweight", focus: ["lower", "full"], kind: "strength", description: "Feet shoulder-width apart, sit back and down until the thighs are parallel, chest up, stand up." },
  { name: "Jump Squat", muscleGroup: "legs", equipment: "bodyweight", focus: ["lower", "full"], kind: "cardio", description: "Squat down, then jump as high as possible and land softly back in the squat." },
  { name: "Mountain Climber", muscleGroup: "core", equipment: "bodyweight", focus: ["abs", "full"], kind: "cardio", description: "In a high plank, drive the knees to the chest one after the other, fast, hips low." },
  { name: "Jumping Jack", muscleGroup: "full_body", equipment: "bodyweight", focus: ["full", "lower"], kind: "cardio", description: "Jump the feet apart while raising the arms overhead, then jump back together." },
  { name: "High Knees", muscleGroup: "full_body", equipment: "bodyweight", focus: ["full", "lower"], kind: "cardio", description: "Run on the spot, bringing the knees up to hip height, on the balls of the feet." },
  { name: "Reverse Lunge", muscleGroup: "legs", equipment: "bodyweight", focus: ["lower", "full"], kind: "strength", description: "Step back and lower the back knee towards the floor, push through the front heel to return. Alternate legs." },
  { name: "Jumping Lunge", muscleGroup: "legs", equipment: "bodyweight", focus: ["lower"], kind: "cardio", description: "In a lunge, jump and switch legs in the air, land softly in a lunge on the other side." },
  { name: "Skater Jump", muscleGroup: "legs", equipment: "bodyweight", focus: ["lower", "full"], kind: "cardio", description: "Leap sideways, one foot to the other, the trailing leg crossing behind." },
  { name: "Wall Sit", muscleGroup: "legs", equipment: "bodyweight", focus: ["lower"], kind: "strength", description: "Back against a wall, slide down until the knees are at 90 degrees and hold." },
  { name: "Glute Bridge", muscleGroup: "legs", equipment: "bodyweight", focus: ["lower"], kind: "strength", description: "On your back, knees bent, drive the hips up and squeeze the glutes." },
  { name: "Push-up", muscleGroup: "chest", equipment: "bodyweight", focus: ["full"], kind: "strength", description: "" },
  { name: "Inchworm", muscleGroup: "full_body", equipment: "bodyweight", focus: ["full"], kind: "strength", description: "Standing, walk the hands out to a plank, then walk the feet back to the hands and stand up." },
  { name: "Plank", muscleGroup: "core", equipment: "bodyweight", focus: ["abs", "full"], kind: "core", description: "" },
  { name: "Plank Shoulder Tap", muscleGroup: "core", equipment: "bodyweight", focus: ["abs", "full"], kind: "core", description: "In a high plank, tap each shoulder with the opposite hand without rocking the hips." },
  { name: "Side Plank", muscleGroup: "core", equipment: "bodyweight", focus: ["abs"], kind: "core", sides: true, description: "On one forearm, body in a straight line, hips high. Hold without sagging." },
  { name: "Bicycle Crunch", muscleGroup: "core", equipment: "bodyweight", focus: ["abs"], kind: "core", description: "On your back, bring each elbow towards the opposite knee while extending the other leg." },
  { name: "Flutter Kicks", muscleGroup: "core", equipment: "bodyweight", focus: ["abs"], kind: "core", description: "On your back, legs straight and off the floor, kick them up and down in small, quick movements." },
  { name: "Crunch", muscleGroup: "core", equipment: "bodyweight", focus: ["abs"], kind: "core", description: "On your back, knees bent, curl the shoulders off the floor using the abs, then lower slowly." },
  { name: "Lying Leg Raise", muscleGroup: "core", equipment: "bodyweight", focus: ["abs"], kind: "core", description: "On your back, legs straight, raise them to vertical and lower them slowly without arching the back." },
  { name: "Hollow Hold", muscleGroup: "core", equipment: "bodyweight", focus: ["abs"], kind: "core", description: "On your back, arms and legs extended and lifted, lower back pressed to the floor. Hold." },
  { name: "Dead Bug", muscleGroup: "core", equipment: "bodyweight", focus: ["abs"], kind: "core", description: "On your back, lower the opposite arm and leg slowly while keeping the lower back flat." },
  { name: "Russian Twist", muscleGroup: "core", equipment: "bodyweight", focus: ["abs"], kind: "core", description: "" },
  { name: "Goblet Squat", muscleGroup: "legs", equipment: "dumbbell", focus: ["lower", "full"], kind: "strength", description: "Hold a dumbbell against the chest, squat down between the knees, chest up, stand up." },
  { name: "Dumbbell Thruster", muscleGroup: "full_body", equipment: "dumbbell", focus: ["full"], kind: "cardio", description: "Dumbbells at the shoulders, squat, then stand up and press them overhead in one movement." },
  { name: "Dumbbell Swing", muscleGroup: "full_body", equipment: "dumbbell", focus: ["full", "lower"], kind: "cardio", description: "Hold one dumbbell with both hands, hinge at the hips and swing it to chest height with a hip drive." },
  { name: "Renegade Row", muscleGroup: "back", equipment: "dumbbell", focus: ["full", "abs"], kind: "strength", description: "In a high plank on two dumbbells, row one to the hip, then the other, without twisting the hips." },
  { name: "Dumbbell Romanian Deadlift", muscleGroup: "legs", equipment: "dumbbell", focus: ["lower"], kind: "strength", description: "Dumbbells in front of the thighs, hinge at the hips with a flat back, then stand up by squeezing the glutes." },
  { name: "Dumbbell Reverse Lunge", muscleGroup: "legs", equipment: "dumbbell", focus: ["lower", "full"], kind: "strength", description: "A dumbbell in each hand, step back to a lunge and push through the front heel to return. Alternate legs." },
  { name: "Dumbbell Sumo Squat", muscleGroup: "legs", equipment: "dumbbell", focus: ["lower"], kind: "strength", description: "Wide stance, toes out, hold a dumbbell between the legs and squat down, knees over the toes." },
  { name: "Dumbbell Push Press", muscleGroup: "shoulders", equipment: "dumbbell", focus: ["full"], kind: "strength", description: "Dumbbells at the shoulders, dip slightly at the knees, then drive them overhead with the legs." },
  { name: "Dumbbell Woodchop", muscleGroup: "core", equipment: "dumbbell", focus: ["abs", "full"], kind: "core", sides: true, description: "Hold one dumbbell with both hands, rotate it diagonally, hip to above the opposite shoulder." },
  { name: "Butt Kicks", muscleGroup: "full_body", equipment: "bodyweight", focus: ["full", "lower"], kind: "cardio", description: "Run on the spot, bringing the heels up to the glutes, fast and light on the feet." },
  { name: "Fast Feet", muscleGroup: "legs", equipment: "bodyweight", focus: ["full", "lower"], kind: "cardio", description: "Slightly crouched, tap the feet as fast as possible on the balls of the feet." },
  { name: "Lateral Shuffle", muscleGroup: "legs", equipment: "bodyweight", focus: ["full", "lower"], kind: "cardio", description: "Knees bent, shuffle three steps sideways and back, staying low, without crossing the feet." },
  { name: "Step Jack", muscleGroup: "full_body", equipment: "bodyweight", focus: ["full", "lower"], kind: "cardio", description: "Step one foot out to the side and back, then the other, fast, without jumping. Arms stay low." },
  { name: "Standing Knee Drive", muscleGroup: "core", equipment: "bodyweight", focus: ["abs", "full"], kind: "cardio", description: "Standing tall, drive one knee up to hip height and back, then the other, fast, abs tight." },
  { name: "Star Jump", muscleGroup: "full_body", equipment: "bodyweight", focus: ["full", "lower"], kind: "cardio", description: "Squat slightly, then jump up spreading arms and legs in a star, land softly feet together." },
  { name: "Broad Jump", muscleGroup: "legs", equipment: "bodyweight", focus: ["lower"], kind: "cardio", description: "Swing the arms and jump forward as far as possible, land softly in a squat, walk back." },
  { name: "Shadow Boxing", muscleGroup: "full_body", equipment: "bodyweight", focus: ["full"], kind: "cardio", description: "In a guard stance, throw quick punches straight ahead, light on the feet, without locking the elbows." },
  { name: "Squat Thrust", muscleGroup: "full_body", equipment: "bodyweight", focus: ["full"], kind: "cardio", description: "Squat, hands on the floor, jump the feet back to a plank, jump them back in and stand up." },
  { name: "Plank Jack", muscleGroup: "core", equipment: "bodyweight", focus: ["abs", "full"], kind: "cardio", description: "In a high plank, jump the feet apart and back together, hips level." },
  { name: "Bear Crawl", muscleGroup: "full_body", equipment: "bodyweight", focus: ["full", "abs"], kind: "cardio", description: "On hands and feet, knees just off the floor, crawl forward and back with small steps, back flat." },
  { name: "Sumo Squat", muscleGroup: "legs", equipment: "bodyweight", focus: ["lower", "full"], kind: "strength", description: "Wide stance, toes out, squat down with the knees over the toes, chest up, stand up." },
  { name: "Squat Pulse", muscleGroup: "legs", equipment: "bodyweight", focus: ["lower"], kind: "strength", description: "Hold the bottom of a squat and move up and down a few centimetres, without standing up." },
  { name: "Lateral Lunge", muscleGroup: "legs", equipment: "bodyweight", focus: ["lower", "full"], kind: "strength", description: "Step wide to one side, sit back on that leg with the other straight, push back. Alternate sides." },
  { name: "Curtsy Lunge", muscleGroup: "legs", equipment: "bodyweight", focus: ["lower", "full"], kind: "strength", description: "Step one leg back and across behind the other, lower the knee, return. Alternate legs." },
  { name: "Split Squat", muscleGroup: "legs", equipment: "bodyweight", focus: ["lower"], kind: "strength", sides: true, description: "In a long stride, lower the back knee towards the floor and push back up, feet staying put." },
  { name: "Cossack Squat", muscleGroup: "legs", equipment: "bodyweight", focus: ["lower"], kind: "strength", description: "Very wide stance, sit down on one leg, the other straight with toes up, then shift to the other side." },
  { name: "Single-Leg Glute Bridge", muscleGroup: "legs", equipment: "bodyweight", focus: ["lower", "abs"], kind: "strength", sides: true, description: "On your back, one foot on the floor and the other leg up, drive the hips up and squeeze the glutes." },
  { name: "Bodyweight Calf Raise", muscleGroup: "legs", equipment: "bodyweight", focus: ["lower"], kind: "strength", description: "Standing, rise onto the toes as high as possible, pause, lower slowly." },
  { name: "Good Morning", muscleGroup: "legs", equipment: "bodyweight", focus: ["lower"], kind: "strength", description: "Hands on the hips, knees soft, hinge forward with a flat back until the chest is near horizontal, stand up." },
  { name: "Donkey Kick", muscleGroup: "legs", equipment: "bodyweight", focus: ["lower"], kind: "strength", sides: true, description: "On all fours, knee bent, push one heel up towards the ceiling without arching the back." },
  { name: "Fire Hydrant", muscleGroup: "legs", equipment: "bodyweight", focus: ["lower"], kind: "strength", sides: true, description: "On all fours, lift one bent knee out to the side to hip height, lower it with control." },
  { name: "Knee Push-up", muscleGroup: "chest", equipment: "bodyweight", focus: ["full"], kind: "strength", description: "Hands under the shoulders, knees on the floor, body in a straight line, knees to head, lower the chest and push up." },
  { name: "Incline Push-up", muscleGroup: "chest", equipment: "bodyweight", focus: ["full"], kind: "strength", description: "Hands on a chair or a bench, body straight, lower the chest to the edge and push back up." },
  { name: "Diamond Push-up", muscleGroup: "arms", equipment: "bodyweight", focus: ["full"], kind: "strength", description: "Hands together under the chest, thumbs and index fingers touching, lower the chest and push up, elbows close." },
  { name: "Pike Push-up", muscleGroup: "shoulders", equipment: "bodyweight", focus: ["full"], kind: "strength", description: "Hips high in an upside-down V, bend the elbows to bring the head towards the floor, push back up." },
  { name: "Bench Dip", muscleGroup: "arms", equipment: "bodyweight", focus: ["full"], kind: "strength", description: "Hands on the edge of a chair behind you, legs out, bend the elbows to lower the hips, push back up." },
  { name: "Heel Taps", muscleGroup: "core", equipment: "bodyweight", focus: ["abs"], kind: "core", description: "On your back, knees bent, shoulders lifted, reach side to side to touch each heel." },
  { name: "Reverse Crunch", muscleGroup: "core", equipment: "bodyweight", focus: ["abs"], kind: "core", description: "On your back, knees bent at 90 degrees, roll the hips off the floor towards the chest, lower slowly." },
  { name: "Scissor Kicks", muscleGroup: "core", equipment: "bodyweight", focus: ["abs"], kind: "core", description: "On your back, legs straight and lifted, cross them one over the other, lower back on the floor." },
  { name: "V-up", muscleGroup: "core", equipment: "bodyweight", focus: ["abs"], kind: "core", description: "Lying flat, lift the legs and the chest at the same time to touch the toes, lower with control." },
  { name: "Sit-up", muscleGroup: "core", equipment: "bodyweight", focus: ["abs"], kind: "core", description: "On your back, knees bent, roll up to sitting, then lower slowly, hands at the temples." },
  { name: "Standing Oblique Crunch", muscleGroup: "core", equipment: "bodyweight", focus: ["abs", "full"], kind: "core", description: "Standing, hands behind the head, bring one knee up to the side to meet the elbow, alternate." },
  { name: "Glute Bridge Hold", muscleGroup: "core", equipment: "bodyweight", focus: ["abs", "lower"], kind: "core", description: "On your back, knees bent, lift the hips and hold them high, glutes and abs tight." },
  { name: "Side Plank Hip Dip", muscleGroup: "core", equipment: "bodyweight", focus: ["abs"], kind: "core", sides: true, description: "In a side plank on the forearm, lower the hip towards the floor and lift it back up." },
  { name: "Dumbbell Bent-Over Row", muscleGroup: "back", equipment: "dumbbell", focus: ["full"], kind: "strength", description: "Bent forward with a flat back, a dumbbell in each hand, pull them to the hips, lower with control." },
  { name: "Dumbbell Floor Press", muscleGroup: "chest", equipment: "dumbbell", focus: ["full"], kind: "strength", description: "On your back, knees bent, press the dumbbells up, lower until the upper arms touch the floor." },
  { name: "Dumbbell Curl to Press", muscleGroup: "shoulders", equipment: "dumbbell", focus: ["full"], kind: "strength", description: "Curl the dumbbells to the shoulders, then press them overhead, lower in reverse." },
  { name: "Dumbbell Lateral Lunge", muscleGroup: "legs", equipment: "dumbbell", focus: ["lower", "full"], kind: "strength", description: "A dumbbell held at the chest, step wide to one side and sit back on that leg, push back. Alternate." },
  { name: "Dumbbell Glute Bridge", muscleGroup: "legs", equipment: "dumbbell", focus: ["lower"], kind: "strength", description: "On your back, a dumbbell on the hips, drive the hips up and squeeze the glutes, lower slowly." },
  { name: "Dumbbell Hammer Curl", muscleGroup: "arms", equipment: "dumbbell", focus: ["full"], kind: "strength", description: "Standing, palms facing each other, curl the dumbbells to the shoulders, lower slowly." },
  { name: "Bird Dog", muscleGroup: "core", equipment: "bodyweight", focus: ["abs"], kind: "core", sides: true, description: "" },
  { name: "Superman Hold", muscleGroup: "core", equipment: "bodyweight", focus: ["abs", "full"], kind: "core", description: "" },
  ...TRX_EXERCISES.map((e): IntervalExercise => ({ name: e.name, muscleGroup: e.muscleGroup, equipment: "suspension", focus: e.focus, kind: e.kind, sides: e.sides, description: e.en })),
];

/** Whether a plan's equipment allows an exercise: the body always, the rest when chosen. */
export const allows = (plan: Pick<IntervalPlan, "dumbbells" | "trx">, e: Pick<IntervalExercise, "equipment">) =>
  e.equipment === "bodyweight" || (e.equipment === "dumbbell" && plan.dumbbells) || (e.equipment === "suspension" && !!plan.trx);

/** The exercises newly added to the library for timed sessions. */
export const NEW_INTERVAL_EXERCISES = INTERVAL_EXERCISES.filter((e) => e.description && !["Side Plank", "Dead Bug", "Glute Bridge"].includes(e.name));

/**
 * The exercises a timed session may use, given the athlete's injuries. A
 * circuit is done fast and tired, so nothing that loads an injured area goes
 * in, not even lightly: those marked "caution" come back only when the focus
 * would be short of exercises for a round, and never those to avoid.
 */
export function injuryPool(
  plan: Pick<IntervalPlan, "focus" | "dumbbells" | "trx" | "minutes">,
  injuries: Pick<Injury, "area" | "healedOn">[],
  all: IntervalExercise[] = INTERVAL_EXERCISES
): { pool: IntervalExercise[]; leftOut: number; cautious: string[] } {
  const level = (e: IntervalExercise) => injuryWarning(e.name, injuries)?.level ?? null;
  const fits = (e: IntervalExercise) => e.focus.includes(plan.focus) && allows(plan, e);
  const safe = all.filter((e) => !level(e));
  const short = exercisesPerRound(plan.minutes) - safe.filter(fits).length;
  const cautious = short > 0 ? all.filter((e) => fits(e) && level(e) === "caution").slice(0, short) : [];
  const pool = [...safe, ...cautious];
  return { pool, leftOut: all.filter(fits).length - pool.filter(fits).length, cautious: cautious.map((e) => e.name) };
}

export function patternSeconds(pattern: IntervalPattern): { work: number; rest: number } {
  const [work, rest] = pattern.split("-").map(Number);
  return { work, rest };
}

/** How many exercises make a round, by length of session. */
export function exercisesPerRound(minutes: number): number {
  return minutes <= 15 ? 5 : minutes <= 30 ? 6 : 8;
}

/** A small seeded random generator, so that a plan always gives the same session. */
function random(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(items: T[], rand: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** The order the kinds come in, so that the heart rate goes up and down. */
const RHYTHM: Record<IntervalFocus, Kind[]> = {
  full: ["cardio", "strength", "core"],
  lower: ["cardio", "strength"],
  abs: ["core", "core", "cardio"],
};

/**
 * The exercises of one round: of the focus, with the equipment chosen when
 * there is some (about half of the round), alternating the kinds of effort, and
 * leaving out those of the other circuit while there are others.
 */
export function pickRound(
  plan: Pick<IntervalPlan, "focus" | "dumbbells" | "trx">,
  count: number,
  rand: () => number,
  avoid: Set<string> = new Set(),
  pool: IntervalExercise[] = INTERVAL_EXERCISES
): IntervalExercise[] {
  const usable = pool.filter((e) => e.focus.includes(plan.focus) && allows(plan, e));
  const equipped = plan.dumbbells || !!plan.trx;
  // Exercises of the other circuit come last, so the two differ as much as they can.
  const shuffled = shuffle(usable, rand);
  const ordered = [...shuffled.filter((e) => !avoid.has(e.name)), ...shuffled.filter((e) => avoid.has(e.name))];
  const dumbbellShare = Math.ceil(count / 2);
  const picked: IntervalExercise[] = [];
  const rhythm = RHYTHM[plan.focus];
  for (let i = 0; picked.length < count && i < count * 4; i++) {
    const kind = rhythm[i % rhythm.length];
    const candidates = ordered.filter((e) => e.kind === kind && !picked.includes(e));
    // With equipment, about half the round uses it, the rest stays bodyweight.
    const wantEquipment = equipped && picked.filter((e) => e.equipment !== "bodyweight").length < dumbbellShare && i % 2 === 0;
    const fresh = candidates.filter((e) => !avoid.has(e.name));
    const pool2 = fresh.length ? fresh : candidates;
    const next = pool2.find((e) => (e.equipment !== "bodyweight") === wantEquipment) ?? pool2[0];
    if (next) picked.push(next);
  }
  // A focus short of one kind: fill with whatever is left.
  for (const e of ordered) if (picked.length < count && !picked.includes(e)) picked.push(e);
  return picked;
}

export type IntervalStep =
  | { type: "work"; exercise: IntervalExercise; seconds: number; round: number }
  | { type: "rest"; seconds: number; round: number; recovery?: boolean };

export interface IntervalSession {
  steps: IntervalStep[];
  rounds: IntervalExercise[][];
  /** Seconds from the first exercise to the last, rests included. */
  totalSec: number;
}

/**
 * The session for a plan: as many minutes as asked, each one an exercise and
 * its rest, a minute of recovery between rounds. Long sessions alternate two
 * circuits so they do not repeat the same exercises for three quarters of an
 * hour. The last exercise ends the session: no rest after it.
 */
export function buildIntervalSession(plan: IntervalPlan, pool?: IntervalExercise[]): IntervalSession {
  const rand = random(plan.seed);
  const { work, rest } = patternSeconds(plan.pattern);
  const perRound = exercisesPerRound(plan.minutes);
  const a = pickRound(plan, perRound, rand, undefined, pool);
  const circuits = plan.minutes >= 30 ? [a, pickRound(plan, perRound, rand, new Set(a.map((e) => e.name)), pool)] : [a];

  const steps: IntervalStep[] = [];
  const rounds: IntervalExercise[][] = [];
  let minute = 0;
  let round = 0;
  while (minute < plan.minutes) {
    const circuit = circuits[round % circuits.length];
    const done: IntervalExercise[] = [];
    for (const exercise of circuit) {
      if (minute >= plan.minutes) break;
      steps.push({ type: "work", exercise, seconds: work, round });
      steps.push({ type: "rest", seconds: rest, round });
      done.push(exercise);
      minute++;
    }
    rounds.push(done);
    // A minute of recovery added to the last rest, unless it would end the session.
    const last = steps[steps.length - 1];
    if (minute < plan.minutes - 1 && last?.type === "rest") {
      steps[steps.length - 1] = { ...last, seconds: last.seconds + ROUND_REST_SEC, recovery: true };
      minute++;
    }
    round++;
  }
  while (steps.length && steps[steps.length - 1].type === "rest") steps.pop();
  return { steps, rounds, totalSec: steps.reduce((sum, s) => sum + s.seconds, 0) };
}

/** The usual rhythm for a level: easier to hold for a beginner. */
export function defaultPattern(level: string | undefined): IntervalPattern {
  return level === "advanced" ? "50-10" : level === "intermediate" ? "45-15" : "30-30";
}

/** How many intervals of each exercise were done, in the order first met. */
export function intervalCounts(steps: IntervalStep[], doneCount: number): { exercise: IntervalExercise; count: number; seconds: number }[] {
  const counts = new Map<string, { exercise: IntervalExercise; count: number; seconds: number }>();
  for (const step of steps.filter((s) => s.type === "work").slice(0, doneCount)) {
    if (step.type !== "work") continue;
    const c = counts.get(step.exercise.name) ?? { exercise: step.exercise, count: 0, seconds: 0 };
    c.count++;
    c.seconds += step.seconds;
    counts.set(step.exercise.name, c);
  }
  return [...counts.values()];
}

import type { MuscleGroup } from "@/db";
import { MUSCLE_GROUPS } from "@/lib/muscles";
import { injuryWarning, type Injury, type InjuryRules } from "./injuries";

/** What the session works: the belly, the whole body, or the legs and glutes. */
export type IntervalFocus = "abs" | "full" | "lower";
export const INTERVAL_FOCUSES: IntervalFocus[] = ["full", "abs", "lower"];

/** Seconds of effort / seconds of rest, written "30-30". */
export type IntervalPattern = string;

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

export type IntervalKind = "cardio" | "strength" | "core";
export const INTERVAL_KINDS: IntervalKind[] = ["cardio", "strength", "core"];
export type IntervalEquipment = "bodyweight" | "dumbbell" | "suspension";
export const INTERVAL_EQUIPMENT: IntervalEquipment[] = ["bodyweight", "dumbbell", "suspension"];
export const FITNESS_LEVELS = ["beginner", "intermediate", "advanced"] as const;

export interface IntervalExercise {
  /** The library's key (its translations and description live there). */
  name: string;
  muscleGroup: MuscleGroup;
  equipment: IntervalEquipment;
  focus: IntervalFocus[];
  kind: IntervalKind;
  /** Done one side then the other: switch halfway. */
  sides?: boolean;
}

/**
 * Everything a timed session is built from, as the admin keeps it (app
 * settings "timed_sessions"): the lengths and rhythms offered, the rests, how
 * many exercises a round takes, the order of the efforts, and the exercises.
 */
export interface TimedGuidance {
  minutes: number[];
  patterns: IntervalPattern[];
  /** Recovery between two rounds. */
  roundRestSec: number;
  /** The countdown before the first exercise. */
  getReadySec: number;
  /** Exercises per round, by length of session (the first that fits). */
  perRound: { upToMinutes: number; count: number }[];
  /** The order the kinds come in, so that the heart rate goes up and down. */
  rhythm: Record<IntervalFocus, IntervalKind[]>;
  /** The usual rhythm for a level. */
  patternForLevel: Record<(typeof FITNESS_LEVELS)[number], IntervalPattern>;
  exercises: IntervalExercise[];
}

export const TIMED_KEY = "timed_sessions";

const MUSCLES = MUSCLE_GROUPS;
const num = (v: unknown, lo: number, hi: number) => typeof v === "number" && Number.isInteger(v) && v >= lo && v <= hi;
export const validPattern = (p: unknown): p is string => {
  if (typeof p !== "string" || !/^\d{1,3}-\d{1,3}$/.test(p)) return false;
  const [w, r] = p.split("-").map(Number);
  return w >= 5 && w <= 600 && r >= 0 && r <= 600;
};

/** The timed-session reference, checked whole; null when anything is off. */
export function parseTimed(raw: string | null | undefined): TimedGuidance | null {
  if (!raw) return null;
  let g: TimedGuidance;
  try {
    g = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!g || typeof g !== "object") return null;
  if (!Array.isArray(g.minutes) || !g.minutes.length || !g.minutes.every((m) => num(m, 1, 180))) return null;
  if (!Array.isArray(g.patterns) || !g.patterns.length || !g.patterns.every(validPattern)) return null;
  if (!num(g.roundRestSec, 0, 600) || !num(g.getReadySec, 0, 120)) return null;
  if (!Array.isArray(g.perRound) || !g.perRound.length || !g.perRound.every((r) => r && num(r.upToMinutes, 1, 10000) && num(r.count, 1, 30))) return null;
  if (Math.max(...g.perRound.map((r) => r.upToMinutes)) < Math.max(...g.minutes)) return null;
  if (!g.rhythm || !INTERVAL_FOCUSES.every((f) => Array.isArray(g.rhythm[f]) && g.rhythm[f].length && g.rhythm[f].every((k) => INTERVAL_KINDS.includes(k)))) return null;
  if (!g.patternForLevel || !FITNESS_LEVELS.every((l) => g.patternForLevel[l] && g.patterns.includes(g.patternForLevel[l]))) return null;
  if (!Array.isArray(g.exercises)) return null;
  const names = new Set<string>();
  for (const e of g.exercises) {
    if (!e || typeof e.name !== "string" || !e.name.trim() || names.has(e.name)) return null;
    names.add(e.name);
    if (!MUSCLES.includes(e.muscleGroup) || !INTERVAL_EQUIPMENT.includes(e.equipment) || !INTERVAL_KINDS.includes(e.kind)) return null;
    if (!Array.isArray(e.focus) || !e.focus.length || !e.focus.every((f) => INTERVAL_FOCUSES.includes(f))) return null;
    if (e.sides !== undefined && typeof e.sides !== "boolean") return null;
  }
  // Every focus needs bodyweight exercises: a session without equipment must be possible.
  if (!INTERVAL_FOCUSES.every((f) => g.exercises.some((e) => e.focus.includes(f) && e.equipment === "bodyweight"))) return null;
  return g;
}

/** Whether a plan's equipment allows an exercise: the body always, the rest when chosen. */
export const allows = (plan: Pick<IntervalPlan, "dumbbells" | "trx">, e: Pick<IntervalExercise, "equipment">) =>
  e.equipment === "bodyweight" || (e.equipment === "dumbbell" && plan.dumbbells) || (e.equipment === "suspension" && !!plan.trx);

/**
 * The exercises a timed session may use, given the athlete's injuries. A
 * circuit is done fast and tired, so nothing that loads an injured area goes
 * in, not even lightly: those marked "caution" come back only when the focus
 * would be short of exercises for a round, and never those to avoid.
 */
export function injuryPool(
  g: TimedGuidance,
  plan: Pick<IntervalPlan, "focus" | "dumbbells" | "trx" | "minutes">,
  injuries: Pick<Injury, "area" | "healedOn">[],
  rules: InjuryRules,
  all: IntervalExercise[] = g.exercises
): { pool: IntervalExercise[]; leftOut: number; cautious: string[] } {
  const level = (e: IntervalExercise) => injuryWarning(rules, e.name, injuries)?.level ?? null;
  const fits = (e: IntervalExercise) => e.focus.includes(plan.focus) && allows(plan, e);
  const safe = all.filter((e) => !level(e));
  const short = exercisesPerRound(g, plan.minutes) - safe.filter(fits).length;
  const cautious = short > 0 ? all.filter((e) => fits(e) && level(e) === "caution").slice(0, short) : [];
  const pool = [...safe, ...cautious];
  return { pool, leftOut: all.filter(fits).length - pool.filter(fits).length, cautious: cautious.map((e) => e.name) };
}

export function patternSeconds(pattern: IntervalPattern): { work: number; rest: number } {
  const [work, rest] = pattern.split("-").map(Number);
  return { work, rest };
}

/** How many exercises make a round, by length of session. */
export function exercisesPerRound(g: Pick<TimedGuidance, "perRound">, minutes: number): number {
  const sorted = [...g.perRound].sort((a, b) => a.upToMinutes - b.upToMinutes);
  return (sorted.find((r) => minutes <= r.upToMinutes) ?? sorted[sorted.length - 1]).count;
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

/**
 * The exercises of one round: of the focus, with the equipment chosen when
 * there is some (about half of the round), alternating the kinds of effort, and
 * leaving out those of the other circuit while there are others.
 */
export function pickRound(
  g: Pick<TimedGuidance, "rhythm">,
  plan: Pick<IntervalPlan, "focus" | "dumbbells" | "trx">,
  count: number,
  rand: () => number,
  avoid: Set<string>,
  pool: IntervalExercise[]
): IntervalExercise[] {
  const usable = pool.filter((e) => e.focus.includes(plan.focus) && allows(plan, e));
  const equipped = plan.dumbbells || !!plan.trx;
  // Exercises of the other circuit come last, so the two differ as much as they can.
  const shuffled = shuffle(usable, rand);
  const ordered = [...shuffled.filter((e) => !avoid.has(e.name)), ...shuffled.filter((e) => avoid.has(e.name))];
  const dumbbellShare = Math.ceil(count / 2);
  const picked: IntervalExercise[] = [];
  const rhythm = g.rhythm[plan.focus];
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
export function buildIntervalSession(g: TimedGuidance, plan: IntervalPlan, pool: IntervalExercise[] = g.exercises): IntervalSession {
  const rand = random(plan.seed);
  const { work, rest } = patternSeconds(plan.pattern);
  const perRound = exercisesPerRound(g, plan.minutes);
  const a = pickRound(g, plan, perRound, rand, new Set(), pool);
  const circuits = plan.minutes >= 30 ? [a, pickRound(g, plan, perRound, rand, new Set(a.map((e) => e.name)), pool)] : [a];

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
      steps[steps.length - 1] = { ...last, seconds: last.seconds + g.roundRestSec, recovery: true };
      minute++;
    }
    round++;
  }
  while (steps.length && steps[steps.length - 1].type === "rest") steps.pop();
  return { steps, rounds, totalSec: steps.reduce((sum, s) => sum + s.seconds, 0) };
}

/** The usual rhythm for a level: easier to hold for a beginner. */
export function defaultPattern(g: Pick<TimedGuidance, "patternForLevel">, level: string | undefined): IntervalPattern {
  return g.patternForLevel[(FITNESS_LEVELS as readonly string[]).includes(level ?? "") ? (level as (typeof FITNESS_LEVELS)[number]) : "beginner"];
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

/** The rounds carried out to the end: each of its efforts done. */
export function roundsDone(steps: IntervalStep[], done: number[]): number {
  const byRound = new Map<number, { total: number; done: number }>();
  steps.forEach((s, i) => {
    if (s.type !== "work") return;
    const r = byRound.get(s.round) ?? { total: 0, done: 0 };
    r.total++;
    if (done.includes(i)) r.done++;
    byRound.set(s.round, r);
  });
  return [...byRound.values()].filter((r) => r.total > 0 && r.done === r.total).length;
}

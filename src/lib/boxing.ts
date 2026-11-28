import type { MuscleGroup } from "@/db";
import { isGroupId } from "@/lib/muscles";
import { injuryWarning, type Injury, type InjuryRules } from "./injuries";
import {
  BOXING_FOCUS,
  FITNESS_LEVELS,
  patternSeconds,
  random,
  shuffle,
  validPattern,
  type BoxingPlan,
  type IntervalExercise,
  type IntervalPattern,
  type IntervalSession,
  type IntervalStep,
  type TimedItem,
} from "./intervals";

/**
 * Boxing rounds, among the timed sessions: combinations shadow-boxed (or on
 * a bag) for the length of a round, a new one every half-minute or so, the
 * round closed by a burst of fast punches, then a rest before the next.
 * What it is built from is a reference an admin keeps (app settings
 * "boxing_rounds"); the combinations are exercises of the library (their
 * names, descriptions, videos and injury rules live there).
 */

/** What a combination asks (punching, getting out of the way, moving…): an id of the reference's kinds. */
export type BoxingKind = string;

/**
 * A kind of combination, named in three languages. One closes each round
 * (the finisher, a burst of fast punches); one fills a round when another
 * kind has nothing left (the main one, punches).
 */
export interface BoxingKindDef extends TimedItem {
  finisher?: boolean;
  main?: boolean;
}

export interface BoxingCombo {
  /** The library's name of the exercise. */
  name: string;
  muscleGroup: MuscleGroup;
  kind: BoxingKind;
}

export interface BoxingGuidance {
  minutes: number[];
  /** The rounds offered: seconds of a round, seconds of rest after it ("180-60"). */
  formats: IntervalPattern[];
  formatForLevel: Record<(typeof FITNESS_LEVELS)[number], IntervalPattern>;
  /** How long each combination of a round lasts. */
  comboSec: number;
  /** The kinds of combination, in the order offered. */
  kinds: BoxingKindDef[];
  /** The order the kinds come in within a round (the finisher closes it). */
  rhythm: BoxingKind[];
  combos: BoxingCombo[];
}

export const BOXING_KEY = "boxing_rounds";

const whole = (v: unknown, lo: number, hi: number) => typeof v === "number" && Number.isInteger(v) && v >= lo && v <= hi;

/** The kind that closes each round, and the one that fills a round when another has nothing left. */
export const finisherKind = (g: Pick<BoxingGuidance, "kinds">) => g.kinds.find((k) => k.finisher)?.id;
export const mainKind = (g: Pick<BoxingGuidance, "kinds">) => g.kinds.find((k) => k.main)?.id;

/** The reference, checked whole; null when anything is off. */
export function parseBoxing(raw: string | null | undefined): BoxingGuidance | null {
  if (!raw) return null;
  let g: BoxingGuidance;
  try {
    g = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!g || typeof g !== "object") return null;
  if (!Array.isArray(g.minutes) || !g.minutes.length || !g.minutes.every((m) => whole(m, 1, 180))) return null;
  if (!whole(g.comboSec, 10, 120)) return null;
  // A round holds whole combinations, two at least (the last one is the burst).
  if (!Array.isArray(g.formats) || !g.formats.length) return null;
  for (const f of g.formats) {
    if (!validPattern(f)) return null;
    const { work } = patternSeconds(f);
    if (work % g.comboSec !== 0 || work / g.comboSec < 2) return null;
  }
  if (!g.formatForLevel || !FITNESS_LEVELS.every((l) => g.formats.includes(g.formatForLevel[l]))) return null;
  const items = g.kinds;
  if (!Array.isArray(items) || !items.length || items.length > 20) return null;
  if (!items.every((i) => i && typeof i.id === "string" && /^[a-z0-9_-]{1,30}$/.test(i.id) && ["fr", "en", "de"].every((l) => typeof i[l as "fr"] === "string" && i[l as "fr"].trim()))) return null;
  if (new Set(items.map((i) => i.id)).size !== items.length) return null;
  // One kind closes the rounds, another (not the same) fills them.
  if (items.filter((i) => i.finisher === true).length !== 1 || items.filter((i) => i.main === true).length !== 1 || items.some((i) => i.finisher && i.main)) return null;
  const KINDS = items.map((i) => i.id);
  const finisher = finisherKind(g);
  if (!Array.isArray(g.rhythm) || !g.rhythm.length || !g.rhythm.every((k) => KINDS.includes(k) && k !== finisher)) return null;
  if (!Array.isArray(g.combos)) return null;
  const names = new Set<string>();
  for (const c of g.combos) {
    if (!c || typeof c.name !== "string" || !c.name.trim() || names.has(c.name)) return null;
    names.add(c.name);
    if (!isGroupId(c.muscleGroup) || !KINDS.includes(c.kind)) return null;
  }
  // Combinations of the main kind at least: a round can always be filled with them.
  if (!g.combos.some((c) => c.kind === mainKind(g))) return null;
  return g;
}

/**
 * The combinations a session may use, given the injuries. Rounds are boxed
 * fast and tired: one that loads an injured area is left out, those marked
 * "caution" coming back only for a kind that would otherwise have none.
 */
export function boxingPool(
  g: BoxingGuidance,
  injuries: Pick<Injury, "area" | "healedOn">[],
  rules: InjuryRules
): { pool: BoxingCombo[]; leftOut: number; cautious: string[] } {
  const level = (c: BoxingCombo) => injuryWarning(rules, c.name, injuries)?.level ?? null;
  const safe = g.combos.filter((c) => !level(c));
  const cautious = g.kinds.map((k) => k.id).flatMap((kind) => (safe.some((c) => c.kind === kind) ? [] : g.combos.filter((c) => c.kind === kind && level(c) === "caution")));
  const pool = g.combos.filter((c) => safe.includes(c) || cautious.includes(c));
  return { pool, leftOut: g.combos.length - pool.length, cautious: cautious.map((c) => c.name) };
}

/** How many rounds fit in the minutes asked: rounds and the rests between them. */
export function roundCount(pattern: IntervalPattern, minutes: number): number {
  const { work, rest } = patternSeconds(pattern);
  return Math.max(1, Math.floor((minutes * 60 + rest) / (work + rest)));
}

/** A combination as the timer and the saved workout know an exercise. */
const asExercise = (c: BoxingCombo): IntervalExercise => ({ name: c.name, muscleGroup: c.muscleGroup, equipment: "bodyweight", focus: [BOXING_FOCUS], kind: c.kind });

/**
 * The rounds for a plan: each one the kinds in their order, a combination
 * after the other with no pause, the last one the burst; the combinations
 * of a kind taken in turn, so that the rounds differ. A rest between rounds,
 * none after the last.
 */
export function buildBoxingSession(g: BoxingGuidance, plan: BoxingPlan, pool: BoxingCombo[] = g.combos): IntervalSession {
  const rand = random(plan.seed);
  const { work, rest } = patternSeconds(plan.pattern);
  const perRound = work / g.comboSec;
  const queues = new Map(g.kinds.map(({ id: kind }) => [kind, shuffle(pool.filter((c) => c.kind === kind), rand)]));
  const finisher = finisherKind(g);
  const main = mainKind(g);
  const turns = new Map<BoxingKind, number>();
  const take = (kind: BoxingKind | undefined): BoxingCombo | null => {
    const queue = kind ? queues.get(kind) : undefined;
    if (!kind || !queue?.length) return null;
    const n = turns.get(kind) ?? 0;
    turns.set(kind, n + 1);
    return queue[n % queue.length];
  };

  const steps: IntervalStep[] = [];
  const rounds: IntervalExercise[][] = [];
  const count = roundCount(plan.pattern, plan.minutes);
  for (let round = 0; round < count; round++) {
    const combos: IntervalExercise[] = [];
    for (let i = 0; i < perRound; i++) {
      // The burst closes the round; a kind with nothing left (injuries) gives way to punches.
      const combo = (i === perRound - 1 ? take(finisher) : null) ?? take(g.rhythm[i % g.rhythm.length]) ?? take(main);
      if (!combo) continue;
      combos.push(asExercise(combo));
      steps.push({ type: "work", exercise: asExercise(combo), seconds: g.comboSec, round });
    }
    rounds.push(combos);
    if (round < count - 1) steps.push({ type: "rest", seconds: rest, round, recovery: true });
  }
  return { steps, rounds, totalSec: steps.reduce((sum, s) => sum + s.seconds, 0) };
}

/** The usual round for a level: shorter rounds for a beginner. */
export function boxingFormat(g: Pick<BoxingGuidance, "formatForLevel">, level: string | undefined): IntervalPattern {
  return g.formatForLevel[(FITNESS_LEVELS as readonly string[]).includes(level ?? "") ? (level as (typeof FITNESS_LEVELS)[number]) : "beginner"];
}

/** A round's length as said: in minutes when whole ("3 min"), else in seconds ("90 s"). */
export const roundLength = (sec: number) => (sec % 60 === 0 ? `${sec / 60} min` : `${sec} s`);

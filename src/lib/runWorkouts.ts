import { PACE_ZONES, metersIn, secondsFor, type PaceZone } from "./runPaces";
import { LEVELS } from "./levels";
import type { FitnessLevel } from "@/db";

export type RunLevel = FitnessLevel;
export const RUN_LEVELS = LEVELS;

/** A block of a run: by time or by distance, in a zone. */
export interface RunBlock {
  kind: "warmup" | "work" | "recovery" | "cooldown";
  zone: PaceZone;
  sec?: number;
  meters?: number;
}

/** A block with its time and distance worked out from the VMA. */
export interface TimedRunBlock extends RunBlock {
  sec: number;
  meters: number;
  /** Given in metres (400 m) rather than in time (30 s). */
  byDistance: boolean;
}

/**
 * The run sessions, kept by an admin (app_settings "run_workouts", Admin >
 * Running) rather than fixed in the code: each named and described in three
 * languages, what it works, and its blocks at each level, repeats written
 * once ("10 times 30 s fast, 30 s easy between them").
 */
export const RUN_WORKOUTS_KEY = "run_workouts";

type Lang = "fr" | "en" | "de";
type Named = { id: string } & Record<Lang, string>;

/** A block, or a set of blocks done n times with, between two of them (not after the last), a block. */
export type RunStep = RunBlock | { repeat: number; of: RunStep[]; between?: RunBlock };

export interface RunWorkout extends Named {
  description: Record<Lang, string>;
  /** What it works (speed, threshold, endurance…): an id of the reference's focuses. */
  focus: string;
  /** The test whose distance gives one's VMA (the half-Cooper). */
  vmaTest?: boolean;
  levels: Record<RunLevel, RunStep[]>;
}
export interface RunWorkoutsReference {
  focuses: Named[];
  workouts: RunWorkout[];
}

const KINDS: RunBlock["kind"][] = ["warmup", "work", "recovery", "cooldown"];
const LANGS: Lang[] = ["fr", "en", "de"];
const ID = /^[a-z0-9_-]{1,30}$/;
const texts = (x: unknown, max: number) =>
  !!x && typeof x === "object" && LANGS.every((l) => typeof (x as Record<Lang, string>)[l] === "string" && (x as Record<Lang, string>)[l].trim().length > 0 && (x as Record<Lang, string>)[l].length <= max);
const named = (x: unknown): x is Named => !!x && typeof (x as Named).id === "string" && ID.test((x as Named).id) && texts(x, 80);
const whole = (n: unknown, lo: number, hi: number) => typeof n === "number" && Number.isInteger(n) && n >= lo && n <= hi;

/** A block of a known kind and zone, by time or by distance (one of them), within reason. */
export function validBlock(b: unknown): b is RunBlock {
  const x = b as RunBlock;
  if (!x || typeof x !== "object" || !KINDS.includes(x.kind) || !PACE_ZONES.includes(x.zone)) return false;
  return (x.sec !== undefined) !== (x.meters !== undefined) && (x.sec === undefined || whole(x.sec, 1, 4 * 3600)) && (x.meters === undefined || whole(x.meters, 1, 100_000));
}

/** Steps that hold together: blocks, and repeats of 1 to 50 times, three deep at most. */
export function validSteps(steps: unknown, depth = 0): steps is RunStep[] {
  if (!Array.isArray(steps) || !steps.length || steps.length > 60 || depth > 2) return false;
  return steps.every((s) =>
    s && typeof s === "object" && "repeat" in s
      ? whole(s.repeat, 1, 50) && validSteps(s.of, depth + 1) && (s.between === undefined || validBlock(s.between))
      : validBlock(s)
  );
}

/** The blocks of steps, the repeats written out. */
export function expandSteps(steps: RunStep[]): RunBlock[] {
  return steps.flatMap((s) =>
    "repeat" in s ? Array.from({ length: s.repeat }, (_, i) => [...expandSteps(s.of), ...(s.between && i < s.repeat - 1 ? [s.between] : [])]).flat() : [s]
  );
}

/** A session's blocks at a level. */
export const workoutBlocks = (w: Pick<RunWorkout, "levels">, level: RunLevel): RunBlock[] => expandSteps(w.levels[level]);

/** The reference, checked whole; null when anything is off. */
export function parseRunWorkouts(text: string | null | undefined): RunWorkoutsReference | null {
  if (!text) return null;
  let r: RunWorkoutsReference;
  try {
    r = JSON.parse(text);
  } catch {
    return null;
  }
  if (!r || !Array.isArray(r.focuses) || !r.focuses.length || !r.focuses.every(named) || new Set(r.focuses.map((f) => f.id)).size !== r.focuses.length) return null;
  if (!Array.isArray(r.workouts) || !r.workouts.length || r.workouts.length > 100 || !r.workouts.every(named) || new Set(r.workouts.map((w) => w.id)).size !== r.workouts.length) return null;
  const focuses = new Set(r.focuses.map((f) => f.id));
  for (const w of r.workouts) {
    if (!texts(w.description, 400) || !focuses.has(w.focus) || (w.vmaTest !== undefined && typeof w.vmaTest !== "boolean")) return null;
    if (!w.levels || !RUN_LEVELS.every((l) => validSteps(w.levels[l]) && expandSteps(w.levels[l]).some((b) => b.kind === "work") && expandSteps(w.levels[l]).length <= 200)) return null;
  }
  return r;
}

/** A name or a description in the app's language. */
export const runText = (x: Record<Lang, string>, locale: string) => x[locale === "fr" || locale === "de" ? locale : "en"];

// Blocks of a plan's run (below).
const work = (zone: PaceZone, size: { sec?: number; meters?: number }): RunBlock => ({ kind: "work", zone, ...size });
const jog = (sec: number): RunBlock => ({ kind: "recovery", zone: "recovery", sec });

/** n times the same effort and recovery, without the recovery after the last. */
const repeat = (n: number, effort: RunBlock, recovery: RunBlock): RunBlock[] =>
  Array.from({ length: n }, (_, i) => (i < n - 1 ? [effort, recovery] : [effort])).flat();

/** The blocks with their time and distance at this VMA. */
export function timedBlocks(blocks: RunBlock[], vma: number): TimedRunBlock[] {
  return blocks.map((b) =>
    b.meters !== undefined
      ? { ...b, sec: secondsFor(vma, b.zone, b.meters), meters: b.meters, byDistance: true }
      : { ...b, sec: b.sec ?? 0, meters: metersIn(vma, b.zone, b.sec ?? 0), byDistance: false }
  );
}

/** Time and distance of a whole session. */
export const runTotals = (blocks: TimedRunBlock[]) => ({
  sec: blocks.reduce((s, b) => s + b.sec, 0),
  meters: blocks.reduce((s, b) => s + b.meters, 0),
  efforts: blocks.filter((b) => b.kind === "work").length,
});

/** The level a profile's fitness level gives. */
export const runLevelOf = (fitness: string | undefined): RunLevel =>
  fitness === "advanced" ? "advanced" : fitness === "intermediate" ? "intermediate" : "beginner";

// ─── A plan's interval run, to play with the guide ───────────────

/** Seconds of the first duration in a text: "1 min 30", "2 min", "45 s", "1:30". */
function firstDuration(text: string): number | null {
  const m = text.match(/(\d+):(\d{2})|(\d+)\s*min\.?(?:\s*(\d+)(?!\s*(?:×|x|m\b|km)))?|(\d+)\s*s\b/i);
  if (!m) return null;
  if (m[1]) return Number(m[1]) * 60 + Number(m[2]);
  if (m[3]) return Number(m[3]) * 60 + (m[4] ? Number(m[4]) : 0);
  return Number(m[5]);
}

/**
 * The blocks of a plan's run with repeats ("8 × 400 m rapides, 1 min 30 de
 * récupération"): the warm-up and cool-down of its steps, the efforts at the
 * pace of the session's zone, the recoveries as written. Null when the run
 * has no repeats to play.
 */
export function planRunBlocks(target: { sport?: string; intensity?: string; steps?: string[] }): RunBlock[] | null {
  if (target.sport !== "run") return null;
  const steps = target.steps ?? [];
  const at = steps.findIndex((s) => /\d+\s*[×x]\s*\(?\s*\d/.test(s));
  if (at < 0) return null;
  const text = steps[at];
  const m = text.match(/(\d+)\s*[×x]\s*\(?\s*(\d+(?:[.,]\d+)?)\s*(km|m|min|s)\b/i);
  if (!m) return null;
  const reps = Number(m[1]);
  const size = Number(m[2].replace(",", "."));
  const unit = m[3].toLowerCase();
  if (!(reps >= 1 && reps <= 40)) return null;
  const effortSize = unit === "km" ? { meters: size * 1000 } : unit === "m" ? { meters: size } : unit === "min" ? { sec: size * 60 } : { sec: size };
  const short = (effortSize.meters ?? 0) <= 400 && (effortSize.sec ?? 0) <= 60;
  const zoneNumber = Number(target.intensity?.match(/(\d)\s*$/)?.[1]);
  const zone: PaceZone =
    zoneNumber === 5 ? "vma" : zoneNumber === 4 ? (short ? "5k" : "threshold") : zoneNumber === 3 ? "marathon" : zoneNumber >= 1 ? "easy" : "10k";
  const rest = firstDuration(text.slice((m.index ?? 0) + m[0].length)) ?? (short ? 90 : 120);
  const before = steps.slice(0, at).map(firstDuration).find((x) => x !== null);
  const after = steps.slice(at + 1).map(firstDuration).find((x) => x !== null);
  const clamp = (sec: number | null | undefined, fallback: number) => Math.min(25 * 60, Math.max(3 * 60, sec ?? fallback));
  return [
    { kind: "warmup", zone: "easy", sec: clamp(before, 15 * 60) },
    ...repeat(reps, work(zone, effortSize), jog(rest)),
    { kind: "cooldown", zone: "recovery", sec: clamp(after, 10 * 60) },
  ];
}

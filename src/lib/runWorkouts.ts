import { metersIn, secondsFor, type PaceZone } from "./runPaces";

export type RunLevel = "beginner" | "intermediate" | "advanced";
export const RUN_LEVELS: RunLevel[] = ["beginner", "intermediate", "advanced"];

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

export type RunWorkoutId = "30-30" | "400" | "800" | "1000" | "pyramid" | "threshold" | "tempo" | "hills" | "fartlek" | "progressive" | "half-cooper";

export interface RunWorkout {
  id: RunWorkoutId;
  /** What it works: speed (VMA), threshold, or endurance. */
  focus: "vma" | "threshold" | "endurance" | "test";
  blocks: (level: RunLevel) => RunBlock[];
}

const by = <T,>(level: RunLevel, values: [T, T, T]) => values[RUN_LEVELS.indexOf(level)];
const warmUp = (level: RunLevel): RunBlock => ({ kind: "warmup", zone: "easy", sec: by(level, [12, 15, 20]) * 60 });
const coolDown: RunBlock = { kind: "cooldown", zone: "recovery", sec: 10 * 60 };
const work = (zone: PaceZone, size: { sec?: number; meters?: number }): RunBlock => ({ kind: "work", zone, ...size });
const jog = (sec: number): RunBlock => ({ kind: "recovery", zone: "recovery", sec });

/** n times the same effort and recovery, without the recovery after the last. */
const repeat = (n: number, effort: RunBlock, recovery: RunBlock): RunBlock[] =>
  Array.from({ length: n }, (_, i) => (i < n - 1 ? [effort, recovery] : [effort])).flat();

const session = (level: RunLevel, main: RunBlock[]) => [warmUp(level), ...main, coolDown];

export const RUN_WORKOUTS: RunWorkout[] = [
  {
    id: "30-30",
    focus: "vma",
    blocks: (l) => {
      const sets = by(l, [2, 2, 3]);
      const reps = by(l, [8, 10, 10]);
      const set = repeat(reps, work("vma", { sec: 30 }), jog(30));
      return session(l, Array.from({ length: sets }, (_, i) => (i < sets - 1 ? [...set, jog(180)] : set)).flat());
    },
  },
  { id: "400", focus: "vma", blocks: (l) => session(l, repeat(by(l, [6, 8, 10]), work("vma", { meters: 400 }), jog(90))) },
  { id: "800", focus: "vma", blocks: (l) => session(l, repeat(by(l, [4, 5, 6]), work("vma", { meters: 800 }), jog(120))) },
  { id: "1000", focus: "vma", blocks: (l) => session(l, repeat(by(l, [3, 5, 6]), work("5k", { meters: 1000 }), jog(120))) },
  {
    id: "pyramid",
    focus: "vma",
    blocks: (l) => {
      const steps = by(l, [[200, 400, 600, 400, 200], [200, 400, 600, 800, 600, 400, 200], [200, 400, 600, 800, 1000, 800, 600, 400, 200]]);
      return session(
        l,
        steps.flatMap((m, i) => {
          const effort = work(m <= 200 ? "short" : "vma", { meters: m });
          // Recover half the time of the effort, about.
          return i < steps.length - 1 ? [effort, jog(Math.max(45, Math.round((m / 400) * 45)))] : [effort];
        })
      );
    },
  },
  { id: "threshold", focus: "threshold", blocks: (l) => session(l, repeat(by(l, [2, 3, 3]), work("threshold", { sec: by(l, [8, 10, 12]) * 60 }), jog(120))) },
  { id: "tempo", focus: "threshold", blocks: (l) => session(l, [work("half", { sec: by(l, [15, 20, 30]) * 60 })]) },
  { id: "hills", focus: "vma", blocks: (l) => session(l, repeat(by(l, [6, 8, 10]), work("5k", { sec: 45 }), jog(90))) },
  {
    id: "fartlek",
    focus: "endurance",
    blocks: (l) => session(l, repeat(by(l, [6, 8, 10]), work("10k", { sec: 60 }), { kind: "recovery", zone: "easy", sec: 60 })),
  },
  {
    id: "progressive",
    focus: "endurance",
    blocks: (l) => {
      const min = by(l, [8, 10, 12]) * 60;
      return [warmUp(l), work("easy", { sec: min }), work("marathon", { sec: min }), work("threshold", { sec: min }), coolDown];
    },
  },
  { id: "half-cooper", focus: "test", blocks: (l) => session(l, [work("vma", { sec: 360 })]) },
];

export const runWorkout = (id: string) => RUN_WORKOUTS.find((w) => w.id === id);

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

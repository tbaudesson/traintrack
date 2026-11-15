/**
 * Insights: the figures of the last four weeks, against the four before, read
 * as a few plain statements, each with its evidence and one thing to do.
 *
 * Nothing here computes training anew: it reads what the app already works
 * out (training load, deload advice, records, estimated 1RM, sessions done)
 * and decides what is worth saying, most pressing first. With too little to
 * go on, it says so ("not enough data yet") rather than conclude.
 */
import { doneBetween } from "@/lib/weekGoal";
import { recordHistory } from "@/lib/performance";
import { oneRepMaxHistory } from "@/lib/goals";
import type { TrainingLoad } from "@/lib/trainingLoad";
import type { DeloadAdvice } from "@/lib/deload";
import type { PainReport } from "@/lib/pain";
import type { Workout, WorkoutSet } from "@/db";

type W = Pick<Workout, "id" | "date" | "title" | "programId" | "programDayIndex" | "kind" | "distanceM" | "durationSec" | "durationMin">;
type S = Pick<WorkoutSet, "workoutId" | "exerciseId" | "setNumber" | "completed" | "isWarmup" | "weightKg" | "reps">;

export type InsightKind = "load" | "pain" | "records" | "volumeUp" | "volumeDown" | "distanceUp" | "distanceDown" | "stagnation" | "regularity" | "steady" | "insufficient";

/** Where a piece of evidence leads: the chart that shows it. */
export type InsightChart = "load" | "volume" | "exercise" | "records" | "distance";

export interface InsightEvidence {
  key: string;
  values: Record<string, string | number>;
  chart?: InsightChart;
  exerciseId?: number;
}

export interface Insight {
  kind: InsightKind;
  tone: "warn" | "good" | "info";
  values: Record<string, string | number>;
  evidence: InsightEvidence[];
  action: { key: string; href?: string };
}

export interface InsightPeriod {
  from: string;
  to: string;
  previousFrom: string;
  previousTo: string;
}

/** Sessions needed in the four weeks before anything is concluded. */
export const MIN_SESSIONS = 3;
/** Sessions of a kind needed in each period before comparing them. */
export const MIN_COMPARABLE = 3;
/** Weeks without a higher estimated 1RM before an exercise is said to stall. */
export const STALL_WEEKS = 5;
/** Sessions of an exercise, over distinct weeks, needed within those weeks. */
export const STALL_EFFORTS = 4;

const addDays = (date: string, days: number) => {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
};
const weekOf = (date: string, from: string) => Math.floor((Date.parse(`${date}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / (7 * 86_400_000));
const change = (now: number, before: number) => Math.round(((now - before) / before) * 100);
const round1 = (n: number) => Math.round(n * 10) / 10;

/** The last four weeks (today included) and the four before. */
export function insightPeriod(today: string): InsightPeriod {
  return { from: addDays(today, -27), to: today, previousFrom: addDays(today, -55), previousTo: addDays(today, -28) };
}

export function insights(input: {
  today: string;
  workouts: W[];
  sets: S[];
  /** The training load as the app computes it (trainingLoad), if any. */
  load?: TrainingLoad | null;
  /** The deload the app advises (deloadAdvice), if any: a sign of fatigue or overload. */
  deload?: DeloadAdvice | null;
  pains?: PainReport[];
  /** Sessions planned a week (the training days), 0 when none. */
  perWeek?: number;
}): { period: InsightPeriod; insights: Insight[] } {
  const { today, workouts, sets } = input;
  const period = insightPeriod(today);
  const done = doneBetween({ from: period.from, to: period.to, workouts, sets });
  const before = doneBetween({ from: period.previousFrom, to: period.previousTo, workouts, sets });
  const out: (Insight & { rank: number })[] = [];
  const overloaded = !!input.deload || input.load?.zone === "caution" || input.load?.zone === "danger";

  // 1. Safety: a load rising too fast.
  const load = input.load;
  if (load && (load.zone === "caution" || load.zone === "danger")) {
    out.push({
      rank: 10,
      kind: "load",
      tone: "warn",
      values: { ratio: load.ratio, change: Math.round((load.ratio - 1) * 100) },
      evidence: [
        { key: "loadRatio", values: { ratio: load.ratio }, chart: "load" },
        { key: "loadWeeks", values: { now: Math.round(load.acute), avg: Math.round(load.chronic) }, chart: "load" },
      ],
      action: input.deload ? { key: "actionDeload", href: "/" } : { key: "actionLighten" },
    });
  }

  // 1. Safety: the same pain reported again.
  const pains = (input.pains ?? []).filter((p) => p.date >= period.from && p.date <= period.to);
  const byArea = new Map<string, PainReport[]>();
  for (const p of pains) byArea.set(p.area, [...(byArea.get(p.area) ?? []), p]);
  const sore = [...byArea.entries()].filter(([, list]) => list.length >= 2).sort((a, b) => b[1].length - a[1].length)[0];
  if (sore) {
    const [area, list] = sore;
    const last = list.map((p) => p.date).sort().at(-1)!;
    const exercise = list.find((p) => p.exerciseName)?.exerciseName;
    out.push({
      rank: 11,
      kind: "pain",
      tone: "warn",
      values: { area, count: list.length },
      evidence: [{ key: "pain", values: { count: list.length, date: last } }, ...(exercise ? [{ key: "painExercise", values: { exercise } }] : [])],
      action: { key: "actionPain", href: "/settings" },
    });
  }

  // Too little to go on: say so, and nothing else but safety.
  if (done.length < MIN_SESSIONS) {
    out.push({
      rank: 60,
      kind: "insufficient",
      tone: "info",
      values: { done: done.length, needed: MIN_SESSIONS },
      evidence: [{ key: "needed", values: { done: done.length, needed: MIN_SESSIONS } }],
      action: { key: "actionStart", href: "/log" },
    });
    return { period, insights: sorted(out) };
  }

  // 3. Progress: records beaten in the four weeks.
  const exerciseIds = [...new Set(sets.filter((s) => (s.weightKg ?? 0) > 0).map((s) => s.exerciseId))];
  const records = exerciseIds
    .flatMap((exerciseId) => recordHistory(exerciseId, workouts, sets).map((r) => ({ ...r, exerciseId })))
    .filter((r) => r.date >= period.from && r.date <= period.to);
  if (records.length > 0) {
    // One per exercise, its best.
    const best = new Map<number, (typeof records)[number]>();
    for (const r of records) if (!best.has(r.exerciseId) || r.oneRepMax > best.get(r.exerciseId)!.oneRepMax) best.set(r.exerciseId, r);
    out.push({
      rank: 30,
      kind: "records",
      tone: "good",
      values: { count: best.size },
      evidence: [...best.values()].slice(0, 3).map((r) => ({ key: "record", values: { weight: r.weightKg, reps: r.reps, date: r.date }, chart: "records" as const, exerciseId: r.exerciseId })),
      action: { key: "actionKeepGoing", href: "/log" },
    });
  }

  // 3. Progress: the loaded volume, only between weeks that both hold loaded sessions.
  const loaded = (list: W[]) => {
    const ids = new Set(list.map((w) => w.id));
    const own = sets.filter((s) => ids.has(s.workoutId) && s.completed && !s.isWarmup && (s.weightKg ?? 0) > 0 && (s.reps ?? 0) > 0);
    return { kg: own.reduce((sum, s) => sum + s.weightKg! * s.reps!, 0), sessions: new Set(own.map((s) => s.workoutId)).size };
  };
  const volNow = loaded(done);
  const volBefore = loaded(before);
  if (volNow.sessions >= MIN_COMPARABLE && volBefore.sessions >= MIN_COMPARABLE && volBefore.kg > 0) {
    const diff = change(volNow.kg, volBefore.kg);
    if (diff >= 10 || diff <= -15) {
      out.push({
        rank: diff >= 10 ? 31 : 40,
        kind: diff >= 10 ? "volumeUp" : "volumeDown",
        tone: diff >= 10 ? "good" : "info",
        values: { change: diff },
        evidence: [
          { key: "volume", values: { now: Math.round(volNow.kg), before: Math.round(volBefore.kg) }, chart: "volume" },
          { key: "loadedSessions", values: { now: volNow.sessions, before: volBefore.sessions }, chart: "volume" },
        ],
        action: diff >= 10 ? { key: "actionConsolidate" } : overloaded ? { key: "actionDeload", href: "/" } : { key: "actionKeepGoing", href: "/log" },
      });
    }
  }

  // 3. Progress: the distance of the outings, never mixed with kilos.
  const outings = (list: W[]) => list.filter((w) => w.kind === "cardio" && (w.distanceM ?? 0) > 0);
  const kmNow = outings(done).reduce((sum, w) => sum + (w.distanceM ?? 0), 0) / 1000;
  const kmBefore = outings(before).reduce((sum, w) => sum + (w.distanceM ?? 0), 0) / 1000;
  if (outings(done).length >= MIN_COMPARABLE && outings(before).length >= MIN_COMPARABLE && kmBefore > 0) {
    const diff = change(kmNow, kmBefore);
    if (diff >= 10 || diff <= -15) {
      out.push({
        rank: diff >= 10 ? 32 : 41,
        kind: diff >= 10 ? "distanceUp" : "distanceDown",
        tone: diff >= 10 ? "good" : "info",
        values: { change: diff, km: round1(kmNow) },
        evidence: [
          { key: "distance", values: { now: round1(kmNow), before: round1(kmBefore) }, chart: "distance" },
          { key: "outings", values: { now: outings(done).length, before: outings(before).length }, chart: "distance" },
        ],
        action: diff >= 10 ? { key: "actionConsolidate" } : { key: "actionKeepGoing", href: "/log" },
      });
    }
  }

  // 4. A stall: enough comparable efforts over five weeks, none above the best before them.
  const stallFrom = addDays(today, -(STALL_WEEKS * 7 - 1));
  const stalls = exerciseIds
    .map((exerciseId) => {
      const points = oneRepMaxHistory(exerciseId, workouts, sets);
      const recent = points.filter((p) => p.date >= stallFrom && p.date <= today);
      const earlier = points.filter((p) => p.date < stallFrom);
      const weeks = new Set(recent.map((p) => weekOf(p.date, stallFrom))).size;
      if (recent.length < STALL_EFFORTS || weeks < STALL_EFFORTS || earlier.length === 0) return null;
      const bestEarlier = earlier.reduce((a, b) => (b.oneRepMax > a.oneRepMax ? b : a));
      const bestRecent = Math.max(...recent.map((p) => p.oneRepMax));
      return bestRecent <= bestEarlier.oneRepMax ? { exerciseId, efforts: recent.length, now: bestRecent, before: bestEarlier } : null;
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .sort((a, b) => b.efforts - a.efforts);
  if (stalls[0]) {
    const s = stalls[0];
    out.push({
      rank: 45,
      kind: "stagnation",
      tone: "info",
      values: { weeks: STALL_WEEKS },
      evidence: [
        { key: "stall", values: { now: Math.round(s.now), before: Math.round(s.before.oneRepMax), date: s.before.date }, chart: "exercise", exerciseId: s.exerciseId },
        { key: "efforts", values: { count: s.efforts, weeks: STALL_WEEKS }, chart: "exercise", exerciseId: s.exerciseId },
      ],
      // A deload only on an existing sign of fatigue or overload; otherwise another rep range.
      action: overloaded ? { key: "actionDeload", href: "/" } : { key: "actionRepRange" },
    });
  }

  // 5. Regularity: fewer sessions than planned.
  const perWeek = input.perWeek ?? 0;
  const avg = round1(done.length / 4);
  if (perWeek > 0 && avg < perWeek * 0.75) {
    out.push({
      rank: 50,
      kind: "regularity",
      tone: "info",
      values: { avg, target: perWeek },
      evidence: [
        { key: "perWeek", values: { avg, target: perWeek } },
        { key: "previousPerWeek", values: { avg: round1(before.length / 4) } },
      ],
      action: { key: "actionPlan", href: "/settings" },
    });
  }

  // Nothing stands out: the work kept up, said plainly.
  if (!out.some((i) => i.kind !== "pain" && i.kind !== "load")) {
    out.push({
      rank: 55,
      kind: "steady",
      tone: "good",
      values: { sessions: done.length },
      evidence: [{ key: "sessions", values: { now: done.length, before: before.length } }],
      action: { key: "actionKeepGoing", href: "/log" },
    });
  }

  return { period, insights: sorted(out) };
}

function sorted(list: (Insight & { rank: number })[]): Insight[] {
  return [...list]
    .sort((a, b) => a.rank - b.rank)
    .map((i) => ({ kind: i.kind, tone: i.tone, values: i.values, evidence: i.evidence, action: i.action }));
}

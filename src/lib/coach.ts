import type { Equipment, Exercise, Program, ProgramDay, Workout, WorkoutSet } from "@/db";
import { findWorkoutProgramDay } from "./startWorkout";
import { substitutes } from "./substitutes";
import { weekdayOf, type ScheduledSession } from "./schedule";

/**
 * The assistant's proposals to adapt one's programs to the sessions actually
 * done. Each rule is plain and says what it saw (the evidence); each proposal
 * is a precise change the athlete applies or ignores, never applied on its
 * own. Applied, it goes through the program's history (it can be undone).
 *
 *  - skipped: an exercise left out in at least 2 of the day's last 3
 *    sessions: replaced by one of the same muscles the athlete can do (their
 *    equipment or the body alone, nothing to avoid for an injury), or
 *    removed when there is none;
 *  - progress: every planned set done at the top of the rep range in the
 *    day's last 3 sessions: one set more (up to 5);
 *  - shortened: fewer than 70 % of the day's sets done in each of its last 3
 *    sessions: one set fewer on each exercise (not under 2);
 *  - missedDay: a weekday of a program missed at least twice in 4 weeks:
 *    moved to another of the athlete's training days, free that week.
 * Pure.
 */

export type CoachChange =
  | { type: "replace"; programId: number; day: number; from: string; to: string }
  | { type: "remove"; programId: number; day: number; exercise: string }
  | { type: "addSet"; programId: number; day: number; exercise: string }
  | { type: "trimDay"; programId: number; day: number }
  | { type: "moveWeekday"; programId: number; from: number; to: number };

export interface CoachProposal {
  /** Stable while the data behind it is the same: an ignored proposal stays ignored until something new is done. */
  id: string;
  kind: "skipped" | "progress" | "shortened" | "missedDay";
  program: string;
  day?: string;
  exercise?: string;
  /** What the rule saw, for the explanation. */
  evidence: { key: string; values: Record<string, string | number> }[];
  change: CoachChange;
}

/** Sessions of a program day looked at. */
const LAST = 3;
const MAX_SETS = 5;
const MIN_SETS = 2;

type W = Pick<Workout, "id" | "date" | "title" | "programId" | "programDayIndex" | "plannedDay" | "cancelledAt">;
type S = Pick<WorkoutSet, "workoutId" | "exerciseId" | "reps" | "completed" | "isWarmup">;
type E = Pick<Exercise, "id" | "name" | "uuid" | "muscleGroup" | "equipment">;

const repRange = (reps: string): [number, number] | null => {
  const m = reps.match(/^(\d+)(?:\s*-\s*(\d+))?$/);
  return m ? [Number(m[1]), Number(m[2] ?? m[1])] : null;
};

export function coachProposals(input: {
  today: string;
  programs: Program[];
  workouts: W[];
  sets: S[];
  exercises: E[];
  owned?: Equipment[];
  /** True for an exercise to avoid with the athlete's injuries. */
  avoid?: (name: string) => boolean;
  /** The planning's sessions of the last four weeks (with the missed ones). */
  schedule?: Pick<ScheduledSession, "date" | "status" | "program">[];
  trainingDays?: number[];
}): CoachProposal[] {
  const out: CoachProposal[] = [];
  const work = input.sets.filter((s) => s.completed && !s.isWarmup);
  const idOf = (name: string, uuid?: string) => input.exercises.find((e) => (uuid && e.uuid === uuid) || e.name.toLowerCase() === name.toLowerCase());

  for (const program of input.programs) {
    const programId = program.id;
    if (!programId) continue;
    (program.structure ?? []).forEach((day: ProgramDay, index) => {
      if (day.cardio || !day.exercises.length) return;
      // The day's last sessions with something done, newest first.
      const sessions = input.workouts
        .filter((w) => !w.cancelledAt && w.date <= input.today && w.id !== undefined && findWorkoutProgramDay([program], w)?.index === index)
        .filter((w) => work.some((s) => s.workoutId === w.id))
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, LAST);
      if (sessions.length < LAST) return;
      const signature = sessions.map((w) => w.id).join(".");
      // An exercise counts under every entry of its name: the library's and one's own copies.
      const idsOf = (name: string) => new Set(input.exercises.filter((e) => e.name.toLowerCase() === name.toLowerCase()).map((e) => e.id));
      const doneOf = (w: W, ids: Set<number | undefined>) => work.filter((s) => s.workoutId === w.id && ids.has(s.exerciseId));
      const dayNames = day.exercises.map((e) => e.exerciseName);
      let skippedHere = false;

      for (const pe of day.exercises) {
        const ex = idOf(pe.exerciseName, pe.exerciseUuid);
        const ids = idsOf(pe.exerciseName);
        if (ex?.id !== undefined) ids.add(ex.id);
        const per = sessions.map((w) => doneOf(w, ids));
        const skipped = per.filter((done) => done.length === 0).length;
        if (skipped >= 2) {
          skippedHere = true;
          // A stand-in the athlete can do: their own equipment or the body alone (any, when the equipment is not known).
          const owned = input.owned ?? [];
          const doable = (e: E) => !owned.length || !e.equipment || e.equipment === "bodyweight" || owned.includes(e.equipment);
          const candidate = ex
            ? substitutes(ex, input.exercises.filter((e) => !dayNames.includes(e.name) && doable(e)), owned).find((e) => !input.avoid?.(e.name))
            : undefined;
          out.push({
            id: `skipped:${program.id}:${index}:${pe.exerciseName}:${signature}`,
            kind: "skipped",
            program: program.name,
            day: day.name,
            exercise: pe.exerciseName,
            evidence: [{ key: "skipped", values: { count: skipped, of: LAST } }],
            change: candidate
              ? { type: "replace", programId, day: index, from: pe.exerciseName, to: candidate.name }
              : { type: "remove", programId, day: index, exercise: pe.exerciseName },
          });
          continue;
        }
        const range = repRange(pe.targetReps);
        const top = range?.[1];
        if (top && pe.targetSets < MAX_SETS && per.every((done) => done.length >= pe.targetSets && done.every((s) => (s.reps ?? 0) >= top))) {
          out.push({
            id: `progress:${program.id}:${index}:${pe.exerciseName}:${signature}`,
            kind: "progress",
            program: program.name,
            day: day.name,
            exercise: pe.exerciseName,
            evidence: [{ key: "progress", values: { sets: pe.targetSets, reps: top, count: LAST } }],
            change: { type: "addSet", programId, day: index, exercise: pe.exerciseName },
          });
        }
      }

      // Cut short every time, though no single exercise stands out as skipped.
      const planned = day.exercises.reduce((sum, e) => sum + e.targetSets, 0);
      const shares = sessions.map((w) => work.filter((s) => s.workoutId === w.id).length / Math.max(1, planned));
      if (!skippedHere && planned > 0 && shares.every((x) => x < 0.7) && day.exercises.some((e) => e.targetSets > MIN_SETS)) {
        out.push({
          id: `shortened:${program.id}:${index}:${signature}`,
          kind: "shortened",
          program: program.name,
          day: day.name,
          evidence: [{ key: "shortened", values: { percent: Math.round((shares.reduce((a, b) => a + b, 0) / shares.length) * 100), count: LAST } }],
          change: { type: "trimDay", programId, day: index },
        });
      }
    });

    // A weekday of the planning missed again and again.
    const own = (program.weekdays ?? []).filter((d) => d >= 1 && d <= 7);
    if (own.length && input.schedule) {
      const missed = new Map<number, string[]>();
      for (const s of input.schedule) {
        if (s.status !== "missed" || s.program.id !== program.id) continue;
        const d = weekdayOf(s.date);
        missed.set(d, [...(missed.get(d) ?? []), s.date]);
      }
      for (const [weekday, dates] of missed) {
        if (dates.length < 2 || !own.includes(weekday)) continue;
        // Another of the athlete's training days, not already the program's, else any free day.
        const free = [...(input.trainingDays ?? []), 1, 2, 3, 4, 5, 6, 7].find((d) => !own.includes(d) && !missed.has(d));
        if (!free) continue;
        out.push({
          id: `missedDay:${program.id}:${weekday}:${dates.sort().join(".")}`,
          kind: "missedDay",
          program: program.name,
          evidence: [{ key: "missedDay", values: { weekday, count: dates.length } }],
          change: { type: "moveWeekday", programId, from: weekday, to: free },
        });
      }
    }
  }
  return out;
}

/** What a change does to the program: the patch to save (through the program's history). */
export function applyChange(program: Pick<Program, "structure" | "weekdays">, change: CoachChange): Partial<Pick<Program, "structure" | "weekdays">> {
  const days = structuredClone(program.structure ?? []);
  const at = "day" in change ? days[change.day] : undefined;
  switch (change.type) {
    case "replace":
      if (at) at.exercises = at.exercises.map((e) => (e.exerciseName === change.from ? { ...e, exerciseName: change.to, exerciseUuid: undefined } : e));
      return { structure: days };
    case "remove":
      if (at) at.exercises = at.exercises.filter((e) => e.exerciseName !== change.exercise);
      return { structure: days };
    case "addSet":
      if (at) at.exercises = at.exercises.map((e) => (e.exerciseName === change.exercise ? { ...e, targetSets: Math.min(MAX_SETS, e.targetSets + 1) } : e));
      return { structure: days };
    case "trimDay":
      if (at) at.exercises = at.exercises.map((e) => ({ ...e, targetSets: Math.max(MIN_SETS, e.targetSets - 1) }));
      return { structure: days };
    case "moveWeekday":
      return { weekdays: [...new Set((program.weekdays ?? []).map((d) => (d === change.from ? change.to : d)))].sort() };
  }
}

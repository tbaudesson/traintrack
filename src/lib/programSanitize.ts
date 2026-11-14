import type { CardioTarget, ProgramDay, ProgramExercise, SpinBlock, SpinKind, Sport } from "@/db";

const SPORTS: Sport[] = ["run", "swim", "bike", "row", "vaulting", "other"];
const SPIN_KINDS: SpinKind[] = ["warmup", "seated", "fast", "climb", "standing", "sprint", "recovery", "cooldown"];

const text = (v: unknown, max: number): string | undefined => (typeof v === "string" && v.trim() ? v.slice(0, max) : undefined);
const num = (v: unknown, min: number, max: number): number | undefined =>
  typeof v === "number" && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : undefined;
const int = (v: unknown, min: number, max: number) => {
  const n = num(v, min, max);
  return n === undefined ? undefined : Math.round(n);
};
const list = (v: unknown, max: number): unknown[] => (Array.isArray(v) ? v.slice(0, max) : []);

function exercise(v: unknown): ProgramExercise | null {
  if (!v || typeof v !== "object") return null;
  const e = v as Record<string, unknown>;
  const exerciseName = text(e.exerciseName, 80);
  if (!exerciseName) return null;
  const percents = list(e.percents, 20).map((p) => num(p, 30, 110)).filter((p): p is number => p !== undefined);
  return {
    exerciseName,
    targetSets: int(e.targetSets, 1, 20) ?? 3,
    targetReps: text(e.targetReps, 20) ?? "8-12",
    ...(int(e.restSec, 0, 900) !== undefined ? { restSec: int(e.restSec, 0, 900) } : {}),
    ...(e.supersetWithNext === true ? { supersetWithNext: true } : {}),
    ...(percents.length ? { percents } : {}),
  };
}

function block(v: unknown): SpinBlock | null {
  if (!v || typeof v !== "object") return null;
  const b = v as Record<string, unknown>;
  const kind = SPIN_KINDS.find((k) => k === b.kind);
  const sec = int(b.sec, 5, 3600);
  const rpm = Array.isArray(b.rpm) ? b.rpm.map((r) => int(r, 20, 200)) : [];
  if (!kind || sec === undefined || rpm.length !== 2 || rpm.some((r) => r === undefined)) return null;
  return { kind, sec, rpm: [rpm[0]!, rpm[1]!], resistance: int(b.resistance, 1, 10) ?? 3 };
}

function cardio(v: unknown): CardioTarget | undefined {
  if (!v || typeof v !== "object") return undefined;
  const c = v as Record<string, unknown>;
  const sport = SPORTS.find((s) => s === c.sport);
  if (!sport) return undefined;
  const steps = list(c.steps, 12).map((s) => text(s, 300)).filter((s): s is string => !!s);
  const blocks = list(c.blocks, 120).map(block).filter((b): b is SpinBlock => !!b);
  return {
    sport,
    ...(num(c.distanceKm, 0, 500) !== undefined ? { distanceKm: num(c.distanceKm, 0, 500) } : {}),
    ...(int(c.durationMin, 1, 600) !== undefined ? { durationMin: int(c.durationMin, 1, 600) } : {}),
    ...(text(c.intensity, 40) ? { intensity: text(c.intensity, 40) } : {}),
    ...(text(c.notes, 600) ? { notes: text(c.notes, 600) } : {}),
    ...(text(c.purpose, 300) ? { purpose: text(c.purpose, 300) } : {}),
    ...(steps.length ? { steps } : {}),
    ...(blocks.length ? { blocks } : {}),
  };
}

/**
 * A program structure rebuilt from data one does not control — a program
 * shared by someone else: only the known fields, of the right types, within
 * sane limits. A day with nothing usable in it is dropped.
 */
export function sanitizeStructure(v: unknown): ProgramDay[] {
  return list(v, 200).flatMap((raw, i) => {
    if (!raw || typeof raw !== "object") return [];
    const d = raw as Record<string, unknown>;
    const exercises = list(d.exercises, 30).map(exercise).filter((e): e is ProgramExercise => !!e);
    const target = cardio(d.cardio);
    if (!exercises.length && !target) return [];
    const week = int(d.week, 1, 104);
    return [{ name: text(d.name, 80) ?? `${i + 1}`, exercises, ...(week !== undefined ? { week } : {}), ...(target ? { cardio: target } : {}) }];
  });
}

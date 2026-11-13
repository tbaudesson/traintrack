import type { Program, Sport, Workout } from "@/db";
import type { ProgramGoal } from "./programTemplates";
import { findWorkoutProgramDay } from "./startWorkout";

export interface ProgramKind {
  kind: ProgramGoal;
  /** For an endurance program: its main sport. */
  sport?: Sport;
}

/** The order of the kinds on the home screen. */
export const KIND_ORDER: ProgramGoal[] = ["endurance", "strength", "hypertrophy", "fat_loss", "general"];

/**
 * What a program is for: the goal of the ready-made program it was added
 * from (same name), or else endurance when it has cardio days, strength
 * otherwise. Endurance takes its most frequent sport.
 */
export function programKind(program: Pick<Program, "name" | "structure">, catalogue: { name: string; goal: ProgramGoal }[]): ProgramKind {
  const days = program.structure ?? [];
  const sports = days.map((d) => d.cardio?.sport).filter((s): s is Sport => !!s);
  const sport = sports.length
    ? [...new Set(sports)].sort((a, b) => sports.filter((s) => s === b).length - sports.filter((s) => s === a).length)[0]
    : undefined;
  const template = catalogue.find((t) => t.name === program.name);
  if (template) return { kind: template.goal, sport: template.goal === "endurance" ? sport : undefined };
  return sport ? { kind: "endurance", sport } : { kind: "strength" };
}

export interface ProgramProgress {
  /** Sessions of the program logged so far. */
  sessions: number;
  /** For a plan with an end (made of weeks): share of its sessions done, 0–1. */
  share: number | null;
}

/** How far along a program is: a share for a plan made of weeks, a count of sessions otherwise. */
export function programProgress(
  program: Program,
  workouts: Pick<Workout, "title" | "programId" | "programDayIndex">[]
): ProgramProgress {
  const days = program.structure ?? [];
  const linked = workouts.map((w) => findWorkoutProgramDay([program], w)?.index).filter((i): i is number => i !== undefined);
  const plan = days.length > 0 && days.some((d) => d.week !== undefined);
  return {
    sessions: linked.length,
    share: plan ? new Set(linked).size / days.length : null,
  };
}

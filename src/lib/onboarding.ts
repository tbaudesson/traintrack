import type { Equipment, FitnessLevel, TrainingGoal } from "@/db";
import { rankTemplates, type ProgramGoal, type ProgramTemplate } from "./programTemplates";
import { programCategory } from "./programCategories";
import type { FavoriteSport } from "./appTheme";

/** The goal a sport usually comes with, chosen for the athlete who can change it. */
export const GOAL_OF_SPORT: Record<FavoriteSport, TrainingGoal> = {
  bodybuilding: "hypertrophy",
  strength: "strength",
  fitness: "fat_loss",
  callisthenics: "general_fitness",
  running: "endurance",
  swimming: "endurance",
  cycling: "endurance",
  vaulting: "general_fitness",
};

/** The program goal a training goal leads to. */
export const programGoalOf = (goal: TrainingGoal): ProgramGoal => (goal === "general_fitness" ? "general" : goal);

const GYM: Equipment[] = ["barbell", "machine", "cable"];

/**
 * Three ready-made programs to suggest at sign-up: those of the athlete's
 * sport first, then the closest to the goal and level, and only programs for
 * home when the athlete has no gym equipment.
 */
export function recommendPrograms(
  input: { goal: TrainingGoal; level: FitnessLevel; equipment: Equipment[]; sport?: FavoriteSport | null },
  catalogue: ProgramTemplate[]
): ProgramTemplate[] {
  const atHome = input.equipment.length > 0 && !input.equipment.some((e) => GYM.includes(e));
  const ranked = rankTemplates({ goal: programGoalOf(input.goal), level: input.level }, catalogue);
  const fitting = atHome ? ranked.filter((t) => t.homeFriendly || t.goal === "endurance") : ranked;
  const pool = fitting.length >= 3 ? fitting : ranked;
  // The programs of one's sport first, the athlete's level first among them.
  if (input.sport) {
    const ofSport = catalogue
      .filter((t) => programCategory(t) === input.sport)
      .sort((a, b) => Number(b.level === input.level) - Number(a.level === input.level));
    if (ofSport.length) return [...ofSport, ...pool.filter((t) => !ofSport.includes(t))].slice(0, 3);
  }
  return pool.slice(0, 3);
}

/** Training days spread over the week for a number of sessions (1 = Monday … 7 = Sunday). */
export function defaultTrainingDays(perWeek: number): number[] {
  const spreads: Record<number, number[]> = {
    1: [3],
    2: [2, 5],
    3: [1, 3, 5],
    4: [1, 2, 4, 5],
    5: [1, 2, 3, 5, 6],
    6: [1, 2, 3, 4, 5, 6],
    7: [1, 2, 3, 4, 5, 6, 7],
  };
  return spreads[Math.min(7, Math.max(1, Math.round(perWeek)))];
}

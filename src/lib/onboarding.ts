import type { Equipment, FitnessLevel, TrainingGoal } from "@/db";
import { rankTemplates, type ProgramGoal, type ProgramTemplate } from "./programTemplates";

/** The program goal a training goal leads to. */
export const programGoalOf = (goal: TrainingGoal): ProgramGoal => (goal === "general_fitness" ? "general" : goal);

const GYM: Equipment[] = ["barbell", "machine", "cable"];

/**
 * Three ready-made programs to suggest at sign-up: closest to the goal and
 * level, and only programs for home when the athlete has no gym equipment.
 */
export function recommendPrograms(
  input: { goal: TrainingGoal; level: FitnessLevel; equipment: Equipment[] },
  catalogue: ProgramTemplate[]
): ProgramTemplate[] {
  const atHome = input.equipment.length > 0 && !input.equipment.some((e) => GYM.includes(e));
  const ranked = rankTemplates({ goal: programGoalOf(input.goal), level: input.level }, catalogue);
  const fitting = atHome ? ranked.filter((t) => t.homeFriendly || t.goal === "endurance") : ranked;
  return (fitting.length >= 3 ? fitting : ranked).slice(0, 3);
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

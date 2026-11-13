import type { Equipment } from "@/db";

export interface WarmupStep {
  weightKg: number;
  reps: number;
}

const BAR_KG = 20;

/** Ramp-up percentages of the working weight, with the reps for each. */
const BARBELL: [number, number][] = [[0.5, 8], [0.7, 5], [0.85, 3]];
const OTHER: [number, number][] = [[0.5, 10], [0.75, 5]];

/**
 * The warm-up sets before a working weight: the empty bar first on a barbell,
 * then lighter steps that leave the legs and arms fresh. Nothing for
 * bodyweight work, which warms up on its own.
 */
export function warmupSets(workKg: number | undefined, equipment: Equipment | undefined): WarmupStep[] {
  if (!workKg || workKg <= 0 || equipment === "bodyweight" || equipment === "bands") return [];
  const barbell = equipment === "barbell";
  const step = equipment === "dumbbell" || equipment === "kettlebell" ? 2 : 2.5;
  const round = (kg: number) => Math.floor(kg / step) * step;

  const steps: WarmupStep[] = barbell && workKg > BAR_KG ? [{ weightKg: BAR_KG, reps: 10 }] : [];
  for (const [share, reps] of barbell ? BARBELL : OTHER) {
    const weightKg = round(workKg * share);
    const floor = barbell ? BAR_KG : 0;
    const previous = steps.at(-1)?.weightKg ?? 0;
    if (weightKg > floor && weightKg > previous && weightKg < workKg) steps.push({ weightKg, reps });
  }
  return steps;
}

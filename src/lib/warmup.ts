import type { Equipment } from "@/db";
import { barOf, loadStep, skipsWarmup } from "@/lib/references";

export interface WarmupStep {
  weightKg: number;
  reps: number;
}

/** Ramp-up percentages of the working weight, with the reps for each. */
const BARBELL: [number, number][] = [[0.5, 8], [0.7, 5], [0.85, 3]];
const OTHER: [number, number][] = [[0.5, 10], [0.75, 5]];

/**
 * The warm-up sets before a working weight: the empty bar first on a barbell,
 * then lighter steps that leave the legs and arms fresh. Nothing for
 * bodyweight work, which warms up on its own.
 */
export function warmupSets(workKg: number | undefined, equipment: Equipment | undefined): WarmupStep[] {
  // As the admin's list of equipment says: none before bodyweight or bands, the empty bar first on a barbell.
  if (!workKg || workKg <= 0 || skipsWarmup(equipment)) return [];
  const BAR_KG = barOf(equipment);
  const barbell = BAR_KG > 0;
  const step = loadStep(equipment);
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

import type { Adherence } from "./adherence";

export type NudgeKind = "never" | "idle" | "lowRate" | "hard";

export interface Nudge {
  kind: NudgeKind;
  days?: number;
  percent?: number;
  rpe?: number;
}

/**
 * Why a coach might check in with an athlete, most pressing first: never
 * trained, four days or more without training, under 60 % of the plan, or a
 * last week that felt very hard. Null when all is well.
 */
export function nudgeFor(a: Adherence | undefined): Nudge | null {
  if (!a) return null;
  if (a.daysSinceLast === null) return { kind: "never" };
  if (a.daysSinceLast >= 4) return { kind: "idle", days: a.daysSinceLast };
  if (a.rate !== null && a.rate < 0.6) return { kind: "lowRate", percent: Math.round(a.rate * 100) };
  if (a.recentRpe !== null && a.recentRpe >= 9) return { kind: "hard", rpe: a.recentRpe };
  return null;
}

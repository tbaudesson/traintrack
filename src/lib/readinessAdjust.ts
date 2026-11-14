/** Below this readiness score (out of 100), today's session is lightened. */
export const LOW_READINESS = 50;

export type LighterReason = "deload" | "readiness" | null;

/**
 * Why today's session should be lighter, if it should: a deload week first,
 * else a low readiness check-in — unless the athlete chose to keep it normal
 * today. A lighter session has fewer sets and loads a tenth lighter.
 */
export function lighterReason(input: { deloadWeek: boolean; readiness: number | null; keptNormal: boolean }): LighterReason {
  if (input.deloadWeek) return "deload";
  if (input.readiness !== null && input.readiness < LOW_READINESS && !input.keptNormal) return "readiness";
  return null;
}

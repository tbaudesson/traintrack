import type { Sport } from "@/db";
import { PLAN_FOCUSES, type PlanFocus } from "./intervals";
import { MOBILITY_MODES, type MobilityMode } from "./mobility";
import { SPORT_DEFS } from "./disciplines";

/**
 * One's "plan B": what to do on a day without time for the planned session,
 * chosen once in Settings and offered from the session card. A timed (HIIT)
 * session, a mobility routine, an endurance outing of a given length, or a
 * day of one of one's programs. Kept on this device.
 */
export type PlanB =
  | { kind: "timed"; focus: PlanFocus; minutes: number }
  | { kind: "mobility"; mode: MobilityMode; minutes: number }
  | { kind: "cardio"; sport: Sport; minutes: number }
  | { kind: "program"; programUuid: string; dayIndex: number };

export const PLAN_B_KINDS: PlanB["kind"][] = ["timed", "mobility", "cardio", "program"];
/** The lengths offered for an outing. */
export const CARDIO_MINUTES = [15, 20, 30, 45];

const whole = (n: unknown, min: number, max: number) => typeof n === "number" && Number.isInteger(n) && n >= min && n <= max;

/** A plan B read from storage, or null when it is not one the app knows. */
export function readPlanB(raw: unknown): PlanB | null {
  if (!raw || typeof raw !== "object") return null;
  const p = raw as Record<string, unknown>;
  switch (p.kind) {
    case "timed":
      return PLAN_FOCUSES.includes(p.focus as PlanFocus) && whole(p.minutes, 1, 120) ? { kind: "timed", focus: p.focus as PlanFocus, minutes: p.minutes as number } : null;
    case "mobility":
      return MOBILITY_MODES.includes(p.mode as MobilityMode) && whole(p.minutes, 1, 120) ? { kind: "mobility", mode: p.mode as MobilityMode, minutes: p.minutes as number } : null;
    case "cardio":
      return typeof p.sport === "string" && p.sport in SPORT_DEFS && whole(p.minutes, 5, 300) ? { kind: "cardio", sport: p.sport as Sport, minutes: p.minutes as number } : null;
    case "program":
      return typeof p.programUuid === "string" && p.programUuid && whole(p.dayIndex, 0, 100) ? { kind: "program", programUuid: p.programUuid, dayIndex: p.dayIndex as number } : null;
    default:
      return null;
  }
}

/** Where a timed or mobility plan B opens, ready to start. */
export function planBHref(p: PlanB): string | null {
  if (p.kind === "timed") return `/intervals?focus=${p.focus}&minutes=${p.minutes}`;
  if (p.kind === "mobility") return `/mobility?mode=${p.mode}&minutes=${p.minutes}`;
  return null;
}

/** The plan B as the profile keeps it: the plan, or {"kind": "none"} when chosen to have none. */
export type StoredPlanB = PlanB | { kind: "none" };

export const storePlanB = (p: PlanB | null): StoredPlanB => p ?? { kind: "none" };

const samePlanB = (a: PlanB | null, b: PlanB | null) => JSON.stringify(a) === JSON.stringify(b);

/**
 * The profile and this device disagree: the profile wins once it holds a
 * choice (made on any device, "none" included); a device with a plan B and a
 * profile without any choice hands it over. Nothing to do otherwise.
 */
export function reconcilePlanB(local: PlanB | null, stored: unknown): { kind: "useProfile"; planB: PlanB | null } | { kind: "saveToProfile"; stored: StoredPlanB } | null {
  if (stored && typeof stored === "object" && (stored as { kind?: unknown }).kind === "none") {
    return local ? { kind: "useProfile", planB: null } : null;
  }
  const fromProfile = readPlanB(stored);
  if (fromProfile) return samePlanB(fromProfile, local) ? null : { kind: "useProfile", planB: fromProfile };
  if (stored == null && local) return { kind: "saveToProfile", stored: storePlanB(local) };
  return null;
}

import type { Sport } from "@/db";
import type { IntervalFocus } from "./intervals";
import { INTERVAL_FOCUSES } from "./intervals";
import type { MobilityMode } from "./mobility";
import { SPORT_DEFS } from "./disciplines";

/**
 * One's "plan B": what to do on a day without time for the planned session,
 * chosen once in Settings and offered from the session card. A timed (HIIT)
 * session, a mobility routine, an endurance outing of a given length, or a
 * day of one of one's programs. Kept on this device.
 */
export type PlanB =
  | { kind: "timed"; focus: IntervalFocus; minutes: number }
  | { kind: "mobility"; mode: MobilityMode; minutes: number }
  | { kind: "cardio"; sport: Sport; minutes: number }
  | { kind: "program"; programUuid: string; dayIndex: number };

export const PLAN_B_KINDS: PlanB["kind"][] = ["timed", "mobility", "cardio", "program"];
/** The lengths offered for an outing. */
export const CARDIO_MINUTES = [15, 20, 30, 45];
const MODES: MobilityMode[] = ["warmup", "stretch", "yoga"];

const whole = (n: unknown, min: number, max: number) => typeof n === "number" && Number.isInteger(n) && n >= min && n <= max;

/** A plan B read from storage, or null when it is not one the app knows. */
export function readPlanB(raw: unknown): PlanB | null {
  if (!raw || typeof raw !== "object") return null;
  const p = raw as Record<string, unknown>;
  switch (p.kind) {
    case "timed":
      return INTERVAL_FOCUSES.includes(p.focus as IntervalFocus) && whole(p.minutes, 1, 120) ? { kind: "timed", focus: p.focus as IntervalFocus, minutes: p.minutes as number } : null;
    case "mobility":
      return MODES.includes(p.mode as MobilityMode) && whole(p.minutes, 1, 120) ? { kind: "mobility", mode: p.mode as MobilityMode, minutes: p.minutes as number } : null;
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

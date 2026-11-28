import type { PainArea, PainReport } from "./pain";
import { returnHeld, type InjuryGuidance } from "./injuryGuidance";

/** An injury the athlete declared: where, and since when (YYYY-MM-DD). */
export interface Injury {
  area: PainArea;
  since: string;
  /** The day it was declared healed: a progressive return starts then. */
  healedOn?: string | null;
}

/** The injuries still in progress: healed ones no longer forbid anything. */
export const activeInjuries = <I extends Pick<Injury, "area" | "healedOn">>(injuries: I[]): I[] => injuries.filter((i) => !i.healedOn);

const daysBetween = (from: string, to: string) => Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000);

export interface ReturnPhase {
  area: PainArea;
  /** 1 to the number of return weeks in the references. */
  week: number;
  /** Share of the usual load, from the references (the last week is full). */
  load: number;
  /** Last day of the return. */
  until: string;
  /** A recent pain on the area keeps the load of the week before. */
  held?: boolean;
}

/**
 * The injuries in their return weeks, today: one load a week from the
 * references. A pain reported on the area lately holds the load back a week.
 */
export function returnPhases(g: InjuryGuidance | null, injuries: Pick<Injury, "area" | "healedOn">[], today: string, pains: PainReport[] = []): ReturnPhase[] {
  if (!g) return [];
  const weeks = g.return.loads.length;
  return injuries.flatMap((i) => {
    if (!i.healedOn) return [];
    const days = daysBetween(i.healedOn, today);
    if (days < 0 || days >= weeks * 7) return [];
    const week = Math.floor(days / 7) + 1;
    const until = new Date(Date.parse(i.healedOn) + (weeks * 7 - 1) * 86_400_000).toISOString().slice(0, 10);
    const held = week > 1 && returnHeld(g, pains, i.area, today);
    return [{ area: i.area, week, load: g.return.loads[held ? week - 2 : week - 1], until, ...(held ? { held } : {}) }];
  });
}

/**
 * How an exercise comes back after an injury: if it loads an area in its
 * return weeks, the lightest load of those areas and the week it is in.
 */
export function returnAdjust(
  g: InjuryGuidance | null,
  allRules: InjuryRules,
  exerciseName: string | undefined,
  injuries: Pick<Injury, "area" | "healedOn">[],
  today: string,
  pains: PainReport[] = []
): ReturnPhase | null {
  const rules = exerciseName ? allRules[exerciseName] : undefined;
  if (!rules) return null;
  const phases = returnPhases(g, injuries, today, pains).filter((p) => rules[p.area]);
  return phases.sort((a, b) => a.load - b.load)[0] ?? null;
}


/** "avoid": better left out while injured. "caution": possible, lighter and without pain. */
export type InjuryLevel = "avoid" | "caution";

/** What one exercise loads, by area. */
export type ExerciseRules = Partial<Record<PainArea, InjuryLevel>>;

/**
 * What each exercise loads, by its English name: "avoid" where it loads the
 * injured area heavily or in its riskiest position, "caution" where it loads
 * it less. Data, not code: each exercise carries its own (exercises.injury_rules,
 * edited by an admin, migration 059), gathered by useInjuryRules(). An exercise
 * without rules loads nothing worth a warning.
 */
export type InjuryRules = Record<string, ExerciseRules | null | undefined>;

/**
 * What a program asks of an injured area: "avoid" if one of its exercises is
 * to be avoided there, "caution" if one loads it less, null if none does.
 */
export function programLoad(rules: InjuryRules, structure: { exercises?: { exerciseName: string }[] }[], area: PainArea): InjuryLevel | null {
  const levels = structure.flatMap((d) => (d.exercises ?? []).map((e) => rules[e.exerciseName]?.[area]));
  return levels.includes("avoid") ? "avoid" : levels.includes("caution") ? "caution" : null;
}

export interface InjuryWarning {
  level: InjuryLevel;
  /** The injured areas the exercise loads at that level. */
  areas: PainArea[];
}

/**
 * The warning for an exercise, given the athlete's injuries: "avoid" if it is
 * to be avoided for any of them, else "caution", else none. Custom exercises
 * have no rules, so no warning: the athlete knows what they made.
 */
export function injuryWarning(allRules: InjuryRules, exerciseName: string | undefined, all: Pick<Injury, "area" | "healedOn">[]): InjuryWarning | null {
  const injuries = activeInjuries(all);
  if (!exerciseName || !injuries.length) return null;
  const rules = allRules[exerciseName];
  if (!rules) return null;
  const hit = (level: InjuryLevel) => injuries.map((i) => i.area).filter((a) => rules[a] === level);
  const avoid = hit("avoid");
  if (avoid.length) return { level: "avoid", areas: avoid };
  const caution = hit("caution");
  return caution.length ? { level: "caution", areas: caution } : null;
}

/** Whether an exercise is fine to propose, in a generator or as a replacement. */
export const isAvoided = (rules: InjuryRules, exerciseName: string | undefined, injuries: Pick<Injury, "area" | "healedOn">[]) =>
  injuryWarning(rules, exerciseName, injuries)?.level === "avoid";

/** Rank exercises for a replacement: safe first, then "caution", then "avoid". */
export function bySafety<E extends { name: string }>(rules: InjuryRules, list: E[], injuries: Pick<Injury, "area" | "healedOn">[]): E[] {
  const rank = (e: E) => ({ none: 0, caution: 1, avoid: 2 })[injuryWarning(rules, e.name, injuries)?.level ?? "none"];
  return [...list].sort((a, b) => rank(a) - rank(b));
}

/**
 * One tap on an area moves it on: not injured → injured; injured → healed,
 * which starts the return weeks; in its return → done (removed). An area
 * healed long ago counts as not injured.
 */
export function toggleInjury(g: InjuryGuidance | null, injuries: Injury[], area: PainArea, today: string): Injury[] {
  const current = injuries.find((i) => i.area === area);
  const others = injuries.filter((i) => i.area !== area);
  if (!current) return [...others, { area, since: today }];
  if (!current.healedOn) return [...others, { ...current, healedOn: today }];
  const returning = returnPhases(g, [current], today).length > 0;
  return returning ? others : [...others, { area, since: today }];
}

/** Declare an area injured again, from a strong pain: whatever it was, injured from today. */
export function declareInjury(injuries: Injury[], area: PainArea, today: string): Injury[] {
  return [...injuries.filter((i) => i.area !== area), { area, since: today }];
}

/** What an area is for the athlete today. */
export function injuryState(g: InjuryGuidance | null, injuries: Injury[], area: PainArea, today: string): "injured" | "returning" | "none" {
  const current = injuries.find((i) => i.area === area);
  if (!current) return "none";
  if (!current.healedOn) return "injured";
  return returnPhases(g, [current], today).length ? "returning" : "none";
}

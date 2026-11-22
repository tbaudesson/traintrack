import type { Exercise, Restriction } from "@/db";
import type { Injury, InjuryLevel, InjuryRules } from "./injuries";
import type { PainArea } from "./pain";

/**
 * The athlete's own restrictions (a muscle group, a movement, an exercise)
 * reach the exercises through the same warnings as an injured joint: each
 * restriction stands as an "area" of its own ("x:movement:overhead"), the
 * exercises it concerns carry it in their rules, and the athlete has it among
 * their injuries. The badges, the replacements, the generators and the
 * assistant then treat both alike, and say which restriction it is.
 */

const PREFIX = "x:";

export const restrictionKey = (r: Pick<Restriction, "kind" | "value">) => `${PREFIX}${r.kind}:${r.value}`;
export const isRestrictionKey = (area: string) => area.startsWith(PREFIX);

/** "x:movement:overhead" back to its kind and value. */
export function parseRestrictionKey(area: string): Pick<Restriction, "kind" | "value"> | null {
  if (!isRestrictionKey(area)) return null;
  const [kind, ...rest] = area.slice(PREFIX.length).split(":");
  return kind === "muscle" || kind === "movement" || kind === "exercise" ? { kind, value: rest.join(":") } : null;
}

/** Those still in force: no end date, or not passed. */
export const activeRestrictions = (all: Restriction[] | null | undefined, today: string) =>
  (all ?? []).filter((r) => !r.until || r.until >= today);

type Ex = Pick<Exercise, "name" | "uuid" | "muscleGroup" | "secondaryMuscles" | "movements" | "isCustom">;

/** At what level a restriction concerns an exercise: the main muscle at its level, a secondary one with caution. */
export function restrictionLevel(r: Restriction, e: Ex): InjuryLevel | null {
  switch (r.kind) {
    case "exercise":
      return e.uuid === r.value || e.name === r.value ? r.level : null;
    case "movement":
      return e.movements?.includes(r.value as never) ? r.level : null;
    case "muscle":
      if (e.muscleGroup === r.value) return r.level;
      return e.secondaryMuscles?.includes(r.value as never) ? "caution" : null;
  }
}

/** The rules each restriction adds to the exercises it concerns, by English name. */
export function restrictionRules(restrictions: Restriction[], exercises: Ex[]): InjuryRules {
  const out: InjuryRules = {};
  for (const r of restrictions) {
    const key = restrictionKey(r) as PainArea;
    for (const e of exercises) {
      const level = restrictionLevel(r, e);
      if (!level) continue;
      const rules = { ...(out[e.name] ?? {}) };
      // The stricter wins when one name gathers two rows.
      if (rules[key] !== "avoid") rules[key] = level;
      out[e.name] = rules;
    }
  }
  return out;
}

/** Library rules and restriction rules together, area by area. */
export function mergeRules(base: InjuryRules, extra: InjuryRules): InjuryRules {
  const out: InjuryRules = { ...base };
  for (const [name, rules] of Object.entries(extra)) out[name] = { ...(base[name] ?? {}), ...(rules ?? {}) };
  return out;
}

/** The restrictions as "injuries" the warnings read, beside the real ones. */
export const restrictionInjuries = (restrictions: Restriction[], today: string): Injury[] =>
  restrictions.map((r) => ({ area: restrictionKey(r) as PainArea, since: today }));

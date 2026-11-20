import type { Equipment, ProgramDay } from "@/db";
import type { InjuryRules } from "./injuries";
import type { PainArea } from "./pain";

export const EQUIPMENT: Equipment[] = ["barbell", "dumbbell", "machine", "cable", "bodyweight", "kettlebell", "bands", "pullup_bar", "suspension", "other"];

/**
 * What the ready-made programs need, as the admin keeps it (app settings
 * "program_equipment", seeded by migration 066):
 *  - needs: the equipment each exercise needs beyond the body (those hung
 *    from a bar are filed "bodyweight" in the library but need one);
 *  - alternatives: what stands in for an exercise without its equipment,
 *    best first;
 *  - standIns: equipment that does what another does (kettlebells for
 *    dumbbells);
 *  - gym: the equipment of a gym; without any, only programs for home.
 */
export interface ProgramEquipmentGuide {
  needs: Record<string, Equipment>;
  alternatives: Record<string, string[]>;
  standIns: Partial<Record<Equipment, Equipment[]>>;
  gym: Equipment[];
}

export const PROGRAM_EQUIPMENT_KEY = "program_equipment";

const isEquipment = (v: unknown): v is Equipment => EQUIPMENT.includes(v as Equipment);
const isName = (v: unknown): v is string => typeof v === "string" && v.trim().length > 0;

/** The equipment reference, checked whole; null when anything is off. */
export function parseProgramEquipment(raw: string | null | undefined): ProgramEquipmentGuide | null {
  if (!raw) return null;
  let g: ProgramEquipmentGuide;
  try {
    g = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!g || typeof g !== "object" || !g.needs || !g.alternatives || !g.standIns || !Array.isArray(g.gym)) return null;
  for (const [name, need] of Object.entries(g.needs)) if (!isName(name) || !isEquipment(need) || need === "bodyweight") return null;
  for (const [name, alts] of Object.entries(g.alternatives)) {
    if (!isName(name) || !Array.isArray(alts) || !alts.every(isName) || alts.includes(name) || new Set(alts).size !== alts.length) return null;
  }
  for (const [need, by] of Object.entries(g.standIns)) if (!isEquipment(need) || !Array.isArray(by) || !by.every(isEquipment)) return null;
  if (!g.gym.every(isEquipment)) return null;
  return g;
}

/** The equipment an exercise needs, or null for the body alone (and for exercises not known here). */
export const exerciseNeeds = (g: ProgramEquipmentGuide, name: string): Equipment | null => g.needs[name] ?? null;

/** Whether the athlete can do an exercise with what they have, stand-ins included. */
const canDo = (g: ProgramEquipmentGuide, name: string, has: Equipment[]) => {
  const need = exerciseNeeds(g, name);
  return !need || has.includes(need) || (g.standIns[need] ?? []).some((e) => has.includes(e));
};

/** The equipment a program needs and the athlete does not have. */
export function missingEquipment(g: ProgramEquipmentGuide, structure: { exercises?: { exerciseName: string }[] }[], has: Equipment[]): Equipment[] {
  const needs = structure.flatMap((d) => (d.exercises ?? []).map((e) => e.exerciseName)).filter((n) => !canDo(g, n, has));
  return [...new Set(needs.map((n) => exerciseNeeds(g, n)!))];
}

export const alternativesOf = (g: ProgramEquipmentGuide, name: string): string[] => g.alternatives[name] ?? [];

/**
 * A program made for the athlete's equipment: each exercise they cannot do
 * is replaced by the first alternative they can, not already in the day and
 * not to be avoided for their injuries. One with no alternative leaves the
 * day when the day keeps two exercises, and stays otherwise (to be swapped
 * in the session). Nothing changes when the equipment, or the reference, is not known.
 */
export function adaptToEquipment(g: ProgramEquipmentGuide | null | undefined, structure: ProgramDay[], has: Equipment[], injured: PainArea[] = [], rules: InjuryRules = {}): { structure: ProgramDay[]; swapped: number } {
  if (!g || !has.length) return { structure, swapped: 0 };
  let swapped = 0;
  const safe = (name: string) => !injured.some((a) => rules[name]?.[a] === "avoid");
  const days = structure.map((day) => {
    if (!day.exercises?.length) return day;
    const names = day.exercises.map((e) => e.exerciseName);
    const exercises = day.exercises.flatMap((e, i) => {
      if (canDo(g, e.exerciseName, has)) return [e];
      const alt = alternativesOf(g, e.exerciseName).find((a) => canDo(g, a, has) && safe(a) && !names.includes(a));
      swapped++;
      if (alt) {
        names[i] = alt;
        return [{ ...e, exerciseName: alt }];
      }
      return [null];
    });
    const kept = exercises.filter((e): e is NonNullable<typeof e> => !!e);
    if (kept.length >= 2) return { ...day, exercises: kept };
    return { ...day, exercises: exercises.map((e, i) => e ?? day.exercises[i]) };
  });
  return { structure: days, swapped };
}

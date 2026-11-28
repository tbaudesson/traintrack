import type { ProgramDay } from "@/db";
import type { PainArea } from "./pain";

/**
 * The ready-made programs: kept by an admin in program_templates (Admin >
 * Templates), read once online and kept on the device (see templateService).
 * Nothing of them lives in the code.
 */

export type PlanLocale = "fr" | "en" | "de";
export const PLAN_LOCALES: PlanLocale[] = ["fr", "en", "de"];

export type ProgramGoal = "strength" | "hypertrophy" | "fat_loss" | "general" | "endurance";
export type ProgramLevel = "beginner" | "intermediate" | "advanced";

export interface ProgramTemplate {
  id: string;
  /** Offered only to users of this language; none means everyone. */
  locale?: PlanLocale;
  name: string;
  description: string;
  goal: ProgramGoal;
  level: ProgramLevel;
  daysPerWeek: number;
  /** Mostly bodyweight/dumbbell — usable without a full gym. */
  homeFriendly?: boolean;
  /** The shelf it is filed on (see programCategories); none lets its sport and goal tell. */
  category?: string;
  /** Written for an athlete with this area injured: none of its exercises loads it. */
  forInjury?: PainArea;
  structure: ProgramDay[];
}

/** Rank templates by closeness to the user's goal / level / days-per-week. */
export function rankTemplates(pref: {
  goal?: ProgramGoal;
  level?: ProgramLevel;
  daysPerWeek?: number;
}, templates: ProgramTemplate[]): ProgramTemplate[] {
  return [...templates]
    .map((tpl) => {
      let score = 0;
      if (pref.goal && tpl.goal === pref.goal) score += 3;
      if (pref.level && tpl.level === pref.level) score += 2;
      if (pref.daysPerWeek) score -= Math.abs(tpl.daysPerWeek - pref.daysPerWeek) * 0.5;
      return { tpl, score };
    })
    .sort((a, b) => b.score - a.score)
    .map((x) => x.tpl);
}

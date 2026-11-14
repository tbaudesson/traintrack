import type { ProgramDay, Sport } from "@/db";
import { PROGRAM_TEMPLATES, type ProgramGoal, type ProgramTemplate } from "./programTemplates";

/** The shelves of the ready-made programs, as an athlete looks for them. */
export type ProgramCategory = "bodybuilding" | "strength" | "fitness" | "running" | "swimming" | "cycling" | "vaulting";

export const CATEGORY_ORDER: ProgramCategory[] = ["bodybuilding", "strength", "fitness", "running", "swimming", "cycling", "vaulting"];

const BY_SPORT: Partial<Record<Sport, ProgramCategory>> = { run: "running", swim: "swimming", bike: "cycling", vaulting: "vaulting" };

/** Strengthening plans for a sport, filed with that sport (ids of the built-in list, without the language). */
const BY_ID: Record<string, ProgramCategory> = {
  "renfo-coureur": "running",
  "renfo-trail": "running",
  "renfo-nageur": "swimming",
  "renfo-cycliste": "cycling",
  "voltige-prepa": "vaulting",
};

const BY_GOAL: Record<ProgramGoal, ProgramCategory> = {
  hypertrophy: "bodybuilding",
  strength: "strength",
  fat_loss: "fitness",
  general: "fitness",
  endurance: "running",
};

/** The sport most of a program's days are for, if any. */
function mainSport(days: ProgramDay[]): Sport | undefined {
  const sports = days.map((d) => d.cardio?.sport).filter((s): s is Sport => !!s);
  if (!sports.length) return undefined;
  const count = (s: Sport) => sports.filter((x) => x === s).length;
  return [...new Set(sports)].sort((a, b) => count(b) - count(a))[0];
}

/**
 * The shelf of a program: its sport when it has sessions of one, the sport a
 * strengthening plan is for, else its goal. A program of one's own is filed
 * by the ready-made program it was made from (same name); null when it was
 * built from scratch and has no sport.
 */
export function programCategory(
  program: { name: string; structure?: ProgramDay[]; goal?: ProgramGoal },
  builtIn: Pick<ProgramTemplate, "id" | "name" | "goal">[] = PROGRAM_TEMPLATES
): ProgramCategory | null {
  const sport = mainSport(program.structure ?? []);
  if (sport && BY_SPORT[sport]) return BY_SPORT[sport]!;
  const known = builtIn.find((t) => t.name === program.name);
  const id = known?.id.replace(/-(en|de)$/, "");
  if (id && BY_ID[id]) return BY_ID[id];
  const goal = program.goal ?? known?.goal;
  return goal ? BY_GOAL[goal] : null;
}

/** The ready-made programs on each shelf, the athlete's level first. */
export function shelves(templates: ProgramTemplate[], level?: string): Map<ProgramCategory, ProgramTemplate[]> {
  const out = new Map<ProgramCategory, ProgramTemplate[]>(CATEGORY_ORDER.map((c) => [c, []]));
  for (const t of templates) out.get(programCategory(t) ?? "fitness")!.push(t);
  const rank = (t: ProgramTemplate) => (t.level === level ? 0 : 1);
  for (const list of out.values()) list.sort((a, b) => rank(a) - rank(b));
  return out;
}

/** How many weeks a plan lasts, when its days follow each other week after week. */
export function planWeeks(days: ProgramDay[]): number | null {
  const weeks = days.map((d) => d.week).filter((w): w is number => w !== undefined);
  return weeks.length ? Math.max(...weeks) : null;
}

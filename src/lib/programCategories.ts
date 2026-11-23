import type { ProgramDay, Sport } from "@/db";
import { PROGRAM_TEMPLATES, type ProgramGoal, type ProgramTemplate } from "./programTemplates";
import type { PainArea } from "./pain";
import { SPORT_DEFS } from "./disciplines";

/** The shelves of the ready-made programs, as an athlete looks for them. */
export type ProgramCategory = "bodybuilding" | "strength" | "fitness" | "callisthenics" | "running" | "hiking" | "swimming" | "cycling" | "vaulting" | "trx" | "injury";

export const CATEGORY_ORDER: ProgramCategory[] = ["bodybuilding", "strength", "fitness", "callisthenics", "running", "hiking", "swimming", "cycling", "vaulting", "trx", "injury"];

const BY_SPORT = Object.fromEntries(
  Object.entries(SPORT_DEFS).filter(([, d]) => d.category).map(([s, d]) => [s, d.category])
) as Partial<Record<Sport, ProgramCategory>>;

/** The shelves of a sport done as an outing (run, ride, swim…), not as sets in a gym. */
const OUTING_SHELVES = new Set<ProgramCategory>(Object.values(BY_SPORT));

/**
 * Whether a program belongs on a shelf. One without a known sport (built from
 * scratch) belongs on every shelf, except on an outing sport's when none of
 * its days is an outing: sets of push-ups are not a run.
 */
export function onShelf(program: { structure?: ProgramDay[] }, own: ProgramCategory | null, shelf: ProgramCategory): boolean {
  if (own) return own === shelf;
  return !OUTING_SHELVES.has(shelf) || (program.structure ?? []).some((d) => !!d.cardio);
}

/** Strengthening plans for a sport, filed with that sport (ids of the built-in list, without the language). */
const BY_ID: Record<string, ProgramCategory> = {
  "renfo-coureur": "running",
  "renfo-trail": "running",
  "renfo-nageur": "swimming",
  "renfo-cycliste": "cycling",
  "voltige-prepa": "vaulting",
  "poids-du-corps-3": "callisthenics",
  "callisthenics-debutant": "callisthenics",
  "callisthenics-intermediaire": "callisthenics",
  "callisthenics-avance": "callisthenics",
  "trx-debutant": "trx",
  "trx-intermediaire": "trx",
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
 * The injured area a program was written for: its own mark, or that of the
 * built-in program of the same name (a catalogue row read from the server has
 * no such mark).
 */
export function injuryAreaOf(program: { name: string; forInjury?: PainArea }): PainArea | null {
  return program.forInjury ?? PROGRAM_TEMPLATES.find((t) => t.name === program.name)?.forInjury ?? null;
}

/**
 * The shelf of a program: the injury shelf for one written for an injury,
 * else its sport when it has sessions of one, the sport a strengthening plan
 * is for, else its goal. A program of one's own is filed
 * by the ready-made program it was made from (same name); null when it was
 * built from scratch and has no sport.
 */
export function programCategory(
  program: { name: string; structure?: ProgramDay[]; goal?: ProgramGoal; forInjury?: PainArea },
  builtIn: Pick<ProgramTemplate, "id" | "name" | "goal">[] = PROGRAM_TEMPLATES
): ProgramCategory | null {
  if (injuryAreaOf(program)) return "injury";
  const sport = mainSport(program.structure ?? []);
  if (sport && BY_SPORT[sport]) return BY_SPORT[sport]!;
  const known = builtIn.find((t) => t.name === program.name);
  // The shelf of a built-in program, by its id: a catalogue row read from the
  // server has another id, so the built-in list of the same name is asked too.
  const id = [...builtIn, ...PROGRAM_TEMPLATES]
    .filter((t) => t.name === program.name)
    .map((t) => t.id.replace(/-(en|de)$/, ""))
    .find((i) => BY_ID[i]);
  if (id) return BY_ID[id];
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

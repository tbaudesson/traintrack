import type { MuscleGroup } from "@/db";
import { MUSCLE_GROUPS } from "@/lib/muscles";
import type { PainArea } from "./pain";
import type { InjuryLevel, InjuryRules } from "./injuries";

/**
 * Before a session (moving, to warm up), after (holding, to stretch), or a
 * session of its own: yoga, postures held with the breath, opening with its
 * first posture and closing with its last (the final relaxation); tai-chi,
 * a form followed in its order, from its opening to its closing.
 */
export type MobilityMode = "warmup" | "stretch" | "yoga" | "taichi";
export const MOBILITY_MODES: MobilityMode[] = ["warmup", "stretch", "yoga", "taichi"];
/** A form learnt and done in its order: the first movements for a short session, the whole of it for a long one; no muscles to aim at. */
export const followsForm = (mode: MobilityMode) => mode === "taichi";
/** The modes every reference has; yoga comes with migration 072, tai-chi with 084. */
const REQUIRED_MODES: MobilityMode[] = ["warmup", "stretch"];

/** The modes a reference holds, in their order: yoga only once it has its postures. */
export const modesOf = (g: Pick<MobilityGuidance, "minutes" | "moves">): MobilityMode[] =>
  MOBILITY_MODES.filter((m) => REQUIRED_MODES.includes(m) || (!!g.minutes[m]?.length && g.moves.some((x) => x.mode === m)));

/** The muscles a mobility session aims at when there is no session to read. */
export type MobilityTarget = "full" | "upper" | "lower";
export const MOBILITY_TARGETS: MobilityTarget[] = ["full", "upper", "lower"];

type Text = { en: string; fr: string; de: string };

export interface MobilityExercise {
  key: string;
  mode: MobilityMode;
  muscles: MuscleGroup[];
  /** Done on each side in turn: two steps, left then right. */
  sides?: boolean;
  name: Text;
  cue: Text;
  video?: string | null;
}

/**
 * The warm-ups and stretches: the moves in the order they are done (standing
 * first, then on the floor), how long each is held, the session lengths
 * offered and the muscles of each target. Data an admin keeps
 * (app_settings.mobility_moves, seeded by migration 065); nothing of it
 * lives here.
 */
export interface MobilityGuidance {
  minutes: Record<MobilityMode, number[]>;
  timing: Record<MobilityMode, { hold: number; sideHold: number; transition: number }>;
  targets: Record<MobilityTarget, MuscleGroup[]>;
  moves: MobilityExercise[];
}

export const MOBILITY_KEY = "mobility_moves";
const MUSCLES = MUSCLE_GROUPS;
const LANGS = ["en", "fr", "de"] as const;
const num = (v: unknown, lo: number, hi: number) => typeof v === "number" && Number.isFinite(v) && v >= lo && v <= hi;
const text = (v: unknown) => !!v && typeof v === "object" && LANGS.every((l) => typeof (v as Text)[l] === "string" && (v as Text)[l].trim().length > 0);

/** The references read from the settings, or null when missing or not holding together. */
export function parseMobility(raw: string | null | undefined): MobilityGuidance | null {
  if (!raw) return null;
  let g: MobilityGuidance;
  try {
    g = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!g?.minutes || !g.timing || !g.targets || !Array.isArray(g.moves)) return null;
  // Warm-up and stretch always; yoga and tai-chi too once any part of them is there.
  const present = MOBILITY_MODES.filter((m) => REQUIRED_MODES.includes(m) || g.minutes[m] !== undefined || g.timing[m] !== undefined || g.moves.some((x) => x?.mode === m));
  for (const mode of present) {
    const t = g.timing[mode];
    if (!Array.isArray(g.minutes[mode]) || !g.minutes[mode].length || !g.minutes[mode].every((m) => num(m, 1, 60))) return null;
    if (!t || !num(t.hold, 5, 300) || !num(t.sideHold, 5, 300) || !num(t.transition, 0, 60)) return null;
    // A warm-up starts with its first move: there must be one.
    if (!g.moves.some((m) => m.mode === mode)) return null;
  }
  for (const target of MOBILITY_TARGETS) if (!Array.isArray(g.targets[target]) || !g.targets[target].every((m) => MUSCLES.includes(m))) return null;
  const keys = new Set<string>();
  for (const m of g.moves) {
    if (!m || typeof m.key !== "string" || !/^[a-z0-9-]+$/.test(m.key) || keys.has(m.key)) return null;
    keys.add(m.key);
    if (!MOBILITY_MODES.includes(m.mode) || !Array.isArray(m.muscles) || !m.muscles.length || !m.muscles.every((x) => MUSCLES.includes(x))) return null;
    if (!text(m.name) || !text(m.cue)) return null;
    if (m.sides !== undefined && typeof m.sides !== "boolean") return null;
    if (m.video != null && (typeof m.video !== "string" || !/^https:\/\//.test(m.video))) return null;
  }
  return g;
}

/**
 * The strongest warning for a move, given the injured areas. What each move
 * loads is data: the injury references' "mobility" rules (migration 059).
 */
export function mobilityWarning(allRules: InjuryRules, key: string, all: { area: PainArea; healedOn?: string | null }[]): { level: InjuryLevel; areas: PainArea[] } | null {
  const injuries = all.filter((i) => !i.healedOn);
  const rules = allRules[key];
  if (!rules || !injuries.length) return null;
  for (const level of ["avoid", "caution"] as const) {
    const areas = injuries.map((i) => i.area).filter((a) => rules[a] === level);
    if (areas.length) return { level, areas };
  }
  return null;
}

/** A move as the timer shows it: in the app's language, one side at a time. */
export interface MobilityMove {
  key: string;
  name: string;
  cue: string;
  demo: { video: string | null; cue: string };
}

export type MobilityStep =
  | { type: "work"; exercise: MobilityMove; seconds: number; side?: "left" | "right" }
  | { type: "rest"; seconds: number };

const cost = (g: MobilityGuidance, e: MobilityExercise) => {
  const t = g.timing[e.mode];
  return e.sides ? 2 * (t.sideHold + t.transition) : t.hold + t.transition;
};

/** How much an exercise works the muscles aimed at; whole-body ones always fit a little. */
function relevance(e: MobilityExercise, muscles: MuscleGroup[]): number {
  if (!muscles.length || muscles.includes("full_body")) return e.muscles.includes("full_body") ? 2 : 1;
  const hits = e.muscles.filter((m) => muscles.includes(m)).length;
  return hits * 2 + (e.muscles.includes("full_body") ? 0.5 : 0);
}

/**
 * The moves for a mobility session: those that work the muscles aimed at
 * first, as many as fit in the minutes asked, then put back in their natural
 * order. A warm-up starts with something that raises the heart rate, the
 * first that the injuries allow.
 */
export function pickMobility(
  g: MobilityGuidance,
  mode: MobilityMode,
  minutes: number,
  muscles: MuscleGroup[],
  injuries: { area: PainArea }[] = [],
  rules: InjuryRules = {}
): MobilityExercise[] {
  // Moves that load an injured area too much are left out.
  const all = g.moves.filter((e) => e.mode === mode && mobilityWarning(rules, e.key, injuries)?.level !== "avoid");
  const budget = minutes * 60;
  const inOrder = followsForm(mode);
  const ranked = inOrder ? all : [...all].sort((a, b) => relevance(b, muscles) - relevance(a, muscles));
  const chosen = new Set<MobilityExercise>();
  let total = 0;
  // A warm-up starts with its first move; a yoga or tai-chi session opens with
  // its first posture and closes with its last.
  const fixed = mode === "warmup" ? [all[0]] : mode === "yoga" || inOrder ? [all[0], all[all.length - 1]] : [];
  for (const e of fixed) {
    if (!e || chosen.has(e)) continue;
    chosen.add(e);
    total += cost(g, e);
  }
  for (const e of ranked) {
    if (chosen.has(e)) continue;
    // A form stops where the time does: no movement skipped for a later one.
    if (total + cost(g, e) > budget) {
      if (inOrder) break;
      continue;
    }
    chosen.add(e);
    total += cost(g, e);
  }
  return all.filter((e) => chosen.has(e));
}

/** The steps the timer plays: each move or hold, a side after the other, with a pause between. */
export function buildMobilitySession(
  g: MobilityGuidance,
  mode: MobilityMode,
  minutes: number,
  muscles: MuscleGroup[],
  locale: string,
  injuries: { area: PainArea }[] = [],
  rules: InjuryRules = {}
): { exercises: MobilityExercise[]; steps: MobilityStep[]; totalSec: number } {
  const lang = (locale === "fr" || locale === "de" ? locale : "en") as keyof Text;
  const timing = g.timing[mode];
  const exercises = pickMobility(g, mode, minutes, muscles, injuries, rules);
  const steps: MobilityStep[] = [];
  for (const e of exercises) {
    const shown: MobilityMove = { key: e.key, name: e.name[lang], cue: e.cue[lang], demo: { video: e.video ?? null, cue: e.cue[lang] } };
    for (const side of e.sides ? (["left", "right"] as const) : [undefined]) {
      if (steps.length) steps.push({ type: "rest", seconds: timing.transition });
      steps.push({ type: "work", exercise: shown, seconds: e.sides ? timing.sideHold : timing.hold, side });
    }
  }
  return { exercises, steps, totalSec: steps.reduce((sum, s) => sum + s.seconds, 0) };
}

/** The muscles a past or planned session worked, read from its exercises. */
export function sessionMuscles(groups: (MuscleGroup | undefined)[]): MuscleGroup[] {
  return [...new Set(groups.filter((g): g is MuscleGroup => !!g && g !== "other"))];
}

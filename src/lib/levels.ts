import type { Equipment, Exercise, FitnessLevel, MuscleGroup } from "@/db";

/**
 * The three levels (beginner, intermediate, advanced) as an admin keeps them
 * (Admin > Levels, app settings "levels"): each one's name in the three
 * languages and what the app starts someone at that level with (the reps and
 * effort of a set nobody filled in, a VMA until they give theirs), and the
 * first loads by equipment and muscle group. The three levels themselves are
 * fixed: programs, run sessions and timed formats are written for each.
 */

export const LEVELS_KEY = "levels";
export const LEVELS: readonly FitnessLevel[] = ["beginner", "intermediate", "advanced"];

export interface LevelItem {
  id: FitnessLevel;
  fr: string;
  en: string;
  de: string;
  /** Reps of a set when the program and last time say nothing. */
  reps: number;
  /** Effort (RPE) of every set but the last, which is one notch harder. */
  rpe: number;
  /** A starting VMA (km/h), until the athlete gives theirs. */
  vma: number;
}

/** A first load for an equipment, for one muscle group or ("") for the others. */
export interface StartLoad {
  equipment: Equipment;
  muscle: MuscleGroup | "";
  kg: Record<FitnessLevel, number>;
}

export interface LevelsReference {
  levels: LevelItem[];
  startKg: StartLoad[];
}

const LABEL = (v: unknown): v is string => typeof v === "string" && !!v.trim() && v.length <= 80;
const ID = /^[a-z0-9_-]{1,30}$/;
const num = (v: unknown, min: number, max: number): v is number => typeof v === "number" && Number.isFinite(v) && v >= min && v <= max;

/** The levels as kept; null when one is missing, out of order or out of range. */
export function parseLevels(text: string | null | undefined): LevelsReference | null {
  if (!text) return null;
  try {
    const v = JSON.parse(text) as { levels?: unknown; startKg?: unknown };
    if (!Array.isArray(v.levels) || v.levels.length !== LEVELS.length || !Array.isArray(v.startKg) || v.startKg.length > 200) return null;
    const levels: LevelItem[] = [];
    for (const [i, raw] of (v.levels as Record<string, unknown>[]).entries()) {
      if (!raw || raw.id !== LEVELS[i]) return null;
      if (!LABEL(raw.fr) || !LABEL(raw.en) || !LABEL(raw.de)) return null;
      if (!num(raw.reps, 1, 100) || !Number.isInteger(raw.reps) || !num(raw.rpe, 1, 10) || !num(raw.vma, 6, 30)) return null;
      levels.push({ id: LEVELS[i], fr: raw.fr.trim(), en: raw.en.trim(), de: raw.de.trim(), reps: raw.reps, rpe: raw.rpe, vma: raw.vma });
    }
    const startKg: StartLoad[] = [];
    for (const raw of v.startKg as Record<string, unknown>[]) {
      if (!raw || typeof raw.equipment !== "string" || !ID.test(raw.equipment)) return null;
      if (typeof raw.muscle !== "string" || (raw.muscle !== "" && !ID.test(raw.muscle))) return null;
      if (startKg.some((s) => s.equipment === raw.equipment && s.muscle === raw.muscle)) return null;
      const kg = raw.kg as Record<string, unknown> | undefined;
      if (!kg || !LEVELS.every((l) => num(kg[l], 0, 500))) return null;
      startKg.push({ equipment: raw.equipment, muscle: raw.muscle, kg: Object.fromEntries(LEVELS.map((l) => [l, kg[l]])) as Record<FitnessLevel, number> });
    }
    return { levels, startKg };
  } catch {
    return null;
  }
}

/** A known level, beginner otherwise. */
export const levelOf = (level: string | null | undefined): FitnessLevel => (LEVELS as readonly string[]).includes(level ?? "") ? (level as FitnessLevel) : "beginner";

/** What the reference says of a level; null while it is not read. */
export const levelItem = (ref: LevelsReference | null | undefined, level: string | null | undefined): LevelItem | null =>
  ref?.levels.find((l) => l.id === levelOf(level)) ?? null;

/** A level's name in the app's language; its id while the reference is not read. */
export function levelName(ref: LevelsReference | null | undefined, level: string | null | undefined, locale: string): string {
  if (!level) return "";
  const it = ref?.levels.find((l) => l.id === level);
  if (!it) return level;
  return locale === "fr" ? it.fr : locale === "de" ? it.de : it.en;
}

/** A first load, kept on the light side: the muscle group's, else the equipment's own; none without one. */
export function startingLoad(ref: LevelsReference | null | undefined, exercise: Pick<Exercise, "equipment" | "muscleGroup"> | undefined, level: FitnessLevel): number | undefined {
  if (!ref || !exercise?.equipment) return undefined;
  const row =
    ref.startKg.find((s) => s.equipment === exercise.equipment && s.muscle === exercise.muscleGroup) ??
    ref.startKg.find((s) => s.equipment === exercise.equipment && s.muscle === "");
  return row ? row.kg[levelOf(level)] : undefined;
}

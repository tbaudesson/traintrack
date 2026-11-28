/**
 * What the group lessons' notebook is made of, as an admin keeps it (app
 * settings "group_lessons", Admin > Group lessons): the sports a coach gives
 * lessons in, and for each its themes (in a lesson's order, the core ones
 * flagged when left aside), age bands, levels and equipment, each named in
 * the three languages, and whether its lessons are given on a horse (its
 * work is then logged on the horse).
 */

/** The app settings key of the reference. */
export const LESSONS_REFERENCE_KEY = "group_lessons";

export interface ReferenceItem {
  /** Kept in the rows (an exercise's theme, a group's age band): lowercase letters, digits, "-" or "_". */
  id: string;
  fr: string;
  en: string;
  de: string;
}

export interface LessonTheme extends ReferenceItem {
  /** What a coach keeps coming back to: flagged when a group has not worked it for a while. */
  core: boolean;
}

export interface LessonSport extends ReferenceItem {
  /** Its lessons are given on a horse (vaulting): the horse's work is logged with them. */
  horses: boolean;
  themes: LessonTheme[];
  ageBands: ReferenceItem[];
  levels: ReferenceItem[];
  equipment: ReferenceItem[];
}

export interface LessonsReference {
  sports: LessonSport[];
}

const ID = /^[a-z0-9_-]{1,30}$/;
const LABEL = (v: unknown): v is string => typeof v === "string" && !!v.trim() && v.length <= 60;

function item(raw: unknown): ReferenceItem | null {
  if (!raw || typeof raw !== "object") return null;
  const { id, fr, en, de } = raw as Record<string, unknown>;
  if (typeof id !== "string" || !ID.test(id) || !LABEL(fr) || !LABEL(en) || !LABEL(de)) return null;
  return { id, fr: fr.trim(), en: en.trim(), de: de.trim() };
}

function items(value: unknown, allowEmpty = false): (ReferenceItem & Record<string, unknown>)[] | null {
  if (!Array.isArray(value) || (!allowEmpty && !value.length) || value.length > 40) return null;
  const out: (ReferenceItem & Record<string, unknown>)[] = [];
  for (const raw of value) {
    const it = item(raw);
    if (!it || out.some((o) => o.id === it.id)) return null;
    out.push({ ...it, core: (raw as Record<string, unknown>).core === true });
  }
  return out;
}

/** The reference as the admin keeps it; null when it does not hold together. */
export function parseLessonsReference(text: string | null | undefined): LessonsReference | null {
  if (!text) return null;
  try {
    const v = JSON.parse(text) as { sports?: unknown };
    if (!Array.isArray(v.sports) || !v.sports.length || v.sports.length > 20) return null;
    const sports: LessonSport[] = [];
    for (const raw of v.sports as Record<string, unknown>[]) {
      const head = item(raw);
      const themes = items(raw?.themes);
      const ageBands = items(raw?.ageBands);
      const levels = items(raw?.levels);
      const equipment = items(raw?.equipment, true);
      if (!head || sports.some((s) => s.id === head.id) || !themes || !ageBands || !levels || !equipment) return null;
      sports.push({
        ...head,
        horses: raw.horses === true,
        themes: themes.map(({ id, fr, en, de, core }) => ({ id, fr, en, de, core: core === true })),
        ageBands: ageBands.map(({ id, fr, en, de }) => ({ id, fr, en, de })),
        levels: levels.map(({ id, fr, en, de }) => ({ id, fr, en, de })),
        equipment: equipment.map(({ id, fr, en, de }) => ({ id, fr, en, de })),
      });
    }
    return { sports };
  } catch {
    return null;
  }
}

/** An item's name in the app's language; its id when the reference no longer has it. */
export function refLabel(list: readonly ReferenceItem[] | undefined, id: string | null | undefined, locale: string): string {
  if (!id) return "";
  const it = list?.find((i) => i.id === id);
  if (!it) return id;
  return locale === "fr" ? it.fr : locale === "de" ? it.de : it.en;
}

/** A sport of the reference; undefined when it no longer has it. */
export const sportOf = (reference: LessonsReference, id: string | null | undefined) => reference.sports.find((s) => s.id === id);

/** The themes flagged when left aside. */
export const coreThemes = (sport: LessonSport | undefined) => (sport?.themes ?? []).filter((t) => t.core).map((t) => t.id);

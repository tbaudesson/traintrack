/**
 * What a tennis coach's notebook is made of, as an admin keeps it (app
 * settings, Admin > Tennis): the themes of a lesson (in a lesson's order, the
 * core ones flagged when left aside), the age bands, the levels and the
 * equipment, each named in the three languages.
 */

/** The app settings key of the reference. */
export const TENNIS_REFERENCE_KEY = "tennis_reference";

export interface ReferenceItem {
  /** Kept in the rows (a drill's theme, a group's age band): lowercase letters, digits, "-" or "_". */
  id: string;
  fr: string;
  en: string;
  de: string;
}

export interface TennisTheme extends ReferenceItem {
  /** A stroke or the footwork: flagged when a group has not worked it for a while. */
  core: boolean;
}

export interface TennisReference {
  themes: TennisTheme[];
  ageBands: ReferenceItem[];
  levels: ReferenceItem[];
  equipment: ReferenceItem[];
}

const ID = /^[a-z0-9_-]{1,30}$/;
const LABEL = (v: unknown): v is string => typeof v === "string" && !!v.trim() && v.length <= 60;

function items(value: unknown, theme = false): (ReferenceItem & { core?: boolean })[] | null {
  if (!Array.isArray(value) || !value.length || value.length > 40) return null;
  const out: (ReferenceItem & { core?: boolean })[] = [];
  for (const raw of value as Record<string, unknown>[]) {
    if (!raw || typeof raw !== "object") return null;
    const { id, fr, en, de } = raw;
    if (typeof id !== "string" || !ID.test(id) || out.some((o) => o.id === id)) return null;
    if (!LABEL(fr) || !LABEL(en) || !LABEL(de)) return null;
    out.push({ id, fr: fr.trim(), en: en.trim(), de: de.trim(), ...(theme ? { core: raw.core === true } : {}) });
  }
  return out;
}

/** The reference as the admin keeps it; null when it does not hold together. */
export function parseTennisReference(text: string | null | undefined): TennisReference | null {
  if (!text) return null;
  try {
    const v = JSON.parse(text) as Record<string, unknown>;
    const themes = items(v.themes, true);
    const ageBands = items(v.ageBands);
    const levels = items(v.levels);
    const equipment = items(v.equipment);
    if (!themes || !ageBands || !levels || !equipment) return null;
    return { themes: themes as TennisTheme[], ageBands, levels, equipment };
  } catch {
    return null;
  }
}

/** An item's name in the app's language; its id when the reference no longer has it. */
export function refLabel(list: ReferenceItem[], id: string | null | undefined, locale: string): string {
  if (!id) return "";
  const item = list.find((i) => i.id === id);
  if (!item) return id;
  return locale === "fr" ? item.fr : locale === "de" ? item.de : item.en;
}

/** The themes flagged when left aside: the strokes and the footwork, as the admin marks them. */
export const coreThemes = (reference: TennisReference) => reference.themes.filter((t) => t.core).map((t) => t.id);

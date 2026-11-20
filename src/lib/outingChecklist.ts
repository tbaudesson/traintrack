/**
 * What to check before setting off on foot, and more before a night out on
 * one's own: a list to tick, not a survival course. Data an admin keeps
 * (app_settings.outing_checklist, seeded by migration 063, Admin > Hiking),
 * read and kept on the device; nothing of it lives here.
 */
export type Lang = "fr" | "en" | "de";
type Text = Record<Lang, string>;

export interface ChecklistItem {
  key: string;
  text: Text;
  /** Only for a night out on one's own. */
  autonomy?: boolean;
}

export interface ChecklistSection {
  key: string;
  title: Text;
  items: ChecklistItem[];
}

export const OUTING_CHECKLIST_KEY = "outing_checklist";
const LANGS: Lang[] = ["fr", "en", "de"];
const KEY = /^[a-z0-9-]+$/;
const text = (v: unknown): v is Text => !!v && typeof v === "object" && LANGS.every((l) => typeof (v as Text)[l] === "string" && (v as Text)[l].trim().length > 0);

/** The list read from the settings, or null when missing or not holding together. */
export function parseChecklist(raw: string | null | undefined): ChecklistSection[] | null {
  if (!raw) return null;
  let list: ChecklistSection[];
  try {
    list = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!Array.isArray(list) || !list.length) return null;
  const keys = new Set<string>();
  for (const s of list) {
    if (!s || typeof s.key !== "string" || !KEY.test(s.key) || !text(s.title) || !Array.isArray(s.items) || !s.items.length) return null;
    for (const i of s.items) {
      if (!i || typeof i.key !== "string" || !KEY.test(i.key) || keys.has(i.key) || !text(i.text)) return null;
      if (i.autonomy !== undefined && typeof i.autonomy !== "boolean") return null;
      keys.add(i.key);
    }
  }
  return list;
}

/** The items to check: the everyday ones, and the night-out ones when going on one's own. */
export const itemsFor = (list: ChecklistSection[], autonomy: boolean): ChecklistSection[] =>
  list.map((s) => ({ ...s, items: s.items.filter((i) => autonomy || !i.autonomy) })).filter((s) => s.items.length > 0);

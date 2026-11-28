/**
 * Lists an admin keeps in the app settings (Admin > Lists), read by the app
 * rather than fixed in its code: the exercises' equipment (with the roles
 * the code reads: no gear needed, no warm-up sets, unsorted, in a gym, at
 * home), the movements (with a short form for a sentence), the swim strokes,
 * and the values the choices offer (rest times, pool lengths, outing
 * minutes, a session's intensity steps).
 */

export const EQUIPMENT_KEY = "equipment";
export const MOVEMENTS_KEY = "movements";
export const SWIM_STROKES_KEY = "swim_strokes";
export const CHOICES_KEY = "choices";

export interface ListItem {
  /** Kept in the rows: lowercase letters, digits, "-" or "_". */
  id: string;
  fr: string;
  en: string;
  de: string;
}

export interface EquipmentItem extends ListItem {
  /** Nothing to own for it (bodyweight): always doable, no load to suggest. */
  noGear: boolean;
  /** No warm-up sets before it (bodyweight, bands). */
  noWarmup: boolean;
  /** The equipment of an exercise nobody sorted. */
  unspecified: boolean;
  /** Ticked for "a gym" and "at home" at the start. */
  gym: boolean;
  home: boolean;
  /** The smallest load step with it (kg): 2 for dumbbells, 2.5 for plates. */
  stepKg: number;
  /** Its empty bar (kg), the first warm-up set; 0 without one. */
  barKg: number;
}

export interface MovementItem extends ListItem {
  /** The words inside a sentence ("avoid … arms overhead"). */
  shortFr: string;
  shortEn: string;
  shortDe: string;
}

export interface Choices {
  restDefaults: number[];
  restWarmups: number[];
  poolLengths: number[];
  cardioMinutes: number[];
  intensitySteps: number[];
}

const ID = /^[a-z0-9_-]{1,30}$/;
const LABEL = (v: unknown): v is string => typeof v === "string" && !!v.trim() && v.length <= 80;

/** A list of named items, each with its flags and extra labels; null when it does not hold together. */
function parseList<T extends ListItem>(text: string | null | undefined, flags: string[] = [], labels: string[] = []): T[] | null {
  if (!text) return null;
  try {
    const value = JSON.parse(text) as unknown;
    if (!Array.isArray(value) || !value.length || value.length > 60) return null;
    const out: T[] = [];
    for (const raw of value as Record<string, unknown>[]) {
      if (!raw || typeof raw !== "object") return null;
      const { id, fr, en, de } = raw;
      if (typeof id !== "string" || !ID.test(id) || out.some((o) => o.id === id)) return null;
      if (!LABEL(fr) || !LABEL(en) || !LABEL(de)) return null;
      const item: Record<string, unknown> = { id, fr: fr.trim(), en: en.trim(), de: de.trim() };
      for (const f of flags) item[f] = raw[f] === true;
      for (const l of labels) {
        if (!LABEL(raw[l])) return null;
        item[l] = (raw[l] as string).trim();
      }
      out.push(item as T);
    }
    return out;
  } catch {
    return null;
  }
}

export function parseEquipment(text: string | null | undefined): EquipmentItem[] | null {
  const list = parseList<EquipmentItem>(text, ["noGear", "noWarmup", "unspecified", "gym", "home"]);
  if (!list || list.filter((e) => e.unspecified).length > 1) return null;
  const raw = JSON.parse(text!) as Record<string, unknown>[];
  for (const [i, e] of list.entries()) {
    const step = raw[i].stepKg;
    const bar = raw[i].barKg;
    if (typeof step !== "number" || step < 0.25 || step > 10) return null;
    if (typeof bar !== "number" || bar < 0 || bar > 50) return null;
    e.stepKg = step;
    e.barKg = bar;
  }
  return list;
}
export const parseMovements = (text: string | null | undefined) => parseList<MovementItem>(text, [], ["shortFr", "shortEn", "shortDe"]);
export const parseSwimStrokes = (text: string | null | undefined) => parseList<ListItem>(text);

/** The values the choices offer; null when one of them is missing or out of range. */
export function parseChoices(text: string | null | undefined): Choices | null {
  if (!text) return null;
  try {
    const v = JSON.parse(text) as Record<string, unknown>;
    const nums = (x: unknown, min: number, max: number) =>
      Array.isArray(x) && x.length >= 1 && x.length <= 12 && x.every((n) => Number.isInteger(n) && n >= min && n <= max) ? (x as number[]) : null;
    const choices = {
      restDefaults: nums(v.restDefaults, 10, 900),
      restWarmups: nums(v.restWarmups, 10, 900),
      poolLengths: nums(v.poolLengths, 10, 100),
      cardioMinutes: nums(v.cardioMinutes, 5, 300),
      intensitySteps: nums(v.intensitySteps, -50, 100),
    };
    return Object.values(choices).every(Boolean) ? (choices as Choices) : null;
  } catch {
    return null;
  }
}

/** An item's name in the app's language; its id when the list no longer has it. */
export function itemLabel(list: readonly ListItem[] | null | undefined, id: string | null | undefined, locale: string): string {
  if (!id) return "";
  const it = list?.find((i) => i.id === id);
  if (!it) return id;
  return locale === "fr" ? it.fr : locale === "de" ? it.de : it.en;
}

/** A movement's words inside a sentence. */
export function movementShort(list: readonly MovementItem[] | null | undefined, id: string, locale: string): string {
  const m = list?.find((i) => i.id === id);
  if (!m) return id;
  return locale === "fr" ? m.shortFr : locale === "de" ? m.shortDe : m.shortEn;
}

/** The equipment with a role (none when the list was never read). */
export const equipmentWith = (list: readonly EquipmentItem[] | null | undefined, role: "noGear" | "noWarmup" | "unspecified" | "gym" | "home") =>
  (list ?? []).filter((e) => e[role]).map((e) => e.id);

let cached: { text: string | null; list: EquipmentItem[] | null } = { text: null, list: null };

/** The list as kept on the device, for code that runs outside a page (warm-up sets, load steps, the coach's advice). */
export function equipmentOnDevice(): EquipmentItem[] | null {
  try {
    const text = localStorage.getItem(`traintrack.guidance.${EQUIPMENT_KEY}`);
    if (text !== cached.text) cached = { text, list: parseEquipment(text) };
    return cached.list;
  } catch {
    return null;
  }
}

/** The plates' step when the list was never read: what most gyms load. */
const DEFAULT_STEP_KG = 2.5;
const itemOf = (id: string | null | undefined) => (id ? equipmentOnDevice()?.find((e) => e.id === id) : undefined);
/** The smallest load step with an exercise's equipment (kg). */
export const loadStep = (id: string | null | undefined) => itemOf(id)?.stepKg ?? DEFAULT_STEP_KG;
/** Its empty bar (kg); 0 without one. */
export const barOf = (id: string | null | undefined) => itemOf(id)?.barKg ?? 0;
/** Nothing to own for it (bodyweight). */
export const needsNoGear = (id: string | null | undefined) => !!itemOf(id)?.noGear;
/** No warm-up sets before it (bodyweight, bands). */
export const skipsWarmup = (id: string | null | undefined) => !!itemOf(id)?.noWarmup;

/**
 * The swim technique sheets: the four strokes and the drills the swimming
 * programs use, each with its key points, its usual mistakes and a video.
 * Data an admin keeps (app_settings.swim_techniques, seeded by migration 060,
 * Admin > Swimming), read and kept on the device; nothing of it lives here.
 */
export type Lang = "fr" | "en" | "de";
type Text = Record<Lang, string>;
type Lines = Record<Lang, string[]>;

export interface SwimTechnique {
  key: string;
  kind: "stroke" | "drill";
  name: Text;
  points: Lines;
  mistakes: Lines;
  video?: string | null;
}

export const SWIM_TECHNIQUES_KEY = "swim_techniques";
const LANGS: Lang[] = ["fr", "en", "de"];

const text = (v: unknown): v is Text => !!v && typeof v === "object" && LANGS.every((l) => typeof (v as Text)[l] === "string" && (v as Text)[l].trim().length > 0);
const lines = (v: unknown): v is Lines =>
  !!v && typeof v === "object" && LANGS.every((l) => Array.isArray((v as Lines)[l]) && (v as Lines)[l].every((x) => typeof x === "string" && x.trim().length > 0));

/** The sheets read from the settings, or null when missing or not holding together. */
export function parseSwimTechniques(raw: string | null | undefined): SwimTechnique[] | null {
  if (!raw) return null;
  let list: SwimTechnique[];
  try {
    list = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!Array.isArray(list) || !list.length) return null;
  const keys = new Set<string>();
  for (const t of list) {
    if (!t || typeof t.key !== "string" || !/^[a-z0-9-]+$/.test(t.key) || keys.has(t.key)) return null;
    keys.add(t.key);
    if (t.kind !== "stroke" && t.kind !== "drill") return null;
    if (!text(t.name) || !lines(t.points) || !lines(t.mistakes)) return null;
    if (t.video != null && (typeof t.video !== "string" || !/^https:\/\//.test(t.video))) return null;
  }
  return list;
}

export const langOf = (locale: string): Lang => (locale === "fr" || locale === "de" ? locale : "en");

/**
 * How much of the app one sees: Essential (the bare minimum to train),
 * Complete (the app with its follow-up) or Expert (every indicator too).
 * A matter of display only: nothing is computed, stored or synced
 * differently, the licence still decides what one may use, and what keeps an
 * athlete safe (injuries, a low form, a load rising too fast) shows in every
 * mode.
 *
 * Which mode each part needs is a reference an admin keeps (app settings,
 * Admin > Display modes); a part it does not name shows in every mode.
 */

export const DISPLAY_MODES = ["essential", "complete", "expert"] as const;
export type DisplayMode = (typeof DISPLAY_MODES)[number];

/** The app settings key of the reference. */
export const DISPLAY_KEY = "display_modes";

/** The mode of a profile that never chose one: the app as it was, everything shown. */
export const LEGACY_MODE: DisplayMode = "expert";

/** The mode a new athlete is offered first. */
export const DEFAULT_MODE: DisplayMode = "complete";

/** The parts that can wait for another mode, page by page (what the admin sets). */
export const DISPLAY_PARTS = {
  // Menu entries, by their id in the navigation; Today, Profile, Settings and
  // Administration are always there (Settings is where the mode is changed).
  nav: ["programs", "exercises", "sports", "history", "import", "progress", "assistant", "readiness", "health", "nutrition", "challenges", "notifications", "layouts"],
  home: ["homeProgress", "homeLoad", "homePlanB", "homeMobility", "homeCalendar", "homeConflict", "homeDeload", "homeReport", "homeTests", "homeInsights", "homeAdvice", "homeSportHint", "homeLastSession"],
  progress: [
    "progressMoreInsights", "progressAssistant", "progressRecommendations", "progressLoad", "progressLoadHistory", "progressEnduranceTrend",
    "progressWeeklyReport", "progressGoals", "progressReport", "progressVolume", "progressByExercise", "progressMuscles", "progressBodyMap", "progressRecords",
  ],
  log: ["logMoreDetails", "logTrimp"],
} as const;

export type DisplayPage = keyof typeof DISPLAY_PARTS;
/** A part's id: "nav.<entry>" for the menu, its own name elsewhere. */
export type DisplayPart = `nav.${(typeof DISPLAY_PARTS.nav)[number]}` | (typeof DISPLAY_PARTS)[Exclude<DisplayPage, "nav">][number];

export const ALL_PARTS: readonly DisplayPart[] = [
  ...DISPLAY_PARTS.nav.map((id) => `nav.${id}` as DisplayPart),
  ...DISPLAY_PARTS.home,
  ...DISPLAY_PARTS.progress,
  ...DISPLAY_PARTS.log,
];

/** Whether a menu entry can wait for another mode (the others always show). */
export const isNavPart = (id: string): id is (typeof DISPLAY_PARTS.nav)[number] => (DISPLAY_PARTS.nav as readonly string[]).includes(id);

/** For each part, the first mode that shows it (parts left out show in every mode). */
export type DisplayGuide = Partial<Record<DisplayPart, DisplayMode>>;

export const isDisplayMode = (value: unknown): value is DisplayMode => DISPLAY_MODES.includes(value as DisplayMode);

/** The reference as the admin keeps it; null when it does not hold together (then everything shows). */
export function parseDisplayGuide(text: string | null | undefined): DisplayGuide | null {
  if (!text) return null;
  try {
    const value = JSON.parse(text) as unknown;
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.some(([part, mode]) => !ALL_PARTS.includes(part as DisplayPart) || !isDisplayMode(mode))) return null;
    return Object.fromEntries(entries) as DisplayGuide;
  } catch {
    return null;
  }
}

/** One's mode, as the profile keeps it; a profile that never chose sees everything, as before. */
export const readDisplayMode = (stored: unknown): DisplayMode => (isDisplayMode(stored) ? stored : LEGACY_MODE);

const rank = (mode: DisplayMode) => DISPLAY_MODES.indexOf(mode);

/** Whether a part shows in this mode; everything does until the reference is known. */
export function shows(part: DisplayPart, mode: DisplayMode, guide: DisplayGuide | null): boolean {
  const from = guide?.[part];
  return !from || rank(mode) >= rank(from);
}

/** How many parts this mode leaves out, to say so where it matters. */
export const hiddenCount = (mode: DisplayMode, guide: DisplayGuide | null): number =>
  ALL_PARTS.filter((part) => !shows(part, mode, guide)).length;

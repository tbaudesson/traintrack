// App appearance: light/dark/system mode + brand accent color.

export type ThemeMode = "light" | "dark" | "system";
export type Accent = "violet" | "indigo" | "emerald" | "rose" | "amber" | "slate";

export const ACCENTS: Accent[] = ["violet", "indigo", "emerald", "rose", "amber", "slate"];

const MODE_KEY = "traintrack-theme";
const ACCENT_KEY = "traintrack.accentChoice";
const LEGACY_ACCENT_KEY = "traintrack.accent";

export function getMode(): ThemeMode {
  if (typeof window === "undefined") return "system";
  const v = window.localStorage.getItem(MODE_KEY);
  return v === "light" || v === "dark" ? v : "system";
}

export function applyMode(mode: ThemeMode): void {
  if (typeof document === "undefined") return;
  const dark =
    mode === "dark" ||
    (mode === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
  window.localStorage.setItem(MODE_KEY, mode);
}

export function getAccent(): Accent {
  if (typeof window === "undefined") return "violet";
  // Before violet became the default, "indigo" was saved for everyone who had
  // never chosen, so only the other colours count as a real choice.
  const stored = window.localStorage.getItem(ACCENT_KEY) ?? window.localStorage.getItem(LEGACY_ACCENT_KEY);
  const v = (window.localStorage.getItem(ACCENT_KEY) === null && stored === "indigo" ? null : stored) as Accent | null;
  return v && ACCENTS.includes(v) ? v : "violet";
}

export function applyAccent(accent: Accent): void {
  if (typeof document === "undefined") return;
  const el = document.documentElement;
  ACCENTS.forEach((a) => el.classList.remove(`accent-${a}`));
  if (accent !== "violet") el.classList.add(`accent-${accent}`);
  window.localStorage.setItem(ACCENT_KEY, accent);
}

export function initAppTheme(): void {
  applyMode(getMode());
  applyAccent(getAccent());
  applyStyle(getPrefs().style);
}

// ─── Style, favourite sport and silhouette ────────────────────────────

/** The look of the whole app, on top of the mode and the accent. */
export type AppStyle = "classic" | "dynamic" | "soft" | "contrast";
export const APP_STYLES: AppStyle[] = ["classic", "dynamic", "soft", "contrast"];

/** The sport put first: its programs, its session, its picture. */
export type FavoriteSport = "bodybuilding" | "strength" | "fitness" | "running" | "swimming" | "cycling" | "vaulting" | "callisthenics";
export const FAVORITE_SPORTS: FavoriteSport[] = ["bodybuilding", "strength", "fitness", "running", "swimming", "cycling", "vaulting", "callisthenics"];

/** Whose picture the home screen shows. */
export type Silhouette = "male" | "female";

/** The rest timer between sets. */
export interface RestPrefs {
  /** After a working set, when the program gives no rest. */
  defaultSec: number;
  /** After a warm-up set. */
  warmupSec: number;
  /** Beeps on the last three seconds and at the end. */
  sound: boolean;
  vibrate: boolean;
  /** A system notification at the end, for a phone left locked. */
  notify: boolean;
}
export const REST_DEFAULTS = [60, 90, 120, 180] as const;
export const REST_WARMUPS = [30, 45, 60, 90] as const;

export interface AppPrefs {
  style: AppStyle;
  sport: FavoriteSport | null;
  silhouette: Silhouette;
  rest: RestPrefs;
  /** The voice coach of the timed sessions. */
  voice: boolean;
}

const PREFS_KEY = "traintrack.prefs";
const PREFS_EVENT = "traintrack-prefs";
const DEFAULT_REST: RestPrefs = { defaultSec: 90, warmupSec: 60, sound: false, vibrate: true, notify: false };
const DEFAULT_PREFS: AppPrefs = { style: "classic", sport: null, silhouette: "male", rest: DEFAULT_REST, voice: true };

let cached: { raw: string | null; prefs: AppPrefs } | null = null;

/** The saved preferences, the same object while they do not change (for useSyncExternalStore). */
export function getPrefs(): AppPrefs {
  if (typeof window === "undefined") return DEFAULT_PREFS;
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(PREFS_KEY);
  } catch {
    return DEFAULT_PREFS;
  }
  if (cached && cached.raw === raw) return cached.prefs;
  let parsed: Partial<AppPrefs> = {};
  try {
    parsed = raw ? JSON.parse(raw) : {};
  } catch {
    parsed = {};
  }
  const prefs: AppPrefs = {
    style: APP_STYLES.includes(parsed.style as AppStyle) ? (parsed.style as AppStyle) : "classic",
    sport: FAVORITE_SPORTS.includes(parsed.sport as FavoriteSport) ? (parsed.sport as FavoriteSport) : null,
    silhouette: parsed.silhouette === "female" ? "female" : "male",
    rest: {
      defaultSec: (REST_DEFAULTS as readonly number[]).includes(parsed.rest?.defaultSec ?? 0) ? parsed.rest!.defaultSec : DEFAULT_REST.defaultSec,
      warmupSec: (REST_WARMUPS as readonly number[]).includes(parsed.rest?.warmupSec ?? 0) ? parsed.rest!.warmupSec : DEFAULT_REST.warmupSec,
      sound: typeof parsed.rest?.sound === "boolean" ? parsed.rest.sound : DEFAULT_REST.sound,
      vibrate: typeof parsed.rest?.vibrate === "boolean" ? parsed.rest.vibrate : DEFAULT_REST.vibrate,
      notify: typeof parsed.rest?.notify === "boolean" ? parsed.rest.notify : DEFAULT_REST.notify,
    },
    voice: typeof parsed.voice === "boolean" ? parsed.voice : true,
  };
  cached = { raw, prefs };
  return prefs;
}

export const getServerPrefs = () => DEFAULT_PREFS;

export function subscribePrefs(callback: () => void): () => void {
  window.addEventListener(PREFS_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(PREFS_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

/** Put the style's class on <html>; the classic look has none. */
export function applyStyle(style: AppStyle): void {
  if (typeof document === "undefined") return;
  const el = document.documentElement;
  APP_STYLES.forEach((s) => el.classList.remove(`style-${s}`));
  if (style !== "classic") el.classList.add(`style-${style}`);
}

export function savePrefs(change: Partial<AppPrefs>): void {
  const next = { ...getPrefs(), ...change };
  try {
    window.localStorage.setItem(PREFS_KEY, JSON.stringify(next));
  } catch {
    // Private window: the choice lasts until the page is closed.
  }
  applyStyle(next.style);
  window.dispatchEvent(new Event(PREFS_EVENT));
}

/** The home picture for a sport and a silhouette: the runner when the sport has none yet. */
export interface Picture {
  src: string;
  width: number;
  height: number;
  /** A whole illustration with its own background, shown behind the card rather than cut out. */
  scene?: boolean;
}

const PICTURES: Partial<Record<`${FavoriteSport}-${Silhouette}` | `default-${Silhouette}`, Picture>> = {
  "default-male": { src: "/images/athlete.webp", width: 521, height: 620 },
  "default-female": { src: "/images/runner-female.webp", width: 420, height: 620 },
  "swimming-female": { src: "/images/swim-female.webp", width: 900, height: 600, scene: true },
  "swimming-male": { src: "/images/swim-male.webp", width: 900, height: 600, scene: true },
  "vaulting-female": { src: "/images/vaulting-female.webp", width: 417, height: 620 },
  "vaulting-male": { src: "/images/vaulting-male.webp", width: 413, height: 620 },
};

export function homePicture(prefs: Pick<AppPrefs, "sport" | "silhouette">): Picture {
  return (prefs.sport && PICTURES[`${prefs.sport}-${prefs.silhouette}`]) || PICTURES[`default-${prefs.silhouette}`]!;
}

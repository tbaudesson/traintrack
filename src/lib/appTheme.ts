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
}

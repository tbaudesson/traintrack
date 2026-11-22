import type { AppPrefs, FavoriteSport } from "./appTheme";
import { FAVORITE_SPORTS } from "./appTheme";

type Choice = Pick<AppPrefs, "sport" | "sport2" | "allSports">;
export type StoredChoice = { favoriteSport: string | null; secondSport: string | null };

const isSport = (v: unknown): v is FavoriteSport => FAVORITE_SPORTS.includes(v as FavoriteSport);

/** Whether the athlete chose something (a sport, or "all sports"), rather than leaving the default. */
export const hasChosen = (c: Choice) => !!c.sport || c.allSports;

/** The choice as the profile keeps it: a sport, "all" or "none". */
export function storeChoice(c: Choice): StoredChoice {
  return {
    favoriteSport: c.allSports ? "all" : c.sport ?? "none",
    secondSport: c.sport && c.sport2 ? c.sport2 : null,
  };
}

/** The choice read back from the profile; null when it was never chosen (or holds a sport this version does not know). */
export function readChoice(stored: Partial<StoredChoice> | null | undefined): Choice | null {
  const fav = stored?.favoriteSport;
  if (fav === "all") return { sport: null, sport2: null, allSports: true };
  if (fav === "none") return { sport: null, sport2: null, allSports: false };
  if (!isSport(fav)) return null;
  const second = isSport(stored?.secondSport) && stored?.secondSport !== fav ? stored!.secondSport as FavoriteSport : null;
  return { sport: fav, sport2: second, allSports: false };
}

export const sameChoice = (a: Choice, b: Choice) => a.sport === b.sport && a.sport2 === b.sport2 && a.allSports === b.allSports;

/**
 * What to do when the profile and this device disagree: the profile wins once
 * it holds a choice (made on any device); a device with a choice and a
 * profile without one hands it to the profile. Nothing to do otherwise.
 */
export function reconcileChoice(local: Choice, stored: Partial<StoredChoice> | null | undefined): { kind: "useProfile"; choice: Choice } | { kind: "saveToProfile"; stored: StoredChoice } | null {
  const fromProfile = readChoice(stored);
  if (fromProfile) return sameChoice(fromProfile, local) ? null : { kind: "useProfile", choice: fromProfile };
  if (stored?.favoriteSport == null && hasChosen(local)) return { kind: "saveToProfile", stored: storeChoice(local) };
  return null;
}

import { useEffect } from "react";
import { getPrefs, savePrefs, type AppPrefs } from "@/lib/appTheme";
import { reconcileChoice, storeChoice } from "@/lib/sportChoice";
import { updateTrainingSchedule, useAthleteProfileOrNull } from "@/hooks/useAthleteProfile";

type Change = Partial<Pick<AppPrefs, "sport" | "sport2" | "allSports">>;

/** Choose one's sport: on this device at once, and with the profile so the other devices follow. */
export async function saveSportChoice(change: Change): Promise<void> {
  const next = { ...getPrefs(), ...change };
  await updateTrainingSchedule(storeChoice(next));
  savePrefs(change);
}

/**
 * Keeps this device's sport in step with the profile: when the profile brings
 * a choice made elsewhere, the device takes it; a device that chose before the
 * profile kept one hands it over. Only the profile's changes trigger it, so a
 * choice made here is never undone while it is being saved.
 */
export function useSportChoiceSync(): void {
  const profile = useAthleteProfileOrNull();
  const loaded = !!profile;
  const favorite = profile?.favoriteSport ?? null;
  const second = profile?.secondSport ?? null;
  useEffect(() => {
    if (!loaded) return;
    const action = reconcileChoice(getPrefs(), { favoriteSport: favorite, secondSport: second });
    if (action?.kind === "useProfile") savePrefs(action.choice);
    else if (action?.kind === "saveToProfile") void updateTrainingSchedule(action.stored);
  }, [loaded, favorite, second]);
}

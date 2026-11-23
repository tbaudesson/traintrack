import { useCallback } from "react";
import { DISPLAY_KEY, parseDisplayGuide, readDisplayMode, shows as showsIn, type DisplayMode, type DisplayPart } from "@/lib/displayMode";
import { updateTrainingSchedule, useAthleteProfileOrNull } from "@/hooks/useAthleteProfile";
import { useAppGuidance } from "./useAppGuidance";

/**
 * One's display mode and whether a part of the app shows in it. Kept with the
 * profile (it follows the athlete); which part needs which mode is the
 * admin's reference. Everything shows while either is unknown.
 */
export function useDisplayMode(): { mode: DisplayMode; chosen: boolean; shows: (part: DisplayPart) => boolean } {
  const profile = useAthleteProfileOrNull();
  const guide = useAppGuidance(DISPLAY_KEY, parseDisplayGuide);
  const mode = readDisplayMode(profile?.displayMode);
  const shows = useCallback((part: DisplayPart) => showsIn(part, mode, guide), [mode, guide]);
  return { mode, chosen: !!profile?.displayMode, shows };
}

/** Choose one's mode: kept with the profile, so the other devices follow. */
export const saveDisplayMode = (mode: DisplayMode) => updateTrainingSchedule({ displayMode: mode });

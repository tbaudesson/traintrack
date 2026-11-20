import { INJURY_GUIDANCE_KEY, parseInjuryGuidance, type InjuryGuidance } from "@/lib/injuryGuidance";
import { useAppGuidance } from "./useAppGuidance";

/** The injury references the admin keeps; null until they have been read once. */
export const useInjuryGuidance = (): InjuryGuidance | null => useAppGuidance(INJURY_GUIDANCE_KEY, parseInjuryGuidance);

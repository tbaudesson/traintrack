import { INJURY_GUIDANCE_KEY, parseInjuryGuidance, type InjuryGuidance } from "@/lib/injuryGuidance";
import { MOBILITY_EXERCISES } from "@/lib/mobility";
import { useAppGuidance } from "./useAppGuidance";

const MOVES = MOBILITY_EXERCISES.map((e) => e.key);
const parse = (text: string | null | undefined) => parseInjuryGuidance(text, MOVES);

/** The injury references the admin keeps; null until they have been read once. */
export const useInjuryGuidance = (): InjuryGuidance | null => useAppGuidance(INJURY_GUIDANCE_KEY, parse);

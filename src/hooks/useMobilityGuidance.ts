import { MOBILITY_KEY, parseMobility, type MobilityGuidance } from "@/lib/mobility";
import { useAppGuidance } from "./useAppGuidance";

/** The warm-ups and stretches the admin keeps; null until they have been read once. */
export const useMobilityGuidance = (): MobilityGuidance | null => useAppGuidance(MOBILITY_KEY, parseMobility);

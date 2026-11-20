import { parseSwimTechniques, SWIM_TECHNIQUES_KEY, type SwimTechnique } from "@/lib/swimTechniques";
import { useAppGuidance } from "./useAppGuidance";

/** The swim technique sheets the admin keeps; null until they have been read once. */
export const useSwimTechniques = (): SwimTechnique[] | null => useAppGuidance(SWIM_TECHNIQUES_KEY, parseSwimTechniques);

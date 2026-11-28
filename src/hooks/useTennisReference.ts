import { useAppGuidance } from "@/hooks/useAppGuidance";
import { TENNIS_REFERENCE_KEY, parseTennisReference, type TennisReference } from "@/lib/tennisReference";

/** The tennis notebook's themes, ages, levels and equipment, as the admin keeps them; null until read once. */
export const useTennisReference = (): TennisReference | null => useAppGuidance(TENNIS_REFERENCE_KEY, parseTennisReference);

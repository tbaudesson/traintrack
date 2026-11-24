import { BOXING_KEY, parseBoxing, type BoxingGuidance } from "@/lib/boxing";
import { useAppGuidance } from "./useAppGuidance";

/** The boxing rounds the admin keeps; null until they have been read once. */
export const useBoxingGuidance = (): BoxingGuidance | null => useAppGuidance(BOXING_KEY, parseBoxing);

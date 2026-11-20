import { TIMED_KEY, parseTimed, type TimedGuidance } from "@/lib/intervals";
import { useAppGuidance } from "./useAppGuidance";

/** What timed sessions are built from, as the admin keeps it; null until read once. */
export const useTimedGuidance = (): TimedGuidance | null => useAppGuidance(TIMED_KEY, parseTimed);

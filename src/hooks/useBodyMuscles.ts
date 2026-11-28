import { useAppGuidance } from "@/hooks/useAppGuidance";
import { BODY_MUSCLES_KEY, parseBodyMuscles, type MuscleDef } from "@/lib/muscleMap";

/** The muscles of the body map, as the admin keeps them; null until read once. */
export const useBodyMuscles = (): MuscleDef[] | null => useAppGuidance(BODY_MUSCLES_KEY, parseBodyMuscles);

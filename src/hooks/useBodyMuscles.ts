import { useMemo } from "react";
import { useAppGuidance } from "@/hooks/useAppGuidance";
import { useMuscleGroups } from "@/hooks/useMuscleGroups";
import { BODY_MUSCLES_KEY, parseBodyMuscles, type BodyRef, type MuscleDef } from "@/lib/muscleMap";

/** The muscles of the body map, as the admin keeps them; null until read once. */
export const useBodyMuscles = (): MuscleDef[] | null => useAppGuidance(BODY_MUSCLES_KEY, parseBodyMuscles);

/** The muscles and their groups together; null until both were read once. */
export function useBodyRef(): BodyRef | null {
  const muscles = useBodyMuscles();
  const groups = useMuscleGroups();
  return useMemo(() => (muscles && groups ? { muscles, groups } : null), [muscles, groups]);
}

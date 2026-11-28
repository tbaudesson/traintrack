import { useAppGuidance } from "@/hooks/useAppGuidance";
import { MUSCLE_GROUPS_KEY, parseMuscleGroups, type MuscleGroupDef } from "@/lib/muscles";

/** The muscle groups, as the admin keeps them; null until read once. */
export const useMuscleGroups = (): MuscleGroupDef[] | null => useAppGuidance(MUSCLE_GROUPS_KEY, parseMuscleGroups);

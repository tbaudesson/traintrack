import { RUN_WORKOUTS_KEY, parseRunWorkouts, type RunWorkoutsReference } from "@/lib/runWorkouts";
import { useAppGuidance } from "./useAppGuidance";

/** The run sessions and what they work, as the admin keeps them; null until read once. */
export const useRunWorkouts = (): RunWorkoutsReference | null => useAppGuidance(RUN_WORKOUTS_KEY, parseRunWorkouts);

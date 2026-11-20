import { useMemo } from "react";
import type { InjuryRules } from "@/lib/injuries";
import { useExercises } from "@/hooks/useExercises";
import { useInjuryGuidance } from "@/hooks/useInjuryGuidance";

/**
 * What each exercise of the library loads when injured, by its English name:
 * the data each exercise carries (an admin edits it), gathered from the
 * exercises on the device. Empty until they are synced.
 */
export function useInjuryRules(): InjuryRules {
  const exercises = useExercises();
  return useMemo(() => {
    const out: InjuryRules = {};
    for (const e of exercises) if (!e.isCustom && e.injuryRules) out[e.name] = e.injuryRules;
    return out;
  }, [exercises]);
}

/** What each warm-up and stretch move loads, from the injury references. */
export function useMobilityRules(): InjuryRules {
  return useInjuryGuidance()?.mobility ?? {};
}

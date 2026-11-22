import { useMemo } from "react";
import type { Injury, InjuryRules } from "@/lib/injuries";
import type { Restriction } from "@/db";
import { useAthleteProfileOrNull, useInjuries } from "@/hooks/useAthleteProfile";
import { activeRestrictions, mergeRules, restrictionInjuries, restrictionRules } from "@/lib/restrictions";
import { localDate } from "@/lib/dates";
import { useExercises } from "@/hooks/useExercises";
import { useInjuryGuidance } from "@/hooks/useInjuryGuidance";

/**
 * What each exercise of the library loads when injured, by its English name:
 * the data each exercise carries (an admin edits it), gathered from the
 * exercises on the device. Empty until they are synced.
 */
export function useInjuryRules(): InjuryRules {
  const exercises = useExercises();
  const restrictions = useMyRestrictions();
  return useMemo(() => {
    const out: InjuryRules = {};
    for (const e of exercises) if (!e.isCustom && e.injuryRules) out[e.name] = e.injuryRules;
    // One's own restrictions (a muscle, a movement, an exercise) add their rules.
    return restrictions.length ? mergeRules(out, restrictionRules(restrictions, exercises)) : out;
  }, [exercises, restrictions]);
}

const NONE: Restriction[] = [];

/** One's restrictions still in force. */
export function useMyRestrictions(): Restriction[] {
  const profile = useAthleteProfileOrNull();
  const all = profile?.restrictions;
  const today = localDate();
  return useMemo(() => (all?.length ? activeRestrictions(all, today) : NONE), [all, today]);
}

/**
 * One's injuries and restrictions together, as the warnings read them: what
 * to flag, rank lower or propose to replace. Never written back: declaring an
 * injury uses the injuries alone.
 */
export function useAvoidedAreas(): Injury[] {
  const injuries = useInjuries();
  const restrictions = useMyRestrictions();
  const today = localDate();
  return useMemo(() => (restrictions.length ? [...injuries, ...restrictionInjuries(restrictions, today)] : injuries), [injuries, restrictions, today]);
}

/** What each warm-up and stretch move loads, from the injury references. */
export function useMobilityRules(): InjuryRules {
  return useInjuryGuidance()?.mobility ?? {};
}

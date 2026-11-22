"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useAthleteProfileOrNull, useInjuries } from "@/hooks/useAthleteProfile";
import { useExercises } from "@/hooks/useExercises";
import { updateProgram, useTrainablePrograms } from "@/hooks/usePrograms";
import { useWorkouts } from "@/hooks/useWorkouts";
import { useAllWorkoutSets } from "@/hooks/useWorkoutSets";
import { useInjuryRules } from "@/hooks/useInjuryRules";
import { useAppPrefs } from "@/hooks/useAppPrefs";
import { useSessionOfTheDay } from "@/hooks/useSessionOfTheDay";
import { useProgramTemplates } from "@/lib/templateService";
import { applyChange, coachProposals, type CoachProposal } from "@/lib/coach";
import { isAvoided } from "@/lib/injuries";
import { scheduleSessions } from "@/lib/schedule";
import { localDate, localDateIn } from "@/lib/dates";
import { canEditProgram } from "@/lib/programOrigin";

const IGNORED_KEY = "traintrack.coach.ignored";

const readIgnored = (): string[] => {
  try {
    return JSON.parse(localStorage.getItem(IGNORED_KEY) ?? "[]");
  } catch {
    return [];
  }
};

/**
 * The assistant's proposals for one's programs, from the sessions done:
 * those not ignored on this device. Applying one saves the change through the
 * program's history; ignoring one hides it until something new is done.
 */
export function useCoach() {
  const { user } = useAuth();
  const today = localDate();
  const programs = useTrainablePrograms();
  const workouts = useWorkouts();
  const sets = useAllWorkoutSets();
  const exercises = useExercises();
  const profile = useAthleteProfileOrNull();
  const injuries = useInjuries();
  const rules = useInjuryRules();
  const prefs = useAppPrefs();
  const catalogue = useProgramTemplates();
  const { planned } = useSessionOfTheDay({ programs, workouts, today, profile, userId: user?.id, sport: prefs.sport, catalogue });
  const [ignored, setIgnored] = useState<string[]>([]);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- reads the device's storage, only on the client
  useEffect(() => setIgnored(readIgnored()), []);

  const all = useMemo(() => {
    // The library and the sets still loading (read as empty lists): nothing to say yet, rather than
    // every exercise looking skipped for an instant.
    if (!exercises.length || (workouts.length > 0 && !sets.length)) return [];
    const schedule = scheduleSessions({ planned, workouts, from: localDateIn(-28), to: localDateIn(-1), today });
    return coachProposals({
      today,
      // A coach's program is changed by the coach, not proposed changes here.
      programs: programs.filter((p) => canEditProgram(p, user?.id)),
      workouts,
      sets,
      exercises: exercises.filter((e) => !e.isCustom || e.userId === user?.id),
      owned: profile?.equipment ?? [],
      avoid: (name) => isAvoided(rules, name, injuries),
      schedule,
      trainingDays: profile?.trainingDays ?? [],
    });
  }, [planned, workouts, today, programs, sets, exercises, user?.id, profile, rules, injuries]);
  const proposals = all.filter((p) => !ignored.includes(p.id));

  function ignore(p: CoachProposal) {
    const next = [...ignored, p.id].slice(-200);
    setIgnored(next);
    try {
      localStorage.setItem(IGNORED_KEY, JSON.stringify(next));
    } catch {
      // Private window: ignored for this visit only.
    }
  }

  /** Applies the change; the program keeps the version before it, to go back to. */
  async function apply(p: CoachProposal): Promise<number | null> {
    const program = programs.find((x) => x.id === p.change.programId);
    if (!program?.id) return null;
    await updateProgram(program.id, applyChange(program, p.change));
    return program.id;
  }

  return { proposals, ignore, apply, planned, workouts, profile, today };
}

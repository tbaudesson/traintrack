"use client";

import { useMemo } from "react";
import { insights } from "@/lib/insights";
import { trainingLoad } from "@/lib/trainingLoad";
import { deloadAdvice } from "@/lib/deload";
import { readinessScore } from "@/hooks/useReadiness";
import type { PainReport } from "@/lib/pain";
import type { AthleteProfile, ReadinessCheckin, Workout, WorkoutSet } from "@/db";

/**
 * The insights of the last four weeks, for Performance and the home screen
 * alike: from the data the page already holds, with the training load and
 * the deload advice worked out as the app always does.
 */
export function useInsights({
  today,
  workouts,
  sets,
  pains,
  readiness,
  profile,
}: {
  today: string;
  workouts: Workout[];
  sets: WorkoutSet[];
  pains: PainReport[];
  readiness: ReadinessCheckin[];
  profile: AthleteProfile | null | undefined;
}) {
  return useMemo(() => {
    const load = trainingLoad({ today, workouts, sets });
    const deload = deloadAdvice({
      today,
      workouts,
      sets,
      readiness: readiness.map((r) => ({ date: r.date, score: readinessScore(r) })),
      deloadWeek: profile?.deloadWeek ?? undefined,
    });
    return insights({ today, workouts, sets, load, deload, pains, perWeek: (profile?.trainingDays ?? []).length });
  }, [today, workouts, sets, pains, readiness, profile]);
}

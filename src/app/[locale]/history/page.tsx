"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkouts } from "@/hooks/useWorkouts";
import { useTrainablePrograms } from "@/hooks/usePrograms";
import { useAthleteProfile } from "@/hooks/useAthleteProfile";
import { useAllWorkoutSets } from "@/hooks/useWorkoutSets";
import { PageHeader } from "@/components/layout/PageHeader";
import { HistoryView } from "@/components/domain/HistoryView";
import { plannedPrograms } from "@/lib/schedule";
import { mondayOfDate } from "@/lib/weekPlan";
import { localDate } from "@/lib/dates";

/**
 * The history on a page of its own, where the menu wheel's "History" leads:
 * the sessions done by month, as a calendar (with the planning ahead) or as
 * the year, searchable.
 */
export default function HistoryPage() {
  const t = useTranslations("log");
  const { user } = useAuth();
  const workouts = useWorkouts();
  const sets = useAllWorkoutSets();
  const programs = useTrainablePrograms();
  const profile = useAthleteProfile();
  const today = localDate();
  const weekStart = mondayOfDate(today);
  const planned = useMemo(
    () => plannedPrograms({ programs, me: user?.id, trainingDays: profile?.trainingDays ?? [], from: weekStart, moves: profile?.scheduleMoves }),
    [programs, user?.id, profile?.trainingDays, profile?.scheduleMoves, weekStart]
  );

  return (
    <>
      <PageHeader title={t("history")} />
      <div className="mx-auto max-w-5xl p-4 pb-24 md:px-6 md:pt-7">
        <HistoryView workouts={workouts} sets={sets} planned={planned} today={today} titled={false} />
      </div>
    </>
  );
}

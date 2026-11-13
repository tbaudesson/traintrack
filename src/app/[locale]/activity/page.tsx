"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useLiveQuery } from "dexie-react-hooks";
import db from "@/db";
import { useClients } from "@/hooks/useClients";
import { useExercises } from "@/hooks/useExercises";
import { buildActivity } from "@/lib/activityFeed";
import { PageHeader } from "@/components/layout/PageHeader";
import { DetailRow } from "@/components/ui/detail-row";
import { EmptyState, SectionHeading } from "@/components/ui/page-parts";
import { BellRing, Dumbbell, Loader2, Newspaper, Trophy } from "lucide-react";
import type { Workout, WorkoutSet } from "@/db";

const NO_WORKOUTS: Workout[] = [];
const NO_SETS: WorkoutSet[] = [];

/** What the coach's clients have been up to. */
export default function ActivityPage() {
  const t = useTranslations("activity");
  const { clients, loading } = useClients();
  const exercises = useExercises();
  const [now] = useState(() => Date.now());

  const ids = useMemo(() => new Set(clients.map((c) => c.userId)), [clients]);
  const workouts = useLiveQuery(() => db.workouts.filter((w) => !!w.userId && ids.has(w.userId)).toArray(), [ids]) ?? NO_WORKOUTS;
  const sets = useLiveQuery(() => db.workoutSets.filter((s) => !!s.userId && ids.has(s.userId) && !s.isWarmup).toArray(), [ids]) ?? NO_SETS;

  const { events, inactive } = useMemo(() => {
    const names = new Map(exercises.map((e) => [e.id, e.name]));
    return buildActivity({
      clients,
      workouts,
      sets,
      exerciseName: (id) => names.get(id) ?? "?",
      today: new Date(now).toISOString().split("T")[0],
    });
  }, [clients, workouts, sets, exercises, now]);

  return (
    <>
      <PageHeader title={t("title")} showBack />
      <div className="space-y-6 p-4 pb-28">
        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden="true" />
          </div>
        ) : clients.length === 0 ? (
          <EmptyState icon={Newspaper} title={t("noClients")} />
        ) : (
          <>
            {inactive.length > 0 && (
              <section className="space-y-2">
                <SectionHeading>{t("toFollowUp")}</SectionHeading>
                {inactive.map((c) => (
                  <DetailRow
                    key={c.userId}
                    href={`/messages/${c.userId}`}
                    icon={BellRing}
                    tone="neutral"
                    title={c.name}
                    subtitle={c.days === null ? t("neverTrained") : t("inactiveDays", { days: c.days })}
                  />
                ))}
              </section>
            )}

            <section className="space-y-2">
              <SectionHeading>{t("recent")}</SectionHeading>
              {events.length === 0 ? (
                <EmptyState icon={Newspaper} title={t("noEvents")} />
              ) : (
                events.map((e) =>
                  e.kind === "record" ? (
                    <DetailRow
                      key={e.key}
                      href={`/client/${e.userId}`}
                      icon={Trophy}
                      title={t("recordBy", { name: e.name })}
                      subtitle={`${e.date} · ${e.exercise} · ${e.weightKg} kg × ${e.reps}`}
                    />
                  ) : (
                    <DetailRow
                      key={e.key}
                      href={`/client/${e.userId}`}
                      icon={Dumbbell}
                      tone="neutral"
                      title={t("sessionBy", { name: e.name })}
                      subtitle={`${e.date} · ${e.cardio ?? t("sessionDetail", { sets: e.sets, volume: e.volume.toLocaleString() })}`}
                    />
                  )
                )
              )}
            </section>
          </>
        )}
      </div>
    </>
  );
}

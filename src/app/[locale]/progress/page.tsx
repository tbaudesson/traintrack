"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useAllWorkoutSets } from "@/hooks/useWorkoutSets";
import { useWorkouts } from "@/hooks/useWorkouts";
import { useBodyMetrics, addBodyMetric } from "@/hooks/useBodyMetrics";
import { useExercises } from "@/hooks/useExercises";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

function epley1rm(weight: number, reps: number): number {
  return Math.round(weight * (1 + reps / 30));
}

export default function ProgressPage() {
  const t = useTranslations("progress");
  const sets = useAllWorkoutSets();
  const workouts = useWorkouts();
  const metrics = useBodyMetrics();
  const exercises = useExercises();

  const [bw, setBw] = useState("");
  const workoutDate = useMemo(() => new Map(workouts.map((w) => [w.id, w.date])), [workouts]);

  // Volume per date (sum weight*reps of completed sets)
  const volumeData = useMemo(() => {
    const byDate = new Map<string, number>();
    for (const s of sets) {
      if (!s.completed || !s.weightKg || !s.reps) continue;
      const d = workoutDate.get(s.workoutId);
      if (!d) continue;
      byDate.set(d, (byDate.get(d) ?? 0) + s.weightKg * s.reps);
    }
    return [...byDate.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1)).map(([date, volume]) => ({ date, volume }));
  }, [sets, workoutDate]);

  // Bodyweight trend
  const bwData = useMemo(
    () =>
      metrics
        .filter((m) => m.weightKg != null)
        .map((m) => ({ date: m.date, weight: m.weightKg! }))
        .sort((a, b) => (a.date < b.date ? -1 : 1)),
    [metrics]
  );

  // 1RM for selected lift
  const liftsWithData = useMemo(() => {
    const ids = new Set(sets.filter((s) => s.weightKg && s.reps).map((s) => s.exerciseId));
    return exercises.filter((e) => e.id && ids.has(e.id));
  }, [sets, exercises]);

  const [liftId, setLiftId] = useState<number | null>(null);
  const activeLift = liftId ?? liftsWithData[0]?.id ?? null;

  const rmData = useMemo(() => {
    if (!activeLift) return [];
    const byDate = new Map<string, number>();
    for (const s of sets) {
      if (s.exerciseId !== activeLift || !s.weightKg || !s.reps) continue;
      const d = workoutDate.get(s.workoutId);
      if (!d) continue;
      const est = epley1rm(s.weightKg, s.reps);
      byDate.set(d, Math.max(byDate.get(d) ?? 0, est));
    }
    return [...byDate.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1)).map(([date, rm]) => ({ date, rm }));
  }, [sets, activeLift, workoutDate]);

  async function logBodyweight() {
    if (!bw) return;
    await addBodyMetric({ date: new Date().toISOString().split("T")[0], weightKg: Number(bw) });
    setBw("");
  }

  const hasData = volumeData.length > 0 || bwData.length > 0;

  return (
    <>
      <PageHeader title={t("title")} />
      <div className="space-y-6 p-4 pb-24">
        {/* Log bodyweight */}
        <Card>
          <CardContent className="flex items-center gap-2 py-3">
            <Input
              type="number"
              inputMode="decimal"
              placeholder={t("bodyweight") + " (kg)"}
              value={bw}
              onChange={(e) => setBw(e.target.value)}
            />
            <Button onClick={logBodyweight} disabled={!bw}>
              {t("addBodyMetric")}
            </Button>
          </CardContent>
        </Card>

        {!hasData && (
          <p className="rounded-lg bg-card/60 py-8 text-center text-sm text-muted-foreground">{t("noData")}</p>
        )}

        {volumeData.length > 0 && (
          <ChartCard title={t("volume")}>
            <LineChart data={volumeData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(120,120,120,0.15)" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} width={40} />
              <Tooltip />
              <Line type="monotone" dataKey="volume" stroke="#4F46E5" strokeWidth={2} dot={false} />
            </LineChart>
          </ChartCard>
        )}

        {liftsWithData.length > 0 && (
          <ChartCard
            title={t("estimated1rm")}
            header={
              <select
                value={activeLift ?? ""}
                onChange={(e) => setLiftId(Number(e.target.value))}
                className="rounded-md border border-border bg-transparent px-2 py-1 text-xs"
              >
                {liftsWithData.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
            }
          >
            <LineChart data={rmData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(120,120,120,0.15)" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} width={40} />
              <Tooltip />
              <Line type="monotone" dataKey="rm" stroke="#16A34A" strokeWidth={2} dot={false} />
            </LineChart>
          </ChartCard>
        )}

        {bwData.length > 0 && (
          <ChartCard title={t("bodyweight")}>
            <LineChart data={bwData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(120,120,120,0.15)" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} width={40} domain={["dataMin - 2", "dataMax + 2"]} />
              <Tooltip />
              <Line type="monotone" dataKey="weight" stroke="#EA580C" strokeWidth={2} dot={false} />
            </LineChart>
          </ChartCard>
        )}
      </div>
    </>
  );
}

function ChartCard({
  title,
  header,
  children,
}: {
  title: string;
  header?: React.ReactNode;
  children: React.ReactElement;
}) {
  return (
    <Card>
      <CardContent className="py-3">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold">{title}</h3>
          {header}
        </div>
        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            {children}
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

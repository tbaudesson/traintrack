"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useAllWorkoutSets } from "@/hooks/useWorkoutSets";
import { useWorkouts } from "@/hooks/useWorkouts";
import { useBodyMetrics, addBodyMetric } from "@/hooks/useBodyMetrics";
import { useExercises } from "@/hooks/useExercises";
import { useFeatureAccess } from "@/hooks/useFeatureAccess";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Dumbbell, Layers, Flame, Trophy } from "lucide-react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell,
} from "recharts";

function epley1rm(weight: number, reps: number): number {
  return Math.round(weight * (1 + reps / 30));
}

type ExMetric = "e1rm" | "top" | "reps" | "vol";

export default function ProgressPage() {
  const t = useTranslations("progress");
  const tex = useTranslations("exercises");
  const { hasFeature } = useFeatureAccess();
  const sets = useAllWorkoutSets();
  const workouts = useWorkouts();
  const metrics = useBodyMetrics();
  const exercises = useExercises();

  const [bw, setBw] = useState("");
  const workoutDate = useMemo(() => new Map(workouts.map((w) => [w.id, w.date])), [workouts]);
  // A set counts toward analytics once it has both weight and reps.
  const scored = useMemo(() => sets.filter((s) => s.weightKg && s.reps), [sets]);

  // ── Summary stats ──────────────────────────────────────────────
  const stats = useMemo(() => {
    const totalVolume = scored.reduce((a, s) => a + s.weightKg! * s.reps!, 0);
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];
    const weekVolume = scored.reduce((a, s) => {
      const d = workoutDate.get(s.workoutId);
      return d && d >= weekAgo ? a + s.weightKg! * s.reps! : a;
    }, 0);
    return {
      workouts: workouts.length,
      sets: sets.length,
      totalVolume: Math.round(totalVolume),
      weekVolume: Math.round(weekVolume),
    };
  }, [scored, sets, workouts, workoutDate]);

  // ── Volume per date ────────────────────────────────────────────
  const volumeData = useMemo(() => {
    const byDate = new Map<string, number>();
    for (const s of scored) {
      const d = workoutDate.get(s.workoutId);
      if (!d) continue;
      byDate.set(d, (byDate.get(d) ?? 0) + s.weightKg! * s.reps!);
    }
    return [...byDate.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1)).map(([date, volume]) => ({ date, volume }));
  }, [scored, workoutDate]);

  // ── Bodyweight ─────────────────────────────────────────────────
  const bwData = useMemo(
    () =>
      metrics
        .filter((m) => m.weightKg != null)
        .map((m) => ({ date: m.date, weight: m.weightKg! }))
        .sort((a, b) => (a.date < b.date ? -1 : 1)),
    [metrics]
  );

  // ── Per-exercise analytics ─────────────────────────────────────
  const liftsWithData = useMemo(() => {
    const ids = new Set(scored.map((s) => s.exerciseId));
    return exercises.filter((e) => e.id && ids.has(e.id));
  }, [scored, exercises]);

  const [liftId, setLiftId] = useState<number | null>(null);
  const activeLift = liftId ?? liftsWithData[0]?.id ?? null;
  const [metric, setMetric] = useState<ExMetric>("e1rm");

  const exData = useMemo(() => {
    if (!activeLift) return [];
    const byDate = new Map<string, { e1rm: number; top: number; reps: number; vol: number }>();
    for (const s of scored) {
      if (s.exerciseId !== activeLift) continue;
      const d = workoutDate.get(s.workoutId);
      if (!d) continue;
      const cur = byDate.get(d) ?? { e1rm: 0, top: 0, reps: 0, vol: 0 };
      cur.e1rm = Math.max(cur.e1rm, epley1rm(s.weightKg!, s.reps!));
      cur.top = Math.max(cur.top, s.weightKg!);
      cur.reps += s.reps!;
      cur.vol += s.weightKg! * s.reps!;
      byDate.set(d, cur);
    }
    return [...byDate.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1)).map(([date, v]) => ({ date, ...v }));
  }, [scored, activeLift, workoutDate]);

  // ── Volume by muscle group (last 30 days) ──────────────────────
  const muscleData = useMemo(() => {
    const exMg = new Map(exercises.map((e) => [e.id, e.muscleGroup]));
    const cutoff = new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];
    const byMg = new Map<string, number>();
    for (const s of scored) {
      const d = workoutDate.get(s.workoutId);
      if (!d || d < cutoff) continue;
      const mg = exMg.get(s.exerciseId) ?? "other";
      byMg.set(mg, (byMg.get(mg) ?? 0) + s.weightKg! * s.reps!);
    }
    return [...byMg.entries()]
      .map(([mg, vol]) => ({ mg, label: tex(`mg_${mg}`), vol: Math.round(vol) }))
      .sort((a, b) => b.vol - a.vol);
  }, [scored, exercises, workoutDate, tex]);

  // ── Personal records (best estimated 1RM per lift) ─────────────
  const prs = useMemo(() => {
    const best = new Map<number, number>();
    for (const s of scored) {
      const e = epley1rm(s.weightKg!, s.reps!);
      best.set(s.exerciseId, Math.max(best.get(s.exerciseId) ?? 0, e));
    }
    const exName = new Map(exercises.map((e) => [e.id, e.name]));
    return [...best.entries()]
      .map(([id, rm]) => ({ name: exName.get(id) ?? "?", rm }))
      .sort((a, b) => b.rm - a.rm)
      .slice(0, 8);
  }, [scored, exercises]);

  async function logBodyweight() {
    if (!bw) return;
    await addBodyMetric({ date: new Date().toISOString().split("T")[0], weightKg: Number(bw) });
    setBw("");
  }

  const hasData = scored.length > 0 || bwData.length > 0;
  const advanced = hasFeature("advanced_progress");
  const MUSCLE_COLORS = ["#4F46E5", "#16A34A", "#EA580C", "#DB2777", "#0891B2", "#CA8A04", "#7C3AED", "#64748B"];
  const METRIC_COLORS: Record<ExMetric, string> = { e1rm: "#16A34A", top: "#4F46E5", reps: "#EA580C", vol: "#0891B2" };

  return (
    <>
      <PageHeader title={t("title")} />
      <div className="space-y-6 p-4 pb-24">
        {/* Summary */}
        {scored.length > 0 && (
          <div className="grid grid-cols-2 gap-3">
            <StatCard icon={Dumbbell} value={stats.workouts} label={t("workouts")} />
            <StatCard icon={Layers} value={stats.sets} label={t("sets")} />
            <StatCard icon={Flame} value={stats.totalVolume.toLocaleString()} label={`${t("totalVolume")} (kg)`} />
            <StatCard icon={Flame} value={stats.weekVolume.toLocaleString()} label={`${t("thisWeek")} (kg)`} />
          </div>
        )}

        {/* Log bodyweight */}
        <Card>
          <CardContent className="flex items-center gap-2 py-3">
            <Input
              type="number" inputMode="decimal"
              placeholder={t("bodyweight") + " (kg)"}
              value={bw} onChange={(e) => setBw(e.target.value)}
            />
            <Button onClick={logBodyweight} disabled={!bw}>{t("addBodyMetric")}</Button>
          </CardContent>
        </Card>

        {!hasData && (
          <p className="rounded-lg bg-card/60 py-8 text-center text-sm text-muted-foreground">{t("noData")}</p>
        )}

        {/* Volume over time */}
        {volumeData.length > 0 && (
          <ChartCard title={t("volume")}>
            <LineChart data={volumeData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(120,120,120,0.15)" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} width={44} />
              <Tooltip />
              <Line type="monotone" dataKey="volume" stroke="#4F46E5" strokeWidth={2} dot={false} />
            </LineChart>
          </ChartCard>
        )}

        {/* Per-exercise progression */}
        {advanced && liftsWithData.length > 0 && (
          <Card>
            <CardContent className="py-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold">{t("byExercise")}</h3>
                <select
                  value={activeLift ?? ""}
                  onChange={(e) => setLiftId(Number(e.target.value))}
                  className="max-w-[55%] truncate rounded-md border border-border bg-transparent px-2 py-1 text-xs"
                >
                  {liftsWithData.map((l) => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
                </select>
              </div>
              <div className="mb-2 flex flex-wrap gap-1.5">
                {(["e1rm", "top", "reps", "vol"] as ExMetric[]).map((m) => (
                  <button
                    key={m}
                    onClick={() => setMetric(m)}
                    className={cn(
                      "rounded-full border px-2.5 py-1 text-xs",
                      metric === m ? "border-accent-500 bg-accent-50 text-accent-700 dark:bg-accent-950/40" : "border-border text-muted-foreground"
                    )}
                  >
                    {t(`metric_${m}`)}
                  </button>
                ))}
              </div>
              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={exData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(120,120,120,0.15)" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} width={44} />
                    <Tooltip />
                    <Line type="monotone" dataKey={metric} stroke={METRIC_COLORS[metric]} strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Volume by muscle group */}
        {advanced && muscleData.length > 0 && (
          <ChartCard title={t("muscleVolume")}>
            <BarChart data={muscleData} layout="vertical" margin={{ left: 8, right: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(120,120,120,0.15)" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10 }} />
              <YAxis type="category" dataKey="label" tick={{ fontSize: 10 }} width={70} />
              <Tooltip />
              <Bar dataKey="vol" radius={[0, 4, 4, 0]}>
                {muscleData.map((_, i) => (
                  <Cell key={i} fill={MUSCLE_COLORS[i % MUSCLE_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ChartCard>
        )}

        {/* Personal records */}
        {advanced && prs.length > 0 && (
          <Card>
            <CardContent className="py-3">
              <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
                <Trophy className="h-4 w-4 text-amber-500" /> {t("prs")}
              </h3>
              <div className="space-y-1">
                {prs.map((p) => (
                  <div key={p.name} className="flex items-center gap-2 text-sm">
                    <span className="flex-1 truncate">{p.name}</span>
                    <span className="font-semibold tabular-nums">{p.rm} <span className="text-xs font-normal text-muted-foreground">kg</span></span>
                  </div>
                ))}
              </div>
              <p className="mt-1.5 text-[11px] text-muted-foreground">{t("prsHint")}</p>
            </CardContent>
          </Card>
        )}

        {/* Bodyweight */}
        {bwData.length > 0 && (
          <ChartCard title={t("bodyweight")}>
            <LineChart data={bwData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(120,120,120,0.15)" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} width={44} domain={["dataMin - 2", "dataMax + 2"]} />
              <Tooltip />
              <Line type="monotone" dataKey="weight" stroke="#EA580C" strokeWidth={2} dot={false} />
            </LineChart>
          </ChartCard>
        )}
      </div>
    </>
  );
}

function StatCard({ icon: Icon, value, label }: { icon: React.ComponentType<{ className?: string }>; value: string | number; label: string }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-1 py-4">
        <Icon className="h-5 w-5 text-accent-500" />
        <p className="text-xl font-bold tabular-nums">{value}</p>
        <p className="text-center text-[11px] text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactElement }) {
  return (
    <Card>
      <CardContent className="py-3">
        <h3 className="mb-2 text-sm font-semibold">{title}</h3>
        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            {children}
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

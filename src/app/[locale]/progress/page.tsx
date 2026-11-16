"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useAllWorkoutSets } from "@/hooks/useWorkoutSets";
import { useWorkouts } from "@/hooks/useWorkouts";
import { useBodyMetrics, addBodyMetric } from "@/hooks/useBodyMetrics";
import { useExercises } from "@/hooks/useExercises";
import { useAthleteProfile } from "@/hooks/useAthleteProfile";
import { GoalsSection } from "@/components/domain/GoalsSection";
import { WeeklyReportCard } from "@/components/domain/WeeklyReportCard";
import { Recommendations } from "@/components/domain/Recommendations";
import { usePainReports } from "@/hooks/usePain";
import { useReadiness } from "@/hooks/useReadiness";
import { useInsights } from "@/hooks/useInsights";
import { trainingLoad } from "@/lib/trainingLoad";
import { TrainingLoadCard } from "@/components/domain/TrainingLoadCard";
import { InsightAction, InsightCard, MoreInsights } from "@/components/domain/InsightCard";
import type { InsightChart } from "@/lib/insights";
import { mondayOfDate } from "@/lib/weekPlan";
import { useFeatureAccess } from "@/hooks/useFeatureAccess";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Dumbbell, Trophy, TrendingUp, ChevronRight, FileText } from "lucide-react";
import { DetailRow } from "@/components/ui/detail-row";
import { Link } from "@/i18n/navigation";
import { useCompetitions } from "@/hooks/useCompetitions";
import { useAppPrefs } from "@/hooks/useAppPrefs";
import { CompetitionResults } from "@/components/domain/CompetitionResults";
import { EmptyState } from "@/components/ui/page-parts";
import { CardioProgress } from "@/components/domain/CardioProgress";
import { isCardioDone } from "@/lib/cardio";
import { detectSport, kindOf } from "@/lib/activityProfile";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell,
} from "recharts";
import { localDate, localDateIn } from "@/lib/dates";
import { useExerciseLabel } from "@/lib/exerciseNames";
import { useFormat } from "@/lib/format";

function epley1rm(weight: number, reps: number): number {
  return Math.round(weight * (1 + reps / 30));
}

type ExMetric = "e1rm" | "top" | "reps" | "vol";

export default function ProgressPage() {
  const t = useTranslations("progress");
  const tcomp = useTranslations("competitions");
  const tm = useTranslations("monthly");
  const competitions = useCompetitions();
  const prefs = useAppPrefs();
  const { num, day } = useFormat();
  const xl = useExerciseLabel();
  const tex = useTranslations("exercises");
  const { hasFeature } = useFeatureAccess();
  const sets = useAllWorkoutSets();
  const workouts = useWorkouts();
  const metrics = useBodyMetrics();
  const exercises = useExercises();
  const athlete = useAthleteProfile();
  const pains = usePainReports();
  const readiness = useReadiness();

  const [bw, setBw] = useState("");
  const [now] = useState(() => Date.now());
  const workoutDate = useMemo(() => new Map(workouts.map((w) => [w.id, w.date])), [workouts]);
  // A set counts toward analytics once it has both weight and reps.
  const scored = useMemo(() => sets.filter((s) => s.weightKg && s.reps), [sets]);

  // The sport practised decides what comes first.
  const today = localDate();
  const activity = kindOf(prefs.sport ?? (prefs.allSports ? null : detectSport({ today, workouts, sets }))) ?? "strength";

  // ── Bodyweight exercises: the most repetitions (or seconds) of a session ──
  const bodyweightSets = useMemo(() => sets.filter((s) => s.completed && !s.isWarmup && (s.reps ?? 0) > 0 && !(s.weightKg && s.weightKg > 0)), [sets]);
  const bodyweightLifts = useMemo(() => {
    const count = new Map<number, number>();
    for (const s of bodyweightSets) count.set(s.exerciseId, (count.get(s.exerciseId) ?? 0) + 1);
    return exercises.filter((e) => e.id && count.has(e.id)).sort((a, b) => count.get(b.id!)! - count.get(a.id!)!);
  }, [bodyweightSets, exercises]);
  const [bodyId, setBodyId] = useState<number | null>(null);
  const activeBody = bodyId ?? bodyweightLifts[0]?.id ?? null;
  const bodyData = useMemo(() => {
    const best = new Map<string, number>();
    for (const s of bodyweightSets) {
      if (s.exerciseId !== activeBody) continue;
      const d = workoutDate.get(s.workoutId);
      if (d) best.set(d, Math.max(best.get(d) ?? 0, s.reps!));
    }
    return [...best.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1)).map(([date, reps]) => ({ date, reps }));
  }, [bodyweightSets, activeBody, workoutDate]);
  const bodyBests = useMemo(
    () =>
      bodyweightLifts.slice(0, 8).map((e) => ({
        id: e.id!,
        name: xl(e.name),
        best: Math.max(...bodyweightSets.filter((s) => s.exerciseId === e.id).map((s) => s.reps!)),
      })),
    [bodyweightLifts, bodyweightSets, xl]
  );

  // ── Summary stats ──────────────────────────────────────────────

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

  // ── The main insight of the last four weeks ────────────────────
  const reading = useInsights({ today, workouts, sets, pains, readiness, profile: athlete });
  // The training load as the app computes it, shown in its section.
  const load = useMemo(() => trainingLoad({ today, workouts, sets }), [today, workouts, sets]);
  const exerciseName = (id: number) => exercises.find((e) => e.id === id)?.name;
  // ── Volume by muscle group (last 30 days) ──────────────────────
  const muscleData = useMemo(() => {
    const exMg = new Map(exercises.map((e) => [e.id, e.muscleGroup]));
    const cutoff = localDateIn(-30, now);
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
  }, [scored, exercises, workoutDate, tex, now]);

  // ── Personal records (best estimated 1RM per lift) ─────────────
  const prs = useMemo(() => {
    const best = new Map<number, number>();
    for (const s of scored) {
      const e = epley1rm(s.weightKg!, s.reps!);
      best.set(s.exerciseId, Math.max(best.get(s.exerciseId) ?? 0, e));
    }
    const exName = new Map(exercises.map((e) => [e.id, xl(e.name)]));
    return [...best.entries()]
      .map(([id, rm]) => ({ name: exName.get(id) ?? "?", rm }))
      .sort((a, b) => b.rm - a.rm)
      .slice(0, 8);
  }, [scored, exercises, xl]);

  async function logBodyweight() {
    if (!bw) return;
    await addBodyMetric({ date: localDate(), weightKg: Number(bw) });
    setBw("");
  }

  const hasData = scored.length > 0 || bwData.length > 0;
  const advanced = hasFeature("advanced_progress");
  const MUSCLE_COLORS = ["#4F46E5", "#16A34A", "#EA580C", "#DB2777", "#0891B2", "#CA8A04", "#7C3AED", "#64748B"];
  const METRIC_COLORS: Record<ExMetric, string> = { e1rm: "#16A34A", top: "#4F46E5", reps: "#EA580C", vol: "#0891B2" };

  const bodyweightSection = (
    <Card>
      <CardContent className="space-y-3 py-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold">{t("bodyweightTitle")}</h3>
          <select
            value={activeBody ?? ""}
            onChange={(e) => setBodyId(Number(e.target.value))}
            aria-label={t("byExercise")}
            className="max-w-[55%] truncate rounded-md border border-border bg-transparent px-2 py-1 text-xs"
          >
            {bodyweightLifts.map((l) => (
              <option key={l.id} value={l.id}>{xl(l.name)}</option>
            ))}
          </select>
        </div>
        <div className="h-44 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={bodyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(120,120,120,0.15)" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(d: string) => day(d).slice(0, 5)} />
              <YAxis tick={{ fontSize: 10 }} width={32} allowDecimals={false} />
              <Tooltip />
              <Line type="monotone" dataKey="reps" name={t("bestSet")} stroke="#EA580C" strokeWidth={2} dot />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <ul className="space-y-1 text-sm">
          {bodyBests.map((b) => (
            <li key={b.id} className="flex items-center gap-2">
              <Trophy className="h-3.5 w-3.5 shrink-0 text-amber-500" aria-hidden="true" />
              <span className="flex-1 truncate">{b.name}</span>
              <span className="font-semibold tabular-nums">{num(b.best, 0)}</span>
            </li>
          ))}
        </ul>
        <p className="text-xs text-muted-foreground">{t("bodyweightHint")}</p>
      </CardContent>
    </Card>
  );

  // A piece of evidence opens its chart: unfolded, brought into view and focused.
  const charts: Record<InsightChart, boolean> = {
    volume: volumeData.length > 0,
    exercise: advanced && liftsWithData.length > 0,
    records: advanced && prs.length > 0,
    load: !!load,
    distance: workouts.some(isCardioDone),
  };
  function showChart(chart: InsightChart, exerciseId?: number) {
    if (chart === "exercise" && exerciseId !== undefined) setLiftId(exerciseId);
    requestAnimationFrame(() => {
      const el = document.getElementById(`chart-${chart}`);
      if (!el) return;
      const fold = el.closest("details");
      if (fold) fold.open = true;
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      (fold?.querySelector("summary") ?? el).focus({ preventScroll: true });
    });
  }

  return (
    <>
      <PageHeader title={t("title")} />
      <div className="mx-auto max-w-5xl space-y-6 p-4 pb-24">
        {/* What the last four weeks say: the main insight, its evidence and the thing to do; the other readings beside it. */}
        <div className="space-y-4 md:grid md:grid-cols-[3fr_2fr] md:items-start md:gap-4 md:space-y-0">
          {reading.insights[0] && (
            <InsightCard insight={reading.insights[0]} period={reading.period} exerciseName={exerciseName} canShow={(c) => charts[c]} onShowChart={showChart}>
              <InsightAction insight={reading.insights[0]} exerciseName={exerciseName} />
            </InsightCard>
          )}
          <div className="space-y-4">
            <MoreInsights items={reading.insights.slice(1)} exerciseName={exerciseName} />
            {/* All of today's advice; the home screen shows the first one only. */}
            <Recommendations limit={99} />
          </div>
        </div>

        {/* Load and regularity: the training load (folded) and last week's report. */}
        {(load || hasFeature("reports")) && (
          <section className="space-y-2">
            <h2 className="t-section-heading">{t("sectionLoad")}</h2>
            {load && (
              <Fold id="chart-load" title={t("loadChart")}>
                <TrainingLoadCard load={load} />
              </Fold>
            )}
            {hasFeature("reports") && (
              <WeeklyReportCard
                workouts={workouts}
                sets={sets}
                exercises={exercises}
                trainingDays={athlete?.trainingDays}
                pains={pains}
                lastMonday={mondayOfDate(localDateIn(-7, now))}
              />
            )}
          </section>
        )}

        {/* Strength goals (an estimated 1RM to reach): for those who lift, or who set one. */}
        {(activity === "strength" || (athlete?.strengthGoals ?? []).length > 0) && (
          <GoalsSection profile={athlete} workouts={workouts} sets={sets} exercises={exercises} editable />
        )}

        {hasFeature("reports") && (
          <section className="space-y-2">
            <h2 className="t-section-heading">{t("sectionReport")}</h2>
            <DetailRow href="/report" icon={FileText} title={tm("open")} subtitle={tm("openHint")} />
          </section>
        )}

        {/* One's own figures: outings, bodyweight work, bodyweight. */}
        <section className="space-y-2">
          <h2 className="t-section-heading">{t("sectionMine")}</h2>
          <div id="chart-distance" tabIndex={-1} className="scroll-mt-20 outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <CardioProgress workouts={workouts} />
          </div>
          {bodyweightLifts.length > 0 && (activity === "bodyweight" || scored.length === 0) && bodyweightSection}
          <Card>
            <CardContent className="flex items-end gap-2 py-3">
              <label className="min-w-0 flex-1 text-sm font-medium">
                {t("bodyweight")}
                <Input
                  type="number" inputMode="decimal"
                  placeholder="kg"
                  value={bw} onChange={(e) => setBw(e.target.value)}
                  className="mt-1"
                />
              </label>
              <Button onClick={logBodyweight} disabled={!bw}>{t("addBodyMetric")}</Button>
            </CardContent>
          </Card>
        </section>

        {/* Vaulting competitions: shown once there is one, or for a vaulter. */}
        {hasFeature("vaulting") && (competitions.length > 0 || prefs.sport === "vaulting") && (
          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="t-section-heading">{tcomp("title")}</h2>
              <Link href="/competitions" className="flex min-h-10 items-center gap-1 text-sm font-medium text-accent-text">
                {competitions.length ? tcomp("seeAll") : tcomp("add")}
                <ChevronRight className="size-4" aria-hidden="true" />
              </Link>
            </div>
            {competitions.length > 0 ? (
              <CompetitionResults results={competitions.slice(0, 3)} />
            ) : (
              <p className="text-sm text-muted-foreground">{tcomp("empty")}</p>
            )}
          </section>
        )}

        {!hasData && bodyweightSets.length === 0 && !workouts.some(isCardioDone) && (
          <EmptyState icon={TrendingUp} title={t("noData")} />
        )}

        {/* Bodyweight logged but no workout sets yet → explain the empty analytics. */}
        {scored.length === 0 && bodyweightSets.length === 0 && bwData.length > 0 && (
          <div className="flex items-start gap-3 rounded-lg border border-dashed border-border p-4">
            <Dumbbell className="mt-0.5 h-5 w-5 shrink-0 text-accent-500" />
            <p className="text-sm text-muted-foreground">{t("analyticsHint")}</p>
          </div>
        )}

        {/* The charts, folded on every screen; a piece of evidence opens its own. */}
        {(volumeData.length > 0 || (advanced && (liftsWithData.length > 0 || muscleData.length > 0 || prs.length > 0)) || bwData.length > 0) && (
          <section className="space-y-2">
            <div>
              <h2 className="t-section-heading">{t("sectionDetails")}</h2>
              <p className="text-sm text-muted-foreground">{t("detailsHint")}</p>
            </div>
            {volumeData.length > 0 && (
              <Fold id="chart-volume" title={t("volume")}>
                <ChartBox>
                  <LineChart data={volumeData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(120,120,120,0.15)" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(d: string) => day(d).slice(0, 5)} />
                    <YAxis tick={{ fontSize: 10 }} width={44} tickFormatter={(v: number) => num(v)} />
                    <Tooltip />
                    <Line type="monotone" dataKey="volume" stroke="#4F46E5" strokeWidth={2} dot={false} />
                  </LineChart>
                </ChartBox>
              </Fold>
            )}

            {advanced && liftsWithData.length > 0 && (
              <Fold id="chart-exercise" title={t("byExercise")}>
            <CardContent className="py-3">
              <div className="mb-2 flex items-center justify-end gap-2">
                <select
                  aria-label={t("byExercise")}
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
                      metric === m ? "border-accent-500 bg-accent-50 text-accent-700 dark:bg-accent-950/40 dark:text-accent-200" : "border-border text-muted-foreground"
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
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(d: string) => day(d).slice(0, 5)} />
                    <YAxis tick={{ fontSize: 10 }} width={44} tickFormatter={(v: number) => num(v)} />
                    <Tooltip />
                    <Line type="monotone" dataKey={metric} stroke={METRIC_COLORS[metric]} strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
              </Fold>
            )}

            {advanced && muscleData.length > 0 && (
              <Fold id="chart-muscles" title={t("muscleVolume")}>
                <ChartBox>
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
                </ChartBox>
              </Fold>
            )}

            {advanced && prs.length > 0 && (
              <Fold id="chart-records" title={t("prs")}>
                <div className="px-4 pb-3">
              <div className="space-y-1">
                {prs.map((p) => (
                  <div key={p.name} className="flex items-center gap-2 text-sm">
                    <span className="flex-1 truncate">{p.name}</span>
                    <span className="font-semibold tabular-nums">{p.rm} <span className="text-xs font-normal text-muted-foreground">kg</span></span>
                  </div>
                ))}
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground">{t("prsHint")}</p>
                </div>
              </Fold>
            )}

            {bwData.length > 0 && (
              <Fold id="chart-bodyweight" title={t("bodyweight")}>
                <ChartBox>
                  <LineChart data={bwData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(120,120,120,0.15)" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(d: string) => day(d).slice(0, 5)} />
                    <YAxis tick={{ fontSize: 10 }} width={44} domain={["dataMin - 2", "dataMax + 2"]} />
                    <Tooltip />
                    <Line type="monotone" dataKey="weight" stroke="#EA580C" strokeWidth={2} dot={false} />
                  </LineChart>
                </ChartBox>
              </Fold>
            )}
          </section>
        )}
      </div>
    </>
  );
}

/** A part of the page folded under its title: opened on demand, or by a piece of evidence. */
function Fold({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <details id={id} className="t-surface scroll-mt-20 rounded-2xl ring-1 ring-foreground/5">
      <summary className="flex min-h-12 cursor-pointer items-center gap-2 rounded-2xl px-4 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring">{title}</summary>
      {children}
    </details>
  );
}

/** A chart's drawing area. */
function ChartBox({ children }: { children: React.ReactElement }) {
  return (
    <div className="h-48 w-full px-2 pb-3">
      <ResponsiveContainer width="100%" height="100%">
        {children}
      </ResponsiveContainer>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { CheckCircle2, Goal as GoalIcon, Plus, Star, Trash2 } from "lucide-react";
import type { BodyMetric, Exercise, Goal, GoalType, Sport, Workout, WorkoutSet } from "@/db";
import { createGoal, deleteGoal, setMainGoal, useGoals } from "@/hooks/useGoals";
import { goalStatus, startValueFor, type GoalData, type GoalStatus } from "@/lib/goalTracking";
import { DISTANCE_SPORTS, formatDistance } from "@/lib/cardio";
import { sportDef } from "@/lib/disciplines";
import { formatClock, parseClock } from "@/lib/clock";
import { localDate } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useExerciseLabel } from "@/lib/exerciseNames";
import { useFormat } from "@/lib/format";

const SELECT = "mt-1 h-11 w-full rounded-lg border border-input bg-card px-3 text-base";
const TYPES: GoalType[] = ["time", "distance", "frequency", "strength", "weight"];
const FREQUENCY_SCOPES = ["all", "strength", "mobility", ...DISTANCE_SPORTS.filter((s) => s !== "other")];

/** The words and figures of a goal: what it is, what it aims at, where it stands. */
export function useGoalText() {
  const t = useTranslations("goals");
  const tc = useTranslations("cardio");
  const { num, day } = useFormat();
  const xl = useExerciseLabel();
  const sport = (s: string | null | undefined) => (s ? tc(`sport_${s}`) : "");
  const scope = (s: string | null | undefined) => (!s || s === "all" ? t("scope_all") : s === "strength" || s === "mobility" ? t(`scope_${s}`) : sport(s));
  const distance = (m: number, s?: string | null) => formatDistance(m, (s as Sport) ?? null);

  const value = (goal: Goal, v: number) => {
    switch (goal.type) {
      case "strength":
      case "weight":
        return `${num(v)} kg`;
      case "time":
        return formatClock(v);
      case "distance":
        return distance(v, goal.scope);
      case "frequency":
        return t("perWeek", { count: v });
    }
  };

  const title = (goal: Goal) => {
    switch (goal.type) {
      case "strength":
        return xl(goal.exerciseName ?? "");
      case "time":
        return t("titleTime", { sport: sport(goal.scope), distance: distance(goal.distanceM ?? 0, goal.scope) });
      case "distance":
        return t("titleDistance", { sport: sport(goal.scope) });
      case "frequency":
        return t("titleFrequency", { scope: scope(goal.scope) });
      case "weight":
        return t("titleWeight");
    }
  };

  const target = (goal: Goal) =>
    [t(goal.type === "time" ? "targetUnder" : "targetValue", { value: value(goal, goal.targetValue) }), goal.deadline ? t("deadline", { date: day(goal.deadline) }) : null]
      .filter(Boolean)
      .join(" · ");

  const status = (goal: Goal, s: GoalStatus) => {
    if (s.achievedOn) return t("achieved", { date: day(s.achievedOn) });
    if (s.current === null) return t("noData");
    const now = t("current", { value: value(goal, s.current) });
    if (goal.type === "strength") return `${now} · ${s.projectedOn ? t(s.onTrack === false ? "projectedLate" : "projected", { date: day(s.projectedOn) }) : t("notEnough")}`;
    if (s.onTrack === false) return `${now} · ${t(goal.type === "frequency" ? "belowPace" : "behind")}`;
    if (s.onTrack === true) return `${now} · ${t("onTrack")}`;
    return now;
  };

  return { title, target, status, value };
}

/** One goal: its name, its target, a bar from where it started to the target, and where it stands. */
export function GoalCard({ goal, data, editable }: { goal: Goal; data: GoalData; editable: boolean }) {
  const t = useTranslations("goals");
  const text = useGoalText();
  const s = goalStatus(goal, data);
  const late = !s.achievedOn && s.onTrack === false;
  return (
    <Card>
      <CardContent className="space-y-2 py-3">
        <div className="flex items-start gap-1">
          <div className="min-w-0 flex-1">
            <p className="font-medium">
              {goal.priority === 1 && <Star className="mr-1 inline h-4 w-4 -translate-y-px fill-amber-400 text-amber-500" role="img" aria-label={t("main")} />}
              {text.title(goal)}
            </p>
            <p className="text-xs text-muted-foreground">{text.target(goal)}</p>
          </div>
          {editable && goal.id !== undefined && (
            <>
              <button
                type="button"
                onClick={() => setMainGoal(goal.id!, goal.priority !== 1)}
                aria-pressed={goal.priority === 1}
                aria-label={t("setMain")}
                className="grid size-11 shrink-0 place-items-center rounded-md text-muted-foreground hover:text-amber-500"
              >
                <Star className={cn("h-4 w-4", goal.priority === 1 && "fill-amber-400 text-amber-500")} aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => {
                  if (window.confirm(t("deleteConfirm"))) void deleteGoal(goal.id!);
                }}
                aria-label={t("delete")}
                className="grid size-11 shrink-0 place-items-center rounded-md text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </button>
            </>
          )}
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-muted" role="progressbar" aria-label={text.title(goal)} aria-valuenow={Math.round(s.share * 100)} aria-valuemin={0} aria-valuemax={100}>
          <div className={cn("h-full rounded-full", s.achievedOn ? "bg-green-500" : late ? "bg-amber-500" : "bg-accent-500")} style={{ width: `${Math.max(3, s.share * 100)}%` }} />
        </div>
        <p className={cn("flex items-center gap-1.5 text-sm", s.achievedOn ? "font-medium text-success-text" : "text-muted-foreground")}>
          {s.achievedOn && <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />}
          {text.status(goal, s)}
        </p>
      </CardContent>
    </Card>
  );
}

/**
 * The athlete's goals, of every kind: a time on a distance, a distance, a
 * number of sessions a week, a lift, a weight. Editable by the athlete,
 * read-only for the coach.
 */
export function GoalsSection({
  userId,
  workouts,
  sets,
  exercises,
  bodyMetrics,
  editable,
}: {
  /** A client's goals, for a coach; one's own otherwise. */
  userId?: string | null;
  workouts: Workout[];
  sets: WorkoutSet[];
  exercises: Exercise[];
  bodyMetrics: BodyMetric[];
  editable: boolean;
}) {
  const t = useTranslations("goals");
  const goals = useGoals(userId);
  const [adding, setAdding] = useState(false);
  const data: GoalData = { today: localDate(), workouts, sets, exercises, bodyMetrics };

  if (!editable && goals.length === 0) return null;

  return (
    <section id="goals" className="scroll-mt-20 space-y-2">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          <GoalIcon className="h-5 w-5 text-accent-text" aria-hidden="true" />
          {editable ? t("title") : t("titleOther")}
        </h2>
        {editable && (
          <Button size="sm" variant="outline" onClick={() => setAdding(true)}>
            <Plus className="mr-1 h-4 w-4" aria-hidden="true" />
            {t("add")}
          </Button>
        )}
      </div>
      {editable && goals.length === 0 && <p className="text-sm text-muted-foreground">{t("emptyAny")}</p>}
      {goals.map((goal) => (
        <GoalCard key={goal.uuid} goal={goal} data={data} editable={editable} />
      ))}
      {editable && <NewGoalDialog open={adding} onOpenChange={setAdding} data={data} isFirst={goals.length === 0} />}
    </section>
  );
}

/**
 * A goal in three answers: what it measures, the target, and maybe a date.
 * The fields change with the kind of goal; nothing else is asked.
 */
function NewGoalDialog({ open, onOpenChange, data, isFirst }: { open: boolean; onOpenChange: (o: boolean) => void; data: GoalData; isFirst: boolean }) {
  const t = useTranslations("goals");
  const tc = useTranslations("cardio");
  const xl = useExerciseLabel();
  const [type, setType] = useState<GoalType>("time");
  const [sport, setSport] = useState<Sport>("run");
  const [scope, setScope] = useState("all");
  const [exerciseId, setExerciseId] = useState<number | "">("");
  const [distance, setDistance] = useState("");
  const [target, setTarget] = useState("");
  const [perWeek, setPerWeek] = useState(3);
  const [deadline, setDeadline] = useState("");
  const [main, setMain] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const isMain = main ?? isFirst;

  const unit = sportDef(sport)?.distanceUnit === "m" ? "m" : "km";
  const metres = (text: string) => (Number(text.replace(",", ".")) || 0) * (unit === "m" ? 1 : 1000);
  const trained = new Set(data.sets.filter((s) => s.completed).map((s) => s.exerciseId));
  const choices = [...data.exercises].sort((a, b) => Number(trained.has(b.id!)) - Number(trained.has(a.id!)) || xl(a.name).localeCompare(xl(b.name)));

  // The goal as typed, or null while something is missing.
  const draft = ((): Parameters<typeof createGoal>[0] | null => {
    const kg = Number(target.replace(",", "."));
    switch (type) {
      case "strength": {
        const e = data.exercises.find((x) => x.id === exerciseId);
        return e && kg > 0 ? { type, exerciseUuid: e.uuid, exerciseName: e.name, targetValue: kg } : null;
      }
      case "time": {
        const seconds = parseClock(target);
        const m = metres(distance);
        return seconds && m > 0 ? { type, scope: sport, distanceM: m, targetValue: seconds } : null;
      }
      case "distance": {
        const m = metres(target);
        return m > 0 ? { type, scope: sport, targetValue: m } : null;
      }
      case "frequency":
        return { type, scope, targetValue: perWeek };
      case "weight":
        return kg > 0 ? { type, targetValue: kg } : null;
    }
  })();

  async function save() {
    if (!draft || busy) return;
    setBusy(true);
    try {
      await createGoal({ ...draft, startValue: startValueFor(draft, data), deadline: deadline || null, priority: isMain ? 1 : 2 });
      onOpenChange(false);
      setTarget("");
      setDistance("");
      setDeadline("");
      setMain(null);
    } finally {
      setBusy(false);
    }
  }

  const chip = (on: boolean) => cn("min-h-11 rounded-full border px-3 text-sm font-medium", on ? "border-accent-500 bg-accent-500 text-white" : "border-border hover:bg-muted");
  const sportChips = (
    <fieldset>
      <legend className="mb-1.5 text-sm font-medium">{t("sport")}</legend>
      <div className="flex flex-wrap gap-2">
        {DISTANCE_SPORTS.filter((s) => s !== "other").map((s) => (
          <button key={s} type="button" aria-pressed={sport === s} onClick={() => setSport(s)} className={chip(sport === s)}>
            {tc(`sport_${s}`)}
          </button>
        ))}
      </div>
    </fieldset>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("add")}</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
        >
          <fieldset>
            <legend className="mb-1.5 text-sm font-medium">{t("kind")}</legend>
            <div className="flex flex-wrap gap-2">
              {TYPES.map((k) => (
                <button
                  key={k}
                  type="button"
                  aria-pressed={type === k}
                  onClick={() => {
                    setType(k);
                    setTarget("");
                  }}
                  className={chip(type === k)}
                >
                  {t(`type_${k}`)}
                </button>
              ))}
            </div>
          </fieldset>

          {type === "strength" && (
            <>
              <label className="block text-sm font-medium">
                {t("exercise")}
                <select value={exerciseId} onChange={(e) => setExerciseId(e.target.value ? Number(e.target.value) : "")} className={SELECT}>
                  <option value="">—</option>
                  {choices.map((e) => <option key={e.id} value={e.id}>{xl(e.name)}</option>)}
                </select>
              </label>
              <label className="block text-sm font-medium">
                {t("targetLabel")}
                <Input inputMode="decimal" value={target} onChange={(e) => setTarget(e.target.value)} placeholder="100" className="mt-1" />
              </label>
              <p className="text-xs text-muted-foreground">{t("hint")}</p>
            </>
          )}

          {type === "time" && (
            <>
              {sportChips}
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-sm font-medium">
                  {t("distanceIn", { unit })}
                  <Input inputMode="decimal" value={distance} onChange={(e) => setDistance(e.target.value)} placeholder={unit === "m" ? "1500" : "10"} className="mt-1" />
                </label>
                <label className="block text-sm font-medium">
                  {t("timeLabel")}
                  <Input value={target} onChange={(e) => setTarget(e.target.value)} placeholder="50:00" className="mt-1" />
                </label>
              </div>
            </>
          )}

          {type === "distance" && (
            <>
              {sportChips}
              <label className="block text-sm font-medium">
                {t("distanceTarget", { unit })}
                <Input inputMode="decimal" value={target} onChange={(e) => setTarget(e.target.value)} placeholder={unit === "m" ? "20000" : "200"} className="mt-1" />
              </label>
            </>
          )}

          {type === "frequency" && (
            <>
              <fieldset>
                <legend className="mb-1.5 text-sm font-medium">{t("what")}</legend>
                <div className="flex flex-wrap gap-2">
                  {FREQUENCY_SCOPES.map((s) => (
                    <button key={s} type="button" aria-pressed={scope === s} onClick={() => setScope(s)} className={chip(scope === s)}>
                      {s === "all" || s === "strength" || s === "mobility" ? t(`scope_${s}`) : tc(`sport_${s}`)}
                    </button>
                  ))}
                </div>
              </fieldset>
              <fieldset>
                <legend className="mb-1.5 text-sm font-medium">{t("sessionsPerWeek")}</legend>
                <div className="flex flex-wrap gap-2">
                  {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                    <button key={n} type="button" aria-pressed={perWeek === n} aria-label={t("perWeek", { count: n })} onClick={() => setPerWeek(n)} className={cn(chip(perWeek === n), "w-11 px-0 tabular-nums")}>
                      {n}
                    </button>
                  ))}
                </div>
              </fieldset>
            </>
          )}

          {type === "weight" && (
            <label className="block text-sm font-medium">
              {t("weightLabel")}
              <Input inputMode="decimal" value={target} onChange={(e) => setTarget(e.target.value)} placeholder="75" className="mt-1" />
            </label>
          )}

          <label className="block text-sm font-medium">
            {t("deadlineLabel")}
            <Input type="date" value={deadline} min={data.today} onChange={(e) => setDeadline(e.target.value)} className="mt-1" />
          </label>
          <label className="flex min-h-11 items-center gap-2 text-sm">
            <input type="checkbox" checked={isMain} onChange={(e) => setMain(e.target.checked)} className="size-5" />
            {t("mainLabel")}
          </label>
          <Button type="submit" className="w-full" disabled={!draft || busy}>
            {t("save")}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Play, Shuffle, Timer } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { useAthleteProfileOrNull } from "@/hooks/useAthleteProfile";
import { useExercises, createCustomExercise } from "@/hooks/useExercises";
import { createWorkout } from "@/hooks/useWorkouts";
import { addWorkoutSet } from "@/hooks/useWorkoutSets";
import {
  INTERVAL_FOCUSES,
  INTERVAL_MINUTES,
  INTERVAL_PATTERNS,
  buildIntervalSession,
  defaultPattern,
  patternSeconds,
  type IntervalFocus,
  type IntervalPattern,
  type IntervalPlan,
} from "@/lib/intervals";
import { localDate } from "@/lib/dates";
import { unlockAudio } from "@/lib/beep";
import { useExerciseLabel } from "@/lib/exerciseNames";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/layout/PageHeader";
import { SectionHeading } from "@/components/ui/page-parts";
import { Button } from "@/components/ui/button";
import { IntervalPlayer, type IntervalResult } from "@/components/domain/IntervalPlayer";

const SAVED = "traintrack-interval-plan";
const newSeed = () => Math.floor(Math.random() * 1_000_000) + 1;

/** A plan from the link ("Do it again") or the last one chosen, if any. */
function initialPlan(): Partial<IntervalPlan> {
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.has("focus")) {
      return {
        focus: params.get("focus") as IntervalFocus,
        dumbbells: params.get("dumbbells") === "1",
        pattern: params.get("pattern") as IntervalPattern,
        minutes: Number(params.get("minutes")),
        seed: Number(params.get("seed")) || undefined,
      };
    }
    return JSON.parse(localStorage.getItem(SAVED) ?? "{}");
  } catch {
    return {};
  }
}

/** A plan read from a link or storage, kept to the values the app knows. */
function sane(p: Partial<IntervalPlan>, fallback: IntervalPlan): IntervalPlan {
  return {
    focus: INTERVAL_FOCUSES.includes(p.focus as IntervalFocus) ? p.focus! : fallback.focus,
    dumbbells: typeof p.dumbbells === "boolean" ? p.dumbbells : fallback.dumbbells,
    pattern: INTERVAL_PATTERNS.includes(p.pattern as IntervalPattern) ? p.pattern! : fallback.pattern,
    minutes: (INTERVAL_MINUTES as readonly number[]).includes(p.minutes ?? 0) ? p.minutes! : fallback.minutes,
    seed: p.seed && p.seed > 0 ? p.seed : fallback.seed,
  };
}

/**
 * Timed bodyweight sessions: the athlete picks the area, the equipment, the
 * rhythm and the length, sees the session, then follows it full screen. What
 * was done is saved as a workout, with one set per interval.
 */
export default function IntervalsPage() {
  const t = useTranslations("intervals");
  const xl = useExerciseLabel();
  const router = useRouter();
  const athlete = useAthleteProfileOrNull();
  const exercises = useExercises();
  const [plan, setPlan] = useState<IntervalPlan | null>(null);
  const [playing, setPlaying] = useState(false);
  const [saving, setSaving] = useState(false);

  // Once the profile is read: the link, else the last plan, else the level's.
  useEffect(() => {
    if (plan || athlete === undefined) return;
    const fallback: IntervalPlan = {
      focus: "full",
      dumbbells: !!athlete?.equipment?.includes("dumbbell"),
      pattern: defaultPattern(athlete?.fitnessLevel),
      minutes: 20,
      seed: newSeed(),
    };
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reads the URL and storage, only on the client
    setPlan(sane(initialPlan(), fallback));
  }, [athlete, plan]);

  const session = useMemo(() => (plan ? buildIntervalSession(plan) : null), [plan]);

  function change(next: Partial<IntervalPlan>) {
    if (!plan) return;
    const updated = { ...plan, ...next, seed: next.seed ?? newSeed() };
    setPlan(updated);
    try {
      localStorage.setItem(SAVED, JSON.stringify({ ...updated, seed: undefined }));
    } catch {
      // Private window: the choice is not remembered, that is all.
    }
  }

  async function save({ done, elapsedSec }: IntervalResult) {
    setPlaying(false);
    if (!plan || !session || done.length === 0) return;
    setSaving(true);
    const { rest } = patternSeconds(plan.pattern);
    const id = await createWorkout({
      date: localDate(),
      title: t("workoutTitle", { focus: t(`focus_${plan.focus}`), minutes: plan.minutes }),
      kind: "interval",
      intervalPlan: plan,
      durationSec: elapsedSec,
      durationMin: Math.max(1, Math.round(elapsedSec / 60)),
    });
    const ids = new Map<string, number>();
    const numbers = new Map<string, number>();
    for (const index of done) {
      const step = session.steps[index];
      if (step.type !== "work") continue;
      const { name, muscleGroup, equipment, description } = step.exercise;
      let exerciseId = ids.get(name) ?? exercises.find((e) => !e.isCustom && e.name === name)?.id ?? exercises.find((e) => e.name === name)?.id;
      if (!exerciseId) {
        // The library has not been updated yet (migration 038): the athlete gets their own copy.
        exerciseId = await createCustomExercise({ name, muscleGroup, equipment, description: description || undefined });
      }
      ids.set(name, exerciseId);
      const setNumber = (numbers.get(name) ?? 0) + 1;
      numbers.set(name, setNumber);
      await addWorkoutSet({ workoutId: id, exerciseId, setNumber, reps: step.seconds, restSec: rest, completed: true });
    }
    router.push(`/log/${id}`);
  }

  if (!plan || !session) return <PageHeader title={t("title")} showBack />;

  const { work, rest } = patternSeconds(plan.pattern);
  const circuits = session.rounds.length > 1 && plan.minutes >= 30 ? session.rounds.slice(0, 2) : session.rounds.slice(0, 1);

  return (
    <>
      <PageHeader title={t("title")} showBack />
      <div className="space-y-6 p-4 pb-28">
        <p className="text-sm text-muted-foreground">{t("intro")}</p>

        <Field label={t("focus")}>
          {INTERVAL_FOCUSES.map((focus) => (
            <Choice key={focus} on={plan.focus === focus} onClick={() => change({ focus })}>
              {t(`focus_${focus}`)}
            </Choice>
          ))}
        </Field>

        <Field label={t("equipment")}>
          <Choice on={!plan.dumbbells} onClick={() => change({ dumbbells: false })}>
            {t("bodyweight")}
          </Choice>
          <Choice on={plan.dumbbells} onClick={() => change({ dumbbells: true })}>
            {t("dumbbells")}
          </Choice>
        </Field>

        <Field label={t("pattern")} hint={t(`patternHint_${plan.pattern}`)}>
          {INTERVAL_PATTERNS.map((pattern) => {
            const s = patternSeconds(pattern);
            return (
              <Choice key={pattern} on={plan.pattern === pattern} onClick={() => change({ pattern })}>
                {t("patternLabel", { work: s.work, rest: s.rest })}
              </Choice>
            );
          })}
        </Field>

        <Field label={t("duration")}>
          {INTERVAL_MINUTES.map((minutes) => (
            <Choice key={minutes} on={plan.minutes === minutes} onClick={() => change({ minutes })}>
              {minutes} min
            </Choice>
          ))}
        </Field>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <SectionHeading>{t("yourSession")}</SectionHeading>
            <Button variant="ghost" size="sm" className="text-accent-text" onClick={() => change({})}>
              <Shuffle className="mr-1 h-4 w-4" aria-hidden="true" />
              {t("shuffle")}
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            {t("summary", {
              // A last round of one or two exercises ends the session; it is not counted as a round.
              rounds: session.rounds.filter((r) => r.length * 2 >= session.rounds[0].length).length,
              exercises: session.rounds[0].length,
              work,
              rest,
            })}
          </p>
          {circuits.map((round, i) => (
            <div key={i} className="t-surface space-y-1 rounded-2xl p-3 ring-1 ring-foreground/5">
              {circuits.length > 1 && (
                <p className="text-xs font-semibold text-muted-foreground uppercase">{t(i === 0 ? "circuitA" : "circuitB")}</p>
              )}
              <ol className="space-y-1">
                {round.map((e, n) => (
                  <li key={e.name} className="flex items-center gap-2 text-sm">
                    <span className="w-5 text-right text-xs text-muted-foreground tabular-nums">{n + 1}</span>
                    <span className="flex-1">{xl(e.name)}</span>
                    {e.equipment === "dumbbell" && <span className="text-xs text-muted-foreground">{t("withDumbbells")}</span>}
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </section>

        <Button
          size="lg"
          className="h-14 w-full rounded-full text-base"
          disabled={saving}
          onClick={() => {
            unlockAudio();
            setPlaying(true);
          }}
        >
          <Play className="mr-2 h-5 w-5" aria-hidden="true" />
          {t("start")}
        </Button>
        <p className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
          <Timer className="h-3.5 w-3.5" aria-hidden="true" />
          {t("soundHint")}
        </p>
      </div>

      {playing && <IntervalPlayer session={session} onEnd={save} />}
    </>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <fieldset className="space-y-2">
      <legend className="mb-2 text-sm font-semibold">{label}</legend>
      <div className="flex flex-wrap gap-2">{children}</div>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </fieldset>
  );
}

function Choice({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={cn(
        "min-h-11 rounded-full border px-4 text-sm font-medium transition-colors",
        on ? "border-accent-500 bg-accent-500 text-white" : "border-border text-foreground hover:bg-muted"
      )}
    >
      {children}
    </button>
  );
}

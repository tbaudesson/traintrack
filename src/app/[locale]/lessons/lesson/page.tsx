"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { ArrowDown, ArrowUp, CheckCircle2, Copy, Pencil, Play, Plus, RotateCcw, Trash2 } from "lucide-react";
import type { GroupLesson, LessonPlanItem } from "@/db";
import { useRouter } from "@/i18n/navigation";
import { deleteGroupLesson, updateGroupLesson, useGroupLesson, useGroupLessons, useLessonGroup } from "@/hooks/useLessons";
import { useExercises } from "@/hooks/useExercises";
import { isGiven, lessonLength, planItem, planMinutes, previousPlan } from "@/lib/lessons";
import { refLabel, sportOf, type LessonsReference } from "@/lib/lessonsReference";
import { LessonsReferenceGate } from "@/components/domain/LessonsReferenceGate";
import { lessonGroupHref } from "@/lib/routes";
import { useFormat } from "@/lib/format";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/layout/PageHeader";
import { SectionHeading } from "@/components/ui/page-parts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RequireFeature } from "@/components/domain/UpgradeNotice";
import { GivenDialog, LessonExercisePicker } from "@/components/domain/LessonDialogs";
import { IntervalPlayer } from "@/components/domain/IntervalPlayer";

/** The seconds before the first drill starts, on the court. */
const GET_READY_SEC = 10;

/**
 * A lesson: its day, its theme and its exercises with their minutes, against
 * the length of the group's slot. Run on the court with the clock, then
 * marked given: how many came, how hard it was, a note.
 */
function LessonContent({ id, reference }: { id: number; reference: LessonsReference }) {
  const t = useTranslations("lessons");
  const locale = useLocale();
  const router = useRouter();
  const { day } = useFormat();
  const lesson = useGroupLesson(id);
  const group = useLessonGroup(lesson?.groupId);
  const lessons = useGroupLessons(lesson?.groupId);
  const exercises = useExercises();
  const [picking, setPicking] = useState(false);
  const [giving, setGiving] = useState<GroupLesson | null>(null);
  const [running, setRunning] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [themeDraft, setThemeDraft] = useState<string | null>(null);
  if (lesson === undefined || group === undefined) return null;
  if (lesson === null || group === null) return <PageHeader title={t("lessonTitle")} showBack />;

  const plan = lesson.plan ?? [];
  const total = planMinutes(plan);
  const length = lessonLength(group, lesson.date);
  const given = isGiven(lesson);
  const previous = lessons ? previousPlan(lessons, lesson.date, lesson.id) : null;
  const setPlan = (next: LessonPlanItem[]) => void updateGroupLesson(id, { plan: next.slice(0, 40) });
  const sport = sportOf(reference, group.sport);
  const move = (i: number, by: number) => {
    const next = [...plan];
    const [item] = next.splice(i, 1);
    next.splice(i + by, 0, item);
    setPlan(next);
  };

  return (
    <>
      <PageHeader title={group.name} showBack />
      <div className="mx-auto max-w-3xl space-y-5 p-4 pb-48 md:p-6">
        <div className="grid grid-cols-[9.5rem_1fr] gap-2">
          <label className="space-y-1 text-xs">
            <span className="text-muted-foreground">{t("date")}</span>
            <Input type="date" value={lesson.date} onChange={(e) => e.target.value && void updateGroupLesson(id, { date: e.target.value })} />
          </label>
          <label className="space-y-1 text-xs">
            <span className="text-muted-foreground">{t("theme")}</span>
            <Input
              value={themeDraft ?? lesson.theme ?? ""}
              placeholder={t("themePlaceholder")}
              maxLength={120}
              onChange={(e) => setThemeDraft(e.target.value)}
              onBlur={() => {
                if (themeDraft !== null) void updateGroupLesson(id, { theme: themeDraft.trim() || null });
                setThemeDraft(null);
              }}
            />
          </label>
        </div>

        {given && (
          <section className="space-y-2 rounded-2xl bg-emerald-50 p-3 text-sm dark:bg-emerald-950/40" role="status">
            <p className="flex items-center gap-2 font-semibold text-emerald-800 dark:text-emerald-200">
              <CheckCircle2 className="size-4" aria-hidden="true" />
              {t("givenOn", { date: day(lesson.date) })}
            </p>
            <p className="text-emerald-900 dark:text-emerald-100">
              {[
                lesson.present != null ? t("presentCount", { count: lesson.present }) : null,
                lesson.intensity ? `${t("intensityShort", { value: lesson.intensity })} (${t(`intensity_${lesson.intensity}`)})` : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
            {lesson.notes && <p className="whitespace-pre-line text-emerald-900 italic dark:text-emerald-100">{lesson.notes}</p>}
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => setGiving(lesson)}>
                <Pencil className="mr-1 size-4" aria-hidden="true" />
                {t("editGiven")}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => void updateGroupLesson(id, { givenAt: null })}>
                <RotateCcw className="mr-1 size-4" aria-hidden="true" />
                {t("backToPlanned")}
              </Button>
            </div>
          </section>
        )}

        <section className="space-y-2" aria-labelledby="lesson-plan">
          <div className="flex items-baseline justify-between gap-2">
            <SectionHeading id="lesson-plan">{t("plan")}</SectionHeading>
            <span className={cn("text-sm font-semibold tabular-nums", total > length ? "text-amber-700 dark:text-amber-300" : "text-muted-foreground")}>
              {t("total", { minutes: total, length })}
            </span>
          </div>
          {plan.length === 0 && <p className="text-sm text-muted-foreground">{t("emptyPlan")}</p>}
          <ol className="space-y-1.5">
            {plan.map((p, i) => (
              <li key={`${i}-${p.name}`} className="t-surface flex items-center gap-2 rounded-xl px-3 py-2 ring-1 ring-foreground/5">
                <span className="w-5 shrink-0 text-xs text-muted-foreground tabular-nums">{i + 1}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">{p.name}</span>
                  <span className="block text-xs text-muted-foreground">{refLabel(sport?.themes, p.category, locale)}</span>
                </span>
                <label className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Input
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={60}
                    value={p.minutes}
                    aria-label={t("minutesOf", { name: p.name })}
                    onChange={(e) => setPlan(plan.map((x, j) => (j === i ? { ...x, minutes: Math.min(60, Math.max(1, Math.round(Number(e.target.value)) || 1)) } : x)))}
                    className="h-9 w-14 px-1 text-center"
                  />
                  {t("min")}
                </label>
                <div className="flex shrink-0">
                  <Button variant="ghost" size="icon-sm" disabled={i === 0} onClick={() => move(i, -1)} aria-label={t("moveUp", { name: p.name })}>
                    <ArrowUp className="size-4" aria-hidden="true" />
                  </Button>
                  <Button variant="ghost" size="icon-sm" disabled={i === plan.length - 1} onClick={() => move(i, 1)} aria-label={t("moveDown", { name: p.name })}>
                    <ArrowDown className="size-4" aria-hidden="true" />
                  </Button>
                  <Button variant="ghost" size="icon-sm" onClick={() => setPlan(plan.filter((_, j) => j !== i))} aria-label={t("removeNamed", { name: p.name })}>
                    <Trash2 className="size-4" aria-hidden="true" />
                  </Button>
                </div>
              </li>
            ))}
          </ol>
          <div className="grid gap-2 sm:grid-cols-2">
            <Button variant="outline" onClick={() => setPicking(true)} disabled={!sport}>
              <Plus className="mr-1 size-4" aria-hidden="true" />
              {t("addDrill")}
            </Button>
            {plan.length === 0 && previous && (
              <Button variant="outline" onClick={() => setPlan(previous)}>
                <Copy className="mr-1 size-4" aria-hidden="true" />
                {t("fromPrevious")}
              </Button>
            )}
          </div>
        </section>

        {plan.length > 0 && (
          <div className="grid gap-2 sm:grid-cols-2">
            <Button className="h-12 rounded-full" onClick={() => setRunning(true)}>
              <Play className="mr-1 size-5" aria-hidden="true" />
              {t("run")}
            </Button>
            {!given && (
              <Button variant="outline" className="h-12 rounded-full" onClick={() => setGiving(lesson)}>
                <CheckCircle2 className="mr-1 size-5" aria-hidden="true" />
                {t("markGiven")}
              </Button>
            )}
          </div>
        )}

        <div className="border-t border-border pt-3">
          {confirmDelete ? (
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span>{t("deleteLessonConfirm")}</span>
              <Button
                size="sm"
                variant="destructive"
                onClick={async () => {
                  await deleteGroupLesson(id);
                  router.push(lessonGroupHref(group.id!));
                }}
              >
                {t("deleteLesson")}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setConfirmDelete(false)}>{t("cancel")}</Button>
            </div>
          ) : (
            <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setConfirmDelete(true)}>
              <Trash2 className="mr-1 size-4" aria-hidden="true" />
              {t("deleteLesson")}
            </Button>
          )}
        </div>
      </div>

      {sport && (
        <LessonExercisePicker
          open={picking}
          exercises={exercises}
          sport={sport}
          ageBand={group.ageBand}
          onClose={() => setPicking(false)}
          onPick={(ex) => {
            setPlan([...plan, planItem(ex, locale)]);
            setPicking(false);
          }}
        />
      )}
      <GivenDialog lesson={giving} group={group} sport={sport} onClose={() => setGiving(null)} />
      {running && (
        <IntervalPlayer
          session={{ steps: plan.map((p) => ({ type: "work" as const, exercise: { name: p.name, cue: refLabel(sport?.themes, p.category, locale) }, seconds: p.minutes * 60 })) }}
          getReadySec={GET_READY_SEC}
          labels={{ work: t("playerWork"), rest: t("playerNext"), counter: (n, all) => t("counter", { n, total: all }) }}
          onEnd={() => {
            setRunning(false);
            // Run to the end or stopped: the coach says how it went, unless already said.
            if (!given) setGiving(lesson);
          }}
        />
      )}
    </>
  );
}

function ById() {
  const id = Number(useSearchParams().get("id"));
  return id > 0 ? <LessonsReferenceGate>{(reference) => <LessonContent key={id} id={id} reference={reference} />}</LessonsReferenceGate> : null;
}

export default function GroupLessonPage() {
  return (
    <RequireFeature feature="group_lessons" namespace="lessons">
      <Suspense>
        <ById />
      </Suspense>
    </RequireFeature>
  );
}

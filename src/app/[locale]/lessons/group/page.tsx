"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { CheckCircle2, CircleDashed, Pencil, Plus } from "lucide-react";
import type { LessonGroup } from "@/db";
import { Link, useRouter } from "@/i18n/navigation";
import { addGroupLesson, useGroupLessons, useLessonGroup } from "@/hooks/useLessons";
import { addDays, groupWeeks, isGiven, nextSlot, planMinutes, sortedSlots, themeMinutes, themesToRevisit } from "@/lib/lessons";
import { coreThemes, refLabel, sportOf, type LessonsReference } from "@/lib/lessonsReference";
import { mondayOfDate } from "@/lib/weekPlan";
import { localDate } from "@/lib/dates";
import { lessonHref } from "@/lib/routes";
import { useFormat } from "@/lib/format";
import { PageHeader } from "@/components/layout/PageHeader";
import { SectionHeading } from "@/components/ui/page-parts";
import { Button } from "@/components/ui/button";
import { RequireFeature } from "@/components/domain/UpgradeNotice";
import { GroupDialog } from "@/components/domain/LessonDialogs";
import { LessonsReferenceGate } from "@/components/domain/LessonsReferenceGate";

/**
 * A group, week by week: the lessons planned and given, with their themes,
 * and the minutes given to each theme over the last four weeks.
 */
function GroupContent({ id, reference }: { id: number; reference: LessonsReference }) {
  const t = useTranslations("lessons");
  const locale = useLocale();
  const router = useRouter();
  const { day } = useFormat();
  const group = useLessonGroup(id);
  const lessons = useGroupLessons(id);
  const [editing, setEditing] = useState<Partial<LessonGroup> | null>(null);
  const today = localDate();
  if (group === undefined || lessons === undefined) return null;
  if (group === null) return <PageHeader title={t("title")} showBack />;

  const sport = sportOf(reference, group.sport);
  const themes = sport?.themes ?? [];
  // The themes in a lesson's order; one the reference no longer has, after them.
  const themeOrder = (ids: Iterable<string | null | undefined>) => {
    const all = [...new Set([...ids].filter((x): x is string => !!x))];
    return [...themes.map((th) => th.id).filter((c) => all.includes(c)), ...all.filter((c) => !themes.some((th) => th.id === c))];
  };
  const weeks = groupWeeks(lessons, today, 8).reverse();
  const recent = lessons.filter((l) => l.date >= addDays(mondayOfDate(today), -21) && l.date <= today);
  const minutes = themeMinutes(recent);
  const top = Math.max(1, ...minutes.values());
  const revisit = themesToRevisit(lessons, today, coreThemes(sport));

  async function newLesson() {
    const date = nextSlot(group!, today)?.date ?? today;
    const existing = lessons!.find((l) => l.date === date);
    router.push(lessonHref(existing?.id ?? (await addGroupLesson({ groupId: id, date, plan: [] }))));
  }

  return (
    <>
      <PageHeader
        title={group.name}
        showBack
        actions={
          <Button variant="ghost" size="icon-sm" onClick={() => setEditing(group)} aria-label={t("editGroup")}>
            <Pencil className="size-4" aria-hidden="true" />
          </Button>
        }
      />
      <div className="mx-auto max-w-3xl space-y-6 p-4 pb-28 md:p-6">
        <p className="text-sm text-muted-foreground">
          {[
            refLabel(reference.sports, group.sport, locale),
            group.ageBand ? refLabel(sport?.ageBands, group.ageBand, locale) : null,
            group.level ? refLabel(sport?.levels, group.level, locale) : null,
            group.players ? t("playersCount", { count: group.players }) : null,
            ...sortedSlots(group.slots ?? []).map((s) => `${t(`day_${s.day}`)} ${s.time} (${s.minutes} min)`),
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
        <Button className="w-full" onClick={() => void newLesson()}>
          <Plus className="mr-1 size-4" aria-hidden="true" />
          {t("newLesson")}
        </Button>

        <section className="space-y-2" aria-labelledby="lessons-themes">
          <SectionHeading id="lessons-themes">{t("themesTitle")}</SectionHeading>
          {minutes.size === 0 ? (
            <p className="text-sm text-muted-foreground">{t("themesEmpty")}</p>
          ) : (
            <ul className="space-y-1.5">
              {themeOrder(minutes.keys()).map((c) => (
                <li key={c} className="grid grid-cols-[7.5rem_1fr_3.5rem] items-center gap-2 text-sm">
                  <span className="truncate">{refLabel(themes, c, locale)}</span>
                  <span className="h-2 overflow-hidden rounded-full bg-muted">
                    <span className="block h-full rounded-full bg-accent-500" style={{ width: `${(minutes.get(c)! / top) * 100}%` }} />
                  </span>
                  <span className="text-right text-xs text-muted-foreground tabular-nums">{t("minutesShort", { minutes: minutes.get(c)! })}</span>
                </li>
              ))}
            </ul>
          )}
          {revisit.length > 0 && (
            <p className="rounded-xl bg-amber-50 p-2.5 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
              {t("revisit", { list: revisit.map((c) => refLabel(themes, c, locale)).join(", ") })}
            </p>
          )}
        </section>

        <section className="space-y-3" aria-labelledby="lessons-weeks">
          <SectionHeading id="lessons-weeks">{t("weeks")}</SectionHeading>
          {weeks.map((w) => (
            <div key={w.monday} className="space-y-1.5">
              <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                {w.monday === mondayOfDate(today) ? t("thisWeek") : t("weekOf", { date: day(w.monday) })}
              </h3>
              {w.lessons.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("noLessonWeek")}</p>
              ) : (
                w.lessons.map((l) => {
                  const cats = themeOrder((l.plan ?? []).map((p) => p.category));
                  return (
                    <Link key={l.id} href={lessonHref(l.id!)} className="t-surface flex items-start gap-3 rounded-2xl px-4 py-3 ring-1 ring-foreground/5 hover:bg-muted">
                      {isGiven(l) ? (
                        <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600 dark:text-emerald-400" aria-label={t("status_given")} />
                      ) : (
                        <CircleDashed className="mt-0.5 size-5 shrink-0 text-muted-foreground" aria-label={t("status_planned")} />
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="block font-medium">{[day(l.date), l.theme].filter(Boolean).join(" · ")}</span>
                        <span className="block text-xs text-muted-foreground">
                          {[
                            t("minutesShort", { minutes: planMinutes(l.plan ?? []) }),
                            l.present != null ? t("presentCount", { count: l.present }) : null,
                            l.intensity ? t("intensityShort", { value: l.intensity }) : null,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
                        {cats.length > 0 && <span className="block text-xs text-muted-foreground">{cats.map((c) => refLabel(themes, c, locale)).join(", ")}</span>}
                        {l.notes && <span className="mt-1 line-clamp-2 block text-xs italic text-muted-foreground">{l.notes}</span>}
                      </span>
                    </Link>
                  );
                })
              )}
            </div>
          ))}
        </section>
      </div>
      <GroupDialog group={editing} reference={reference} onClose={() => setEditing(null)} />
    </>
  );
}

function ById() {
  const id = Number(useSearchParams().get("id"));
  return id > 0 ? <LessonsReferenceGate>{(reference) => <GroupContent key={id} id={id} reference={reference} />}</LessonsReferenceGate> : null;
}

export default function LessonGroupPage() {
  return (
    <RequireFeature feature="group_lessons" namespace="lessons">
      <Suspense>
        <ById />
      </Suspense>
    </RequireFeature>
  );
}

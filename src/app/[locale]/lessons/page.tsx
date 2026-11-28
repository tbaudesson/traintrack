"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Archive, CheckCircle2, ChevronRight, CircleDashed, ListChecks, Pencil, Plus, Users } from "lucide-react";
import type { GroupLesson, LessonGroup } from "@/db";
import { Link, useRouter } from "@/i18n/navigation";
import { addGroupLesson, useGroupLessons, useLessonGroups } from "@/hooks/useLessons";
import { isGiven, lessonLength, planMinutes, slotsOfWeek, themesToRevisit } from "@/lib/lessons";
import { coreThemes, refLabel, sportOf, type LessonsReference } from "@/lib/lessonsReference";
import { mondayOfDate } from "@/lib/weekPlan";
import { localDate } from "@/lib/dates";
import { lessonGroupHref, lessonHref } from "@/lib/routes";
import { useFormat } from "@/lib/format";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState, SectionHeading } from "@/components/ui/page-parts";
import { Button } from "@/components/ui/button";
import { RequireFeature } from "@/components/domain/UpgradeNotice";
import { GroupDialog } from "@/components/domain/LessonDialogs";
import { LessonsReferenceGate } from "@/components/domain/LessonsReferenceGate";

/**
 * The group lessons' notebook: this week's lessons, group by group (to
 * prepare, ready, given), then the groups with what to bring back. Nothing
 * about the players themselves.
 */
function LessonsHome({ reference }: { reference: LessonsReference }) {
  const t = useTranslations("lessons");
  const router = useRouter();
  const groups = useLessonGroups();
  const lessons = useGroupLessons();
  const [editing, setEditing] = useState<Partial<LessonGroup> | null>(null);
  const today = localDate();
  const monday = mondayOfDate(today);
  const active = (groups ?? []).filter((g) => !g.archivedAt);
  const archived = (groups ?? []).filter((g) => g.archivedAt);
  const week = active
    .flatMap((g) => slotsOfWeek(g, monday).map((s) => ({ group: g, ...s, lesson: (lessons ?? []).find((l) => l.groupId === g.id && l.date === s.date) })))
    .sort((a, b) => a.date.localeCompare(b.date) || a.slot.time.localeCompare(b.slot.time));

  /** The lesson of a slot: opened, or made for that day. */
  async function open(group: LessonGroup, date: string, lesson?: GroupLesson) {
    const id = lesson?.id ?? (await addGroupLesson({ groupId: group.id!, date, plan: [] }));
    router.push(lessonHref(id));
  }

  return (
    <>
      <PageHeader
        title={t("title")}
        showBack
        actions={
          <div className="flex gap-2">
            <Link href={`/exercises?sport=${active[0]?.sport ?? "all"}`} className="flex h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-sm font-medium hover:bg-muted">
              <ListChecks className="size-4" aria-hidden="true" />
              {t("drills")}
            </Link>
            <Button size="sm" onClick={() => setEditing({})}>
              <Plus className="mr-1 size-4" aria-hidden="true" />
              {t("newGroup")}
            </Button>
          </div>
        }
      />
      <div className="mx-auto max-w-3xl space-y-6 p-4 pb-28 md:p-6">
        <p className="text-sm text-muted-foreground">{t("intro")}</p>

        {groups && active.length === 0 && <EmptyState icon={Users} title={t("empty")} />}

        {active.length > 0 && (
          <section className="space-y-2" aria-labelledby="lessons-week">
            <SectionHeading id="lessons-week">{t("thisWeek")}</SectionHeading>
            {week.length === 0 && <p className="text-sm text-muted-foreground">{t("noSlotThisWeek")}</p>}
            <ul className="space-y-2">
              {week.map(({ group, date, slot, lesson }) => (
                <WeekRow key={`${group.id}-${date}`} group={group} date={date} time={slot.time} lesson={lesson} past={date < today} onOpen={() => void open(group, date, lesson)} />
              ))}
            </ul>
          </section>
        )}

        {active.length > 0 && (
          <section className="space-y-2" aria-labelledby="lessons-groups">
            <SectionHeading id="lessons-groups">{t("groups")}</SectionHeading>
            {active.map((g) => (
              <GroupRow key={g.id} group={g} reference={reference} lessons={(lessons ?? []).filter((l) => l.groupId === g.id)} today={today} onEdit={() => setEditing(g)} />
            ))}
          </section>
        )}

        {archived.length > 0 && (
          <details className="t-panel rounded-xl px-4 py-1">
            <summary className="flex min-h-11 cursor-pointer items-center gap-2 text-sm font-semibold">
              <Archive className="size-4 text-muted-foreground" aria-hidden="true" />
              {t("archived", { count: archived.length })}
            </summary>
            <div className="space-y-2 pt-1 pb-3">
              {archived.map((g) => (
                <GroupRow key={g.id} group={g} reference={reference} lessons={(lessons ?? []).filter((l) => l.groupId === g.id)} today={today} onEdit={() => setEditing(g)} />
              ))}
            </div>
          </details>
        )}
      </div>
      <GroupDialog group={editing} reference={reference} onClose={() => setEditing(null)} />
    </>
  );
}

function WeekRow({ group, date, time, lesson, past, onOpen }: { group: LessonGroup; date: string; time: string; lesson?: GroupLesson; past: boolean; onOpen: () => void }) {
  const t = useTranslations("lessons");
  const { day } = useFormat();
  const minutes = lesson ? planMinutes(lesson.plan ?? []) : 0;
  const status = lesson && isGiven(lesson) ? "given" : minutes > 0 ? "ready" : "todo";
  return (
    <li>
      <button type="button" onClick={onOpen} className="t-surface flex min-h-14 w-full items-center gap-3 rounded-2xl px-4 py-3 text-left ring-1 ring-foreground/5 hover:bg-muted">
        {status === "given" ? (
          <CheckCircle2 className="size-5 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
        ) : (
          <CircleDashed className={`size-5 shrink-0 ${status === "ready" ? "text-accent-text" : "text-muted-foreground"}`} aria-hidden="true" />
        )}
        <span className="min-w-0 flex-1">
          <span className="block font-medium">{group.name}</span>
          <span className="block text-xs text-muted-foreground">{[`${day(date)} · ${time}`, lesson?.theme].filter(Boolean).join(" · ")}</span>
        </span>
        <span className={`shrink-0 text-xs font-semibold ${status === "given" ? "text-emerald-700 dark:text-emerald-300" : status === "ready" ? "text-accent-text" : past ? "text-amber-700 dark:text-amber-300" : "text-muted-foreground"}`}>
          {status === "given" ? t("status_given") : status === "ready" ? t("status_ready", { minutes, length: lessonLength(group, date) }) : t("status_todo")}
        </span>
        <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      </button>
    </li>
  );
}

function GroupRow({ group, reference, lessons, today, onEdit }: { group: LessonGroup; reference: LessonsReference; lessons: GroupLesson[]; today: string; onEdit: () => void }) {
  const t = useTranslations("lessons");
  const locale = useLocale();
  const { day } = useFormat();
  const sport = sportOf(reference, group.sport);
  const last = lessons.filter(isGiven).sort((a, b) => b.date.localeCompare(a.date))[0];
  const revisit = themesToRevisit(lessons, today, coreThemes(sport));
  const facts = [
    refLabel(reference.sports, group.sport, locale),
    group.ageBand ? refLabel(sport?.ageBands, group.ageBand, locale) : null,
    group.level ? refLabel(sport?.levels, group.level, locale) : null,
    group.players ? t("playersCount", { count: group.players }) : null,
  ];
  return (
    <div className="t-surface flex items-start gap-1 rounded-2xl ring-1 ring-foreground/5">
      <Link href={lessonGroupHref(group.id!)} className="min-w-0 flex-1 space-y-0.5 rounded-2xl px-4 py-3 hover:bg-muted">
        <span className="block font-medium">{group.name}</span>
        <span className="block text-xs text-muted-foreground">{facts.filter(Boolean).join(" · ")}</span>
        <span className="block text-xs text-muted-foreground">{last ? t("lastGiven", { date: day(last.date) }) : t("noLessonYet")}</span>
        {revisit.length > 0 && (
          <span className="block text-xs font-medium text-amber-700 dark:text-amber-300">{t("revisit", { list: revisit.map((c) => refLabel(sport?.themes, c, locale)).join(", ") })}</span>
        )}
      </Link>
      <Button variant="ghost" size="icon-sm" className="m-2" onClick={onEdit} aria-label={t("editGroupNamed", { name: group.name })}>
        <Pencil className="size-4" aria-hidden="true" />
      </Button>
    </div>
  );
}

export default function LessonsPage() {
  return (
    <RequireFeature feature="group_lessons" namespace="lessons">
      <LessonsReferenceGate>{(reference) => <LessonsHome reference={reference} />}</LessonsReferenceGate>
    </RequireFeature>
  );
}

"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ClipboardPen, Plus } from "lucide-react";
import type { LessonGroup } from "@/db";
import { Link } from "@/i18n/navigation";
import { useLessonGroups } from "@/hooks/useLessons";
import { useLessonsReference } from "@/hooks/useLessonsReference";
import { refLabel, sportOf } from "@/lib/lessonsReference";
import { sortedSlots } from "@/lib/lessons";
import { lessonGroupHref } from "@/lib/routes";
import { SectionHeading } from "@/components/ui/page-parts";
import { DetailRow } from "@/components/ui/detail-row";
import { Button, buttonVariants } from "@/components/ui/button";
import { GroupDialog } from "@/components/domain/LessonDialogs";

/**
 * In Coaching > Teams, the lesson groups (tennis, vaulting…): teams without
 * accounts, whose lessons a coach prepares and gives. Nothing about their
 * players but how many they are.
 */
export function LessonTeams() {
  const t = useTranslations("lessons");
  const locale = useLocale();
  const groups = useLessonGroups();
  const reference = useLessonsReference();
  const [editing, setEditing] = useState<Partial<LessonGroup> | null>(null);
  const active = (groups ?? []).filter((g) => !g.archivedAt);
  return (
    <section className="space-y-2" aria-labelledby="lesson-teams">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <SectionHeading id="lesson-teams">{t("teamsTitle")}</SectionHeading>
        <div className="flex gap-1.5">
          <Link href="/lessons" className={buttonVariants({ size: "sm", variant: "outline" })}>
            <ClipboardPen className="mr-1 size-4" aria-hidden="true" />
            {t("notebook")}
          </Link>
          {reference && (
            <Button size="sm" onClick={() => setEditing({})}>
              <Plus className="mr-1 size-4" aria-hidden="true" />
              {t("newGroup")}
            </Button>
          )}
        </div>
      </div>
      <p className="text-xs text-muted-foreground">{t("teamsHint")}</p>
      {active.map((g) => {
        const sport = reference ? sportOf(reference, g.sport) : undefined;
        return (
          <DetailRow
            key={g.id}
            href={lessonGroupHref(g.id!)}
            icon={ClipboardPen}
            title={g.name}
            subtitle={[
              reference ? refLabel(reference.sports, g.sport, locale) : null,
              g.ageBand ? refLabel(sport?.ageBands, g.ageBand, locale) : null,
              g.players ? t("playersCount", { count: g.players }) : null,
              ...sortedSlots(g.slots ?? []).map((s) => `${t(`day_${s.day}`)} ${s.time}`),
            ]
              .filter(Boolean)
              .join(" · ")}
          />
        );
      })}
      {reference && <GroupDialog group={editing} reference={reference} onClose={() => setEditing(null)} />}
    </section>
  );
}
